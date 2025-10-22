import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RefreshCw, FileCode, Plus, ExternalLink, Star, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/router'

export default function PromptManagementTab() {
  const router = useRouter()

  // State management
  const [loading, setLoading] = useState(true)
  const [configs, setConfigs] = useState([])
  const [selectedConfig, setSelectedConfig] = useState(null)
  const [selectedTab, setSelectedTab] = useState('general')

  // System defaults
  const [defaultGeneral, setDefaultGeneral] = useState('')
  const [defaultReport, setDefaultReport] = useState('')
  const [defaultSlide, setDefaultSlide] = useState('')

  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [slidesModalOpen, setSlidesModalOpen] = useState(false)

  // Slide preview states
  const [slideData, setSlideData] = useState(null)
  const [slideLoading, setSlideLoading] = useState(false)
  const [slideError, setSlideError] = useState(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Text expansion
  const [expandedText, setExpandedText] = useState(false)

  // Fetch all configurations
  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No active session')
        return
      }

      const { data, error } = await supabase
        .from('prompt_configs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setConfigs(data || [])

      // Find and set system defaults
      const generalDefault = data?.find(c => c.prompt_type === 'general' && c.is_system_default)
      const reportDefault = data?.find(c => c.prompt_type === 'report' && c.is_system_default)
      const slideDefault = data?.find(c => c.prompt_type === 'slide' && c.is_system_default)

      setDefaultGeneral(generalDefault?.id || '')
      setDefaultReport(reportDefault?.id || '')
      setDefaultSlide(slideDefault?.id || '')

      // Auto-select first config if none selected
      if (!selectedConfig && data && data.length > 0) {
        const firstOfType = data.find(c => c.prompt_type === selectedTab)
        if (firstOfType) {
          setSelectedConfig(firstOfType)
        }
      }
    } catch (error) {
      console.error('Error fetching configs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Set system defaults
  const setSystemDefaults = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('请先登录')
        return
      }

      // Update defaults for each type
      const updates = []

      if (defaultGeneral) {
        updates.push({ type: 'general', id: defaultGeneral })
      }
      if (defaultReport) {
        updates.push({ type: 'report', id: defaultReport })
      }
      if (defaultSlide) {
        updates.push({ type: 'slide', id: defaultSlide })
      }

      for (const update of updates) {
        // First, unset all defaults for this type
        await supabase
          .from('prompt_configs')
          .update({ is_system_default: false })
          .eq('user_id', session.user.id)
          .eq('prompt_type', update.type)

        // Then set the new default
        await supabase
          .from('prompt_configs')
          .update({ is_system_default: true })
          .eq('id', update.id)
      }

      alert('✅ 系统默认配置已更新')
      await fetchConfigs()
    } catch (error) {
      console.error('Error setting defaults:', error)
      alert('❌ 更新失败：' + error.message)
    }
  }

  // Fetch slide data from JSON URL
  const fetchSlideData = async (jsonUrl) => {
    if (!jsonUrl) return

    try {
      setSlideLoading(true)
      setSlideError(null)

      const response = await fetch(jsonUrl)
      if (!response.ok) throw new Error('Failed to fetch slide data')

      const data = await response.json()
      setSlideData(data)
      setCurrentSlideIndex(0)
    } catch (error) {
      console.error('Error fetching slide data:', error)
      setSlideError('无法加载幻灯片数据')
    } finally {
      setSlideLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  // Auto-load slide data when selecting a slide config
  useEffect(() => {
    if (selectedConfig?.prompt_type === 'slide' && selectedConfig?.generate_slides) {
      fetchSlideData(selectedConfig.generate_slides)
    } else {
      setSlideData(null)
      setSlideError(null)
    }
  }, [selectedConfig?.id])

  // Filter configs by type
  const getConfigsByType = (type) => {
    const filtered = configs.filter(c => c.prompt_type === type)
    // Sort: defaults first, then by created_at
    return filtered.sort((a, b) => {
      if (a.is_system_default && !b.is_system_default) return -1
      if (!a.is_system_default && b.is_system_default) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }

  const generalConfigs = getConfigsByType('general')
  const reportConfigs = getConfigsByType('report')
  const slideConfigs = getConfigsByType('slide')

  // Helper to truncate text
  const truncateText = (text, maxLength = 1000) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return expandedText ? text : text.substring(0, maxLength)
  }

  // Render configuration list item
  const renderConfigItem = (config) => (
    <div
      key={config.id}
      onClick={() => setSelectedConfig(config)}
      className={`
        p-3 rounded-lg cursor-pointer transition-all
        ${selectedConfig?.id === config.id ? 'bg-primary/10 border-2 border-primary' : 'hover:bg-muted/50 border border-transparent'}
      `}
    >
      <div className="flex items-center gap-2">
        {config.is_system_default && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
        <span className="font-medium">{config.name}</span>
      </div>
    </div>
  )

  // Render detail panel based on config type
  const renderDetailPanel = () => {
    if (!selectedConfig) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>选择一个配置查看详情</p>
          </div>
        </div>
      )
    }

    const { prompt_type, name, model_selection, created_at, is_system_default } = selectedConfig

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold">{name}</h3>
            {is_system_default && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Model: {model_selection}</p>
            <p>Created: {new Date(created_at).toLocaleString('zh-CN')}</p>
            <p>System Default: {is_system_default ? 'Yes' : 'No'}</p>

            {prompt_type === 'general' && selectedConfig.test_question && (
              <p className="mt-2">
                <span className="font-medium text-foreground">Test Question: </span>
                {selectedConfig.test_question}
              </p>
            )}

            {prompt_type === 'report' && selectedConfig.report_topic && (
              <p className="mt-2">
                <span className="font-medium text-foreground">Report Topic: </span>
                {selectedConfig.report_topic}
              </p>
            )}

            {prompt_type === 'slide' && selectedConfig.manus_prompt && (
              <p className="mt-2">
                <span className="font-medium text-foreground">Manus Prompt: </span>
                {selectedConfig.manus_prompt}
              </p>
            )}
          </div>
        </div>

        {/* Generated content preview */}
        {prompt_type === 'general' && selectedConfig.generated_response && (
          <div>
            <h4 className="font-semibold mb-2">📊 Generated Response:</h4>
            <div className="p-4 bg-muted/50 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">
                {truncateText(selectedConfig.generated_response)}
              </pre>
              {selectedConfig.generated_response.length > 1000 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setExpandedText(!expandedText)}
                  className="mt-2 p-0 h-auto"
                >
                  {expandedText ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  {expandedText ? '收起' : '展开全文'}
                </Button>
              )}
            </div>
          </div>
        )}

        {prompt_type === 'report' && selectedConfig.generated_report && (
          <div>
            <h4 className="font-semibold mb-2">📄 Generated Report:</h4>
            <div className="p-4 bg-muted/50 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">
                {truncateText(selectedConfig.generated_report)}
              </pre>
              {selectedConfig.generated_report.length > 1000 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setExpandedText(!expandedText)}
                  className="mt-2 p-0 h-auto"
                >
                  {expandedText ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  {expandedText ? '收起' : '展开全文'}
                </Button>
              )}
            </div>
          </div>
        )}

        {prompt_type === 'slide' && (
          <div>
            <h4 className="font-semibold mb-2">📄 Slide Preview:</h4>
            {slideLoading ? (
              <div className="p-8 bg-muted/50 rounded-lg text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading slides...</p>
              </div>
            ) : slideError ? (
              <div className="p-8 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                <p className="text-destructive">{slideError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSlideData(selectedConfig.generate_slides)}
                  className="mt-2"
                >
                  重试
                </Button>
              </div>
            ) : slideData ? (
              <div>
                <div className="bg-muted/50 rounded-lg overflow-hidden" style={{ height: '300px' }}>
                  <iframe
                    srcDoc={slideData.files?.[0]?.content || ''}
                    className="w-full h-full"
                    sandbox="allow-same-origin"
                    title="Slide Preview"
                  />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>Total Slides: {slideData.slide_ids?.length || 0}</p>
                  {slideData.slide_ids && slideData.slide_ids.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {slideData.slide_ids.map((id, idx) => (
                        <li key={idx}>• {id}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSlidesModalOpen(true)}
                  className="mt-2"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Slides
                </Button>
              </div>
            ) : (
              <div className="p-8 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">No slide data available</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setDetailsModalOpen(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Full Details
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/prompt-studio?id=${selectedConfig.id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Edit in Studio
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Default Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            System Default Configuration
          </CardTitle>
          <CardDescription>设置系统默认配置，用于不同场景的模板</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">General:</label>
              <Select value={defaultGeneral} onValueChange={setDefaultGeneral}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {generalConfigs.map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.is_system_default && '⭐ '}{config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Report:</label>
              <Select value={defaultReport} onValueChange={setDefaultReport}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {reportConfigs.map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.is_system_default && '⭐ '}{config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Slide:</label>
              <Select value={defaultSlide} onValueChange={setDefaultSlide}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {slideConfigs.map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.is_system_default && '⭐ '}{config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={setSystemDefaults}>
              Set as System Defaults
            </Button>
            <Button variant="outline" onClick={fetchConfigs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/prompt-studio?type=${selectedTab}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration List and Details */}
      <Card>
        <CardHeader>
          <CardTitle>All Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-4">
            {/* Left sidebar - Config list */}
            <div className="col-span-4 border-r pr-4">
              <Tabs value={selectedTab} onValueChange={(value) => {
                setSelectedTab(value)
                setSelectedConfig(null)
                setExpandedText(false)
              }}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">
                    General ({generalConfigs.length})
                  </TabsTrigger>
                  <TabsTrigger value="report">
                    Report ({reportConfigs.length})
                  </TabsTrigger>
                  <TabsTrigger value="slide">
                    Slide ({slideConfigs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-2 mt-4">
                  {generalConfigs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>暂无配置</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/admin/prompt-studio?type=general')}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        创建配置
                      </Button>
                    </div>
                  ) : (
                    generalConfigs.map(renderConfigItem)
                  )}
                </TabsContent>

                <TabsContent value="report" className="space-y-2 mt-4">
                  {reportConfigs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>暂无配置</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/admin/prompt-studio?type=report')}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        创建配置
                      </Button>
                    </div>
                  ) : (
                    reportConfigs.map(renderConfigItem)
                  )}
                </TabsContent>

                <TabsContent value="slide" className="space-y-2 mt-4">
                  {slideConfigs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>暂无配置</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/admin/prompt-studio?type=slide')}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        创建配置
                      </Button>
                    </div>
                  ) : (
                    slideConfigs.map(renderConfigItem)
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Right panel - Config details */}
            <div className="col-span-8">
              {renderDetailPanel()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration Details - {selectedConfig?.name}</DialogTitle>
          </DialogHeader>
          {selectedConfig && (
            <div className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList>
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  <TabsTrigger value="prompts">Prompts</TabsTrigger>
                  <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
                  <TabsTrigger value="result">Generated Result</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Name:</p>
                      <p className="text-muted-foreground">{selectedConfig.name}</p>
                    </div>
                    <div>
                      <p className="font-medium">Model:</p>
                      <p className="text-muted-foreground">{selectedConfig.model_selection}</p>
                    </div>
                    <div>
                      <p className="font-medium">Type:</p>
                      <p className="text-muted-foreground">{selectedConfig.prompt_type}</p>
                    </div>
                    <div>
                      <p className="font-medium">System Default:</p>
                      <p className="text-muted-foreground">{selectedConfig.is_system_default ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Created:</p>
                      <p className="text-muted-foreground">{new Date(selectedConfig.created_at).toLocaleString('zh-CN')}</p>
                    </div>
                    <div>
                      <p className="font-medium">Updated:</p>
                      <p className="text-muted-foreground">{new Date(selectedConfig.updated_at).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="prompts" className="space-y-4">
                  <div>
                    <p className="font-medium mb-2">System Prompt:</p>
                    <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {selectedConfig.system_prompt}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium mb-2">User Prompt Template:</p>
                    <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {selectedConfig.user_prompt_template}
                    </pre>
                  </div>
                  {selectedConfig.test_question && (
                    <div>
                      <p className="font-medium mb-2">Test Question:</p>
                      <p className="p-4 bg-muted rounded-lg text-sm">{selectedConfig.test_question}</p>
                    </div>
                  )}
                  {selectedConfig.report_topic && (
                    <div>
                      <p className="font-medium mb-2">Report Topic:</p>
                      <p className="p-4 bg-muted rounded-lg text-sm">{selectedConfig.report_topic}</p>
                    </div>
                  )}
                  {selectedConfig.manus_prompt && (
                    <div>
                      <p className="font-medium mb-2">Manus Prompt:</p>
                      <p className="p-4 bg-muted rounded-lg text-sm">{selectedConfig.manus_prompt}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="knowledge" className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Knowledge Base:</p>
                      <p className="text-muted-foreground">{selectedConfig.knowledge_base_name || 'None'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Top K Results:</p>
                      <p className="text-muted-foreground">{selectedConfig.top_k_results}</p>
                    </div>
                    <div>
                      <p className="font-medium">Strict Mode:</p>
                      <p className="text-muted-foreground">{selectedConfig.strict_mode ? 'Yes' : 'No'}</p>
                    </div>
                    {selectedConfig.user_data_name && (
                      <div>
                        <p className="font-medium">User Data:</p>
                        <p className="text-muted-foreground">{selectedConfig.user_data_name}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="result">
                  {selectedConfig.prompt_type === 'general' && selectedConfig.generated_response && (
                    <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {selectedConfig.generated_response}
                    </pre>
                  )}
                  {selectedConfig.prompt_type === 'report' && selectedConfig.generated_report && (
                    <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {selectedConfig.generated_report}
                    </pre>
                  )}
                  {selectedConfig.prompt_type === 'slide' && selectedConfig.generate_slides && (
                    <div className="space-y-2">
                      <p>Slides JSON URL:</p>
                      <a
                        href={selectedConfig.generate_slides}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm break-all"
                      >
                        {selectedConfig.generate_slides}
                      </a>
                      {selectedConfig.manus_share_url && (
                        <>
                          <p className="mt-4">Manus Share URL:</p>
                          <a
                            href={selectedConfig.manus_share_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm break-all"
                          >
                            {selectedConfig.manus_share_url}
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All Slides Modal */}
      <Dialog open={slidesModalOpen} onOpenChange={setSlidesModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>All Slides - {selectedConfig?.name}</DialogTitle>
          </DialogHeader>
          {slideData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                  >
                    ◀ Prev
                  </Button>
                  <span className="text-sm">
                    Slide {currentSlideIndex + 1} / {slideData.files?.length || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentSlideIndex(Math.min((slideData.files?.length || 1) - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex >= (slideData.files?.length || 1) - 1}
                  >
                    Next ▶
                  </Button>
                </div>
                {selectedConfig?.manus_share_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedConfig.manus_share_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Manus
                  </Button>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <iframe
                  srcDoc={slideData.files?.[currentSlideIndex]?.content || ''}
                  className="w-full h-full"
                  sandbox="allow-same-origin"
                  title={`Slide ${currentSlideIndex + 1}`}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
