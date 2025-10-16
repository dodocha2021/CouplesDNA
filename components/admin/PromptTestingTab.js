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

const defaultSystemPrompt = `You are an expert assistant. Use the following CONTEXT to answer the QUESTION. The CONTEXT is composed of KNOWLEDGE and USERDATA. Do not make up information. Be concise and clear in your response.`;

const defaultUserPromptTemplate = `CONTEXT:

KNOWLEDGE:
{context}

USERDATA:
{userdata}

---

QUESTION:
{question}`;

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

export default function PromptTestingTab() {
  const [model, setModel] = useState('anthropic/claude-sonnet-4.5');
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [userPromptTemplate, setUserPromptTemplate] = useState(defaultUserPromptTemplate);
  const [strictMode, setStrictMode] = useState(true);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState([]);
  const [categoryThresholds, setCategoryThresholds] = useState({});
  const [topK, setTopK] = useState(10);
  
  const supabase = useSupabaseClient();

  const models = getAllModels();
  const modelsByProvider = models.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  useEffect(() => {
    const fetchKnowledge = async () => {
      const { data, error } = await supabase
        .from('knowledge_uploads')
        .select('id, file_name, file_size, metadata, updated_at, status')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        setKnowledgeItems(data);
      }
    };
    
    fetchKnowledge();
  }, []);

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
          mode: 'prompt',
          model: model,
          systemPrompt: finalSystemPrompt,
          userPromptTemplate: userPromptTemplate,
          question: question,
          strictMode: strictMode,
          scope: scopeWithThresholds,
          knowledgeTopK: topK
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

      {/* Knowledge Base Selection */}
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
                onSelect={(isSelected) => handleSelect(itemIds, isSelected)}
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
                    onSelect={(isSelected) => handleSelect([file.id], isSelected)}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompt & Behavior</CardTitle>
              <CardDescription>
                Design prompts and define how the AI should behave.
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
          <CardTitle>Test Question</CardTitle>
          <CardDescription>Enter your question to test the prompt</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What is the best way to communicate?"
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
        {isLoading ? 'Running...' : 'Run Test'}
      </Button>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Generated Response</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="prose dark:prose-invert max-w-none p-4 border rounded-md min-h-[20rem] bg-gray-50/50">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <p>Generating...</p>
                </div>
              )}
              {!isLoading && !response && (
                <p className="text-gray-500">Response will appear here.</p>
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
    </div>
  );
}
