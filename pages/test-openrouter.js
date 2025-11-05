
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getAllModels } from '@/lib/ai/config';

export default function TestOpenRouter() {
  const [model, setModel] = useState('anthropic/claude-sonnet-4.5');
  const [prompt, setPrompt] = useState('你好，请介绍一下你自己');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const models = getAllModels();
  const modelsByProvider = models.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  const handleTest = async () => {
    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'direct',
          model: model,
          userPrompt: prompt,
          systemPrompt: '你是一个友好的AI助手'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'API request failed');
      }

      setResponse(data.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">OpenRouter API 测试</h1>

      <div className="space-y-6">
        {/* 模型选择 */}
        <Card>
          <CardHeader>
            <CardTitle>选择模型</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
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
            <p className="text-sm text-gray-500 mt-2">
              {models.find(m => m.id === model)?.description}
            </p>
          </CardContent>
        </Card>

        {/* 输入Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>输入Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="输入你的问题..."
            />
          </CardContent>
        </Card>

        {/* 测试按钮 */}
        <Button 
          onClick={handleTest} 
          disabled={isLoading || !prompt}
          className="w-full"
          size="lg"
        >
          {isLoading ? '正在测试...' : '发送测试'}
        </Button>

        {/* 错误信息 */}
        {error && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500">错误</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 响应结果 */}
        {response && (
          <Card>
            <CardHeader>
              <CardTitle>AI 响应</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                {response}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
