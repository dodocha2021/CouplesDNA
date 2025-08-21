import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUpRightFromSquare } from 'lucide-react';
import NoUserPrompt from '../components/NoUserPrompt';

export default function TestFinalReport() {
  // 用户认证状态
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

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
  const [prompts, setPrompts] = useState({
    1: "How to maintain a long-term healthy relationship" // 默认问题1的内容
  });
  const [expandedQuestions, setExpandedQuestions] = useState({
    1: true // 默认展开第一个问题
  });
  const [promptErrors, setPromptErrors] = useState({}); // 每个输入框的错误状态
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(1); // 动态问题数量，默认1个
  const [apiError, setApiError] = useState(null); // API测试区域错误显示

  // 验证prompts连续性和完整性 - 新规则：所有问题都必须有内容
  const validatePrompts = () => {
    // 清除之前的错误
    setApiError(null);
    
    // 检查从1到totalQuestions的每个问题都必须有内容
    const emptyQuestions = [];
    const newErrors = {};
    
    for (let i = 1; i <= totalQuestions; i++) {
      const promptContent = prompts[i];
      if (!promptContent || promptContent.trim() === '') {
        emptyQuestions.push(i);
        newErrors[i] = '请输入内容或删除这个prompt';
      } else {
        newErrors[i] = null; // 清除错误
      }
    }
    
    setPromptErrors(newErrors);
    
    if (emptyQuestions.length > 0) {
      return `所有问题都必须填写内容`;
    }
    
    return null; // 验证通过
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setApiError(null);
    setWorkflowState('idle');
    stopPolling(); // 停止所有轮询

    try {
      // 生成一个测试sessionId
      const testSessionId = `test-${Date.now()}`;
      setCurrentSessionId(testSessionId);
      
      console.log('🔄 Testing Final Report API...');
      console.log('📋 Session ID:', testSessionId);
      console.log('📊 Total Questions:', totalQuestions);

      // 获取当前会话信息用于认证
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session for generating report');
      }

      const response = await axios.post('/api/generate-Finalreport', {
        sessionId: testSessionId,
        totalQuestions: totalQuestions
      }, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
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
      
      // 同时设置apiError以在API Testing区域显示
      setApiError(displayMessage);
      
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
    console.log(`📝 Updating prompt ${questionNumber} with value:`, value);
    setPrompts(prev => {
      const updated = {
        ...prev,
        [questionNumber]: value
      };
      console.log('📋 Updated prompts state:', updated);
      return updated;
    });
    
    // 清除该输入框的错误状态（如果用户开始输入内容）
    if (value && value.trim() !== '') {
      setPromptErrors(prev => ({
        ...prev,
        [questionNumber]: null
      }));
    }
  };

  const cleanAllPrompts = async () => {
    // 清空当前页面状态
    setPrompts({});
    setExpandedQuestions({});
    
    try {
      console.log('🔄 Clearing all prompts from generate-Finalreport.js...');
      
      // 获取当前会话信息用于认证
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session for clearing prompts');
      }

      // 调用API清空文件中的prompts
      const response = await axios.post('/api/clear-prompts', {}, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        timeout: 10000
      });

      console.log('✅ Clear response:', response.data);
      // 成功时不显示弹窗，静默清空
      
    } catch (error) {
      console.error('Error clearing prompts:', error);
      alert(`Failed to clear prompts from database: ${error.response?.data?.error || error.message}`);
    }
  };

  // 动态管理问题数量
  const addQuestion = () => {
    setTotalQuestions(prev => {
      const newQuestionNumber = prev + 1;
      // 为新问题添加空内容
      setPrompts(prevPrompts => ({
        ...prevPrompts,
        [newQuestionNumber]: ''
      }));
      // 展开新问题
      setExpandedQuestions(prevExpanded => ({
        ...prevExpanded,
        [newQuestionNumber]: true
      }));
      return newQuestionNumber;
    });
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
      
      // 删除错误状态
      const newErrors = { ...promptErrors };
      delete newErrors[totalQuestions];
      setPromptErrors(newErrors);
      
      setTotalQuestions(prev => prev - 1);
    }
  };

  // 加载文件中的prompts
  const loadPromptsFromFile = async () => {
    setIsLoadingPrompts(true);
    try {
      console.log('🔄 Loading prompts from generate-Finalreport.js...');
      
      // 获取当前会话信息用于认证
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session for loading prompts');
      }

      const response = await axios.get('/api/get-prompts', {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('✅ Loaded prompts:', response.data.prompts);
      
      // 如果数据库中有数据，使用数据库的；否则保持默认值
      if (response.data.prompts && Object.keys(response.data.prompts).length > 0) {
        // 检查是否有实际内容（不是全部空字符串）
        const hasContent = Object.values(response.data.prompts).some(content => content && content.trim() !== '');
        
        if (hasContent) {
          setPrompts(response.data.prompts);
          
          // 从加载的数据中获取问题总数
          if (response.data.totalQuestions) {
            setTotalQuestions(response.data.totalQuestions);
          }
        } else {
          // 数据库中都是空的，保持默认值
          console.log('Database contains empty prompts, keeping defaults');
        }
      } else {
        console.log('No prompts in database, keeping defaults');
      }
      
      // 自动展开有内容的questions
      if (response.data.prompts && Object.keys(response.data.prompts).length > 0) {
        const questionsWithContent = Object.keys(response.data.prompts).filter(
          key => response.data.prompts[key] && response.data.prompts[key].trim() !== ''
        );
        
        if (questionsWithContent.length > 0) {
          const expandedState = {};
          questionsWithContent.forEach(key => {
            expandedState[key] = true;
          });
          setExpandedQuestions(expandedState);
        }
      }
      
    } catch (error) {
      console.error('Error loading prompts:', error);
      alert(`Failed to load prompts from database: ${error.response?.data?.error || error.message}`);
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
      // 获取当前会话信息用于认证
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!silent) console.error('No active session for loading workflow progress');
        return;
      }

      const response = await axios.get(`/api/get-workflow-progress?sessionId=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
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
      // 获取当前会话信息用于认证
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!silent) console.error('No active session for loading session history');
        return;
      }

      const response = await axios.get('/api/get-session-history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
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
      // 获取当前会话信息用于认证
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session for checking workflow state');
        return false;
      }

      const response = await axios.get('/api/get-session-history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
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

  // 用户认证检查
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setAuthError('认证检查失败');
          return;
        }

        if (!session) {
          setAuthError('请先登录访问此页面');
          return;
        }

        setUser(session.user);
        setAuthError(null);
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthError('认证检查出错');
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setAuthError('会话已过期，请重新登录');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user);
        setAuthError(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // 页面加载时自动获取prompts、历史和恢复workflow状态
  useEffect(() => {
    // 只有用户认证成功后才初始化页面
    if (!user || isAuthLoading) return;

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
  }, [user, isAuthLoading]); // 依赖用户状态
  
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
    console.log('🚀 Save button clicked');
    console.log('📋 Current prompts state:', prompts);
    console.log('📊 Total questions:', totalQuestions);
    console.log('👤 Current user:', user);
    
    // Save函数调用日志

    if (Object.keys(prompts).length === 0) {
      alert('没有prompts需要保存');
      console.log('❌ No prompts to save - prompts object is empty');
      return;
    }

    // 验证问题连续性和完整性
    console.log('🔍 Starting validation...');
    const validationError = validatePrompts();
    if (validationError) {
      console.log('❌ Validation failed:', validationError);
      setApiError(validationError);
      alert('验证失败: ' + validationError);
      return;
    }
    console.log('✅ Validation passed');

    setIsSaving(true);
    try {
      console.log('💾 Starting save process...');
      console.log('📝 Prompts to save:', prompts);
      console.log('📊 Total questions to save:', totalQuestions);
      
      // 获取当前会话信息用于认证
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error('Session error: ' + sessionError.message);
      }
      if (!session) {
        throw new Error('No active session for saving prompts');
      }
      
      console.log('🔑 Session found, access token:', session.access_token ? 'Present' : 'Missing');

      console.log('📡 Making API request to /api/save-prompts...');
      const requestPayload = {
        prompts: prompts,
        totalQuestions: totalQuestions
      };
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };
      
      console.log('📦 Request payload:', requestPayload);
      console.log('🔑 Request headers:', { ...requestHeaders, Authorization: 'Bearer [REDACTED]' });

      const response = await axios.post('/api/save-prompts', requestPayload, {
        headers: requestHeaders,
        timeout: 10000
      });
      
      console.log('🎉 API request successful!');

      console.log('✅ Save response:', response.data);
      // 成功保存提示
      setApiError(null);
      
      // 显示成功提示
      const successMsg = `✅ 保存成功！更新了 ${response.data.updatedQuestions?.length || Object.keys(prompts).filter(k => prompts[k]?.trim()).length} 个prompts`;
      console.log(successMsg);
      
      // 可选：显示短暂的成功提示
      alert(successMsg);
      
    } catch (error) {
      console.error('Error saving prompts:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = 'Failed to save prompts to database';
      
      if (error.response?.status === 401) {
        errorMessage = '认证失败，请重新登录';
      } else if (error.response?.status === 500) {
        errorMessage = '服务器错误：' + (error.response?.data?.error || error.message);
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else {
        errorMessage = error.message;
      }
      
      alert(`保存失败: ${errorMessage}`);
      setApiError(`保存失败: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 认证加载中
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">检查用户认证状态...</p>
        </div>
      </div>
    );
  }

  // 认证失败
  if (authError || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">访问受限</h2>
            <p className="text-red-600 mb-4">{authError || '需要登录才能访问此页面'}</p>
            <button
              onClick={() => window.location.href = '/auth'}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              前往登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
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
        <div className="border border-black bg-white p-8 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-medium text-black mb-2">
              Test Final Report API
            </h1>
            <div className="text-sm text-gray-600">
              <span>用户: </span>
              <span className="font-medium">{user?.email || 'Unknown User'}</span>
              <span className="mx-2">|</span>
              <span>ID: </span>
              <span className="font-mono text-xs">{user?.id?.slice(0, 8) || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Prompt Editor - 整合模块 */}
        <div className="bg-white border border-black p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-medium text-black">Prompt Editor</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: AI Suggestions */}
            <div>
              <NoUserPrompt />
            </div>
            
            {/* Right: Manual Prompts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-black">Manual Prompts</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={loadPromptsFromFile}
                    disabled={isLoadingPrompts}
                    className={`w-16 h-8 border border-black font-medium text-xs transition-all duration-200 ${
                      isLoadingPrompts
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {isLoadingPrompts ? 'Loading...' : 'Reload'}
                  </button>
                  <button
                    onClick={savePrompts}
                    disabled={isSaving}
                    className={`w-16 h-8 border border-black font-medium text-xs transition-all duration-200 ${
                      isSaving
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cleanAllPrompts}
                    className="w-16 h-8 border border-black font-medium text-xs bg-white text-black hover:bg-gray-100 transition-all duration-200"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              {/* 问题数量管理 */}
              <div className="mb-4 p-3 bg-white border border-black">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black">Total Questions: {totalQuestions}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={removeQuestion}
                      disabled={totalQuestions <= 1}
                      className={`w-8 h-8 border border-black font-medium text-sm transition-all duration-200 ${
                        totalQuestions <= 1
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-gray-100'
                      }`}
                      title="Remove last question"
                    >
                      −
                    </button>
                    <button
                      onClick={addQuestion}
                      className="w-8 h-8 border border-black font-medium text-sm bg-white text-black hover:bg-gray-100 transition-all duration-200"
                      title="Add new question"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 问题编辑区域 */}
              <div>
                {Array.from({length: totalQuestions}, (_, index) => {
                  const questionNumber = index + 1;
                  return (
                    <div key={questionNumber} className="mb-4 bg-white border border-black">
                      <button
                        onClick={() => toggleQuestion(questionNumber)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-black">Question {questionNumber}</span>
                          {prompts[questionNumber] && prompts[questionNumber].trim() !== '' && (
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          )}
                        </div>
                        <span className="text-black">
                          {expandedQuestions[questionNumber] ? '−' : '+'}
                        </span>
                      </button>
                      
                      {expandedQuestions[questionNumber] && (
                        <div className="px-4 pb-4">
                          <textarea
                            value={prompts[questionNumber] || ''}
                            onChange={(e) => updatePrompt(questionNumber, e.target.value)}
                            placeholder={`Enter prompt for question ${questionNumber}...`}
                            className={`w-full h-32 px-3 py-2 border bg-white focus:outline-none resize-none ${
                              promptErrors[questionNumber] ? 'border-red-500' : 'border-black'
                            }`}
                          />
                          {promptErrors[questionNumber] && (
                            <div className="mt-1 text-xs text-red-500">
                              {promptErrors[questionNumber]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* API测试和Workflow状态 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* API Testing */}
          <div className="bg-white border border-black p-6">
            <h2 className="text-xl font-medium text-black mb-4">API Testing</h2>
            
            <button
              onClick={handleGenerateReport}
              disabled={isLoading || workflowState === 'processing' || workflowState === 'starting'}
              className={`w-full py-3 px-4 border border-black font-medium transition-colors ${
                isLoading || workflowState === 'processing' || workflowState === 'starting'
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
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

            {apiError && (
              <div className="bg-white border border-black p-4 mt-4">
                <h3 className="text-black font-medium mb-2">Validation Error</h3>
                <p className="text-black">{apiError}</p>
              </div>
            )}

            {error && (
              <div className="bg-white border border-black p-4 mt-4">
                <h3 className="text-black font-medium mb-2">Error</h3>
                <p className="text-black text-sm">{error.message}</p>
                {error.details && (
                  <div className="mt-2 p-2 bg-gray-100 border border-black text-xs">
                    <p className="font-medium">Details:</p>
                    <pre className="text-black overflow-x-auto">{JSON.stringify(error.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="bg-white border border-black p-4 mt-4">
                <h3 className="text-black font-medium mb-2">Webhook Response Success</h3>
                <p className="text-black text-sm">SessionId: {result.sessionId}</p>
                <p className="text-black text-sm">Status: {result.status}</p>
                <p className="text-black text-xs mt-2">→ Workflow is now being monitored automatically</p>
              </div>
            )}
          </div>
          
          {/* Workflow Status */}
          <div className="bg-white border border-black p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-black">Workflow Status</h3>
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
        <div className="bg-white border border-black p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-black">Session History</h3>
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
                <div key={index} className="border border-black bg-white p-3 hover:bg-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-black truncate">
                      {session.session_id}
                    </span>
                    <span className={`px-2 py-1 border border-black text-xs font-medium ${
                      session.status === 'completed' ? 'bg-white text-black' :
                      session.status === 'processing' ? 'bg-black text-white' :
                      session.status === 'error' ? 'bg-gray-100 text-black' :
                      'bg-white text-black'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="text-xs text-black space-y-1">
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
                    className="mt-2 w-full px-2 py-1 bg-black border border-black text-white text-xs hover:bg-gray-800"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-black">
              <p className="text-sm">No session history found</p>
            </div>
          )}
        </div>
        
        {/* 报告浏览区域 */}
        <div className="bg-white border border-black p-6 mb-8" style={{display: 'none'}}>
          <h2 className="text-xl font-medium text-black mb-4">Report Browser</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                SessionId
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter SessionId"
                className="w-full px-3 py-2 border border-black bg-white focus:outline-none"
              />
            </div>
            
            <button
              onClick={handleLoadReports}
              disabled={isLoadingReports || !sessionId.trim()}
              className={`w-full py-2 px-4 border border-black font-medium transition-colors ${
                isLoadingReports || !sessionId.trim()
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
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
              <div className="bg-white border border-black p-3">
                <p className="text-black text-sm">{reportsError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* 报告显示区域 */}
          <div className="bg-white border border-black p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-black">Report Content</h2>
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
                <div className="border border-black bg-white min-h-[600px] max-h-[800px] overflow-hidden">
                  <iframe
                    src={`/test-finalreport/${sessionId}`}
                    className="w-full h-[800px] border-0"
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