import * as React from "react"
import { useRouter } from "next/router"
import { supabase } from "../../lib/supabase"
import { ArrowBigRightIcon } from 'lucide-react'
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"
import { cn } from "../../src/lib/utils"
import { 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadarChart, Radar
} from 'recharts'

// 图表组件
const ChartCard = ({ title, children, className }) => (
  <div className={cn("bg-white p-6 rounded-lg shadow-sm border border-gray-200", className)}>
    <h3 className="text-lg font-semibold text-gray-900 mb-4 font-instrument-sans text-center">{title}</h3>
    <div className="w-full h-64">
      {children}
    </div>
  </div>
)

// 自定义图表样式
const chartStyle = {
  fontSize: '12px',
  fontFamily: 'inherit'
}

// 高级 HoverCard 组件
const AdvancedTooltip = ({ children, content, className }) => {
  const [isOpen, setOpen] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const springConfig = { stiffness: 100, damping: 15 }
  const x = useMotionValue(0)
  const translateX = useSpring(x, springConfig)

  const handleMouseMove = (event) => {
    const targetRect = event.target.getBoundingClientRect()
    const eventOffsetX = event.clientX - targetRect.left
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2
    x.set(offsetFromCenter)
  }

  if (!isMounted) {
    return <span className={cn("text-black dark:text-white", className)}>{children}</span>
  }

  return (
    <HoverCardPrimitive.Root
      openDelay={50}
      closeDelay={100}
      onOpenChange={(open) => {
        setOpen(open)
      }}
    >
      <HoverCardPrimitive.Trigger
        onMouseMove={handleMouseMove}
        className={cn("text-black dark:text-white cursor-pointer", className)}
      >
        {children}
      </HoverCardPrimitive.Trigger>

      <HoverCardPrimitive.Content
        className="[transform-origin:var(--radix-hover-card-content-transform-origin)]"
        side="top"
        align="center"
        sideOffset={10}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.6 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                },
              }}
              exit={{ opacity: 0, y: 20, scale: 0.6 }}
              className="shadow-xl rounded-xl"
              style={{
                x: translateX,
              }}
            >
              <div className="block p-4 bg-white text-gray-900 border border-gray-200 shadow rounded-xl max-w-md">
                <div className="text-sm leading-relaxed evidence-tooltip">{content}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Root>
  )
}

const Hero = React.forwardRef(({ className, title, subtitle, eyebrow, ctaText, ctaLink, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col items-center bg-[#f3f1ea]", className)}
      {...props}
    >
      {eyebrow && (
        <p 
          className="font-instrument-sans uppercase tracking-[0.51em] leading-[133%] text-center text-[19px] mt-[249px] mb-8 text-[#000000] animate-appear opacity-0"
        >
          {eyebrow}
        </p>
      )}

      <h1 
        className="text-[64px] leading-[83px] text-center px-4 lg:px-[314px] text-[#000000] animate-appear opacity-0 delay-100"
      >
        {title}
      </h1>

      {subtitle && (
        <p 
          className="text-[28px] text-center font-instrument-sans font-light px-4 lg:px-[314px] mt-[25px] mb-[48px] leading-[133%] text-[#000000] animate-appear opacity-0 delay-300"
        >
          {subtitle}
        </p>
      )}

      {ctaText && ctaLink && (
        <a href={ctaLink}>
          <div 
            className="inline-flex items-center bg-[#000000] text-[#ffffff] rounded-[10px] hover:bg-[#000000]/90 transition-colors font-instrument-sans w-[227px] h-[49px] animate-appear opacity-0 delay-500"
          >
            <div className="flex items-center justify-between w-full pl-[22px] pr-[17px]">
              <span className="text-[19px] whitespace-nowrap">{ctaText}</span>
              <div className="flex items-center gap-[14px]">
                <div className="w-[36px] h-[15px] relative flex items-center justify-center">
                  <ArrowBigRightIcon className="w-6 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </a>
      )}
    </div>
  )
})
Hero.displayName = "Hero"

// 添加动画样式
const animationStyles = `
  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-appear {
    animation: appear 0.8s ease-out forwards;
  }
  
  .delay-100 {
    animation-delay: 0.1s;
  }
  
  .delay-300 {
    animation-delay: 0.3s;
  }
  
  .delay-500 {
    animation-delay: 0.5s;
  }
  
  .delay-700 {
    animation-delay: 0.7s;
  }
  
  @font-face {
    font-family: 'Instrument Sans';
    src: url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@300;400;500;600;700&display=swap');
  }
  
  .font-instrument-sans {
    font-family: 'Instrument Sans', sans-serif;
  }

  .tooltip-trigger {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tooltip-trigger:hover {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 8px;
    margin: -8px;
  }

  .evidence-tooltip {
    max-width: 400px;
    line-height: 1.6;
  }

  .evidence-tooltip p {
    margin: 0;
  }
`;

export default function DynamicReportPage() {
  const router = useRouter()
  const { sessionId } = router.query
  const [reportData, setReportData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    if (!sessionId) return

    const fetchReportData = async () => {
      try {
        setLoading(true)
        
        // 从数据库获取报告数据
        const { data, error } = await supabase
          .from('n8n_chat_histories')
          .select('message')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          throw new Error('Failed to fetch report data')
        }

        if (!data || data.length === 0) {
          throw new Error('No report found for this session')
        }

        const message = data[0].message
        if (message.type === 'ai' && message.content) {
          // 检查内容是否是 JSON 格式
          if (typeof message.content === 'string' && message.content.trim().startsWith('{')) {
            try {
              const content = JSON.parse(message.content)
              if (content.output && content.output.reportTitle) {
                setReportData(content.output)
              } else {
                throw new Error('Invalid report format')
              }
            } catch (parseError) {
              throw new Error('Failed to parse report content')
            }
          } else {
            throw new Error('Report content is not in JSON format')
          }
        } else {
          throw new Error('Invalid message format')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [sessionId])

  if (loading) {
    return (
      <>
        <style jsx global>{animationStyles}</style>
        <div className="min-h-screen bg-[#f3f1ea] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-xl font-instrument-sans">Loading report...</p>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <style jsx global>{animationStyles}</style>
        <div className="min-h-screen bg-[#f3f1ea] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4 font-instrument-sans">Error Loading Report</h1>
            <p className="text-gray-600 mb-4 font-instrument-sans">{error}</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-instrument-sans"
            >
              Back to Home
            </button>
          </div>
        </div>
      </>
    )
  }

  if (!reportData) {
    return (
      <>
        <style jsx global>{animationStyles}</style>
        <div className="min-h-screen bg-[#f3f1ea] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-600 mb-4 font-instrument-sans">No Report Data</h1>
            <button 
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-instrument-sans"
            >
              Back to Home
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style jsx global>{animationStyles}</style>
      
      <div className="min-h-screen bg-[#f3f1ea]">
        <Hero
          eyebrow="AI-Generated Analysis Report"
          title={reportData.reportTitle || "Relationship Analysis Report"}
          subtitle="Comprehensive insights based on conversation patterns and psychological research"
        />
        
        {/* 总体评分 */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Overall Assessment
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#f3f1ea] p-8 rounded-lg text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-blue-600">{reportData.overallScore || 'N/A'}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-instrument-sans">Overall Score</h3>
                <p className="text-gray-600 font-instrument-sans">Out of 10</p>
              </div>
              
              <div className="bg-[#f3f1ea] p-8 rounded-lg text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-instrument-sans">Risk Level</h3>
                <p className="text-gray-600 font-instrument-sans">{reportData.riskLevel || 'Unknown'}</p>
              </div>
              
              <div className="bg-[#f3f1ea] p-8 rounded-lg text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💚</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-instrument-sans">Relationship Health</h3>
                <p className="text-gray-600 font-instrument-sans">{reportData.relationshipHealth || 'Unknown'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 关键优势 */}
        <section className="py-20 bg-[#f3f1ea]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Key Strengths
              </h2>
            </div>

            <div className="bg-white p-8 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportData.keyStrengths && reportData.keyStrengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                    <p className="text-gray-600 font-instrument-sans">{strength}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 关键问题 */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Key Concerns
              </h2>
            </div>

            <div className="bg-[#f3f1ea] p-8 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportData.keyConcerns && reportData.keyConcerns.map((concern, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-sm">⚠</span>
                    </div>
                    <p className="text-gray-600 font-instrument-sans">{concern}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 可视化评估 */}
        {reportData.charts && (
          <section className="py-20 bg-[#f3f1ea]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                  Visual Assessment
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 饼图 - 关系健康分析 */}
                {reportData.charts.scoreBreakdown && (
                  <ChartCard title={reportData.charts.scoreBreakdown.title}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.charts.scoreBreakdown.data.labels.map((label, index) => ({
                            name: label,
                            value: reportData.charts.scoreBreakdown.data.values[index]
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.charts.scoreBreakdown.data.labels.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={reportData.charts.scoreBreakdown.data.colors[index]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={chartStyle} />
                        <Legend wrapperStyle={chartStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* 折线图 - 关系质量随时间变化 */}
                {reportData.charts.progressOverTime && (
                  <ChartCard title={reportData.charts.progressOverTime.title}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={reportData.charts.progressOverTime.data.timeLabels.map((time, index) => ({
                        time,
                        ...reportData.charts.progressOverTime.data.datasets.reduce((acc, dataset) => {
                          acc[dataset.label] = dataset.values[index];
                          return acc;
                        }, {})
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={chartStyle} />
                        <Legend wrapperStyle={chartStyle} />
                        {reportData.charts.progressOverTime.data.datasets.map((dataset, index) => (
                          <Line
                            key={index}
                            type="monotone"
                            dataKey={dataset.label}
                            stroke={dataset.color}
                            strokeWidth={2}
                            dot={{ fill: dataset.color, strokeWidth: 2, r: 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* 雷达图 - 关系维度评估 */}
                {reportData.charts.relationshipDimensions && (
                  <ChartCard title={reportData.charts.relationshipDimensions.title}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={reportData.charts.relationshipDimensions.data.labels.map((label, index) => ({
                        subject: label,
                        A: reportData.charts.relationshipDimensions.data.values[index],
                        fullMark: 10
                      }))}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
                        <Radar
                          name="Score"
                          dataKey="A"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Tooltip contentStyle={chartStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* 柱状图 - 沟通模式频率分析 */}
                {reportData.charts.communicationPatterns && (
                  <ChartCard title={reportData.charts.communicationPatterns.title}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.charts.communicationPatterns.data.labels.map((label, index) => ({
                        name: label,
                        value: reportData.charts.communicationPatterns.data.values[index],
                        category: reportData.charts.communicationPatterns.data.categories[index]
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={chartStyle} />
                        <Bar dataKey="value" fill="#8884d8">
                          {reportData.charts.communicationPatterns.data.labels.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={reportData.charts.communicationPatterns.data.colors[index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </div>

              {/* 图表说明 */}
              {reportData.charts.communicationPatterns?.description && (
                <div className="mt-8 bg-white p-6 rounded-lg">
                  <p className="text-sm text-gray-600 font-instrument-sans text-center">
                    {reportData.charts.communicationPatterns.description}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 详细分析 */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Detailed Analysis
              </h2>
            </div>

            <div className="space-y-8">
              {reportData.analysisPoints && reportData.analysisPoints.map((point, index) => (
                <div key={index} className="bg-[#f3f1ea] p-8 rounded-lg">
                  <div className="mb-4">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded font-instrument-sans">
                      {point.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">
                    {point.main}
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2 font-instrument-sans">
                        Evidence & Research: 
                        {point.evidence && <span className="text-xs text-gray-400"> (hover for evidence)</span>}
                      </h4>
                      {point.evidence ? (
                        <AdvancedTooltip 
                          content={point.evidence}
                          className="font-instrument-sans"
                        >
                          <p className="text-gray-600 font-instrument-sans cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border-l-2 border-green-200 pl-3">
                            {point.knowledge}
                          </p>
                        </AdvancedTooltip>
                      ) : (
                        <p className="text-gray-600 font-instrument-sans border-l-2 border-green-200 pl-3 py-2">
                          {point.knowledge}
                        </p>
                      )}
                    </div>
                    {point.action && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2 font-instrument-sans">Action:</h4>
                        <p className="text-gray-600 font-instrument-sans border-l-2 border-purple-200 pl-3 py-2 bg-purple-50">
                          {point.action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 建议 */}
        <section className="py-20 bg-[#f3f1ea]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Recommendations
              </h2>
            </div>

            <div className="bg-white p-8 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportData.recommendations && reportData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-sm">{index + 1}</span>
                    </div>
                    <p className="text-gray-600 font-instrument-sans">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 下一步 */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Next Steps
              </h2>
            </div>

            <div className="bg-[#f3f1ea] p-8 rounded-lg">
              <p className="text-lg text-gray-600 font-instrument-sans leading-relaxed">
                {reportData.nextSteps}
              </p>
            </div>
          </div>
        </section>

        {/* 返回按钮 */}
        <section className="py-16 bg-[#f3f1ea]">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <button 
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-12 px-8 font-instrument-sans"
            >
              Back to Home
            </button>
          </div>
        </section>
      </div>
    </>
  );
} 