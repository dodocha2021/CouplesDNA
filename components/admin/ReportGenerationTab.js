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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const defaultSystemPromptReport = `You are an expert assistant. Use the following CONTEXT to answer the QUESTION. The CONTEXT is composed of KNOWLEDGE and USERDATA. Do not make up information. Be concise and clear in your response.\n\nIMPORTANT: Your answer must be structured as a slide outline with clear sections and bullet points.`;

const defaultUserPromptTemplate = `CONTEXT:\n\nKNOWLEDGE:\n{context}\n\nUSERDATA:\n{userdata}\n\n---\n\nQUESTION:\n{question}`;

const TreeItem = ({ children, ...props }) => {
  const { label, id, isSelected, onSelect, isBranch, initiallyOpen = false, level, threshold, onThresholdChange } = props;
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const Icon = isBranch ? (isOpen ? ChevronDown : ChevronRight) : null;

  return (
    <div>
      {/* 第一行：展开按钮 + 复选框 + 标签 */}
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
        />
        <label htmlFor={id} className="text-sm flex-1 cursor-pointer">
          {label}
        </label>
      </div>
      
      {/* 第二行：Threshold 滑块（只在分类层级显示）*/}
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

export default function ReportGenerationTab() {
  const [model, setModel] = useState('anthropic/claude-sonnet-4.5');
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPromptReport);
  const [userPromptTemplate, setUserPromptTemplate] = useState(defaultUserPromptTemplate);
  const [strictMode, setStrictMode] = useState(true);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState([]);
  const [categoryThresholds, setCategoryThresholds] = useState({});
  const [knowledgeTopK, setKnowledgeTopK] = useState(5);

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [selectedUserFileIds, setSelectedUserFileIds] = useState([]);
  const [userDataTopK, setUserDataTopK] = useState(5);

  const [slides, setSlides] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [manusShareUrl, setManusShareUrl] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [showManusDialog, setShowManusDialog] = useState(false);


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
        console.log('Found user files:', data);
        setUserFiles(data);
      }
    };
    
    fetchUserFiles();
  }, [selectedUserId]);

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

  const handleSelect = (ids, isSelected) => {
    setSelectedKnowledgeIds(prev => 
      isSelected 
        ? [...new Set([...prev, ...ids])]
        : prev.filter(id => !ids.includes(id))
    );
  };

  const handleThresholdChange = (category, value) => {
    setCategoryThresholds(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleRunTest = async () => {
    if (!question.trim()) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Please enter a question." 
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      let finalSystemPrompt = systemPrompt;
      if (strictMode) {
        finalSystemPrompt += "\n\nIf CONTEXT is empty, say 'I could not find an answer in the provided knowledge base.'";
      }

      const scopeWithThresholds = selectedKnowledgeIds.map(id => {
        const item = knowledgeItems.find(k => k.id === id);
        const category = item?.metadata?.category || 'General';
        return {
          file_id: id,
          threshold: categoryThresholds[category] || 0.30
        };
      });

      const res = await fetch('/api/run-rag-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'report',
          model: model,
          systemPrompt: finalSystemPrompt,
          userPromptTemplate: userPromptTemplate,
          question: question,
          strictMode: strictMode,
          
          scope: scopeWithThresholds,
          knowledgeTopK: knowledgeTopK,
          
          reportConfig: {
            userData: {
              selectedUserId: selectedUserId,
              selectedFileIds: selectedUserFileIds.length > 0 ? selectedUserFileIds : [],
              topK: userDataTopK
            },
            knowledge: {
              topK: knowledgeTopK
            }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'API request failed');
      }

      const data = await res.json();
      setResponse(data);
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

const handleGenerateSlides = async () => {
  setIsGeneratingSlides(true);
  setManusShareUrl(null);
  setSlides(null);
  
  try {
    // Step 1: 创建任务，立即获取 share URL
    const createRes = await fetch('/api/create-slide-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportContent: response.response })
    });
    
    if (!createRes.ok) throw new Error('Failed to create task');
    
    const { taskId, shareUrl } = await createRes.json();
    setTaskId(taskId);
    setManusShareUrl(shareUrl);
    setShowManusDialog(true); // 打开弹窗
    
    // Step 2: 轮询检查任务状态
    let attempts = 0;
    const maxAttempts = 60;
    
    const checkStatus = async () => {
      const checkRes = await fetch('/api/check-slide-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      
      const data = await checkRes.json();
      
      if (data.status === 'completed') {
        setShowManusDialog(false); // 自动关闭
        setSlides(data.slides);
        setCurrentSlideIndex(0);
        setIsGeneratingSlides(false);
        toast({ title: 'Success', description: 'Slides generated!' });
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 5000);
      } else {
        throw new Error('Task timeout');
      }
    };
    
    checkStatus();
    
  } catch (err) {
    setIsGeneratingSlides(false);
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
          <Select value={model} onValueChange={setModel}>
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
        {/* Knowledge Base Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>{selectedKnowledgeIds.length} selected</CardDescription>
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
                  isSelected={itemIds.every(id => selectedKnowledgeIds.includes(id))}
                  onSelect={(isSelected) => handleSelect(itemIds, isSelected)}
                  threshold={categoryThresholds[category] || 0.30}
                  onThresholdChange={(value) => handleThresholdChange(category, value)}
                >
                  {files.map(file => (
                    <TreeItem
                      key={file.id}
                      label={`${file.file_name}`}
                      id={file.id}
                      level={1}
                      isSelected={selectedKnowledgeIds.includes(file.id)}
                      onSelect={(isSelected) => handleSelect([file.id], isSelected)}
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
              value={knowledgeTopK}
              onChange={(e) => setKnowledgeTopK(parseInt(e.target.value))}
            />
          </CardContent>
        </Card>

        {/* User Data Selection */}
        <Card>
          <CardHeader>
            <CardTitle>User Data</CardTitle>
            <CardDescription>Select user and files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select User</Label>
              <Select 
                value={selectedUserId || ''} 
                onValueChange={(userId) => {
                  console.log('Selected user:', userId);
                  setSelectedUserId(userId);
                  setSelectedUserFileIds([]); // 清空之前选择的文件
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

            {selectedUserId && (
              <>
                <div>
                  <Label>User Files (optional)</Label>
                  {userFiles.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 mb-2">
                      Loading files or no completed uploads found for this user...
                    </p>
                  )}
                  <ScrollArea className="border rounded-md p-3 h-40">
                    {userFiles.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        This user has no processed chat files yet.
                      </p>
                    ) : (
                      userFiles.map(file => (
                        <div key={file.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={file.id}
                            checked={selectedUserFileIds.includes(file.id)}
                            onCheckedChange={(checked) => {
                              setSelectedUserFileIds(prev =>
                                checked
                                  ? [...prev, file.id]
                                  : prev.filter(id => id !== file.id)
                              );
                            }}
                          />
                          <label htmlFor={file.id} className="text-sm cursor-pointer">
                            {file.file_name} 
                            <span className="text-xs text-gray-500 ml-2">
                              ({new Date(file.created_at).toLocaleDateString()})
                            </span>
                          </label>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
                
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
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
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
              {!isLoading && !response && (
                <p className="text-gray-500">Report will appear here.</p>
              )}
              {!isLoading && response && (
                <ReactMarkdown>{response.response}</ReactMarkdown>
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
              {!isLoading && !response && (
                <p>Debug information will appear here.</p>
              )}
              {!isLoading && response?.debugLogs && (
                <pre className="whitespace-pre-wrap">{response.debugLogs}</pre>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
{/* Slide Generation Section */}
<Card className="mt-6">
  <CardHeader>
    <CardTitle>Generate Slides</CardTitle>
    <CardDescription>Convert the generated report into presentation slides</CardDescription>
  </CardHeader>
  <CardContent>
    <Button 
      onClick={handleGenerateSlides}
      disabled={!response || isGeneratingSlides}
      className="mb-4"
    >
      {isGeneratingSlides ? 'Generating Slides...' : 'Generate Slides from Report'}
    </Button>
    
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

{/* Manus 进度弹窗 */}
<Dialog open={showManusDialog} onOpenChange={setShowManusDialog}>
  <DialogContent className="max-w-5xl h-[80vh]">
    <DialogHeader>
      <DialogTitle>
        Manus Task Progress {isGeneratingSlides && '(Generating...)'}
      </DialogTitle>
    </DialogHeader>
    <div className="flex-1 overflow-hidden">
      {manusShareUrl && (
        <div className="h-full flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            Note: If the preview doesn't load, use the link below
          </p>
          <a 
            href={manusShareUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            🔗 Open in new tab
          </a>
          <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <iframe
              src={manusShareUrl}
              className="w-full h-full"
              title="manus-progress"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
}
