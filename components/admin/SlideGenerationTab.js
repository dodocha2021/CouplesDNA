import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { usePromptConfig } from '@/hooks/usePromptConfig';

export default function SlideGenerationTab({ loadedConfig, setLoadedConfig, onConfigLoaded, onSaveSuccess }) {
  const {
    modelSelection,
    knowledgeBaseId,
    knowledgeBaseName,
    selectedKnowledgeIds,
    topK,
    strictMode,
    systemPrompt,
    userPromptTemplate,
    userDataId,
    userDataName,
    reportTopic,
    generatedReport,
    testQuestion,
    generatedResponse,
    debugLogs,
    generateSlides,
    manusTaskId, setManusTaskId,
    manusShareUrl, setManusShareUrl,
    manusTaskStatus, setManusTaskStatus,
    manusPrompt, setManusPrompt,
    handleSaveConfig,
    saveLoading,
  } = usePromptConfig({
    loadedConfig,
    setLoadedConfig,
    onSaveSuccess,
    promptType: 'slide'
  });

  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [slideLogs, setSlideLogs] = useState([]);
  const [slides, setSlides] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  const [availableConfigs, setAvailableConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [reportContent, setReportContent] = useState('');

  const { toast } = useToast();
  const supabase = useSupabaseClient();

  // 加载可用的 Report/General 配置
  useEffect(() => {
    const fetchConfigs = async () => {
      const { data } = await supabase
        .from('prompt_configs')
        .select('id, prompt_type, name, report_topic, test_question, generated_report, generated_response, created_at')
        .in('prompt_type', ['general', 'report'])
        .order('created_at', { ascending: false });
      
      if (data) {
        setAvailableConfigs(data);
      }
    };
    
    fetchConfigs();
  }, [supabase]);

  // 处理加载的配置
  useEffect(() => {
    if (loadedConfig && loadedConfig.prompt_type === 'slide'&& availableConfigs.length > 0) { 
       // 恢复源配置选择
       if (loadedConfig.source_config_id) {
        setSelectedConfigId(loadedConfig.source_config_id);
      }
      
      // 加载 Slide 配置
      const content = loadedConfig.generated_report || loadedConfig.generated_response || '';
      setReportContent(content);
      
      // 加载 slides
      if (loadedConfig.generate_slides) {
        try {
          const slidesData = JSON.parse(loadedConfig.generate_slides);
          setSlides(slidesData.files || slidesData);
          setCurrentSlideIndex(0);
        } catch (e) {
          console.error('Failed to parse slides:', e);
        }
      }
      
       
    }
  }, [loadedConfig, availableConfigs, onConfigLoaded]);

  // 自动恢复轮询（如果有进行中的任务）
  useEffect(() => {
    if (loadedConfig && loadedConfig.manus_task_status === 'pending') {
      const taskAge = Date.now() - new Date(loadedConfig.manus_task_created_at || 0);
      
      if (taskAge < 30 * 60 * 1000) {
        console.log('🔄 Resuming polling for task:', loadedConfig.manus_task_id);
        
        setIsGeneratingSlides(true);
        setSlideLogs(prev => [...prev, `🔄 Resuming task monitoring for: ${loadedConfig.manus_task_id}`]);
        
        startPolling(loadedConfig.manus_task_id);
      }
    }
  }, [loadedConfig]);

  

  // 处理选择配置
  const handleSelectConfig = async (configId) => {
    setSelectedConfigId(configId);
    
    if (!configId) {
      setReportContent('');
      return;
    }
    
    const config = availableConfigs.find(c => c.id === configId);
    if (config) {
      const content = config.generated_report || config.generated_response || '';
      setReportContent(content);
    }
  };

  // 生成 Slides
  const handleGenerateSlides = async () => {
    if (!reportContent.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a configuration or enter report content"
      });
      return;
    }

    // 检查是否使用相同 prompt 重新生成
    if (loadedConfig?.prompt_type === 'slide' && 
        loadedConfig.manus_prompt === manusPrompt) {
      
      const confirmed = window.confirm(
        '⚠️ Regenerate with Same Prompt?\n\n' +
        'You have already generated slides with this prompt.\n' +
        'Generating again may produce different results (layout, colors, styles).\n' +
        'This is similar to rolling the dice again.\n\n' +
        'Create a new version?'
      );
      
      if (!confirmed) return;
    }

    setIsGeneratingSlides(true);
    setSlideLogs([]);
    setSlides(null);

    try {
      setSlideLogs(prev => [...prev, '📤 Creating Manus task...']);
      
      // 组合完整 prompt
      const fullPrompt = manusPrompt + reportContent;
      
      // 创建 Manus 任务
      const createRes = await fetch('/api/create-slide-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ // Note the change here
          reportContent: fullPrompt
        })
      });

      if (!createRes.ok) {
        throw new Error('Failed to create slide task');
      }

      const createData = await createRes.json();
      const newTaskId = createData.task_id;
      const shareUrl = createData.share_url;

      setManusTaskId(newTaskId);
      setManusShareUrl(shareUrl);
      setManusTaskStatus('pending');
      
      setSlideLogs(prev => [...prev, `✅ Task created: ${newTaskId}`]);
      if (shareUrl) {
        setSlideLogs(prev => [...prev, `🔗 Share URL: ${shareUrl}`]);
      }

      toast({
        title: "Task Created",
        description: `Slides are being generated. Task ID: ${newTaskId}`
      });

      // 立即保存到数据库
      await autoSaveSlideConfig(newTaskId, shareUrl);
      setSlideLogs(prev => [...prev, '💾 Saved slide configuration to database']);

      // 开始轮询
      startPolling(newTaskId);

    } catch (error) {
      setSlideLogs(prev => [...prev, `❌ Error: ${error.message}`]);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
      setIsGeneratingSlides(false);
    }
  };

  // 重置到默认值
  const handleResetToDefault = () => {
    setSelectedConfigId('');
    setReportContent('');
    setSlides(null);
    setSlideLogs([]);
    setCurrentSlideIndex(0);
    setIsGeneratingSlides(false);
    setManusTaskId('');
    setManusShareUrl('');
    setManusTaskStatus('');
    setManusPrompt('Create a professional presentation with slides based on this report in english: ');
    setLoadedConfig(null);
    toast({
      title: "Reset",
      description: "Slide generation settings reset to default"
    });
  };

  // 自动保存 Slide 配置
  const autoSaveSlideConfig = async (taskId, shareUrl) => {
    try {
      console.log('🔍 Debug - selectedConfigId:', selectedConfigId);  // ✅ 添加这行
      console.log('🔍 Debug - availableConfigs:', availableConfigs);  // ✅ 添加这行
   
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 获取完整的源配置信息
      let sourceConfig = null;
      if (selectedConfigId) {
        const { data } = await supabase
          .from('prompt_configs')
          .select('*')
          .eq('id', selectedConfigId)
          .single();
        
        sourceConfig = data;
      }
      
      const configData = {
        prompt_type: 'slide',
        name: sourceConfig?.report_topic || sourceConfig?.test_question || 'Untitled Slide',
        source_config_id: loadedConfig?.source_config_id || selectedConfigId || null,

        // 继承自源配置（如果有）
        model_selection: loadedConfig?.model_selection || sourceConfig?.model_selection,
        knowledge_base_id: loadedConfig?.knowledge_base_id || sourceConfig?.knowledge_base_id,
        knowledge_base_name: loadedConfig?.knowledge_base_name || sourceConfig?.knowledge_base_name,
        selected_knowledge_ids: loadedConfig?.selected_knowledge_ids || sourceConfig?.selected_knowledge_ids || [],
        top_k_results: loadedConfig?.top_k_results || sourceConfig?.top_k_results,
        strict_mode: loadedConfig?.strict_mode ?? sourceConfig?.strict_mode,
        system_prompt: loadedConfig?.system_prompt || sourceConfig?.system_prompt,
        user_prompt_template: loadedConfig?.user_prompt_template || sourceConfig?.user_prompt_template,
        user_data_id: loadedConfig?.user_data_id || sourceConfig?.user_data_id,
        user_data_name: loadedConfig?.user_data_name || sourceConfig?.user_data_name,
        report_topic: sourceConfig?.report_topic,
        generated_report: sourceConfig?.generated_report,
        test_question: sourceConfig?.test_question,
        generated_response: sourceConfig?.generated_response,
        debug_logs: loadedConfig?.debug_logs || sourceConfig?.debug_logs,
        
        // Slide 特有字段
        manus_prompt: manusPrompt,
        manus_task_id: taskId,
        manus_share_url: shareUrl,
        manus_task_status: 'pending',
        manus_task_created_at: new Date().toISOString()
      };

      const response = await fetch('/api/admin/prompt-config/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      const result = await response.json();
      if (result.success && result.data) {
        setLoadedConfig(result.data);
      }
    } catch (error) {
      console.error('Failed to auto-save slide config:', error);
    }
  };

  // 轻量级轮询
  const startPolling = (taskId) => {
    let pollCount = 0;
    const maxPolls = 180; // 30分钟
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        if (loadedConfig?.id) {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(`/api/admin/prompt-config/${loadedConfig.id}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          
          const result = await response.json();
          
          if (result.success) {
            const config = result.data;
            
            // 任务完成
            if (config.manus_task_status === 'completed') {
              clearInterval(pollInterval);
              
              if (config.generate_slides) {
                const slidesData = JSON.parse(config.generate_slides);
                setSlides(slidesData.files || slidesData);
                setCurrentSlideIndex(0);
              }
              
              setManusTaskStatus('completed');
              setIsGeneratingSlides(false);
              setSlideLogs(prev => [...prev, '✅ Slides completed!']);
              
              toast({
                title: "Success",
                description: "Slides generated successfully!"
              });
              return;
            }
            
            // 任务失败
            if (config.manus_task_status === 'failed') {
              clearInterval(pollInterval);
              setManusTaskStatus('failed');
              setIsGeneratingSlides(false);
              setSlideLogs(prev => [...prev, `❌ Failed: ${config.manus_task_error || 'Unknown error'}`]);
              
              toast({
                variant: "destructive",
                title: "Failed",
                description: config.manus_task_error || 'Task failed'
              });
              return;
            }
          }
        }
        
        // 超时
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setIsGeneratingSlides(false);
          setSlideLogs(prev => [...prev, '⏱️ Timeout']);
          toast({ variant: "destructive", title: "Timeout" });
        }
        
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 15000); // 每15秒检查一次
    
    // 组件卸载时清理
    return () => clearInterval(pollInterval);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Source Configuration</CardTitle>
          <CardDescription>
            Choose a Report or General configuration to generate slides from
          </CardDescription>
        </CardHeader>
        <CardContent>
          {console.log('🔍 loadedConfig:', loadedConfig)}
          {console.log('🔍 prompt_type:', loadedConfig?.prompt_type)}
          {console.log('🔍 Should disable?', loadedConfig?.prompt_type === 'slide')}
          
          <Select
            value={selectedConfigId}
            onValueChange={handleSelectConfig}
            disabled={loadedConfig?.prompt_type === 'slide'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a configuration" />
            </SelectTrigger>
            <SelectContent>
              {availableConfigs.map(config => {
                const typeLabel = config.prompt_type === 'general' ? 'General' : 'Report';
                const name = config.report_topic || config.test_question || config.name;
                
                return (
                  <SelectItem key={config.id} value={config.id}>
                    [{typeLabel}] {name.substring(0, 50)}{name.length > 50 ? '...' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manus Prompt Template</CardTitle>
          <CardDescription>
            Customize the prompt for slide generation (report content will be appended)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={manusPrompt}
            onChange={(e) => setManusPrompt(e.target.value)}
            rows={3}
            className="font-mono"
            placeholder="Create a professional presentation with slides based on this report in english: "
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Content</CardTitle>
          <CardDescription>
            Content preview (read-only, first 200 characters)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 border rounded-md">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {reportContent ? reportContent.substring(0, 200) + (reportContent.length > 200 ? '...' : '') : 'No content selected'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button 
        type="button"
        onClick={handleGenerateSlides} 
        disabled={isGeneratingSlides || !reportContent}
        className="w-full"
        size="lg"
      >
        {isGeneratingSlides ? 'Generating...' : 'Generate Slides'}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Slide Generation Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {!isGeneratingSlides && slideLogs.length === 0 && !slides && (
            <p className="text-gray-500 text-sm">Logs will appear here during generation</p>
          )}
          
          {(isGeneratingSlides || slideLogs.length > 0) && (
            <div className="font-mono text-xs border rounded-md min-h-[10rem] max-h-[20rem] overflow-auto bg-gray-900 text-green-400 p-4">
              {slideLogs.length === 0 ? (
                <p>Initializing...</p>
              ) : (
                slideLogs.map((log, idx) => (
                  <div key={idx} className="mb-1">{log}</div>
                ))
              )}
              {manusShareUrl && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <a 
                    href={manusShareUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View in Manus →
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {slides && slides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Slides ({currentSlideIndex + 1}/{slides.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden" style={{ minHeight: '720px' }}>
              <iframe
                srcDoc={slides[currentSlideIndex].content}
                className="w-full"
                style={{ height: '720px', border: 'none' }}
                title={`Slide ${currentSlideIndex + 1}`}
              />
            </div>
            <div className="flex justify-between mt-4">
              <Button
                onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                disabled={currentSlideIndex === 0}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Slide {currentSlideIndex + 1} of {slides.length}
              </span>
              <Button
                onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                disabled={currentSlideIndex === slides.length - 1}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 mt-6">
        <Button
          onClick={() => handleSaveConfig()}
          disabled={saveLoading || !manusTaskId || (loadedConfig && loadedConfig.manus_task_id === manusTaskId)}
          className="px-6 py-2"
        >
          {loadedConfig && loadedConfig.manus_task_id === manusTaskId
            ? '✓ Already Saved'
            : saveLoading
            ? 'Saving...'
            : 'Save Configuration'}
        </Button>
        <Button
          onClick={handleResetToDefault}
          variant="outline"
          className="px-6 py-2"
        >
          Reset to Default
        </Button>
      </div>
    </div>
  );
}
