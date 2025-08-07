import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUpRightFromSquare } from 'lucide-react';

export default function TestFinalReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('idle'); // 'idle', 'loading', 'completed', 'error'
  const [currentSessionId, setCurrentSessionId] = useState('');
  
  // 新增状态
  const [sessionId, setSessionId] = useState('');
  const [reports, setReports] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  
  // Workflow状态相关
  const [workflowProgress, setWorkflowProgress] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // 集中化轮询状态管理
  const [pollingState, setPollingState] = useState({
    isPolling: false,
    intervals: {
      workflowStatus: null,
      sessionHistory: null,
      starting: null
    },
    currentWorkflow: null
  });
  const [workflowState, setWorkflowState] = useState('idle'); // 'idle', 'starting', 'processing', 'completed', 'error', 'timeout'
  const [startingTimeout, setStartingTimeout] = useState(null);
  
  // Prompt管理状态
  const [prompts, setPrompts] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(40); // 动态问题数量

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setWorkflowState('idle');
    stopPolling(); // 停止所有轮询

    try {
      // 生成一个测试sessionId
      const testSessionId = `test-${Date.now()}`;
      setCurrentSessionId(testSessionId);
      
      console.log('🔄 Testing Final Report API...');
      console.log('📋 Session ID:', testSessionId);
      console.log('📊 Total Questions:', totalQuestions);

      const response = await axios.post('/api/generate-Finalreport', {
        sessionId: testSessionId,
        totalQuestions: totalQuestions
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 90000
      });

      console.log('✅ API Response:', response.data);
      setResult(response.data);
      
      // Webhook成功，进入starting状态
      setWorkflowState('starting');
      setIsLoading(false);
      
      // 开始starting状态的密集轮询
      startPolling(testSessionId, true);

    } catch (err) {
      console.error('❌ API Error:', err);
      
      // 立即显示webhook错误
      const errorMessage = err.response?.data?.error || err.message;
      const errorDetails = err.response?.data;
      
      // 特殊处理常见错误
      let displayMessage = errorMessage;
      if (err.response?.status === 404) {
        displayMessage = 'Workflow not active in n8n - please check if the workflow is running';
      }
      
      setError({
        message: displayMessage,
        status: err.response?.status,
        details: errorDetails
      });
      setWorkflowState('error');
      setIsLoading(false);
      
      // 开始常规轮询
      startPolling();
    }
  };

  // 加载报告数据
  const handleLoadReports = async () => {
    if (!sessionId.trim()) {
      setReportsError('Please enter a SessionId');
      return;
    }

    setIsLoadingReports(true);
    setReportsError(null);
    setReports([]);
    setCurrentQuestionIndex(0);

    try {
      console.log('🔄 Loading reports for sessionId:', sessionId);
      
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setReportsError('No report data found for this SessionId');
        return;
      }

      // 过滤出AI消息
      const aiMessages = data.filter(item => {
        try {
          // message字段已经是JSON对象，直接使用
          const message = item.message;
          return message && message.type === 'ai';
        } catch (e) {
          console.error('Error parsing message:', e);
          return false;
        }
      });

      if (aiMessages.length === 0) {
        setReportsError('No AI report data found for this SessionId');
        return;
      }

      console.log('✅ Found AI reports:', aiMessages.length);
      console.log('📋 Sample AI message:', aiMessages[0]?.message);
      setReports(aiMessages);
      
    } catch (err) {
      console.error('❌ Error loading reports:', err);
      setReportsError(err.message || 'Failed to load reports');
    } finally {
      setIsLoadingReports(false);
    }
  };

  // 翻页功能
  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < reports.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // 键盘导航
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (reports.length === 0) return;
      
      if (event.key === 'ArrowLeft') {
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentQuestionIndex, reports.length]);

  // 解析报告内容
  const getCurrentReportContent = () => {
    if (reports.length === 0 || currentQuestionIndex >= reports.length) {
      return null;
    }
    
    const report = reports[currentQuestionIndex];
    try {
      // message字段已经是JSON对象，直接使用
      let message = report.message;
      
      // 如果message是字符串，尝试解析为JSON
      if (typeof message === 'string') {
        try {
          message = JSON.parse(message);
        } catch (parseError) {
          console.error('Error parsing message string:', parseError);
          return message; // 如果解析失败，直接返回原字符串
        }
      }
      
      // 只显示AI类型的消息
      if (message && message.type === 'ai' && message.content) {
        // 确保返回纯markdown字符串
        return typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      } else {
        return 'Non-AI message or no content found';
      }
    } catch (e) {
      console.error('Error parsing report content:', e);
      return 'Content parsing error';
    }
  };

  // Prompt管理功能
  const toggleQuestion = (questionNumber) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionNumber]: !prev[questionNumber]
    }));
  };

  const updatePrompt = (questionNumber, value) => {
    setPrompts(prev => ({
      ...prev,
      [questionNumber]: value
    }));
  };

  const cleanAllPrompts = async () => {
    // 清空当前页面状态
    setPrompts({});
    setExpandedQuestions({});
    
    try {
      console.log('🔄 Clearing all prompts from generate-Finalreport.js...');
      
      // 调用API清空文件中的prompts
      const response = await axios.post('/api/clear-prompts', {}, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      console.log('✅ Clear response:', response.data);
      alert('Successfully cleared all prompts from generate-Finalreport.js');
      
    } catch (error) {
      console.error('Error clearing prompts:', error);
      alert(`Failed to clear prompts: ${error.response?.data?.error || error.message}`);
    }
  };

  // 动态管理问题数量
  const addQuestion = () => {
    setTotalQuestions(prev => prev + 1);
  };

  const removeQuestion = () => {
    if (totalQuestions > 1) {
      // 删除最后一个问题的prompt
      const newPrompts = { ...prompts };
      delete newPrompts[totalQuestions];
      setPrompts(newPrompts);
      
      // 删除展开状态
      const newExpanded = { ...expandedQuestions };
      delete newExpanded[totalQuestions];
      setExpandedQuestions(newExpanded);
      
      setTotalQuestions(prev => prev - 1);
    }
  };

  // 加载文件中的prompts
  const loadPromptsFromFile = async () => {
    setIsLoadingPrompts(true);
    try {
      console.log('🔄 Loading prompts from generate-Finalreport.js...');
      
      const response = await axios.get('/api/get-prompts', {
        timeout: 10000
      });

      console.log('✅ Loaded prompts:', response.data.prompts);
      setPrompts(response.data.prompts);
      
      // 从加载的数据中获取问题总数
      if (response.data.totalQuestions) {
        setTotalQuestions(response.data.totalQuestions);
      }
      
      // 自动展开有内容的questions
      const questionsWithContent = Object.keys(response.data.prompts).filter(
        key => response.data.prompts[key] && response.data.prompts[key].trim() !== ''
      );
      
      const expandedState = {};
      questionsWithContent.forEach(key => {
        expandedState[key] = true;
      });
      setExpandedQuestions(expandedState);
      
    } catch (error) {
      console.error('Error loading prompts:', error);
      alert(`Failed to load prompts: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // 停止所有轮询
  const stopPolling = () => {
    console.log('🛑 Stopping all polling intervals');
    
    // 清理所有间隔
    if (pollingState.intervals.workflowStatus) {
      clearInterval(pollingState.intervals.workflowStatus);
    }
    if (pollingState.intervals.sessionHistory) {
      clearInterval(pollingState.intervals.sessionHistory);
    }
    if (pollingState.intervals.starting) {
      clearInterval(pollingState.intervals.starting);
    }
    if (startingTimeout) {
      clearTimeout(startingTimeout);
    }
    
    // 重置轮询状态
    setPollingState({
      isPolling: false,
      intervals: {
        workflowStatus: null,
        sessionHistory: null,
        starting: null
      },
      currentWorkflow: null
    });
    setStartingTimeout(null);
  };

  // 获取workflow进度
  const loadWorkflowProgress = async (sessionId, silent = false) => {
    if (!sessionId) return;
    
    if (!silent) setIsLoadingProgress(true);
    try {
      const response = await axios.get(`/api/get-workflow-progress?sessionId=${sessionId}`);
      if (response.data.success) {
        setWorkflowProgress(response.data.data);
        
        // 如果是starting状态且找到了记录，切换到processing
        if (workflowState === 'starting') {
          console.log('✅ Found workflow record, switching from starting to processing');
          setWorkflowState('processing');
          
          // 清理starting间隔，切换到常规轮询
          if (pollingState.intervals.starting) {
            clearInterval(pollingState.intervals.starting);
          }
          if (startingTimeout) {
            clearTimeout(startingTimeout);
          }
          setStartingTimeout(null);
          
          // 重新启动常规轮询
          setTimeout(() => {
            startPolling(currentSessionId, false);
          }, 100);
        }
        
        // 根据状态更新workflowState
        if (response.data.data.status === 'completed') {
          console.log('✅ Workflow completed, stopping all polling');
          setWorkflowState('completed');
          stopPolling();
        } else if (response.data.data.status === 'error') {
          console.log('❌ Workflow error, stopping all polling');
          setWorkflowState('error');
          stopPolling();
        } else if (response.data.data.status === 'processing' && workflowState !== 'starting') {
          setWorkflowState('processing');
        }
        
        return true; // 找到记录
      }
    } catch (error) {
      if (error.response?.status === 404) {
        if (workflowState === 'starting') {
          // starting状态下404是正常的，继续等待
          console.log('🔍 Session not found yet, continuing to poll...');
          return false;
        } else {
          // 非starting状态下的404，可能是session真的不存在
          console.log('❌ Session not found in database');
          return false;
        }
      }
      console.error('❌ Error loading workflow progress:', error);
    } finally {
      if (!silent) setIsLoadingProgress(false);
    }
    return false;
  };
  
  // 获取session历史
  const loadSessionHistory = async (silent = false) => {
    if (!silent) setIsLoadingHistory(true);
    try {
      const response = await axios.get('/api/get-session-history');
      if (response.data.success) {
        setSessionHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error loading session history:', error);
    } finally {
      if (!silent) setIsLoadingHistory(false);
    }
  };

  // 开始轮询
  const startPolling = (sessionId = null, isStarting = false) => {
    console.log('🔄 Starting polling', { sessionId, isStarting, workflowState });
    
    // 先清理现有轮询
    stopPolling();
    
    const targetSessionId = sessionId || currentSessionId;
    
    // 设置Session History轮询
    const historyInterval = setInterval(() => {
      console.log('📊 Polling session history');
      loadSessionHistory(true);
    }, 5000);
    
    let workflowInterval = null;
    let startingInterval = null;
    
    if (isStarting && targetSessionId) {
      // Starting状态的密集轮询
      startingInterval = setInterval(async () => {
        console.log('🔍 Starting state polling for session:', targetSessionId);
        const found = await loadWorkflowProgress(targetSessionId, true);
        if (found && workflowState === 'starting') {
          console.log('✅ Found record during starting, will switch to regular polling');
        }
      }, 2000);
      
      // 3分钟超时
      const timeout = setTimeout(() => {
        console.log('⏰ Starting timeout reached');
        if (startingInterval) clearInterval(startingInterval);
        setStartingTimeout(null);
        
        if (workflowState === 'starting') {
          setWorkflowState('timeout');
          setError({
            message: 'Workflow initialization timeout',
            details: 'No workflow record was created within 3 minutes.'
          });
          stopPolling();
        }
      }, 180000);
      
      setStartingTimeout(timeout);
    } else if (targetSessionId && workflowState !== 'starting') {
      // 常规workflow状态轮询
      workflowInterval = setInterval(() => {
        console.log('📈 Regular workflow polling for session:', targetSessionId);
        loadWorkflowProgress(targetSessionId, true);
      }, 3000);
    }
    
    // 更新轮询状态
    setPollingState({
      isPolling: true,
      intervals: {
        workflowStatus: workflowInterval,
        sessionHistory: historyInterval,
        starting: startingInterval
      },
      currentWorkflow: targetSessionId
    });
  };


  // 检查并恢复进行中的workflow状态
  const checkAndRestoreWorkflowState = async () => {
    try {
      const response = await axios.get('/api/get-session-history');
      if (response.data.success && response.data.data.length > 0) {
        // 查找最新的进行中workflow
        const activeWorkflow = response.data.data.find(session => 
          session.status === 'processing' || session.status === 'starting'
        );
        
        if (activeWorkflow) {
          console.log('🔄 Found active workflow on page load:', activeWorkflow.session_id);
          
          // 恢复API Testing状态
          setCurrentSessionId(activeWorkflow.session_id);
          setResult({
            sessionId: activeWorkflow.session_id,
            status: activeWorkflow.status,
            message: 'Workflow restored from previous session'
          });
          
          // 设置workflow状态
          if (activeWorkflow.status === 'processing') {
            setWorkflowState('processing');
          } else if (activeWorkflow.status === 'starting') {
            setWorkflowState('starting');
          }
          
          // 开始轮询这个workflow
          startPolling(activeWorkflow.session_id, activeWorkflow.status === 'starting');
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking for active workflows:', error);
    }
    return false;
  };

  // 页面加载时自动获取prompts、历史和恢复workflow状态
  useEffect(() => {
    const initializePage = async () => {
      loadPromptsFromFile();
      loadSessionHistory();
      
      // 尝试恢复进行中的workflow
      const hasActiveWorkflow = await checkAndRestoreWorkflowState();
      
      if (!hasActiveWorkflow) {
        // 没有进行中的workflow，开始基础轮询（仅Session History）
        startPolling();
      }
    };
    
    initializePage();
    
    // 清理函数
    return () => {
      stopPolling();
    };
  }, []);
  
  // 监听workflow状态变化，更新Session History
  useEffect(() => {
    if (workflowState) {
      console.log('🔄 Workflow state changed to:', workflowState, '- updating session history');
      loadSessionHistory(true);
    }
  }, [workflowState]);

  // 当currentSessionId变化时重新设置轮询
  useEffect(() => {
    if (currentSessionId && currentSessionId.trim() && workflowState !== 'starting') {
      startPolling(currentSessionId, false);
    }
  }, [currentSessionId]);

  // 页面可见性变化时控制轮询
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Page hidden, stopping polling');
        stopPolling();
      } else {
        console.log('📱 Page visible, restarting polling');
        if (currentSessionId && currentSessionId.trim()) {
          startPolling(currentSessionId, false);
        } else {
          startPolling();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSessionId]);

  const savePrompts = async () => {
    if (Object.keys(prompts).length === 0) {
      alert('No prompts to save');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Saving prompts:', prompts);
      console.log('Total questions:', totalQuestions);
      
      const response = await axios.post('/api/save-prompts', {
        prompts: prompts,
        totalQuestions: totalQuestions // 同时保存问题总数
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      console.log('✅ Save response:', response.data);
      alert(`Successfully saved ${response.data.updatedQuestions.length} prompts to generate-Finalreport.js`);
      
    } catch (error) {
      console.error('Error saving prompts:', error);
      alert(`Failed to save prompts: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
                      <style jsx>{`
                  .resize {
                    resize: both;
                    overflow: auto;
                  }
                  .resize::-webkit-resizer {
                    background-color: #e5e7eb;
                    border-radius: 0 0 4px 0;
                  }
                `}</style>
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Test Final Report API
        </h1>
        


        {/* API测试和Workflow状态 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* API Testing */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">API Testing</h2>
            
            <button
              onClick={handleGenerateReport}
              disabled={isLoading || workflowState === 'processing' || workflowState === 'starting'}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isLoading || workflowState === 'processing' || workflowState === 'starting'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Waiting for webhook response...
                </div>
              ) : (
                'Call generate-Finalreport API'
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <h3 className="text-red-800 font-medium mb-2">Error</h3>
                <p className="text-red-700 text-sm">{error.message}</p>
                {error.details && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                    <p className="font-medium">Details:</p>
                    <pre className="text-red-600 overflow-x-auto">{JSON.stringify(error.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <h3 className="text-green-800 font-medium mb-2">Webhook Response Success</h3>
                <p className="text-green-700 text-sm">SessionId: {result.sessionId}</p>
                <p className="text-green-700 text-sm">Status: {result.status}</p>
                <p className="text-green-600 text-xs mt-2">→ Workflow is now being monitored automatically</p>
              </div>
            )}
          </div>
          
          {/* Workflow Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Workflow Status</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  pollingState.isPolling ? 'bg-green-400 animate-pulse' : 'bg-gray-300'
                }`}></div>
                <span className="text-xs text-gray-500">Auto-sync</span>
              </div>
            </div>
            
            {(workflowProgress || workflowState === 'starting') ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Progress:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          workflowState === 'completed' ? 'bg-green-500' :
                          workflowState === 'processing' ? 'bg-blue-500' :
                          workflowState === 'starting' ? 'bg-blue-400 animate-pulse' :
                          workflowState === 'error' || workflowState === 'timeout' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}
                        style={{ 
                          width: workflowState === 'starting' ? '10%' : 
                                 workflowProgress ? `${(workflowProgress.current_step / workflowProgress.total_steps) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {workflowState === 'starting' ? '0/?' : 
                       workflowProgress ? `${workflowProgress.current_step}/${workflowProgress.total_steps}` : '0/0'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      workflowState === 'completed' ? 'bg-green-100 text-green-800' :
                      workflowState === 'processing' ? 'bg-blue-100 text-blue-800' :
                      workflowState === 'starting' ? 'bg-blue-50 text-blue-600' :
                      workflowState === 'error' || workflowState === 'timeout' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {workflowState === 'starting' ? 'initializing' : 
                       workflowProgress ? workflowProgress.status : workflowState}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Step:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {workflowState === 'starting' ? '0/??' : 
                       workflowProgress ? `${workflowProgress.current_step}/${workflowProgress.total_steps}` : '0/0'}
                    </span>
                  </div>
                </div>
                
                {(workflowProgress?.current_question || workflowState === 'starting') && (
                  <div className="text-sm">
                    <span className="text-gray-600">Current:</span>
                    <p className="text-gray-900 mt-1 p-2 bg-gray-50 rounded text-xs">
                      {workflowState === 'starting' ? 'Waiting for workflow to initialize...' : 
                       workflowProgress?.current_question || 'No current task'}
                    </p>
                  </div>
                )}
                
                {workflowProgress?.error_message && (
                  <div className="text-sm">
                    <span className="text-red-600">Error:</span>
                    <p className="text-red-700 mt-1 p-2 bg-red-50 rounded text-xs">
                      {workflowProgress.error_message}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No workflow data available</p>
                <p className="text-xs mt-1">Start a workflow to see progress</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Session History */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Session History</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                pollingState.intervals.sessionHistory ? 'bg-green-400 animate-pulse' : 'bg-gray-300'
              }`}></div>
              <span className="text-xs text-gray-500">Auto-updating</span>
            </div>
          </div>
          
          {sessionHistory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
              {sessionHistory.map((session, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {session.session_id}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      session.status === 'completed' ? 'bg-green-100 text-green-800' :
                      session.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      session.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Steps: {session.current_step}/{session.total_steps}</p>
                    <p>Started: {new Date(session.started_at).toLocaleDateString()}</p>
                    {session.completed_at && (
                      <p>Completed: {new Date(session.completed_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // 将sessionId传递给Report Browser模块并自动加载报告
                      setSessionId(session.session_id);
                      // 自动触发加载报告
                      setTimeout(() => {
                        handleLoadReports();
                      }, 100);
                    }}
                    className="mt-2 w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No session history found</p>
            </div>
          )}
        </div>
        
        {/* 报告浏览区域 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Browser</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SessionId
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter SessionId"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={handleLoadReports}
              disabled={isLoadingReports || !sessionId.trim()}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isLoadingReports || !sessionId.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
              }`}
            >
              {isLoadingReports ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : (
                'Load Reports'
              )}
            </button>

            {reportsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{reportsError}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 中间：报告页面prompt区域 */}
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Report Page Prompts</h2>
              <div className="flex space-x-2">
                <button
                  onClick={loadPromptsFromFile}
                  disabled={isLoadingPrompts}
                  className={`w-16 h-8 rounded-md font-medium text-xs transition-all duration-200 ${
                    isLoadingPrompts
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  {isLoadingPrompts ? 'Loading...' : 'Reload'}
                </button>
                <button
                  onClick={savePrompts}
                  disabled={isSaving}
                  className={`w-16 h-8 rounded-md font-medium text-xs transition-all duration-200 ${
                    isSaving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cleanAllPrompts}
                  className="w-16 h-8 rounded-md font-medium text-xs bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {/* 问题数量管理 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Questions: {totalQuestions}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={removeQuestion}
                    disabled={totalQuestions <= 1}
                    className={`w-8 h-8 rounded-md font-medium text-sm transition-all duration-200 ${
                      totalQuestions <= 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm hover:shadow-md'
                    }`}
                    title="Remove last question"
                  >
                    −
                  </button>
                  <button
                    onClick={addQuestion}
                    className="w-8 h-8 rounded-md font-medium text-sm bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    title="Add new question"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 max-h-[800px] overflow-y-auto">
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((questionNumber) => (
                <div key={questionNumber} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleQuestion(questionNumber)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">Question {questionNumber}</span>
                      {prompts[questionNumber] && prompts[questionNumber].trim() !== '' && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {expandedQuestions[questionNumber] ? '−' : '+'}
                    </span>
                  </button>
                  
                  {expandedQuestions[questionNumber] && (
                    <div className="px-4 pb-4">
                      <textarea
                        value={prompts[questionNumber] || ''}
                        onChange={(e) => updatePrompt(questionNumber, e.target.value)}
                        placeholder={`Enter prompt for question ${questionNumber}...`}
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：报告显示区域 */}
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Report Content</h2>
              {sessionId.trim() && (
                <button
                  onClick={() => window.open(`/test-finalreport/${sessionId}?completed=true`, '_blank')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="在新标签页中打开报告"
                >
                  <ArrowUpRightFromSquare className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {!sessionId.trim() ? (
              <div className="text-center py-12 text-gray-500">
                <p>Please enter SessionId and load reports to view content</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* iframe显示独立报告页面 */}
                <div className="border border-gray-200 rounded-lg bg-white min-h-[600px] max-h-[800px] overflow-hidden">
                  <iframe
                    src={`/test-finalreport/${sessionId}`}
                    className="w-full h-[800px] border-0 rounded-lg"
                    title="Report Content"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                </div>
                
                {/* 提示信息 */}
                <div className="text-xs text-gray-500 text-center">
                  Report content loaded from /test-finalreport/{sessionId}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 