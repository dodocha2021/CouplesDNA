import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, ChevronDown, Bot, TestTube2, AlertTriangle } from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

const defaultSystemPrompt = `You are an expert assistant. Use the following CONTEXT to answer the QUESTION.\nThe CONTEXT is a collection of documents. If the answer is not found in the CONTEXT, say "I could not find an answer in the provided knowledge base."\nDo not make up information. Be concise and clear in your response.`;
const defaultUserPromptTemplate = `CONTEXT:\n{context}\n\n---\n\nQUESTION:\n{question}`;
const defaultFallbackAnswer = "The information you're looking for couldn't be found in the current knowledge base. Please try rephrasing your question or selecting a different set of documents.";

const TreeItem = ({ children, ...props }) => {
    const { label, id, isSelected, onSelect, isBranch, initiallyOpen = false, level, threshold, onThresholdChange } = props;
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    const Icon = isBranch ? (isOpen ? ChevronDown : ChevronRight) : null;

    return (
        <div className="ml-4">
            <div className="flex items-center space-x-2 py-1 group">
                {Icon && (
                    <button onClick={() => setIsOpen(!isOpen)} className="p-0.5 rounded-md hover:bg-gray-200">
                        <Icon className="h-4 w-4" />
                    </button>
                )}
                {!isBranch && <div className="w-5 h-5"></div>} 
                <Checkbox id={id} checked={isSelected} onCheckedChange={onSelect} />
                <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none">
                    {label}
                </label>
                {level === 0 && (
                    <div className="flex-grow ml-4">
                        <div className="flex items-center justify-between mb-1">
                            <Label htmlFor={`slider-${id}`} className="text-sm font-medium">
                                Threshold: <span className="font-bold">{threshold.toFixed(2)}</span>
                            </Label>
                            <span className="text-xs text-gray-500">
                                推荐: 0.30
                            </span>
                        </div>
                        <Slider
                            id={`slider-${id}`}
                            min={0.15}
                            max={0.80}
                            step={0.01}
                            value={[threshold]} 
                            onValueChange={(value) => onThresholdChange(value[0])}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>宽松 (0.15)</span>
                            <span>严格 (0.80)</span>
                        </div>
                    </div>
                )}
            </div>
            {isOpen && children && (
                <div className="pl-5 border-l border-gray-200">
                    {children}
                </div>
            )}
        </div>
    );
};

const PromptStudioPage = () => {
    const supabase = useSupabaseClient(); // 在组件顶部调用
    const [knowledgeItems, setKnowledgeItems] = useState([]);
    const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState([]);
    const [question, setQuestion] = useState('What are the main features of our product?');
    const [model, setModel] = useState('gpt-4o');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
    const [userPromptTemplate, setUserPromptTemplate] = useState(defaultUserPromptTemplate);
    const [categoryThresholds, setCategoryThresholds] = useState({});

    const [strictMode, setStrictMode] = useState(true);
    const [fallbackAnswer, setFallbackAnswer] = useState(defaultFallbackAnswer);

    useEffect(() => {
        const fetchKnowledgeUploads = async () => {
            try {
                console.log('Fetching knowledge uploads...');
                
                const { data, error } = await supabase
                    .from('knowledge_uploads')
                    .select('id, file_name, file_size, metadata, updated_at, status')
                    .eq('status', 'completed')
                    .order('updated_at', { ascending: false });
                
                console.log('Query result:', { data, error });
                
                if (error) {
                    console.error('Query error:', error);
                    throw error;
                }
                
                console.log(`Found ${data?.length || 0} completed uploads`);
                setKnowledgeItems(data || []);
                
                // 按 category 设置初始 threshold
                const initialThresholds = {};
                (data || []).forEach(item => {
                    const category = item.metadata?.category || 'Uncategorized';
                    if (!initialThresholds[category]) {
                        initialThresholds[category] = 0.30;
                    }
                });
                setCategoryThresholds(initialThresholds);
                
            } catch (error) {
                console.error('Fetch error:', error);
                toast({ 
                    variant: "destructive", 
                    title: "Error", 
                    description: `Could not load knowledge base: ${error.message}` 
                });
            }
        };
        
        fetchKnowledgeUploads();
    }, [supabase, toast]); // 添加 supabase 到依赖

    const knowledgeTree = useMemo(() => {
        return knowledgeItems.reduce((acc, item) => {
            const category = item.metadata?.category || 'Uncategorized';
            
            if (!acc[category]) {
                acc[category] = { files: [], itemIds: [] };
            }
            
            acc[category].files.push(item);
            acc[category].itemIds.push(item.id);
            
            return acc;
        }, {});
    }, [knowledgeItems]);

    const handleSelect = (ids, isSelected) => {
        setSelectedKnowledgeIds(prev => {
            const currentIds = new Set(prev);
            if (isSelected) {
                ids.forEach(id => currentIds.add(id));
            } else {
                ids.forEach(id => currentIds.delete(id));
            }
            return Array.from(currentIds);
        });
    };

    const handleThresholdChange = (category, value) => {
        setCategoryThresholds(prev => ({ ...prev, [category]: value }));
    }

    const handleRunVectorSearch = async () => {
        if (!question || selectedKnowledgeIds.length === 0) {
            toast({ variant: "destructive", title: "Error", description: "A question and at least one item in the search scope are required for vector search." });
            return;
        }
        
        setIsLoading(true);
        setResponse('');
        
        try {
            const scopeWithThresholds = selectedKnowledgeIds.map(id => {
                const item = knowledgeItems.find(k => k.id === id);
                const category = item.metadata?.category || 'Uncategorized';
                const fileId = item.metadata?.file_id;
                
                console.log('Selected item:', {
                    id: item.id,
                    file_id: fileId,
                    category,
                    threshold: categoryThresholds[category] || 0.55
                });
                
                if (!fileId) {
                    console.warn(`Warning: Item ${id} has no file_id in metadata`);
                }
                
                return {
                    file_id: fileId,
                    threshold: categoryThresholds[category] || 0.55,
                    type: 'file'
                };
            });

            console.log('Sending scope to API:', scopeWithThresholds);

            const res = await fetch('/api/run-rag-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    systemPrompt,
                    userPromptTemplate,
                    model,
                    scope: scopeWithThresholds,
                    strictMode,
                    fallbackAnswer,
                }),
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Vector search API request failed');
            }
            
            const data = await res.json();
            setResponse(data.response);
        } catch (error) {
            toast({ variant: "destructive", title: "Vector Search Error", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRunManualContext = async () => {
        toast({ variant: "destructive", title: "Not Implemented", description: "This functionality needs to be updated for file-based context." });
    };

    return (
        <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Prompt & Behavior</CardTitle>
                        <CardDescription>{"Design prompts and define how the AI should behave when context is not found."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label><Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6} className="font-mono"/></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">User Prompt (Template)</label><Textarea value={userPromptTemplate} onChange={(e) => setUserPromptTemplate(e.target.value)} rows={8} className="font-mono"/></div>
                        <div className="pt-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="strict-mode" checked={strictMode} onCheckedChange={setStrictMode} />
                                <Label htmlFor="strict-mode" className="font-medium">Strict Mode</Label>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">When enabled, if no relevant knowledge is found, the AI will return the custom fallback answer instead of using its general knowledge.</p>
                            {strictMode && (
                                <div className="mt-4">
                                    <Label htmlFor="fallback-answer" className="block text-sm font-medium text-gray-700 mb-1">Fallback Answer</Label>
                                    <Textarea id="fallback-answer" value={fallbackAnswer} onChange={(e) => setFallbackAnswer(e.target.value)} rows={3} placeholder="e.g., I could not find an answer..." />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader><CardTitle>Inputs & Model</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Knowledge Base Search Scope ({selectedKnowledgeIds.length} selected)
                            </label>
                            <ScrollArea className="border rounded-md p-2 h-64">
                                {Object.entries(knowledgeTree).map(([category, { files, itemIds }]) => {
                                    const isCategorySelected = itemIds.every(id => selectedKnowledgeIds.includes(id));
                                    return (
                                        <TreeItem 
                                            key={category} 
                                            id={`cat-${category}`} 
                                            label={`${category} (${files.length})`} 
                                            isSelected={isCategorySelected} 
                                            onSelect={(checked) => handleSelect(itemIds, checked)} 
                                            isBranch 
                                            initiallyOpen={true}
                                            level={0}
                                            threshold={categoryThresholds[category] || 0.30}
                                            onThresholdChange={(value) => handleThresholdChange(category, value)}
                                        >
                                            {files.map(file => (
                                                <TreeItem
                                                    key={file.id}
                                                    id={file.id}
                                                    label={
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="truncate">{file.file_name}</span>
                                                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                                                {(file.file_size / 1024).toFixed(1)}KB · {new Date(file.updated_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    }
                                                    isSelected={selectedKnowledgeIds.includes(file.id)}
                                                    onSelect={(checked) => handleSelect([file.id], checked)}
                                                    level={1}
                                                />
                                            ))}
                                        </TreeItem>
                                    );
                                })}
                            </ScrollArea>
                        </div>
                        <div><label className="block text-sm font-medium text-gamma-700 mb-1">Test Question</label><Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4o">OpenAI GPT-4o</SelectItem>
                                    <SelectItem value="gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</SelectItem>
                                    <SelectItem value="gemini-1.0-pro">Google Gemini 1.0 Pro</SelectItem>
                                    <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                                    <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                                    <SelectItem value="claude-2.1">Claude 2.1</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                     </CardContent>
                </Card>
                <div className="flex space-x-4">
                    <Button onClick={handleRunVectorSearch} disabled={isLoading} size="lg" className="w-full">
                        <Bot className="mr-2 h-5 w-5"/> {isLoading ? 'Searching...' : 'Find Context & Run (Vector Search)'}
                    </Button>
                    <Button onClick={handleRunManualContext} disabled={isLoading} size="lg" variant="outline" className="w-full">
                       <TestTube2 className="mr-2 h-5 w-5"/> {isLoading ? 'Running...' : 'Run with Selected (Manual)'}
                    </Button>
                </div>
            </div>
            <div className="lg:col-span-1">
                <Card className="sticky top-4">
                    <CardHeader><CardTitle>Generated Response</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="prose dark:prose-invert max-w-none p-4 border rounded-md min-h-[40rem] bg-gray-50/50">
                            {isLoading ? <div className="flex items-center justify-center h-full"><p>Generating...</p></div> : <p style={{ whiteSpace: 'pre-wrap' }}>{response || "Response will appear here."}</p>}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PromptStudioPage;
