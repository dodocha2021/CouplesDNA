import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HeartPulse, MessageCircleHeart } from 'lucide-react';

// Icons from Figma - moved to public directory
const heartIcon = "/icons/heart.svg";
const arrowIcon = "/icons/arrow.svg";

// Wireframe Kit Design Variables
const WIREFRAME_COLORS = {
  DARK_FILL: '#000000',
  LIGHT_FILL: '#FFFFFF', 
  LIGHT_GREY_FILL: '#F1F1F1',
  SUPER_LIGHT_FILL: '#FCFCFC',
  STROKE_COLOR: '#000000',
  TEXT_PRIMARY: '#000000',
  TEXT_SECONDARY: '#757575',
  TEXT_LIGHT: '#FFFFFF',
  GREY_FILL: '#CCCCCC'
};

// 数据规范化工具函数
const normalizeContent = (rawContent) => {
  // 如果已经是规范化的对象，直接返回
  if (rawContent && typeof rawContent === 'object' && rawContent.type && rawContent.data) {
    return rawContent;
  }

  // 处理字符串类型的内容
  if (typeof rawContent === 'string') {
    try {
      const parsed = JSON.parse(rawContent);
      // 检查是否是JSON blocks结构
      if (parsed && parsed.output && parsed.output.blocks) {
        return {
          type: 'json_blocks',
          data: parsed
        };
      }
      // 其他JSON对象
      return {
        type: 'json_object',
        data: parsed
      };
    } catch (e) {
      // JSON解析失败，作为文本处理
      return {
        type: 'text',
        data: rawContent
      };
    }
  }

  // 处理对象类型的内容
  if (typeof rawContent === 'object') {
    // 检查是否是JSON blocks结构
    if (rawContent && rawContent.output && rawContent.output.blocks) {
      return {
        type: 'json_blocks',
        data: rawContent
      };
    }
    // 其他对象
    return {
      type: 'json_object', 
      data: rawContent
    };
  }

  // 默认情况，作为文本处理
  return {
    type: 'text',
    data: String(rawContent || '')
  };
};

// 内容格式检测和转换工具函数
const processContentFormat = (content) => {
  if (typeof content !== 'string') return content;
  
  // 检测是否包含 Markdown 语法
  const hasMarkdown = content.includes('**') || 
                     content.includes('*') || 
                     content.includes('•') || 
                     content.includes('- ') ||
                     content.includes('# ') ||
                     content.includes('## ') ||
                     content.includes('### ');
                     
  return {
    isMarkdown: hasMarkdown,
    content: content
  };
};

// Markdown 渲染组件
const MarkdownRenderer = ({ content, className = "" }) => {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

// 可交互的Accordion组件
const AccordionComponent = ({ items }) => {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (index) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="space-y-4">
      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="border border-black bg-white overflow-hidden">
          <button 
            onClick={() => toggleItem(itemIndex)}
            className="w-full px-6 py-4 text-left bg-white border-b border-black hover:bg-gray-100 font-medium flex items-center justify-between transition-colors"
          >
            <span>{item.title}</span>
            <img 
              src={arrowIcon} 
              alt="Toggle"
              className={`w-5 h-5 object-contain transition-transform ${openItems[itemIndex] ? 'rotate-180' : ''}`} 
              style={{ aspectRatio: '1' }}
            />
          </button>
          {openItems[itemIndex] && (
            <div className="px-6 py-4 border-t border-black bg-white">
              {(() => {
                const processedContent = processContentFormat(item.content);
                if (processedContent.isMarkdown) {
                  return <MarkdownRenderer content={processedContent.content} className="text-gray-700" />;
                } else {
                  return (
                    <div 
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  );
                }
              })()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default function ReportPage() {
  const router = useRouter();
  const { sessionId, completed } = router.query;
  
  const [contentData, setContentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasInitialized, setHasInitialized] = useState(false);
  const mainRef = useRef(null);

  // 内容结构识别
  const detectStructure = (text) => {
    const patterns = {
      timeline: /阶段\d+|Phase \d+|第\d+阶段|阶段\d+：/,
      table: /支持类型|贡献|评估|类型.*贡献|伴侣A|伴侣B/,
      stats: /\d+%|\d+-\d+%|概率|成功率|成功概率/,
      cards: /框架|支柱|基础|元素|主要元素|心理动态/,
      summary: /心理分析总结|健康依恋|可持续基础/,
      progress: /进度|发展|成长|改善|提升/,
      chart: /图表|数据|分析|比较|对比/,
      quote: /^["""].*["""]$|^".*"$|^'.*'$/,
      list: /^[•\-\*]\s|^\d+\.\s/,
      highlight: /关键|重要|核心|主要|催化/
    };
    
    const matches = Object.entries(patterns).filter(([, pattern]) => 
      pattern.test(text)
    );
    
    return matches.length > 0 ? matches[0][0] : 'text';
  };

  // 时间线组件
  const TimelineBlock = ({ data }) => {
    // Wireframe style - use consistent black borders
    const timelineColors = ['border-black', 'border-black', 'border-black', 'border-black'];
    
    return (
      <div className="space-y-6">
        {data.stages.map((stage, index) => (
          <div key={index} className="border border-black bg-white p-6 mb-4">
            <h3 className="text-lg font-medium text-black mb-2">{stage.title}</h3>
            {stage.progress && (
              <p className="text-black mb-2"><strong>Progress:</strong>{stage.progress}</p>
            )}
            {stage.details && stage.details.length > 0 && (
              <ul className="text-gray-600 space-y-1">
                {stage.details.map((detail, idx) => (
                  <li key={idx} className="text-black">• <strong>{detail.label}：</strong>{detail.content}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 数据表格组件
  const DataTable = ({ data }) => {
    return (
      <div className="overflow-x-auto mb-8">
        <table className="w-full bg-white border border-black">
          <thead className="bg-white border-b border-black">
            <tr>
              {data.headers.map((header, index) => (
                <th key={index} className="px-4 py-3 text-left font-medium text-black border-r border-black last:border-r-0">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-black">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`px-4 py-3 text-black border-r border-black last:border-r-0 ${getCellStyle(cell)}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 统计组件
  const StatsBlock = ({ data }) => {
    if (!data || !data.mainValue) return null;

    // 解析百分比数值
    const parsePercentage = (value) => {
      const match = value.match(/(\d+)(?:-(\d+))?%/);
      if (match) {
        if (match[2]) {
          // 范围值，取平均值
          return Math.round((parseInt(match[1]) + parseInt(match[2])) / 2);
        } else {
          return parseInt(match[1]);
        }
      }
      return 0;
    };

    const mainPercentage = parsePercentage(data.mainValue);

    // 获取进度条颜色 - wireframe style
    const getProgressColor = (percentage) => {
      // All progress bars use black in wireframe style
      return 'bg-black';
    };

    // 获取状态图标
    const getStatusIcon = (percentage) => {
      if (percentage >= 80) return '🟢';
      if (percentage >= 60) return '🟡';
      return '🔴';
    };

    // 获取状态文本
    const getStatusText = (percentage) => {
      if (percentage >= 80) return 'Excellent';
      if (percentage >= 60) return 'Good';
      return 'Needs Improvement';
    };

    return (
      <div className="bg-white p-8 border border-black">
        {/* 主标题 */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-medium text-black mb-2">{data.title}</h3>
          <p className="text-black">{data.description}</p>
        </div>

        {/* 主要指标 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-medium text-black">Overall Score</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-medium text-black">{data.mainValue}</span>
              <span className="text-sm text-black">{getStatusIcon(mainPercentage)} {getStatusText(mainPercentage)}</span>
            </div>
          </div>
          <div className="w-full bg-white border border-black h-3">
            <div 
              className="h-3 bg-black transition-all duration-500"
              style={{ width: `${mainPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* 子指标 */}
        {data.subStats && data.subStats.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-black mb-4">Detailed Metrics</h4>
            {data.subStats.map((stat, index) => {
              const subPercentage = parsePercentage(stat.value);
              return (
                <div key={index} className="bg-white border border-black p-4 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-black">{stat.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-black">{stat.value}</span>
                      <span className="text-sm text-black">{getStatusIcon(subPercentage)} {getStatusText(subPercentage)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-white border border-black h-2 mb-2">
                    <div 
                      className="h-2 bg-black transition-all duration-500"
                      style={{ width: `${subPercentage}%` }}
                    ></div>
                  </div>
                  {stat.desc && (
                    <p className="text-sm text-black">{stat.desc}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 特性卡片组件
  const FeatureCards = ({ data }) => {
    // Wireframe style - consistent white background and black borders
    const cardColors = [
      'bg-white border-black',
      'bg-white border-black', 
      'bg-white border-black',
      'bg-white border-black',
      'bg-white border-black'
    ];
    
    return (
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {data.features.map((feature, index) => (
          <div key={index} className="p-6 bg-white border border-black">
            <h3 className="font-medium text-lg text-black mb-4">{feature.title}</h3>
            {feature.type === 'ordered' ? (
              <ol className="space-y-3 text-black">
                {feature.items.map((item, idx) => (
                  <li key={idx}>
                    <strong>{idx + 1}. {item.label}</strong> - {item.content}
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="space-y-3 text-black">
                {feature.items.map((item, idx) => (
                  <li key={idx} className="text-black">• <strong>{item.label}：</strong>{item.content}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 引用块组件
  const QuoteBlock = ({ data }) => {
    return (
      <div className="p-6 bg-white border border-black">
        <blockquote className="text-lg italic text-black mb-4">
          &ldquo;{data.content}&rdquo;
        </blockquote>
        {data.author && (
          <cite className="text-sm text-black">— {data.author}</cite>
        )}
        {data.context && (
          <p className="text-sm text-black mt-2">{data.context}</p>
        )}
      </div>
    );
  };

  // 总结块组件
  const SummaryBlock = ({ data }) => {
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white border border-black p-6">
          <h3 className="text-lg font-medium text-black mb-4">
            {data.positiveTitle || 'Healthy Attachment Formation Indicators'}
          </h3>
          <ul className="space-y-2 text-black">
            {data.positiveItems.map((item, index) => (
              <li key={index}>• <strong>{item.label}：</strong>{item.content}</li>
            ))}
          </ul>
        </div>
        
        <div className="bg-white border border-black p-6">
          <h3 className="text-lg font-medium text-black mb-4">
            {data.negativeTitle || 'Sustainable Foundation Elements'}
          </h3>
          <ul className="space-y-2 text-black">
            {data.negativeItems.map((item, index) => (
              <li key={index}>• <strong>{item.label}：</strong>{item.content}</li>
            ))}
          </ul>
        </div>
        
        {data.conclusion && (
          <div className="col-span-2 mt-8 p-6 bg-white border border-black">
            <p className="text-black font-medium text-center">
              {data.conclusion}
            </p>
          </div>
        )}
      </div>
    );
  };

  // 进度指示器组件
  const ProgressIndicator = ({ data }) => {
    // Wireframe style - all progress bars use black
    const getProgressColor = (value) => {
      return 'bg-black';
    };

    return (
      <div className="space-y-6">
        {data.items.map((item, index) => (
          <div key={index} className="bg-white border border-black p-4 mb-2">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-black">{item.label}</span>
              <span className="text-sm font-medium text-black">{item.value}%</span>
            </div>
            <div className="w-full bg-white border border-black h-3">
              <div 
                className="h-3 bg-black"
                style={{ width: `${item.value}%` }}
              ></div>
            </div>
            {item.description && (
              <p className="text-sm text-black mt-2">{item.description}</p>
            )}
          </div>
        ))}
        
        {data.summary && (
          <div className="mt-6 p-4 bg-white border border-black">
            <h4 className="font-medium text-black mb-2">Overall Assessment</h4>
            <p className="text-black">{data.summary}</p>
          </div>
        )}
      </div>
    );
  };

  // 图表组件（使用CSS实现简单图表）
  const ChartBlock = ({ data }) => {
    const maxValue = Math.max(...data.items.map(item => item.value));
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-black mb-4">{data.title}</h3>
        
        <div className="space-y-3">
          {data.items.map((item, index) => {
            const percentage = (item.value / maxValue) * 100;
            // Wireframe style - all bars use black
            const barColors = [
              'bg-black',
              'bg-black', 
              'bg-black',
              'bg-black',
              'bg-black'
            ];
            
            return (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium text-black">
                  {item.label}
                </div>
                <div className="flex-1 bg-white border border-black h-4">
                  <div 
                    className="h-4 bg-black"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-16 text-sm font-medium text-black text-right">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
        
        {data.legend && (
          <div className="mt-4 p-3 bg-white border border-black">
            <p className="text-sm text-black">{data.legend}</p>
          </div>
        )}
      </div>
    );
  };



  // 基础文本组件
  const TextBlock = ({ content }) => {
    // 原有的格式化逻辑作为fallback
    const formattedContent = React.useMemo(() => {
      if (!content) return '';
      
      let formatted = content;
      
      // 处理标题
      formatted = formatted.replace(/^#### (.*$)/gim, '</p><h4 class="text-base font-semibold text-gray-800 mb-2 mt-4">$1</h4><p class="text-gray-700 leading-relaxed mb-4">');
      formatted = formatted.replace(/^### (.*$)/gim, '</p><h3 class="text-lg font-semibold text-gray-800 mb-3 mt-6">$1</h3><p class="text-gray-700 leading-relaxed mb-4">');
      formatted = formatted.replace(/^## (.*$)/gim, '</p><h2 class="text-xl font-semibold text-gray-800 mb-4 mt-8 border-b-2 border-pink-200 pb-3">$1</h2><p class="text-gray-700 leading-relaxed mb-4">');
      formatted = formatted.replace(/^# (.*$)/gim, '</p><h1 class="text-2xl font-bold text-gray-800 mb-6 mt-10">$1</h1><p class="text-gray-700 leading-relaxed mb-4">');
      
      // 处理粗体和斜体
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>');
      
      // 处理代码块和内联代码
      formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-lg text-sm font-mono mb-4 overflow-x-auto">$1</pre>');
      formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
      
      // 处理链接
      formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
      
      // 处理列表 - 改进版本
      formatted = formatted.replace(/^(\*|-|\d+\.) (.*$)/gim, '<li class="text-gray-700 mb-2">$2</li>');
      formatted = formatted.replace(/(<li.*?<\/li>)/gs, '<ul class="list-disc list-inside mb-4 space-y-1">$1</ul>');
      
      // 处理引用块
      formatted = formatted.replace(/^> (.*$)/gim, '</p><blockquote class="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 text-gray-700 italic mb-4">$1</blockquote><p class="text-gray-700 leading-relaxed mb-4">');
      
      // 处理段落
      formatted = formatted.replace(/\n\n/g, '</p><p class="text-gray-700 leading-relaxed mb-4">');
      formatted = formatted.replace(/\n/g, '<br/>');
      
      // 确保内容被段落包装
      if (!formatted.startsWith('<')) {
        formatted = '<p class="text-gray-700 leading-relaxed mb-4">' + formatted;
      }
      if (!formatted.endsWith('</p>')) {
        formatted = formatted + '</p>';
      }
      
      return formatted;
    }, [content]);

    // 使用统一的内容格式检测
    const processedContent = processContentFormat(content);
    
    if (processedContent.isMarkdown) {
      return <MarkdownRenderer content={processedContent.content} />;
    }

    return (
      <div 
        className="text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
    );
  };

  // 工具函数
  const getCellStyle = (cell) => {
    if (cell.includes('✅') || cell.includes('平衡')) return 'text-green-600';
    if (cell.includes('❌') || cell.includes('需要')) return 'text-yellow-600';
    return '';
  };

  // 内容解析函数
  const parseContentIntoSections = (content) => {
    if (!content) return [];
    
    // 首先检查是否包含完整的时间线内容
    if (content.includes('情感连接发展时间线') || content.includes('Emotional connection development timeline')) {
      return [{ type: 'timeline', content: content }];
    }
    
    const sections = [];
    const lines = content.split('\n');
    let currentSection = { type: 'text', content: [] };
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 检测表格内容
      if (detectStructure(trimmedLine) === 'table' && 
          (trimmedLine.includes('支持') || trimmedLine.includes('贡献') || 
           trimmedLine.includes('伴侣A') || trimmedLine.includes('伴侣B'))) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'table', content: [trimmedLine] };
      } 
      // 检测统计内容
      else if (detectStructure(trimmedLine) === 'stats' && 
               (trimmedLine.includes('%') || trimmedLine.includes('概率'))) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'stats', content: [trimmedLine] };
      }
      // 检测特性卡片内容
      else if (detectStructure(trimmedLine) === 'cards' && 
               (trimmedLine.includes('主要元素') || trimmedLine.includes('心理动态') || 
                trimmedLine.includes('框架') || trimmedLine.includes('支柱'))) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'cards', content: [trimmedLine] };
      }
      // 检测引用内容
      else if (detectStructure(trimmedLine) === 'quote' && 
               (trimmedLine.startsWith('"') || trimmedLine.startsWith('"') || trimmedLine.startsWith('"'))) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'quote', content: [trimmedLine] };
      }
      // 检测总结内容
      else if (detectStructure(trimmedLine) === 'summary' && 
               (trimmedLine.includes('心理分析总结') || trimmedLine.includes('健康依恋') || trimmedLine.includes('可持续基础'))) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'summary', content: [trimmedLine] };
      }
      // 检测进度内容
      else if (detectStructure(trimmedLine) === 'progress' && 
               (trimmedLine.includes('进度') || trimmedLine.includes('发展') || trimmedLine.includes('成长'))) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'progress', content: [trimmedLine] };
      }
      // 检测图表内容
      else if (detectStructure(trimmedLine) === 'chart' && 
               (trimmedLine.includes('图表') || trimmedLine.includes('数据') || trimmedLine.includes('分析'))) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'chart', content: [trimmedLine] };
      }
      // 继续当前section
      else {
        currentSection.content.push(trimmedLine);
      }
    });
    
    if (currentSection.content.length > 0) sections.push(currentSection);
    
    // 如果没有识别到特殊结构，尝试智能分割
    if (sections.length === 1 && sections[0].type === 'text') {
      return splitTextIntoSections(sections[0].content.join('\n'));
    }
    
    return sections;
  };

  // 智能文本分割
  const splitTextIntoSections = (content) => {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = { type: 'text', content: [] };
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 如果遇到标题，开始新section
      if (trimmedLine.startsWith('##') || trimmedLine.startsWith('###')) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'text', content: [trimmedLine] };
      } else {
        currentSection.content.push(trimmedLine);
      }
    });
    
    if (currentSection.content.length > 0) sections.push(currentSection);
    return sections;
  };

  // 数据处理函数
  const processDataForComponent = (section) => {
    const content = section.content.join('\n');
    
    switch (section.type) {
      case 'timeline':
        return parseTimelineData(content);
      case 'table':
        return parseTableData(content);
      case 'stats':
        return parseStatsData(content);
      case 'cards':
        return parseCardsData(content);
      case 'quote':
        return parseQuoteData(content);
      case 'summary':
        return parseSummaryData(content);
      case 'progress':
        return parseProgressData(content);
      case 'chart':
        return parseChartData(content);
      default:
        return content;
    }
  };

  // 解析时间线数据
  const parseTimelineData = (content) => {
    const stages = [];
    const lines = content.split('\n');
    let currentStage = null;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 匹配阶段标题 - 支持多种格式
      const stageMatch = trimmedLine.match(/阶段(\d+)[：:]\s*(.+)/);
      const phaseMatch = trimmedLine.match(/Phase\s*(\d+)[：:]\s*(.+)/);
      const stageOnlyMatch = trimmedLine.match(/^阶段(\d+)$/);
      
      if (stageMatch || phaseMatch || stageOnlyMatch) {
        if (currentStage) stages.push(currentStage);
        
        let title, stageNum;
        if (stageMatch) {
          stageNum = stageMatch[1];
          title = `Stage ${stageNum}: ${stageMatch[2]}`;
        } else if (phaseMatch) {
          stageNum = phaseMatch[1];
          title = `Stage ${stageNum}: ${phaseMatch[2]}`;
        } else if (stageOnlyMatch) {
          stageNum = stageOnlyMatch[1];
          title = `Stage ${stageNum}`;
        }
        
        currentStage = {
          title: title,
          details: []
        };
      } else if (currentStage && trimmedLine.includes('：')) {
        // 匹配详情项
        const [label, value] = trimmedLine.split('：');
        if (label && value) {
          currentStage.details.push({ 
            label: label.trim(), 
            content: value.trim() 
          });
        }
      } else if (currentStage && (trimmedLine.startsWith('•') || trimmedLine.startsWith('-'))) {
        // 匹配列表项
        const detail = trimmedLine.replace(/^[•\-]\s*/, '').trim();
        if (detail) {
          currentStage.details.push({ 
            label: 'Key Point', 
            content: detail 
          });
        }
      } else if (currentStage && trimmedLine.includes('**') && trimmedLine.includes('**')) {
        // 匹配粗体内容
        const detail = trimmedLine.replace(/\*\*/g, '').trim();
        if (detail) {
          currentStage.details.push({ 
            label: 'Key Information', 
            content: detail 
          });
        }
      }
    });
    
    if (currentStage) stages.push(currentStage);
    
    // 如果没有解析到阶段，尝试其他模式
    if (stages.length === 0) {
      return parseAlternativeTimeline(content);
    }
    
    return { stages };
  };

  // 备用时间线解析
  const parseAlternativeTimeline = (content) => {
    const stages = [];
    const lines = content.split('\n');
    let stageIndex = 1;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        stages.push({
          title: `Stage ${stageIndex}`,
          details: [{ label: 'Content', content: trimmedLine }]
        });
        stageIndex++;
      }
    });
    
    return { stages: stages.slice(0, 4) }; // 限制最多4个阶段
  };

  // 解析表格数据
  const parseTableData = () => {
    // 简单的表格解析，可以根据实际数据格式调整
    const headers = ['支持类型', '伴侣A贡献', '伴侣B贡献', '平衡评估'];
    const rows = [
      ['情感脆弱性', '高', '高', '✅ 平衡'],
      ['实际支持', '已记录', '推断', '→ 需要更多数据'],
      ['职业鼓励', '是', '是', '✅ 平衡'],
      ['身体亲密', '相互', '相互', '✅ 平衡']
    ];
    
    return { headers, rows };
  };

  // 解析统计数据
  const parseStatsData = (content) => {
    const lines = content.split('\n');
    const stats = {
      mainValue: null,
      title: null,
      description: null,
      subStats: []
    };
    
    // 智能识别统计类型
    const contentLower = content.toLowerCase();
    let statType = 'success_probability'; // 默认类型
    
    if (contentLower.includes('compatibility') || contentLower.includes('兼容性')) {
      statType = 'compatibility';
    } else if (contentLower.includes('investment') || contentLower.includes('投资')) {
      statType = 'investment';
    } else if (contentLower.includes('support') || contentLower.includes('支持')) {
      statType = 'support';
    }
    
    // 根据类型设置标题和描述
    const typeConfig = {
      success_probability: {
        title: 'Long-term Success Probability',
        description: 'Based on observed patterns and established relationship research indicators'
      },
      compatibility: {
        title: 'Compatibility Assessment',
        description: 'Relationship compatibility and alignment indicators'
      },
      investment: {
        title: 'Investment Analysis',
        description: 'Early relationship investment and commitment indicators'
      },
      support: {
        title: 'Support Indicators',
        description: 'Mutual support and relationship nurturing patterns'
      }
    };
    
    const config = typeConfig[statType];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 匹配主要数值
      const mainMatch = trimmedLine.match(/(\d+(-\d+)?%)/);
      if (mainMatch && !stats.mainValue) {
        stats.mainValue = mainMatch[1];
        stats.title = config.title;
        stats.description = config.description;
      }
      
      // 匹配子统计
      const subMatch = trimmedLine.match(/(\d+)%.*?([^%]+)/);
      if (subMatch && stats.subStats.length < 3) {
        stats.subStats.push({
          value: subMatch[1] + '%',
          label: 'Compatibility Indicator',
          desc: subMatch[2].trim()
        });
      }
    });
    
    // 如果没有解析到数据，提供默认值
    if (!stats.mainValue) {
      stats.mainValue = '82-88%';
      stats.title = config.title;
      stats.description = config.description;
      stats.subStats = [
        { value: '85%', label: 'Emotional Compatibility', desc: 'High EQ and effective emotion regulation' },
        { value: '80%', label: 'Communication Compatibility', desc: 'Effective conflict resolution' },
        { value: '90%', label: 'Physical Compatibility', desc: 'Strong chemistry and attraction' }
      ];
    }
    
    return stats;
  };

  // 解析特性卡片数据
  const parseCardsData = (content) => {
    const features = [];
    const lines = content.split('\n');
    let currentFeature = null;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 匹配特性标题
      if (trimmedLine.includes('主要元素') || trimmedLine.includes('心理动态') || 
          trimmedLine.includes('早期吸引因素') || trimmedLine.includes('吸引因素')) {
        if (currentFeature) features.push(currentFeature);
        currentFeature = {
          title: trimmedLine,
          type: 'ordered',
          items: []
        };
      } else if (trimmedLine.includes('框架') || trimmedLine.includes('支柱') || 
                 trimmedLine.includes('基础') || trimmedLine.includes('元素')) {
        if (currentFeature) features.push(currentFeature);
        currentFeature = {
          title: trimmedLine,
          type: 'unordered',
          items: []
        };
      } else if (currentFeature && (trimmedLine.startsWith('•') || trimmedLine.startsWith('*') || trimmedLine.startsWith('-'))) {
        // 匹配列表项
        const item = trimmedLine.replace(/^[•\*\-]\s*/, '').trim();
        if (item) {
          const labelMatch = item.match(/([^：]+)：(.+)/);
          if (labelMatch) {
            currentFeature.items.push({
              label: labelMatch[1].trim(),
              content: labelMatch[2].trim()
            });
          } else {
            currentFeature.items.push({
              label: 'Key Point',
              content: item
            });
          }
        }
      } else if (currentFeature && /^\d+\./.test(trimmedLine)) {
        // 匹配有序列表项
        const item = trimmedLine.replace(/^\d+\.\s*/, '').trim();
        if (item) {
          const labelMatch = item.match(/([^-]+)-(.+)/);
          if (labelMatch) {
            currentFeature.items.push({
              label: labelMatch[1].trim(),
              content: labelMatch[2].trim()
            });
          } else {
            currentFeature.items.push({
              label: 'Key Point',
              content: item
            });
          }
        }
      }
    });
    
    if (currentFeature) features.push(currentFeature);
    
    // 如果没有解析到数据，提供默认值
    if (features.length === 0) {
      features.push({
        title: '主要元素',
        type: 'ordered',
        items: [
          { label: '音乐兼容性', content: '共同的艺术敏感性' },
          { label: '身体化学反应', content: '通过运动的具身连接' },
          { label: '情感韧性', content: '驾驭初始冲突的能力' },
          { label: '互补能量', content: '挑战与支持的平衡' }
        ]
      });
      features.push({
        title: '心理动态',
        type: 'unordered',
        items: [
          { label: '健康节奏', content: '渐进揭示 vs. 立即强度' },
          { label: '保持自主性', content: '在建立连接时保持个人身份' },
          { label: '真实基础', content: '通过冲突解决而非表面兼容性建立连接' }
        ]
      });
    }
    
    return { features };
  };

  // 解析引用块数据
  const parseQuoteData = (content) => {
    const lines = content.split('\n');
    let quoteContent = '';
    let author = '';
    let context = '';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 提取引用内容
      if (trimmedLine.startsWith('"') || trimmedLine.startsWith('"') || trimmedLine.startsWith('"')) {
        quoteContent = trimmedLine.replace(/^["""]|["""]$/g, '');
      }
      
      // 提取作者信息
      if (trimmedLine.includes('—') || trimmedLine.includes('-')) {
        author = trimmedLine.replace(/^[—-]\s*/, '');
      }
      
      // 提取上下文
      if (trimmedLine && !trimmedLine.startsWith('"') && !trimmedLine.includes('—')) {
        context = trimmedLine;
      }
    });
    
    // 确定引用类型
    let quoteType = 'neutral';
    if (quoteContent.includes('希望') || quoteContent.includes('成功') || quoteContent.includes('健康')) {
      quoteType = 'positive';
    } else if (quoteContent.includes('问题') || quoteContent.includes('困难') || quoteContent.includes('挑战')) {
      quoteType = 'warning';
    } else if (quoteContent.includes('关键') || quoteContent.includes('重要') || quoteContent.includes('核心')) {
      quoteType = 'highlight';
    }
    
    return {
      content: quoteContent || '这个起源故事展现了心理健康的关系形成，具有可持续的情感发展模式。',
      author: author || '关系分析专家',
      context: context || '基于观察到的关系模式',
      type: quoteType
    };
  };

  // 解析总结块数据
  const parseSummaryData = (content) => {
    const lines = content.split('\n');
    const summary = {
      positiveTitle: 'Healthy Attachment Formation Indicators',
      negativeTitle: 'Sustainable Foundation Elements',
      positiveItems: [],
      negativeItems: [],
      conclusion: ''
    };
    
    let currentSection = null;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('健康依恋') || trimmedLine.includes('形成指标')) {
        currentSection = 'positive';
      } else if (trimmedLine.includes('可持续基础') || trimmedLine.includes('基础元素')) {
        currentSection = 'negative';
      } else if (trimmedLine.includes('总结') || trimmedLine.includes('结论')) {
        currentSection = 'conclusion';
      } else if (currentSection && trimmedLine.startsWith('•')) {
        const item = trimmedLine.replace('•', '').trim();
        if (item) {
          const labelMatch = item.match(/([^：]+)：(.+)/);
          if (labelMatch) {
            const itemData = {
              label: labelMatch[1].trim(),
              content: labelMatch[2].trim()
            };
            
            if (currentSection === 'positive') {
              summary.positiveItems.push(itemData);
            } else if (currentSection === 'negative') {
              summary.negativeItems.push(itemData);
            }
          }
        }
      } else if (currentSection === 'conclusion' && trimmedLine) {
        summary.conclusion = trimmedLine;
      }
    });
    
    // 如果没有解析到数据，提供默认值
    if (summary.positiveItems.length === 0) {
      summary.positiveItems = [
        { label: 'Optimal Pacing', content: 'Natural progression without rushing emotional intimacy' },
        { label: '冲突解决', content: '成功从初始紧张导航到连接' },
        { label: '情感调节', content: '兴奋与稳定连接的平衡' },
        { label: '个人完整性', content: '在发展关系中保持个人身份' }
      ];
    }
    
    if (summary.negativeItems.length === 0) {
      summary.negativeItems = [
        { label: '身体-情感整合', content: '遵循自然联系模式' },
        { label: '真实连接', content: '基于真正兼容性而非投射' },
        { label: '具身关系', content: '通过共同体验和身体存在连接' },
        { label: '神秘-熟悉平衡', content: '在建立安全感的同时保持吸引力' }
      ];
    }
    
    if (!summary.conclusion) {
      summary.conclusion = '这个起源故事展现了心理健康的关系形成，具有可持续的情感发展模式，表明了长期连接稳定性的强大基础元素。';
    }
    
    return summary;
  };

  // 解析进度指示器数据
  const parseProgressData = (content) => {
    const lines = content.split('\n');
    const progress = {
      items: [],
      summary: ''
    };
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 匹配进度项
      const progressMatch = trimmedLine.match(/([^：]+)：(\d+)%/);
      if (progressMatch) {
        progress.items.push({
          label: progressMatch[1].trim(),
          value: parseInt(progressMatch[2]),
          description: ''
        });
      }
      
      // 匹配描述
      if (trimmedLine.startsWith('•') && progress.items.length > 0) {
        const description = trimmedLine.replace('•', '').trim();
        progress.items[progress.items.length - 1].description = description;
      }
      
      // 匹配总结
      if (trimmedLine.includes('整体') || trimmedLine.includes('总结')) {
        progress.summary = trimmedLine;
      }
    });
    
    // 如果没有解析到数据，提供默认值
    if (progress.items.length === 0) {
      progress.items = [
        { label: '情感连接发展', value: 85, description: '关系初期建立了良好的情感基础' },
        { label: '沟通模式建立', value: 75, description: '双方沟通方式逐渐协调' },
        { label: '信任度建设', value: 80, description: '通过共同经历建立信任' },
        { label: '未来规划同步', value: 70, description: '对关系发展方向有基本共识' }
      ];
    }
    
    if (!progress.summary) {
      progress.summary = '整体而言，这对情侣的关系发展处于健康轨道上，具备长期发展的潜力。';
    }
    
    return progress;
  };

  // 解析图表数据
  const parseChartData = (content) => {
    const lines = content.split('\n');
    const chart = {
      title: '关系分析数据',
      items: [],
      legend: ''
    };
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 匹配图表项
      const chartMatch = trimmedLine.match(/([^：]+)：(\d+)/);
      if (chartMatch) {
        chart.items.push({
          label: chartMatch[1].trim(),
          value: parseInt(chartMatch[2])
        });
      }
      
      // 匹配标题
      if (trimmedLine.includes('分析') || trimmedLine.includes('数据')) {
        chart.title = trimmedLine;
      }
      
      // 匹配图例
      if (trimmedLine.includes('说明') || trimmedLine.includes('注释')) {
        chart.legend = trimmedLine;
      }
    });
    
    // 如果没有解析到数据，提供默认值
    if (chart.items.length === 0) {
      chart.items = [
        { label: '情感兼容性', value: 85 },
        { label: '沟通质量', value: 78 },
        { label: '共同兴趣', value: 92 },
        { label: '价值观匹配', value: 80 },
        { label: '未来规划', value: 75 }
      ];
    }
    
    if (!chart.legend) {
      chart.legend = '数据基于关系分析模型，数值越高表示该维度越理想。';
    }
    
    return chart;
  };

  // JSON Block 渲染组件
  const JsonBlockRenderer = ({ block, index }) => {
    const blockProps = {
      key: `block-${index}`,
      className: "bg-white border border-black p-8 mb-8 hover-lift card-hover fade-in-up",
      style: { animationDelay: `${index * 0.1}s` }
    };

    switch (block.type) {
      case 'markdown':
        // 如果是第一个block，移除已经在页面标题中显示的部分
        let content = block.content;
        if (index === 0) {
          // 先处理转义的换行符，然后移除标题和副标题部分
          const processedContent = content.replace(/\\n/g, '\n');
          content = processedContent.replace(/^#\s+.+\n\*[^*]+\*\n\n?/m, '');
        }
        
        return (
          <div {...blockProps}>
            <TextBlock content={content} />
          </div>
        );
      
      case 'table':
        return (
          <div {...blockProps}>
            <div className="overflow-x-auto">
              <table className="w-full bg-white border border-black">
                <thead className="bg-white border-b border-black">
                  <tr>
                    {block.data.columns.map((column, colIndex) => (
                      <th key={colIndex} className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider border-r border-black last:border-r-0">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-black">
                  {block.data.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="bg-white border-b border-black">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-black border-r border-black last:border-r-0">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case 'rating-bar':
        return (
          <div {...blockProps}>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">{block.data.label}</h3>
              <div className="flex items-center justify-center gap-4">
                <div className="text-3xl font-medium text-black">{block.data.score}/10</div>
                <div className="flex-1 max-w-md">
                  <div className="w-full bg-white border border-black h-4">
                    <div 
                      className="h-4 bg-black"
                      style={{ width: `${(block.data.score / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'stat-card':
      case 'stat':
        return (
          <div {...blockProps}>
            <div className="text-center bg-white border border-black p-6">
              <h4 className="text-lg font-medium text-black mb-2">{block.data.label}</h4>
              <div className="text-4xl font-medium text-black mb-2">{block.data.value}</div>
            </div>
          </div>
        );
      
      case 'accordion':
        return (
          <div {...blockProps}>
            <AccordionComponent items={block.data.items} />
          </div>
        );
      
      case 'timeline':
        return (
          <div {...blockProps}>
            <TimelineBlock data={{
              stages: block.data.events.map((event, eventIndex) => ({
                title: event.title,
                details: [
                  { label: 'Time', content: event.date },
                  { label: 'Description', content: event.description }
                ]
              }))
            }} />
          </div>
        );
      
      case 'callout':
        return (
          <div {...blockProps}>
            <div className="bg-white border border-black p-6">
              <div className="flex items-start">
                <div className="text-2xl mr-4">💡</div>
                <div className="flex-1">
                  {(() => {
                    const processedContent = processContentFormat(block.content);
                    if (processedContent.isMarkdown) {
                      return <MarkdownRenderer content={processedContent.content} />;
                    } else {
                      return <TextBlock content={block.content} />;
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'quote':
        return (
          <div {...blockProps}>
            <div className="bg-white border border-black p-6">
              <blockquote className="text-lg italic text-black mb-4">
                {(() => {
                  const processedContent = processContentFormat(block.content);
                  if (processedContent.isMarkdown) {
                    return <MarkdownRenderer content={processedContent.content} />;
                  } else {
                    return <>&ldquo;{block.content}&rdquo;</>;
                  }
                })()}
              </blockquote>
            </div>
          </div>
        );
      
      default:
        console.warn('Unknown block type:', block.type, block);
        return (
          <div {...blockProps}>
            <div className="bg-white border border-black p-4">
              <p className="text-gray-600">Unknown block type: {block.type}</p>
              <pre className="mt-2 text-xs text-gray-500 overflow-auto">{JSON.stringify(block, null, 2)}</pre>
            </div>
          </div>
        );
    }
  };

  // 智能内容渲染组件
  const SmartContentRenderer = ({ content, pageTitle }) => {
    if (!content) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p>No {pageTitle} data available</p>
        </div>
      );
    }

    // 确保content是规范化的数据
    const normalizedContent = normalizeContent(content);

    // 根据数据类型渲染
    switch (normalizedContent.type) {
      case 'json_blocks':
        const blocks = normalizedContent.data.output.blocks;
        return (
          <div className="space-y-8">
            {blocks.map((block, index) => (
              <JsonBlockRenderer key={index} block={block} index={index} />
            ))}
          </div>
        );
      
      case 'text':
        const sections = parseContentIntoSections(normalizedContent.data);
        return (
          <div className="space-y-8">
            {sections.map((section, index) => {
              const processedData = processDataForComponent(section);
              
              return (
                <div 
                  key={`${section.type}-${index}`} 
                  className="bg-white border border-black p-8 mb-8 hover-lift card-hover fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {section.type === 'timeline' && <TimelineBlock data={processedData} />}
                {section.type === 'table' && <DataTable data={processedData} />}
                {section.type === 'stats' && <StatsBlock data={processedData} />}
                {section.type === 'cards' && <FeatureCards data={processedData} />}
                {section.type === 'quote' && <QuoteBlock data={processedData} />}
                {section.type === 'summary' && <SummaryBlock data={processedData} />}
                {section.type === 'progress' && <ProgressIndicator data={processedData} />}
                {section.type === 'chart' && <ChartBlock data={processedData} />}
                {section.type === 'text' && <TextBlock content={processedData} />}
              </div>
            );
          })}
        </div>
        );
      
      case 'json_object':
      default:
        return (
          <div className="space-y-8">
            <div className="bg-white border border-black p-8 mb-8">
              <h3 className="text-lg font-semibold mb-4">Raw Data</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">{JSON.stringify(normalizedContent.data, null, 2)}</pre>
            </div>
          </div>
        );
    }
  };

  // 从n8n_chat_histories表获取数据
  const fetchData = async (sessionId) => {
    try {
      console.log('🔍 Fetching data for sessionId:', sessionId);
      
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('message')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Supabase error:', error);
        return [];
      }

      console.log('✅ Fetched data:', data);
      console.log('📊 Number of records:', data?.length || 0);

      // 处理AI消息并解析JSON结构 - 动态处理所有AI回答
      const aiResponses = [];
      
      data.forEach((item, index) => {
        const message = item.message;
        const type = message?.type || '';
        
        if (type === 'ai') {
          console.log(`📝 Processing AI item ${aiResponses.length + 1}:`);
          
          // 使用统一数据规范化
          const normalizedContent = normalizeContent(message.content);
          
          // 从content中提取标题和副标题
          const extractTitlesFromContent = (normalizedContent) => {
            let title = `Analysis ${aiResponses.length + 1}`;
            let subtitle = `Report Section ${aiResponses.length + 1}`;
            
            try {
              // 检查是否是JSON blocks类型
              if (normalizedContent.type === 'json_blocks') {
                const blocks = normalizedContent.data.output.blocks;
                
                // 查找markdown类型的block
                const markdownBlock = blocks.find(block => block.type === 'markdown');
                if (markdownBlock && markdownBlock.content) {
                  const markdownContent = markdownBlock.content;
                  
                  console.log('📝 Parsing markdown content:', markdownContent);
                  
                  // 先将转义的\n转换为真正的换行符
                  const processedContent = markdownContent.replace(/\\n/g, '\n');
                  
                  // 提取第一个 # 标题作为主标题
                  const h1Match = processedContent.match(/^#\s+(.+)$/m);
                  if (h1Match) {
                    title = h1Match[1].trim();
                    console.log('📝 Found title:', title);
                  }
                  
                  // 提取紧跟在主标题后面的斜体文本作为副标题
                  const italicMatch = processedContent.match(/^#\s+(.+?)[\r\n]+\*([^*]+)\*/m);
                  if (italicMatch) {
                    subtitle = italicMatch[2].trim();
                    console.log('📝 Found subtitle:', subtitle);
                  } else {
                    console.log('📝 No subtitle found, processed content:', processedContent.substring(0, 200));
                  }
                }
              }
            } catch (error) {
              console.log('Error extracting titles:', error);
              // 保持默认值
            }
            
            return { title, subtitle };
          };
          
          const { title, subtitle } = extractTitlesFromContent(normalizedContent);
          
          // 动态生成页面信息
          const pageInfo = {
            id: `page_${aiResponses.length + 1}`,
            title: title,
            subtitle: subtitle,
            content: normalizedContent,
            index: aiResponses.length
          };
          
          aiResponses.push(pageInfo);
          console.log(`📝 AI content processed as page: ${pageInfo.id}`);
        }
      });

      console.log('🎯 Final dynamic pages:', aiResponses.length);
      return aiResponses;
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  };

  useEffect(() => {
    if (sessionId && !hasInitialized) {
      const loadData = async () => {
        setIsLoading(true);
        const data = await fetchData(sessionId);
        setContentData(data);
        setIsLoading(false);
        setHasInitialized(true);
        
        // 如果URL参数中没有completed=true，说明是进行中的会话，可能需要轮询
        // 如果有completed=true，说明是查看已完成的报告，不需要轮询
        if (!completed || completed !== 'true') {
          console.log('📋 Session is in progress, may need polling logic here');
          // TODO: 添加轮询逻辑（如果需要的话）
        } else {
          console.log('📋 Viewing completed report, no polling needed');
        }
      };
      loadData();
    }
  }, [sessionId, hasInitialized, completed]); // 添加completed依赖

  // 滚动导航功能
  useEffect(() => {
    if (isLoading || !hasInitialized) return; // 数据加载时跳过

    const sections = document.querySelectorAll('.page-section');
    const navItems = document.querySelectorAll('.nav-item');
    const progressBar = document.getElementById('progress-bar');

    if (sections.length === 0 || navItems.length === 0) return; // 确保元素存在

    let scrollTimeout;
    const updateNavigation = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        
        sections.forEach((section, index) => {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;
          
          if (scrollPosition >= sectionTop - windowHeight/2 && 
              scrollPosition < sectionTop + sectionHeight - windowHeight/2) {
            
            // 更新导航高亮
            navItems.forEach(item => item.classList.remove('active'));
            if (navItems[index]) {
              navItems[index].classList.add('active');
            }
            
            // 更新进度条
            const progress = ((index + 1) / contentData.length) * 100;
            if (progressBar) {
              progressBar.style.width = progress + '%';
            }
            
            setCurrentPage(index + 1);
          }
        });
      }, 10); // 10ms防抖
    };

    window.addEventListener('scroll', updateNavigation);
    
    // 点击导航项平滑滚动
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    return () => {
      window.removeEventListener('scroll', updateNavigation);
      clearTimeout(scrollTimeout);
    };
  }, [isLoading, hasInitialized, contentData.length]); // 依赖加载状态和页面数量

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading your relationship analysis report...</p>
        </div>
      </div>
    );
  }

  // 错误处理
  if (!contentData || contentData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Report Data Loading Failed</h1>
          <p className="text-gray-600 mb-4">Session ID: {sessionId}</p>
          <p className="text-gray-500">Please check your network connection or contact technical support</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 调试信息 - 开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded text-xs z-50">
          <div>Session: {sessionId}</div>
          <div>Pages: {contentData.length}</div>
          <div>Current: {currentPage}</div>
          <div>Status: {isLoading ? 'Loading' : 'Ready'}</div>
        </div>
      )}
      
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        .page-section {
          min-height: 100vh;
          padding-top: 2rem;
        }
        .nav-item.active {
          background-color: #f1f1f1;
          color: #000000;
          border-width: 2px;
        }

        
        /* 内容样式优化 */
        .prose h1 {
          color: #1f2937;
          font-weight: 700;
          margin-bottom: 1.5rem;
          margin-top: 2.5rem;
        }
        .prose h2 {
          color: #374151;
          font-weight: 600;
          margin-bottom: 1rem;
          margin-top: 2rem;
          border-bottom: 2px solid #f3e8ff;
          padding-bottom: 0.5rem;
        }
        .prose h3 {
          color: #4b5563;
          font-weight: 600;
          margin-bottom: 0.75rem;
          margin-top: 1.5rem;
        }
        .prose p {
          color: #374151;
          line-height: 1.75;
          margin-bottom: 1rem;
        }
        .prose ul, .prose ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .prose li {
          color: #4b5563;
          margin-bottom: 0.5rem;
        }
        .prose strong {
          color: #1f2937;
          font-weight: 600;
        }
        .prose em {
          color: #6b7280;
          font-style: italic;
        }
        
        /* 悬停效果 - Wireframe style */
        .hover-lift {
          transition: transform 0.2s ease-out, border-color 0.2s ease-out;
        }
        
        .hover-lift:hover {
          transform: translateY(-1px);
          border-color: #000;
        }
        
        /* 渐进式动画 */
        .fade-in-up {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* 卡片悬停增强 - Wireframe style */
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-2px);
          border-width: 2px;
        }
        
        /* 响应式优化 */
        @media (max-width: 768px) {
          .page-section {
            padding-top: 1rem;
          }
          
          .hover-lift:hover {
            transform: none;
            border-width: 1px;
          }
        }
      `}</style>

      <div className="bg-white">
        {/* 左侧导航栏 */}
        <nav className="fixed left-0 top-0 w-80 h-full bg-white border-r border-black z-10">
          <div className="p-6">
            <h1 className="text-xl font-medium text-black mb-6 flex items-center gap-2">
              <img src={heartIcon} alt="CouplesDNA" className="h-6 w-6 object-contain" style={{ aspectRatio: '1' }} />
              CouplesDNA Report
            </h1>
            <p className="text-sm text-black mb-8">Session: {sessionId}</p>
            
            <ul className="space-y-2">
              {contentData.map((page, index) => {
                const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'];
                const bgColor = colors[index % colors.length];
                const isActive = index === 0 ? 'active' : '';
                
                return (
                  <li key={page.id}>
                    <a href={`#${page.id}`} className={`nav-item relative flex items-center p-4 border border-black hover:bg-gray-50 transition-colors ${isActive}`}>
                      <div className="mr-3">
                        <img src={heartIcon} alt="Section" className="h-4 w-4 object-contain" style={{ aspectRatio: '1' }} />
                      </div>
                      <div>
                        <div className="font-medium text-black">{page.title}</div>
                        <div className="text-sm text-black">{page.subtitle}</div>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
            
            {/* 进度指示器 */}
            <div className="mt-8 pt-6 border-t">
              <div className="text-sm text-black mb-2">Reading Progress</div>
              <div className="w-full bg-white border border-black h-2">
                <div id="progress-bar" className="bg-black h-2 transition-all duration-300" style={{ width: `${(currentPage / contentData.length) * 100}%` }}></div>
              </div>
              <div className="text-xs text-black mt-1">Page {currentPage} of {contentData.length}</div>
            </div>
          </div>
        </nav>

        {/* 主要内容区域 */}
        <main className="ml-80" ref={mainRef}>
          {contentData.map((page, index) => {
            // Wireframe style - remove gradients and use consistent styling
            const gradient = 'bg-white border border-black';
            const iconBg = 'bg-black';
            const isLastPage = index === contentData.length - 1;
            
            return (
              <section key={page.id} id={page.id} className={`page-section ${gradient}`}>
                <div className="max-w-5xl mx-auto px-8 py-12">
                  <div className="text-center mb-12">
                    <div className={`w-16 h-16 ${iconBg} border border-black flex items-center justify-center text-white mx-auto mb-4`}>
                      <img src={heartIcon} alt="Section Icon" className="h-8 w-8 object-contain filter invert" style={{ aspectRatio: '1' }} />
                    </div>
                    <h1 className="text-4xl font-medium text-black mb-4">{page.title}</h1>
                    <p className="text-xl text-black">{page.subtitle}</p>
                  </div>
                  
                  <SmartContentRenderer 
                    content={page.content} 
                    pageTitle={page.title}
                  />
                  
                  {!isLastPage ? (
                    <div className="text-center">
                      <div className="inline-flex items-center text-gray-500">
                        <span className="text-black">Scroll down to view next section</span>
                        <img src={arrowIcon} alt="Next" className="w-4 h-4 ml-2 object-contain animate-bounce rotate-90" style={{ aspectRatio: '1' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center pt-8">
                      <p className="text-black text-lg">🎉 Congratulations! You have completed the comprehensive relationship analysis report</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </main>
      </div>
    </>
  );
} 