import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PromptTestingTab from '@/components/admin/PromptTestingTab';
import ReportGenerationTab from '@/components/admin/ReportGenerationTab';

export default function PromptStudioPage() {
  const [mode, setMode] = useState('prompt');

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Prompt Studio</h1>
        <p className="text-gray-600 mt-2">
          Test and design prompts for different scenarios
        </p>
      </div>

      <Tabs value={mode} onValueChange={setMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prompt">Prompt Testing</TabsTrigger>
          <TabsTrigger value="report">Report Generation</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="mt-6">
          <PromptTestingTab />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <ReportGenerationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
