import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import PromptTestingTab from '@/components/admin/PromptTestingTab'
import ReportGenerationTab from '@/components/admin/ReportGenerationTab'

export default function PromptStudioPage() {
  const [mode, setMode] = useState('prompt')
  const [historyConfigs, setHistoryConfigs] = useState([])
  const [selectedHistoryId, setSelectedHistoryId] = useState('')
  const [loadedConfig, setLoadedConfig] = useState(null)
  const supabase = createClientComponentClient()

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      console.log('Fetching history for user:', session.user.id) // 添加这行

      const response = await fetch('/api/admin/prompt-config/history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      console.log('History result:', result) // 添加这行
      
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

  const handleLoadHistory = async (configId) => {
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
        <div className="w-96">
          <select
            value={selectedHistoryId}
            onChange={(e) => {
              setSelectedHistoryId(e.target.value)
              if (e.target.value) {
                handleLoadHistory(e.target.value)
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Load Configuration</option>
            {historyConfigs.map(config => (
              <option key={config.id} value={config.id}>
                [{config.prompt_type === 'general' ? 'General' : 'Report'}] {config.name.substring(0, 30)}
                {config.name.length > 30 ? '...' : ''} ({new Date(config.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })})
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabs value={mode} onValueChange={setMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prompt">General Prompt</TabsTrigger>
          <TabsTrigger value="report">Report Prompt</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="mt-6">
          <PromptTestingTab 
            loadedConfig={loadedConfig} 
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
      </Tabs>
    </div>
  )
}
