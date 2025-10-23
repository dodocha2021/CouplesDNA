import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import PromptTestingTab from '@/components/admin/PromptTestingTab'
import ReportGenerationTab from '@/components/admin/ReportGenerationTab'
import SlideGenerationTab from '@/components/admin/SlideGenerationTab'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function PromptStudioPage() {
  const router = useRouter()
  const [mode, setMode] = useState('prompt')
  const [historyConfigs, setHistoryConfigs] = useState([])
  const [loadedConfig, setLoadedConfig] = useState(null)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const handleNewConfiguration = () => {
    setLoadedConfig(null);
    
    // 刷新历史记录（清空选择）
    fetchHistory();
    
    toast({
      title: "New Configuration",
      description: "Started a new configuration. All fields reset to default."
    });
  };

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      console.log('Fetching history for user:', session.user.id)

      const response = await fetch('/api/admin/prompt-config/history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      console.log('History result:', result)
      
      if (result.success) {
        setHistoryConfigs(result.data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  // Auto-load config from URL parameter
  useEffect(() => {
    if (router.isReady && router.query.id) {
      const configId = router.query.id
      handleLoadHistory(configId)
    }
  }, [router.isReady, router.query.id])

  const handleLoadHistory = async (configId) => {
    if (!configId) {
      setLoadedConfig(null)
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/prompt-config/${configId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      
      if (result.success) {
        const config = result.data

        // Switch to appropriate tab
        if (config.prompt_type === 'general') {
          setMode('prompt')
        } else if (config.prompt_type === 'slide') {
          setMode('slide')
        } else {
          setMode('report')
        }

        // Set loaded config for child components
        setLoadedConfig(config)

        // Show warnings if files deleted
        if (config.knowledge_base_deleted) {
          alert(`⚠️ Original file '${config.knowledge_base_name}' has been deleted`)
        }
        if (config.user_data_deleted) {
          alert(`⚠️ Original file '${config.user_data_name}' has been deleted`)
        }
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Prompt Studio</h1>
          <p className="text-gray-600 mt-2">
            Test and design prompts for different scenarios
          </p>
        </div>
        <div className="flex items-center gap-4">
         
          
          <select
            value={loadedConfig?.id || ''}
            onChange={(e) => handleLoadHistory(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">-- Select History --</option>
            {historyConfigs.map(config => {
              const typeLabel = config.prompt_type === 'general' 
                ? 'General' 
                : config.prompt_type === 'slide' 
                ? 'Slide' 
                : 'Report';
              
              return (
                <option key={config.id} value={config.id}>
                  [{typeLabel}] {config.name.substring(0, 30)}
                  {config.name.length > 30 ? '...' : ''} ({new Date(config.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <Tabs value={mode} onValueChange={setMode} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prompt">Prompt Testing</TabsTrigger>
          <TabsTrigger value="report">Report Generation</TabsTrigger>
          <TabsTrigger value="slide">Slide Generation</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="mt-6">
          <PromptTestingTab 
            loadedConfig={loadedConfig} 
            setLoadedConfig={setLoadedConfig}
            onConfigLoaded={() => setLoadedConfig(null)}
            onSaveSuccess={fetchHistory}
          />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <ReportGenerationTab 
            loadedConfig={loadedConfig}
            setLoadedConfig={setLoadedConfig}
            onConfigLoaded={() => setLoadedConfig(null)}
            onSaveSuccess={fetchHistory}
          />
        </TabsContent>
        
        <TabsContent value="slide">
          <SlideGenerationTab
            loadedConfig={loadedConfig}
            setLoadedConfig={setLoadedConfig}
            onConfigLoaded={() => setLoadedConfig(null)}
            onSaveSuccess={fetchHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
