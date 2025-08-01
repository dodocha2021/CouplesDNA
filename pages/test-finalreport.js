import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';

export default function TestFinalReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('idle'); // 'idle', 'loading', 'completed', 'error'
  const [lastSessionId, setLastSessionId] = useState('');
  
  // 新增状态
  const [sessionId, setSessionId] = useState('');
  const [reports, setReports] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  
  // Prompt管理状态
  const [prompts, setPrompts] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setApiStatus('loading');

    try {
      // 生成一个测试sessionId
      const testSessionId = `test-${Date.now()}`;
      setLastSessionId(testSessionId);
      
      console.log('🔄 Testing Final Report API...');
      console.log('📋 Session ID:', testSessionId);

      const response = await axios.post('/api/generate-Finalreport', {
        sessionId: testSessionId
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000 // 5分钟超时
      });

      console.log('✅ API Response:', response.data);
      setResult(response.data);
      setApiStatus('completed');

    } catch (err) {
      console.error('❌ API Error:', err);
      setError({
        message: err.response?.data?.error || err.message,
        status: err.response?.status,
        details: err.response?.data
      });
      setApiStatus('error');
    } finally {
      setIsLoading(false);
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
      const message = report.message;
      
      // 只显示AI类型的消息
      if (message && message.type === 'ai') {
        return message.content || 'No content';
      } else {
        return 'Non-AI message';
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

  const cleanAllPrompts = () => {
    setPrompts({});
    setExpandedQuestions({});
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

  // 页面加载时自动获取prompts
  useEffect(() => {
    loadPromptsFromFile();
  }, []);

  const savePrompts = async () => {
    if (Object.keys(prompts).length === 0) {
      alert('No prompts to save');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Saving prompts:', prompts);
      
      const response = await axios.post('/api/save-prompts', {
        prompts: prompts
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
        
        {/* API测试和报告浏览区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">API Testing</h2>
            
                          <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isLoading
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
                <h3 className="text-green-800 font-medium mb-2">Success</h3>
                <p className="text-green-700 text-sm">SessionId: {result.sessionId}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
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
        </div>

        {/* API信息 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800 font-medium">API Information</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Status:</span>
              <div className={`w-3 h-3 rounded-full ${
                apiStatus === 'idle' ? 'bg-green-500' :
                apiStatus === 'loading' ? 'bg-red-500 animate-pulse' :
                apiStatus === 'completed' ? 'bg-green-500' :
                'bg-red-500'
              }`}></div>
              <span className={`text-sm font-medium ${
                apiStatus === 'idle' ? 'text-green-600' :
                apiStatus === 'loading' ? 'text-red-600' :
                apiStatus === 'completed' ? 'text-green-600' :
                'text-red-600'
              }`}>
                {apiStatus === 'idle' ? 'Idle' :
                 apiStatus === 'loading' ? 'Processing...' :
                 apiStatus === 'completed' ? 'Completed' :
                 'Error'}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-medium">Endpoint:</span> POST /api/generate-Finalreport</p>
            <p><span className="font-medium">Webhook:</span> 81134b04-e2f5-4661-ae0b-6d6ef6d83123</p>
            <p><span className="font-medium">Function:</span> Generate final report (40 questions)</p>
            <p><span className="font-medium">Timeout:</span> 5 minutes</p>
            <p><span className="font-medium">Last SessionId:</span> {lastSessionId || 'None'}</p>
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
            
            <div className="space-y-2 max-h-[800px] overflow-y-auto">
              {Array.from({ length: 40 }, (_, i) => i + 1).map((questionNumber) => (
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Content</h2>
            
            {reports.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Please enter SessionId and load reports</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 翻页控制 */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={goToPrevious}
                    disabled={currentQuestionIndex === 0}
                    className={`px-3 py-1 rounded ${
                      currentQuestionIndex === 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    ← Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentQuestionIndex + 1} / {reports.length}
                  </span>
                  
                  <button
                    onClick={goToNext}
                    disabled={currentQuestionIndex === reports.length - 1}
                    className={`px-3 py-1 rounded ${
                      currentQuestionIndex === reports.length - 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Next →
                  </button>
                </div>

                {/* 报告内容 */}
                <div className="border border-gray-200 rounded-lg p-6 min-h-[600px] max-h-[800px] overflow-y-auto bg-white resize">
                  <div className="prose prose-lg max-w-none">
                    {getCurrentReportContent() ? (
                      <div className="markdown-content">
                        <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-6" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-medium text-gray-700 mb-2 mt-4" {...props} />,
                            p: ({node, ...props}) => <p className="text-gray-700 leading-relaxed mb-3" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-gray-800" {...props} />,
                            em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                            code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800" {...props} />,
                            pre: ({node, ...props}) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto text-sm font-mono text-gray-800 mb-3" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 mb-3" {...props} />
                          }}
                        >
                          {getCurrentReportContent()}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-8">
                        No content to display
                      </div>
                    )}
                  </div>
                </div>

                {/* 键盘提示 */}
                <div className="text-xs text-gray-500 text-center">
                  Use ← → arrow keys or click buttons to navigate
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 