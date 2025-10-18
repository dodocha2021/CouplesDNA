import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getAllModels } from '@/lib/ai/config';
import ReactMarkdown from 'react-markdown';
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { usePromptConfig } from '@/hooks/usePromptConfig';

const TreeItem = ({ children, ...props }) => {
  const { label, id, isSelected, onSelect, isBranch, initiallyOpen = false, level, threshold, onThresholdChange, disabled } = props;
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const Icon = isBranch ? (isOpen ? ChevronDown : ChevronRight) : null;

  return (
    <div>
      <div className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded ${level > 0 ? 'ml-4' : ''}`}>
        {Icon && (
          <button onClick={() => setIsOpen(!isOpen)} className="mr-2">
            <Icon className="h-4 w-4" />
          </button>
        )}
        <Checkbox 
          id={id} 
          checked={isSelected} 
          onCheckedChange={onSelect}
          className="mr-2"
          disabled={disabled}
        />
        <label htmlFor={id} className={`text-sm flex-1 cursor-pointer ${disabled ? 'text-gray-400' : ''}`}>
          {label}
        </label>
      </div>
      
      {isBranch && threshold !== undefined && (
        <div className="flex items-center gap-3 py-1 px-2 ml-10 mb-1">
          <span className="text-xs text-gray-500 w-16">Threshold:</span>
          <Slider
            value={[threshold]}
            onValueChange={([value]) => onThresholdChange(value)}
            min={0}
            max={1}
            step={0.05}
            className="flex-1"
          />
          <span className="text-xs font-mono w-12 text-right">{threshold.toFixed(2)}</span>
        </div>
      )}

      {isBranch && isOpen && children}
    </div>
  );
};

export default function ReportGenerationTab({ loadedConfig, onConfigLoaded, onSaveSuccess }) {
  const {
    modelSelection, setModelSelection,
    knowledgeBaseId, setKnowledgeBaseId,
    knowledgeBaseName, setKnowledgeBaseName,
    selectedKnowledgeIds, setSelectedKnowledgeIds,
    topK, setTopK,
    strictMode, setStrictMode,
    systemPrompt, setSystemPrompt,
    userPromptTemplate, setUserPromptTemplate,
    userDataId, setUserDataId,
    userDataName, setUserDataName,
    reportTopic, setReportTopic,
    generatedReport, setGeneratedReport,
    generateSlides, setGenerateSlides,
    debugLogs, setDebugLogs,
    handleSaveConfig,
    handleResetToDefault,
    saveLoading,
  } = usePromptConfig({
    loadedConfig,
    onSaveSuccess,
    promptType: 'report'
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [categoryThresholds, setCategoryThresholds] = useState({});
  
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [selectedUserFileIds, setSelectedUserFileIds] = useState([]);
  const [userDataTopK, setUserDataTopK] = useState(5);

  const [slides, setSlides] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
const [slideLogs, setSlideLogs] = useState([]);
const [taskId, setTaskId] = useState(null);
const [manusShareUrl, setManusShareUrl] = useState(null);

  const supabase = useSupabaseClient();

  const models = getAllModels();
  const modelsByProvider = models.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  useEffect(() => {
    const fetchData = async () => {
      const { data: knowledgeData } = await supabase
        .from('knowledge_uploads')
        .select('*')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });
      
      if (knowledgeData) setKnowledgeItems(knowledgeData);
      
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, email');
      
      if (userData) setUsers(userData);
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setUserFiles([]);
      return;
    }
    
    const fetchUserFiles = async () => {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user files:', error);
        return;
      }
      
      if (data) {
        setUserFiles(data);
      }
    };
    
    fetchUserFiles();
  }, [selectedUserId]);

  useEffect(() => {
    if (knowledgeBaseId && knowledgeItems.length > 0) {
      const file = knowledgeItems.find(item => item.id === knowledgeBaseId);
      if (file && !knowledgeBaseName) {
        setKnowledgeBaseName(file.file_name);
      }
    }
  }, [knowledgeBaseId, knowledgeItems, knowledgeBaseName, setKnowledgeBaseName]);

  useEffect(() => {
    if (userDataId && userFiles.length > 0) {
      const file = userFiles.find(item => item.id === userDataId);
      if (file && !userDataName) {
        setUserDataName(file.file_name);
      }
    }
  }, [userDataId, userFiles, userDataName, setUserDataName]);

  useEffect(() => {
    if (loadedConfig && loadedConfig.prompt_type === 'report') {
      if (loadedConfig.user_data_id) {
        const userId = userFiles.find(f => f.id === loadedConfig.user_data_id)?.user_id;
        if (userId) {
          setSelectedUserId(userId);
        }
      }
      
      if (loadedConfig.generate_slides) {
        try {
          const slidesData = JSON.parse(loadedConfig.generate_slides);
          setSlides(slidesData);
        } catch (e) {
          console.error('Failed to parse slides:', e);
        }
      }

      if (onConfigLoaded) {
        onConfigLoaded();
      }
    }
  }, [loadedConfig, onConfigLoaded, userFiles]);

  const knowledgeTree = useMemo(() => {
    const tree = {};
    knowledgeItems.forEach(item => {
      const category = item.metadata?.category || 'General';
      if (!tree[category]) {
        tree[category] = { files: [], itemIds: [] };
      }
      tree[category].files.push(item);
      tree[category].itemIds.push(item.id);
    });
    return tree;
  }, [knowledgeItems]);

  const handleSelectFile = (fileId, isSelected) => {
    if (isSelected) {
      setSelectedKnowledgeIds(prev => [...prev, fileId]);
    } else {
      setSelectedKnowledgeIds(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleSelectCategory = (itemIds, isSelected) => {
    if (isSelected) {
      setSelectedKnowledgeIds(prev => [...new Set([...prev, ...itemIds])]);
    } else {
      setSelectedKnowledgeIds(prev => prev.filter(id => !itemIds.includes(id)));
    }
  };

  const handleSelectUserFile = (fileId, isSelected) => {
    if (isSelected) {
      setSelectedUserFileIds(prev => [...prev, fileId]);
    } else {
      setSelectedUserFileIds(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleThresholdChange = (category, value) => {
    setCategoryThresholds(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleGenerateReport = async () => {
    if (!reportTopic.trim()) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Please enter a report topic." 
      });
      return;
    }

    setIsLoading(true);
    setGeneratedReport('');
    setDebugLogs('');
    setSlides(null);

    try {
      let finalSystemPrompt = systemPrompt;
      if (strictMode) {
        finalSystemPrompt += "\n\nIf CONTEXT is empty, say 'I could not find an answer in the provided knowledge base.'";
      }

      let scope = [];
      selectedKnowledgeIds.forEach(fileId => {
        const item = knowledgeItems.find(k => k.id === fileId);
        const category = item?.metadata?.category || 'General';
        scope.push({
          file_id: fileId,
          threshold: categoryThresholds[category] || 0.30
        });
      });

      const reportConfig = {
        userData: {
          selectedUserId: selectedUserId,
          selectedFileIds: selectedUserFileIds,
          topK: userDataTopK
        },
        knowledge: {
          topK: topK
        }
      };

      const res = await fetch('/api/run-rag-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'report',
          model: modelSelection,
          systemPrompt: finalSystemPrompt,
          userPromptTemplate: userPromptTemplate,
          question: reportTopic,
          strictMode: strictMode,
          reportConfig: reportConfig,
          scope: scope,
          knowledgeTopK: topK
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'API request failed');
      }

      const data = await res.json();
      setGeneratedReport(data.response || '');
      setDebugLogs(data.debugLogs || '');
      
      // 设置 knowledgeBaseId 和 userDataId 为第一个选中的文件（用于保存）
      if (selectedKnowledgeIds.length > 0) {
        setKnowledgeBaseId(selectedKnowledgeIds[0]);
        const firstFile = knowledgeItems.find(k => k.id === selectedKnowledgeIds[0]);
        if (firstFile) {
          setKnowledgeBaseName(firstFile.file_name);
        }
      }
      
      if (selectedUserFileIds.length > 0) {
        setUserDataId(selectedUserFileIds[0]);
        const firstUserFile = userFiles.find(f => f.id === selectedUserFileIds[0]);
        if (firstUserFile) {
          setUserDataName(firstUserFile.file_name);
        }
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Report Generation Error", 
        description: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSlides = async () => {
    if (!generatedReport) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please generate a report first"
      });
      return;
    }

    setIsGeneratingSlides(true);
    setSlideLogs([]);
    setSlides(null);
    setTaskId(null);
    setManusShareUrl(null);

    try {
      // Step 1: Create task
      setSlideLogs(prev => [...prev, '📤 Creating Manus task...']);
      
      const createRes = await fetch('/api/create-slide-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportContent: generatedReport,
          reportTopic: reportTopic
        })
      });

      if (!createRes.ok) {
        throw new Error('Failed to create task');
      }

      const createData = await createRes.json();
      const newTaskId = createData.task_id;
      const shareUrl = createData.share_url;


      if (!newTaskId) {
        throw new Error('No task ID returned');
      }

      setTaskId(newTaskId);
      setManusShareUrl(shareUrl);
      setSlideLogs(prev => [...prev, `✅ Task created: ${newTaskId}`]);
      if (shareUrl) {
        setSlideLogs(prev => [...prev, `🔗 Share URL: ${shareUrl}`]);
      }

      // Step 2: Poll for completion
      pollSlideTask(newTaskId);

    } catch (error) {
      setSlideLogs(prev => [...prev, `❌ Error: ${error.message}`]);
      toast({
        variant: "destructive",
        title: "Slide Generation Error",
        description: error.message
      });
      setIsGeneratingSlides(false);
    }
  };

const pollSlideTask = async (taskId) => {
  const maxAttempts = 60; // 最多轮询60次（5分钟）
  let attempts = 0;

  const poll = async () => {
    attempts++;
    
    try {
      const checkRes = await fetch('/api/check-slide-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      const checkData = await checkRes.json();
      
      if (checkData.log) {
        setSlideLogs(prev => [...prev, checkData.log]);
      }

      if (checkData.status === 'completed' && checkData.slides) {
        setSlides(checkData.slides.files || checkData.slides);
        setGenerateSlides(JSON.stringify(checkData.slides.files || checkData.slides));
        setCurrentSlideIndex(0);
        setIsGeneratingSlides(false);
        
        toast({
          title: "Success",
          description: "Slides generated successfully"
        });
        return;
      }

      if (checkData.status === 'failed' || checkData.error) {
        throw new Error(checkData.error || 'Task failed');
      }

      // Continue polling if not completed and haven't exceeded max attempts
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      } else {
        throw new Error('Task timeout: exceeded maximum polling time');
      }

    } catch (error) {
      setSlideLogs(prev => [...prev, `❌ Error: ${error.message}`]);
      setIsGeneratingSlides(false);
      toast({
        variant: "destructive",
        title: "Slide Generation Error",
        description: error.message
      });
    }
  };

  poll();
};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Model Selection</CardTitle>
          <CardDescription>Choose the AI model to use</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={modelSelection} onValueChange={setModelSelection}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(modelsByProvider).map(([provider, models]) => (
                <SelectGroup key={provider}>
                  <SelectLabel>{provider}</SelectLabel>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <span>{m.name}</span>
                        <Badge variant="outline" className="text-xs">
                          ${m.pricing.prompt}/1K
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Selection</CardTitle>
          <CardDescription>
            Select knowledge sources ({selectedKnowledgeIds.length} selected)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="border rounded-md p-2 h-64">
            {Object.entries(knowledgeTree).map(([category, { files, itemIds }]) => (
              <TreeItem
                key={category}
                label={`${category} (${files.length})`}
                id={category}
                isBranch
                initiallyOpen={true}
                level={0}
                isSelected={itemIds.every(id => selectedKnowledgeIds.includes(id))}
                onSelect={(checked) => handleSelectCategory(itemIds, checked)}
                threshold={categoryThresholds[category] || 0.30}
                onThresholdChange={(value) => handleThresholdChange(category, value)}
              >
                {files.map(file => (
                  <TreeItem
                    key={file.id}
                    label={`${file.file_name} · ${(file.file_size / 1024).toFixed(1)}KB`}
                    id={file.id}
                    level={1}
                    isSelected={selectedKnowledgeIds.includes(file.id)}
                    onSelect={(checked) => handleSelectFile(file.id, checked)}
                  />
                ))}
              </TreeItem>
            ))}
          </ScrollArea>
          
          <div className="mt-4">
            <Label>Top K Results</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Data Selection</CardTitle>
          <CardDescription>Select user and their uploaded data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select User</Label>
            <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUserId && (
            <>
              <div>
                <Label>User Files ({selectedUserFileIds.length} selected)</Label>
                <ScrollArea className="border rounded-md p-2 h-32 mt-2">
                  {userFiles.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">No files uploaded by this user</p>
                  ) : (
                    userFiles.map(file => (
                      <div key={file.id} className="flex items-center py-1 px-2 hover:bg-gray-100 rounded">
                        <Checkbox
                          checked={selectedUserFileIds.includes(file.id)}
                          onCheckedChange={(checked) => handleSelectUserFile(file.id, checked)}
                          className="mr-2"
                        />
                        <label className="text-sm flex-1 cursor-pointer">
                          {file.file_name} · {(file.file_size / 1024).toFixed(1)}KB
                        </label>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>

              <div>
                <Label>User Data Top K</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={userDataTopK}
                  onChange={(e) => setUserDataTopK(parseInt(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompt & Behavior</CardTitle>
              <CardDescription>
                Design prompts for report generation
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="strict-mode-report" className="text-sm font-medium">
                Strict Mode
              </Label>
              <Switch 
                id="strict-mode-report" 
                checked={strictMode} 
                onCheckedChange={setStrictMode} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              System Prompt
            </Label>
            <Textarea 
              value={systemPrompt} 
              onChange={(e) => setSystemPrompt(e.target.value)} 
              rows={6} 
              className="font-mono"
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              User Prompt Template
            </Label>
            <Textarea 
              value={userPromptTemplate} 
              onChange={(e) => setUserPromptTemplate(e.target.value)} 
              rows={12} 
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available placeholders: {'{context}'} (knowledge), {'{userdata}'}, {'{question}'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Topic</CardTitle>
          <CardDescription>Enter the topic for report generation</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={reportTopic}
            onChange={(e) => setReportTopic(e.target.value)}
            placeholder="e.g., Relationship Communication Analysis"
            className="text-base"
          />
        </CardContent>
      </Card>

      <Button 
        onClick={handleGenerateReport} 
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Generating...' : 'Generate Report'}
      </Button>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Generated Report</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="prose dark:prose-invert max-w-none p-4 border rounded-md min-h-[20rem] bg-gray-50/50">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <p>Generating...</p>
                </div>
              )}
              {!isLoading && !generatedReport && (
                <p className="text-gray-500">Report will appear here.</p>
              )}
              {!isLoading && generatedReport && (
                <ReactMarkdown>{generatedReport}</ReactMarkdown>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs border rounded-md min-h-[20rem] max-h-[40rem] overflow-auto bg-gray-900 text-green-400 p-4">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <p>Processing...</p>
                </div>
              )}
              {!isLoading && !debugLogs && (
                <p>Debug information will appear here.</p>
              )}
              {!isLoading && debugLogs && (
                <pre className="whitespace-pre-wrap">{debugLogs}</pre>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Slides Module */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Slide Generation</CardTitle>
            <Button
              onClick={handleGenerateSlides}
              disabled={!generatedReport || isGeneratingSlides}
              size="sm"
            >
              {isGeneratingSlides ? 'Generating...' : 'Generate Slides'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isGeneratingSlides && !slides && (
            <p className="text-gray-500 text-sm">Click "Generate Slides" to create a presentation</p>
          )}
          
          {isGeneratingSlides && (
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
          disabled={saveLoading}
          className="px-6 py-2"
        >
          {saveLoading ? 'Saving...' : 'Save Current Configuration'}
        </Button>
        <Button
          onClick={() => handleResetToDefault()}
          variant="outline"
          className="px-6 py-2"
        >
          Reset to Default
        </Button>
      </div>
    </div>
  );
}