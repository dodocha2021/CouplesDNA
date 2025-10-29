import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const defaultSystemPrompt = `You are an expert assistant. Use the following CONTEXT to answer the QUESTION. The CONTEXT is composed of KNOWLEDGE and USERDATA. Do not make up information. Be concise and clear in your response.`

const defaultUserPromptTemplate = `CONTEXT:

KNOWLEDGE:
{context}

USERDATA:
{userdata}

---

QUESTION:
{question}`

export function usePromptConfig({ loadedConfig, setLoadedConfig, onSaveSuccess, promptType = 'general' }) {
  const supabaseClient = createClientComponentClient()
  
  // Common fields
  const [modelSelection, setModelSelection] = useState('anthropic/claude-sonnet-4-20250514')
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('')
  const [knowledgeBaseName, setKnowledgeBaseName] = useState('')
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState([])
  const [topK, setTopK] = useState(promptType === 'general' ? 10 : 5)
  const [strictMode, setStrictMode] = useState(true)
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt)
  const [userPromptTemplate, setUserPromptTemplate] = useState(defaultUserPromptTemplate)
  const [debugLogs, setDebugLogs] = useState('')
  
  // General prompt specific
  const [testQuestion, setTestQuestion] = useState('')
  const [generatedResponse, setGeneratedResponse] = useState('')
  
  // Report prompt specific
  const [userDataId, setUserDataId] = useState('')
  const [userDataName, setUserDataName] = useState('')
  const [reportTopic, setReportTopic] = useState('')
  const [generatedReport, setGeneratedReport] = useState('')
  const [generateSlides, setGenerateSlides] = useState('')
  const [manusTaskId, setManusTaskId] = useState('')
  const [manusShareUrl, setManusShareUrl] = useState('')
  const [manusTaskStatus, setManusTaskStatus] = useState('')
  const [manusPrompt, setManusPrompt] = useState('Create a professional presentation with slides based on this report in english: ')

  const [saveLoading, setSaveLoading] = useState(false)
  
  // Load config when provided
  useEffect(() => {
    if (loadedConfig && loadedConfig.prompt_type === promptType) {
      setModelSelection(loadedConfig.model_selection)
      setKnowledgeBaseId(loadedConfig.knowledge_base_id || '')
      setKnowledgeBaseName(loadedConfig.knowledge_base_name || '')
      setSelectedKnowledgeIds(loadedConfig.selected_knowledge_ids || []) // 新增
      setTopK(loadedConfig.top_k_results)
      setStrictMode(loadedConfig.strict_mode)
      setSystemPrompt(loadedConfig.system_prompt)
      setUserPromptTemplate(loadedConfig.user_prompt_template)
      setDebugLogs(loadedConfig.debug_logs || '')
      
      if (promptType === 'general') {
        setTestQuestion(loadedConfig.test_question || '')
        setGeneratedResponse(loadedConfig.generated_response || '')
      } else {
        setUserDataId(loadedConfig.user_data_id || '')
        setUserDataName(loadedConfig.user_data_name || '')
        setReportTopic(loadedConfig.report_topic || '')
        setGeneratedReport(loadedConfig.generated_report || '')
        setGenerateSlides(loadedConfig.generate_slides || '')
        setManusTaskId(loadedConfig.manus_task_id || '')
        setManusShareUrl(loadedConfig.manus_share_url || '')
        setManusTaskStatus(loadedConfig.manus_task_status || '')
        setManusPrompt(loadedConfig.manus_prompt || 'Create a professional presentation with slides based on this report in english: ')
      }
    }
  }, [loadedConfig, promptType])
  
  const handleSaveConfig = async (additionalData = {}) => {
    try {
      setSaveLoading(true)
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session) {
        alert('Please login first')
        return
      }

      let configData = {
        prompt_type: promptType,
        model_selection: modelSelection,
        knowledge_base_id: knowledgeBaseId,
        knowledge_base_name: knowledgeBaseName,
        top_k_results: topK,
        strict_mode: strictMode,
        system_prompt: systemPrompt,
        user_prompt_template: userPromptTemplate,
        debug_logs: debugLogs,
        ...additionalData
      }

      if (promptType === 'general') {
        if (!modelSelection || !knowledgeBaseId || topK === undefined || 
            strictMode === undefined || !systemPrompt || !userPromptTemplate || 
            !testQuestion || !generatedResponse || !debugLogs) {
          alert('Please run test to generate results before saving')
          return
        }
        
        configData = {
          ...configData,
          name: testQuestion,
          test_question: testQuestion,
          generated_response: generatedResponse,
          selected_knowledge_ids: selectedKnowledgeIds // 新增
        }
      } else if (promptType === 'report') {
        if (!modelSelection || !knowledgeBaseId || topK === undefined || 
            !userDataId || strictMode === undefined || !systemPrompt || 
            !userPromptTemplate || !reportTopic || !generatedReport || !debugLogs) {
          alert('Please generate report before saving')
          return
        }
        
        configData = {
          ...configData,
          name: reportTopic,
          user_data_id: userDataId,
          user_data_name: userDataName,
          report_topic: reportTopic,
          generated_report: generatedReport,
          selected_knowledge_ids: selectedKnowledgeIds
          // ✅ 移除：generate_slides, manus_task_id, manus_share_url
        }
      } else if (promptType === 'slide') {
        if (!modelSelection || !knowledgeBaseId || topK === undefined || 
            strictMode === undefined || !systemPrompt || !userPromptTemplate || 
            !manusPrompt || !manusTaskId) {
          alert('Please generate slides before saving')
          return
        }
        
        configData = {
          ...configData,
          name: reportTopic || testQuestion || 'Untitled Slide',
          manus_prompt: manusPrompt,
          manus_task_id: manusTaskId,
          manus_share_url: manusShareUrl,
          manus_task_status: manusTaskStatus,
          manus_task_created_at: loadedConfig?.manus_task_created_at,
          manus_task_completed_at: loadedConfig?.manus_task_completed_at,
          generate_slides: generateSlides,
          
          // 继承自 Report/General
          user_data_id: userDataId,
          user_data_name: userDataName,
          report_topic: reportTopic,
          generated_report: generatedReport,
          test_question: testQuestion,
          generated_response: generatedResponse,
          selected_knowledge_ids: selectedKnowledgeIds
        }
      }

      const response = await fetch('/api/admin/prompt-config/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      })

      const result = await response.json()

      if (result.success) {
        alert('Configuration saved successfully')
        if (onSaveSuccess) {
          onSaveSuccess()
        }
      } else {
        // Handle duplicate task ID error with friendly message
        if (result.code === 'DUPLICATE_TASK_ID') {
          alert('This slide has already been saved.\n\nTo save a new version, please:\n1. Modify the Manus Prompt (if needed)\n2. Click "Generate Slides" to create new slides\n3. Then save the new configuration')
        } else {
          alert(result.error || 'Failed to save')
        }
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save')
    } finally {
      setSaveLoading(false)
    }
  }
  
  const handleResetToDefault = () => {
    setModelSelection('anthropic/claude-sonnet-4-20250514')
    setKnowledgeBaseId('')
    setKnowledgeBaseName('')
    setSelectedKnowledgeIds([])
    setTopK(promptType === 'general' ? 10 : 5)
    setStrictMode(true)
    setSystemPrompt(defaultSystemPrompt)
    setUserPromptTemplate(defaultUserPromptTemplate)
    setDebugLogs('')
    
    if (promptType === 'general') {
      setTestQuestion('')
      setGeneratedResponse('')
    } else {
      setUserDataId('')
      setUserDataName('')
      setReportTopic('')
      setGeneratedReport('')
      setGenerateSlides('')
      setManusTaskId('')
      setManusShareUrl('')
      setManusTaskStatus('')
      setManusPrompt('Create a professional presentation with slides based on this report in english: ')
    }

    if (setLoadedConfig) {
      setLoadedConfig(null);
    }
  }
  
  return {
    // Common fields
    modelSelection, setModelSelection,
    knowledgeBaseId, setKnowledgeBaseId,
    knowledgeBaseName, setKnowledgeBaseName,
    selectedKnowledgeIds, setSelectedKnowledgeIds, // 新增
    topK, setTopK,
    strictMode, setStrictMode,
    systemPrompt, setSystemPrompt,
    userPromptTemplate, setUserPromptTemplate,
    debugLogs, setDebugLogs,
    
    // General fields
    testQuestion, setTestQuestion,
    generatedResponse, setGeneratedResponse,
    
    // Report fields
    userDataId, setUserDataId,
    userDataName, setUserDataName,
    reportTopic, setReportTopic,
    generatedReport, setGeneratedReport,
    generateSlides, setGenerateSlides,
    manusTaskId, setManusTaskId,
    manusShareUrl, setManusShareUrl,
    manusTaskStatus, setManusTaskStatus,
    manusPrompt, setManusPrompt,

    // Actions
    handleSaveConfig,
    handleResetToDefault,
    saveLoading
  }
}
