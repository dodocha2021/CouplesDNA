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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

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
      
      {isBranch && isOpen && (
        <div className="ml-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default function ReportGenerationTab(props) {
  const {
    modelSelection, setModelSelection,
    knowledgeBaseId, setKnowledgeBaseId,
    knowledgeBaseName, setKnowledgeBaseName,
    topK, setTopK,
    strictMode, setStrictMode,
    systemPrompt, setSystemPrompt,
    userPromptTemplate, setUserPromptTemplate,
    debugLogs, setDebugLogs,
    userDataId, setUserDataId,
    userDataName, setUserDataName,
    reportTopic, setReportTopic,
    generatedReport, setGeneratedReport,
    generateSlides, setGenerateSlides,
    handleSaveConfig,
    handleResetToDefault,
    saveLoading,
  } = props;

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [categoryThresholds, setCategoryThresholds] = useState({});

  const [users, setUsers] = useState([]);
  const [userFiles, setUserFiles] = useState([]);
  const [userDataTopK, setUserDataTopK] = useState(5);

  const [slides, setSlides] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [manusShareUrl, setManusShareUrl] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [logs, setLogs] = useState([]);

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
    if (knowledgeBaseId && knowledgeItems.length > 0) {
      const file = knowledgeItems.find(item => item.id === knowledgeBaseId);
      if (file && !knowledgeBaseName) {
        setKnowledgeBaseName(file.file_name);
      }
    }
  }, [knowledgeBaseId, knowledgeItems, knowledgeBaseName, setKnowledgeBaseName]);
  
  useEffect(() => {
    if (userDataId && users.length > 0) {
      const user = users.find(u => u.id === userDataId);
      if (user && !userDataName) {
        setUserDataName(user.email);
      }
    }
  }, [userDataId, users, userDataName, setUserDataName]);

  useEffect(() => {
    if (!userDataId) {
      setUserFiles([]);
      return;
    }
    
    const fetchUserFiles = async () => {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('user_id', userDataId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user files:', error);
        return;
      }
      
      if (data) {
        console.log('Found user files:', data);
        setUserFiles(data);
      }
    };
    
    fetchUserFiles();
  }, [userDataId]);

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

  const handleSelectKnowledgeFile = (fileId, isSelected) => {
    if (isSelected) {
      setKnowledgeBaseId(fileId);
      const file = knowledgeItems.find(item => item.id === fileId);
      if (file) {
        setKnowledgeBaseName(file.file_name);
      }
    } else {
      if (knowledgeBaseId === fileId) {
        setKnowledgeBaseId('');
        setKnowledgeBaseName('');
      }
    }
  };

  const handleSelectUserDataFile = (fileId, isSelected) => {
    // For reports, we allow multiple user data files
  };

  const handleThresholdChange = (category, value) => {
    setCategoryThresholds(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleRunTest = async () => {
    if (!reportTopic.trim()) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Please enter a report topic." 
      });
      return;
    }

    setIsLoading(true);
    setGeneratedReport(null);
    setDebugLogs(null);

    try {
      let finalSystemPrompt = systemPrompt;
      if (strictMode) {
        finalSystemPrompt += "\n\nIf CONTEXT is empty, say 'I could not find an answer in the provided knowledge base.'";
      }

      let knowledgeScope = [];
      if (knowledgeBaseId) {
        const item = knowledgeItems.find(k => k.id === knowledgeBaseId);
        const category = item?.metadata?.category || 'General';
        knowledgeScope.push({
            file_id: knowledgeBaseId,
            threshold: categoryThresholds[category] || 0.30
        });
      }

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
          
          scope: knowledgeScope,
          knowledgeTopK: topK,
          
          reportConfig: {
            userData: {
              selectedUserId: userDataId,
              selectedFileIds: [], // Not supported for now
              topK: userDataTopK
            },
            knowledge: {
              topK: topK
            }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'API request failed');
      }

      const data = await res.json();
      setGeneratedReport(data.response);
      setDebugLogs(data.debugLogs);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Test Run Error", 
        description: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

const addLog = (message) => {
  setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
};

const handleGenerateSlides = async () => {
  setIsGeneratingSlides(true);
  setManusShareUrl(null);
  setSlides(null);
  setLogs([]);
  
  try {
    addLog('📤 Creating Manus task...');
    
    const createRes = await fetch('/api/create-slide-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportContent: generatedReport })
    });
    
    if (!createRes.ok) throw new Error('Failed to create task');
    
    const { task_id, share_url, task_title, task_url } = await createRes.json();
    setTaskId(task_id);
    setManusShareUrl(share_url);

    addLog(`✅ Task created: ${task_id}`);
    addLog(`📝 Task title: ${task_title}`);
    addLog(`🔗 Task URL: ${task_url}`);
    addLog(`🔗 Share URL: ${share_url}`);
    addLog('⏳ Polling task status...');
    
    let attempts = 0;
    const maxAttempts = 60;
    
    const checkStatus = async () => {
      addLog(`🔄 [Attempt ${attempts + 1}/${maxAttempts}] Checking status...`);
      
      const checkRes = await fetch('/api/check-slide-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task_id })
      });
      
      const data = await checkRes.json();
      
      if (data.log) addLog(data.log);
      
      if (data.status === 'completed') {
        setSlides(data.slides);
        setCurrentSlideIndex(0);
        setIsGeneratingSlides(false);
        addLog('🎉 SUCCESS! Slides are ready.');
        toast({ title: 'Success', description: 'Slides generated!' });
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 5000);
      } else {
        addLog('⏰ Task timeout after 5 minutes');
        throw new Error('Task timeout');
      }
    };
    
    checkStatus();
    
  } catch (err) {
    setIsGeneratingSlides(false);
    addLog(`💥 ERROR: ${err.message}`);
    toast({ title: 'Error', description: err.message, variant: 'destructive' });
  }
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

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>{knowledgeBaseId ? '1 selected' : '0 selected'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="border rounded-md p-2 h-64 mb-4">
              {Object.entries(knowledgeTree).map(([category, { files, itemIds }]) => (
                <TreeItem
                  key={category}
                  label={`${category} (${files.length})`}
                  id={category}
                  isBranch
                  initiallyOpen={true}
                  level={0}
                  isSelected={false}
                  onSelect={() => {}}
                  disabled={true}
                  threshold={categoryThresholds[category] || 0.30}
                  onThresholdChange={(value) => handleThresholdChange(category, value)}
                >
                  {files.map(file => (
                    <TreeItem
                      key={file.id}
                      label={`${file.file_name}`}
                      id={file.id}
                      level={1}
                      isSelected={knowledgeBaseId === file.id}
                      onSelect={(isSelected) => handleSelectKnowledgeFile(file.id, isSelected)}
                    />
                  ))}
                </TreeItem>
              ))}
            </ScrollArea>
            <Label>Top K Results</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Data</CardTitle>
            <CardDescription>Select user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select User</Label>
              <Select 
                value={userDataId || ''} 
                onValueChange={(userId) => {
                  setUserDataId(userId);
                  const user = users.find(u => u.id === userId);
                  if(user) setUserDataName(user.email);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
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

            {userDataId && (
              <>
                <div>
                  <Label>Top K Results</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={userDataTopK}
                    onChange={(e) => setUserDataTopK(parseInt(e.target.value))}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompt & Behavior</CardTitle>
              <CardDescription>
                Design prompts for report generation. The answer must be structured as a slide outline.
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
              rows={8} 
              className="font-mono"
            />
            {strictMode && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Strict Mode enabled: Will return "I could not find an answer in the provided knowledge base" if CONTEXT is empty.
              </p>
            )}
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
            placeholder="e.g., Generate a relationship analysis report"
            className="text-base"
          />
        </CardContent>
      </Card>

      <Button 
        onClick={handleRunTest} 
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Generating Report...' : 'Generate Report'}
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
                  <p>Generating report...</p>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Generate Slides</CardTitle>
          <CardDescription>Convert the generated report into presentation slides</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGenerateSlides}
            disabled={!generatedReport || isGeneratingSlides}
            className="mb-4"
          >
            {isGeneratingSlides ? 'Generating Slides...' : 'Generate Slides from Report'}
          </Button>
          
          {logs.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Generation Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="font-mono text-xs bg-gray-900 text-green-400 p-4 rounded-md overflow-auto"
                  style={{ height: '200px' }}
                >
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))}
                </div>
                {manusShareUrl && (
                  <a 
                    href={manusShareUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm mt-2 inline-block"
                  >
                    🔗 Open Manus progress in new tab
                  </a>
                )}
              </CardContent>
            </Card>
          )}
          
          {slides && (
            <div>
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                  >
                    ←
                  </Button>
                  <span className="text-sm font-medium">
                    {currentSlideIndex + 1} / {slides.files.length}
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentSlideIndex(Math.min(slides.files.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slides.files.length - 1}
                  >
                    →
                  </Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSlides(null)}>
                  Close
                </Button>
              </div>
              
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <iframe
                  srcDoc={slides.files[currentSlideIndex]?.content}
                  className="w-full"
                  style={{ height: '720px' }}
                  title="slide-preview"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 mt-6">
        <button
          onClick={() => handleSaveConfig('report')}
          disabled={saveLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saveLoading ? 'Saving...' : 'Save Current Configuration'}
        </button>
        <button
          onClick={() => handleResetToDefault('report')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}
