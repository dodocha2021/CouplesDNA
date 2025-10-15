import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, ChevronDown, Bot, TestTube2 } from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ReactMarkdown from 'react-markdown';

const defaultSystemPrompt = `You are an expert assistant. Use the following CONTEXT to answer the QUESTION. The CONTEXT is a collection of documents. If the answer is not found in the CONTEXT, say "I could not find an answer in the provided knowledge base." Do not make up information. Be concise and clear in your response.`;
const defaultUserPromptTemplate = `CONTEXT (Knowledge Base):
{context}

USER DATA (Personal History):
{userdata}

---

QUESTION:
{question}`;
const defaultFallbackAnswer = "The information you\'re looking for couldn\'t be found in the current knowledge base. Please try rephrasing your question or selecting a different set of documents.";

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
    const supabase = useSupabaseClient();
    const [knowledgeItems, setKnowledgeItems] = useState([]);
    const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState([]);
    const [question, setQuestion] = useState('What are the main features of our product?');
    const [model, setModel] = useState('gpt-4o');
    const [response, setResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
    const [userPromptTemplate, setUserPromptTemplate] = useState(defaultUserPromptTemplate);
    const [categoryThresholds, setCategoryThresholds] = useState({});

    const [strictMode, setStrictMode] = useState(true);
    const [fallbackAnswer, setFallbackAnswer] = useState(defaultFallbackAnswer);

    const [topK, setTopK] = useState(10);
    
    const [mode, setMode] = useState('prompt');
    const [reportConfig, setReportConfig] = useState({
        userData: {
            selectedUserId: null,
            selectedFileIds: [],
            topK: 5
        },
        knowledge: {
            topK: 5
        }
    });
    const [users, setUsers] = useState([]);
    const [userFiles, setUserFiles] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data: knowledgeData, error: knowledgeError } = await supabase
                    .from('knowledge_uploads')
                    .select('id, file_name, file_size, metadata, updated_at, status')
                    .eq('status', 'completed')
                    .order('updated_at', { ascending: false });
                
                if (knowledgeError) throw knowledgeError;
                
                setKnowledgeItems(knowledgeData || []);
                
                const initialThresholds = {};
                (knowledgeData || []).forEach(item => {
                    const category = item.metadata?.category || 'Uncategorized';
                    if (!initialThresholds[category]) {
                        initialThresholds[category] = 0.30;
                    }
                });
                setCategoryThresholds(initialThresholds);
                
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: `Could not load knowledge base: ${error.message}` });
            }

            try {
                const { data: usersData, error: usersError } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .order('email');
                if (usersError) throw usersError;
                setUsers(usersData || []);
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: `Could not load users: ${error.message}` });
            }
        };
        
        fetchInitialData();
    }, [supabase, toast]);

    useEffect(() => {
        if (reportConfig.userData.selectedUserId) {
            const fetchUserFiles = async () => {
                try {
                    const { data, error } = await supabase
                        .from('user_uploads')
                        .select('id, file_name')
                        .eq('user_id', reportConfig.userData.selectedUserId)
                        .eq('status', 'completed');
                    console.log('查询结果:', data, '错误:', error);
                    if (error) throw error;
                    setUserFiles(data || []);
                } catch (error) {
                     toast({ variant: "destructive", title: "Error", description: `Could not load user files: ${error.message}` });
                }
            };
            fetchUserFiles();
        } else {
            setUserFiles([]);
        }
    }, [reportConfig.userData.selectedUserId, supabase, toast]);


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
    };

    const handleRunTest = async () => {
        if (!question) {
            toast({ variant: "destructive", title: "Error", description: "A question is required." });
            return;
        }
        
        setIsLoading(true);
        setResponse(null);
        
        try {
            const scopeWithThresholds = selectedKnowledgeIds.map(id => {
                const item = knowledgeItems.find(k => k.id === id);
                if (!item) return null;
                
                const category = item.metadata?.category || 'Uncategorized';
                
                return {
                    file_id: item.id,  // ✅ 直接使用 item.id
                    threshold: categoryThresholds[category] || 0.30,
                };
            }).filter(Boolean);

            const res = await fetch('/api/run-rag-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    systemPrompt: systemPrompt,
                    userPromptTemplate,
                    model,
                    strictMode,
                    fallbackAnswer,
                    
                    mode: mode,
                    reportConfig: mode === 'report' ? reportConfig : null,
                    
                    scope: scopeWithThresholds,
                    knowledgeTopK: mode === 'report' ? reportConfig.knowledge.topK : topK,
                }),
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'API request failed');
            }
            
            const data = await res.json();
            setResponse(data);
        } catch (error) {
            toast({ variant: "destructive", title: "Test Run Error", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
return (
    <div className="container mx-auto p-4 space-y-6">
        {/* Tabs */}
        <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prompt">Prompt Testing</TabsTrigger>
                <TabsTrigger value="report">Report Generation</TabsTrigger>
            </TabsList>
        </Tabs>
        
        <Card>
            <CardHeader>
                <CardTitle>Prompt & Behavior</CardTitle>
                <CardDescription>
                    {mode === 'prompt' 
                        ? "Design prompts and define how the AI should behave." 
                        : "Design prompts for report generation. Use {context} for knowledge, {userdata} for user data, and {question} for the question."}
                </CardDescription>
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

        {/* Report Generation Mode specific settings */}
        {mode === 'report' && (
            <div className="grid grid-cols-2 gap-6">
                {/* User Data Settings */}
                <Card>
                    <CardHeader><CardTitle>User Data Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Select User</Label>
                            <Select
                                value={reportConfig.userData.selectedUserId || ''}
                                onValueChange={(val) => setReportConfig({
                                    ...reportConfig,
                                    userData: { ...reportConfig.userData, selectedUserId: val, selectedFileIds: [] }
                                })}
                            >
                                <SelectTrigger><SelectValue placeholder="Choose a user" /></SelectTrigger>
                                <SelectContent>
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label>User Files (optional)</Label>
                            <div className="space-y-2 border rounded p-3 max-h-40 overflow-y-auto">
                                {userFiles.length === 0 ? (
                                    <p className="text-sm text-gray-500">No files found</p>
                                ) : (
                                    userFiles.map(file => (
                                        <div key={file.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={file.id}
                                                checked={reportConfig.userData.selectedFileIds.includes(file.id)}
                                                onCheckedChange={(checked) => {
                                                    const newIds = checked
                                                        ? [...reportConfig.userData.selectedFileIds, file.id]
                                                        : reportConfig.userData.selectedFileIds.filter(id => id !== file.id);
                                                    setReportConfig({
                                                        ...reportConfig,
                                                        userData: { ...reportConfig.userData, selectedFileIds: newIds }
                                                    });
                                                }}
                                            />
                                            <label htmlFor={file.id} className="text-sm cursor-pointer">
                                                {file.file_name}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <Label>Top K Results</Label>
                            <Input
                                type="number" min={1} max={20}
                                value={reportConfig.userData.topK}
                                onChange={(e) => setReportConfig({
                                    ...reportConfig,
                                    userData: { ...reportConfig.userData, topK: parseInt(e.target.value) || 5 }
                                })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Inputs & Model */}
                <Card>
                    <CardHeader><CardTitle>Inputs & Model</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Knowledge Base Search Scope ({selectedKnowledgeIds.length} selected)</Label>
                            <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                                {Object.entries(knowledgeTree).map(([category, { files, itemIds }]) => (
                                    <TreeItem
                                        key={category}
                                        label={`${category} (${files.length})`}
                                        id={category}
                                        isBranch
                                        initiallyOpen
                                        level={0}
                                        isSelected={itemIds.every(id => selectedKnowledgeIds.includes(id))}
                                        onSelect={(isSelected) => handleSelect(itemIds, isSelected)}
                                        threshold={categoryThresholds[category] || 0.30}
                                        onThresholdChange={(value) => handleThresholdChange(category, value)}
                                    >
                                        {files.map(file => (
                                            <TreeItem
                                                key={file.id}
                                                label={`${file.file_name} ${(file.file_size / 1024).toFixed(1)}KB · ${new Date(file.updated_at).toLocaleDateString()}`}
                                                id={file.id}
                                                level={1}
                                                isSelected={selectedKnowledgeIds.includes(file.id)}
                                                onSelect={(isSelected) => handleSelect([file.id], isSelected)}
                                            />
                                        ))}\
                                    </TreeItem>
                                ))}\
                            </div>
                        </div>

                        <div>
                            <Label>Knowledge Base Top K Results</Label>
                            <Input
                                type="number" 
                                min={1} 
                                max={20}
                                value={reportConfig.knowledge.topK}
                                onChange={(e) => setReportConfig({
                                    ...reportConfig,
                                    knowledge: { ...reportConfig.knowledge, topK: parseInt(e.target.value) || 5 }
                                })}
                            />
                        </div>

                        <div>
                            <Label>Test Question</Label>
                            <Textarea
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                rows={4}
                                placeholder="Ask a question..."
                            />
                        </div>

                        <div>
                            <Label>AI Model</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger><SelectValue placeholder="Select AI Model" /></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Anthropic</SelectLabel>
                                        <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                                        <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                                        <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel>OpenAI</SelectLabel>
                                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel>Google</SelectLabel>
                                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* Prompt Testing Mode */}
        {mode === 'prompt' && (
            <Card>
                <CardHeader><CardTitle>Inputs & Model</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Knowledge Base Search Scope ({selectedKnowledgeIds.length} selected)
                        </label>
                        <ScrollArea className="border rounded-md p-2 h-64">
                            {Object.entries(knowledgeTree).map(([category, data]) => {
                                const { files, itemIds } = data;
                                const isCategorySelected = itemIds.every(id => selectedKnowledgeIds.includes(id));
                                return (
                                    <TreeItem 
                                        key={category} 
                                        id={`cat-${category}`} 
                                        label={`${category} (${files.length})`} 
                                        isSelected={isCategorySelected} 
                                        onSelect={(checked) => handleSelect(itemIds, checked)} 
                                        isBranch initiallyOpen={true} level={0}
                                        threshold={categoryThresholds[category] || 0.30}
                                        onThresholdChange={(value) => handleThresholdChange(category, value)}
                                    >
                                        {files.map(file => (
                                            <TreeItem
                                                key={file.id} id={file.id}
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
                    
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Test Question</label><Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} /></div>

                    <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between mb-1">
                            <Label htmlFor="top-k-slider" className="text-sm font-medium">Top K: <span className="font-bold">{topK}</span></Label>
                            <span className="text-xs text-gray-500">Number of chunks to retrieve</span>
                        </div>
                        <Slider id="top-k-slider" min={1} max={100} step={1} value={[topK]} onValueChange={(value) => setTopK(value[0])} className="w-full"/>
                        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Fewer (1)</span><span>More (100)</span></div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">AI Model</label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger><SelectValue placeholder="Select AI Model" /></SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Anthropic</SelectLabel>
                                    <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>OpenAI</SelectLabel>
                                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>Google</SelectLabel>
                                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                                    <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        )}

        {/* Run Test Button */}
        <Button onClick={handleRunTest} disabled={isLoading} size="lg" className="w-full">
            <Bot className="mr-2 h-5 w-5"/> {isLoading ? 'Running...' : 'Run Test'}
        </Button>

        {/* Generated Response - 改为两列 */}
        <div className="grid grid-cols-2 gap-4">
            {/* 左侧：AI Response */}
            <Card>
                <CardHeader><CardTitle>Generated Response</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="prose dark:prose-invert max-w-none p-4 border rounded-md min-h-[20rem] bg-gray-50/50">
                        {isLoading && <div className="flex items-center justify-center h-full"><p>Generating...</p></div>}
                        {!isLoading && !response && <p>Response will appear here.</p>}
                        {!isLoading && response && (
                            <ReactMarkdown>{response.response}</ReactMarkdown>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* 右侧：Debug Logs */}
            <Card>
                <CardHeader><CardTitle>Debug Logs</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="font-mono text-xs p-4 border rounded-md min-h-[20rem] max-h-[40rem] bg-gray-900 text-green-400">
                        {isLoading && <div className="flex items-center justify-center h-full"><p>Processing...</p></div>}
                        {!isLoading && !response && <p>Debug information will appear here.</p>}
                        {!isLoading && response?.debugLogs && (
                            <pre className="whitespace-pre-wrap">{response.debugLogs}</pre>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    </div>
);
};

export default PromptStudioPage;
