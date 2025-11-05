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
        <div className="flex items-center gap-2 py-1 px-2 ml-10 mb-1">
          <span className="text-xs text-gray-500 w-16">Threshold:</span>
          <Slider
            value={[threshold]}
            onValueChange={([value]) => onThresholdChange(value)}
            min={0}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <span className="text-xs font-mono w-12 text-right">{threshold.toFixed(2)}</span>
          <button
            onClick={() => onThresholdChange(0)}
            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            title="Set to 0 (no filtering)"
          >
            0
          </button>
        </div>
      )}

      {isBranch && isOpen && children}
    </div>
  );
};
export default function ReportGenerationTab({ loadedConfig, setLoadedConfig, onConfigLoaded, onSaveSuccess }) {
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
    debugLogs, setDebugLogs,
    handleSaveConfig,
    handleResetToDefault,
    saveLoading,
  } = usePromptConfig({
    loadedConfig,
    setLoadedConfig,
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
        .eq('is_active', true)
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
        .eq('is_active', true)
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
      // 处理 User Data Selection - 异步查询用户ID
      if (loadedConfig.user_data_id) {
        const fetchUserId = async () => {
          const { data: fileData } = await supabase
            .from('user_uploads')
            .select('user_id')
            .eq('id', loadedConfig.user_data_id)
            .single();
          
          if (fileData) {
            setSelectedUserId(fileData.user_id);
          }
        };
        
        fetchUserId();
      }
      
      // 处理 Knowledge Base Selection
      if (loadedConfig.selected_knowledge_ids && Array.isArray(loadedConfig.selected_knowledge_ids)) {
        setSelectedKnowledgeIds(loadedConfig.selected_knowledge_ids);
      }

      // 处理 Category Thresholds
      if (loadedConfig.category_thresholds) {
        const thresholds = typeof loadedConfig.category_thresholds === 'string'
          ? JSON.parse(loadedConfig.category_thresholds)
          : loadedConfig.category_thresholds;
        setCategoryThresholds(thresholds);
      }

    }
  }, [loadedConfig, onConfigLoaded, supabase]);

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

    // Validate that at least one user file is selected
    if (selectedUserFileIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select at least one user data file."
      });
      return;
    }

    // Validate that at least one knowledge file is selected
    if (selectedKnowledgeIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select at least one knowledge base file."
      });
      return;
    }

    setIsLoading(true);
    setGeneratedReport('');
    setDebugLogs('');

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
          threshold: categoryThresholds[category] !== undefined ? categoryThresholds[category] : 0.30
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
                          id={file.id}
                          checked={selectedUserFileIds.includes(file.id)}
                          onCheckedChange={(checked) => handleSelectUserFile(file.id, checked)}
                          className="mr-2"
                        />
                        <label htmlFor={file.id} className="text-sm flex-1 cursor-pointer">
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
              <Label htmlFor="strict-mode" className="text-sm font-medium">
                Strict Mode
              </Label>
              <Switch 
                id="strict-mode" 
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
            {strictMode && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Strict Mode enabled: Will return error message if CONTEXT is empty.
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
          <CardDescription>Enter the topic for your report</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={reportTopic}
            onChange={(e) => setReportTopic(e.target.value)}
            placeholder="e.g., How to improve communication in relationships"
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
      <div className="flex gap-4 mt-6">
        <Button
          onClick={() => {
            // Build complete category_thresholds including defaults
            console.log('=== SAVE BUTTON CLICKED (Report Generation) ===');
            console.log('selectedKnowledgeIds:', selectedKnowledgeIds);
            console.log('knowledgeItems:', knowledgeItems);
            console.log('categoryThresholds state:', categoryThresholds);

            const completeThresholds = {};
            selectedKnowledgeIds.forEach(fileId => {
              const item = knowledgeItems.find(k => k.id === fileId);
              console.log(`Processing fileId ${fileId}:`, {
                found: !!item,
                metadata: item?.metadata,
                category: item?.metadata?.category || 'General'
              });
              const category = item?.metadata?.category || 'General';
              if (!completeThresholds[category]) {
                const threshold = categoryThresholds[category] !== undefined
                  ? categoryThresholds[category]
                  : 0.30;
                completeThresholds[category] = threshold;
                console.log(`Set ${category} threshold to:`, threshold);
              }
            });

            console.log('Final completeThresholds object:', completeThresholds);
            console.log('=== CALLING handleSaveConfig ===');
            handleSaveConfig({ category_thresholds: completeThresholds });
          }}
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