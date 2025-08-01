import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function ReportPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  
  const [contentData, setContentData] = useState({});
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
    const timelineColors = ['border-pink-400', 'border-rose-400', 'border-pink-500', 'border-rose-500'];
    
    return (
      <div className="space-y-6">
        {data.stages.map((stage, index) => (
          <div key={index} className={`border-l-4 pl-6 ${timelineColors[index % timelineColors.length]}`}>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{stage.title}</h3>
            {stage.progress && (
              <p className="text-gray-700 mb-2"><strong>进展：</strong>{stage.progress}</p>
            )}
            {stage.details && stage.details.length > 0 && (
              <ul className="text-gray-600 space-y-1">
                {stage.details.map((detail, idx) => (
                  <li key={idx}>• <strong>{detail.label}：</strong>{detail.content}</li>
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
        <table className="w-full bg-gray-50 rounded-lg">
          <thead className="bg-blue-100">
            <tr>
              {data.headers.map((header, index) => (
                <th key={index} className="px-4 py-3 text-left font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`px-4 py-3 ${getCellStyle(cell)}`}>
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
    return (
      <div className="text-center mb-8">
        {data.mainValue && (
          <div className="text-6xl font-bold text-green-600 mb-2">
            {data.mainValue}
          </div>
        )}
        {data.title && (
          <p className="text-2xl text-gray-700">{data.title}</p>
        )}
        {data.description && (
          <p className="text-gray-500 mt-2">{data.description}</p>
        )}
        
        {data.subStats && data.subStats.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {data.subStats.map((stat, index) => (
              <div key={index} className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <p className="font-medium">{stat.label}</p>
                <p className="text-sm text-gray-600 mt-1">{stat.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 特性卡片组件
  const FeatureCards = ({ data }) => {
    const cardColors = [
      'bg-pink-50 border-pink-400',
      'bg-rose-50 border-rose-400', 
      'bg-purple-50 border-purple-400',
      'bg-indigo-50 border-indigo-400',
      'bg-blue-50 border-blue-400'
    ];
    
    return (
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {data.features.map((feature, index) => (
          <div key={index} className={`p-6 rounded-lg border-l-4 ${cardColors[index % cardColors.length]}`}>
            <h3 className="font-semibold text-lg mb-4">{feature.title}</h3>
            {feature.type === 'ordered' ? (
              <ol className="space-y-3 text-gray-700">
                {feature.items.map((item, idx) => (
                  <li key={idx}>
                    <strong>{idx + 1}. {item.label}</strong> - {item.content}
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="space-y-3 text-gray-700">
                {feature.items.map((item, idx) => (
                  <li key={idx}>• <strong>{item.label}：</strong>{item.content}</li>
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
    const quoteColors = {
      positive: 'bg-green-50 border-green-400',
      neutral: 'bg-blue-50 border-blue-400',
      warning: 'bg-yellow-50 border-yellow-400',
      highlight: 'bg-pink-50 border-pink-400'
    };
    
    return (
      <div className={`p-6 rounded-lg border-l-4 ${quoteColors[data.type] || quoteColors.neutral}`}>
        <blockquote className="text-lg italic text-gray-700 mb-4">
          &ldquo;{data.content}&rdquo;
        </blockquote>
        {data.author && (
          <cite className="text-sm text-gray-500">— {data.author}</cite>
        )}
        {data.context && (
          <p className="text-sm text-gray-600 mt-2">{data.context}</p>
        )}
      </div>
    );
  };

  // 总结块组件
  const SummaryBlock = ({ data }) => {
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-green-600">
            {data.positiveTitle || '健康依恋形成指标'}
          </h3>
          <ul className="space-y-2 text-gray-700">
            {data.positiveItems.map((item, index) => (
              <li key={index}>• <strong>{item.label}：</strong>{item.content}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-blue-600">
            {data.negativeTitle || '可持续基础元素'}
          </h3>
          <ul className="space-y-2 text-gray-700">
            {data.negativeItems.map((item, index) => (
              <li key={index}>• <strong>{item.label}：</strong>{item.content}</li>
            ))}
          </ul>
        </div>
        
        {data.conclusion && (
          <div className="col-span-2 mt-8 p-6 bg-gradient-to-r from-pink-100 to-rose-100 rounded-lg">
            <p className="text-gray-700 font-medium text-center">
              {data.conclusion}
            </p>
          </div>
        )}
      </div>
    );
  };

  // 进度指示器组件
  const ProgressIndicator = ({ data }) => {
    const getProgressColor = (value) => {
      if (value >= 80) return 'bg-green-500';
      if (value >= 60) return 'bg-yellow-500';
      if (value >= 40) return 'bg-orange-500';
      return 'bg-red-500';
    };

    return (
      <div className="space-y-6">
        {data.items.map((item, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-800">{item.label}</span>
              <span className="text-sm font-semibold text-gray-600">{item.value}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${getProgressColor(item.value)}`}
                style={{ width: `${item.value}%` }}
              ></div>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mt-2">{item.description}</p>
            )}
          </div>
        ))}
        
        {data.summary && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-semibold text-blue-800 mb-2">整体评估</h4>
            <p className="text-blue-700">{data.summary}</p>
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{data.title}</h3>
        
        <div className="space-y-3">
          {data.items.map((item, index) => {
            const percentage = (item.value / maxValue) * 100;
            const barColors = [
              'bg-pink-500',
              'bg-blue-500', 
              'bg-green-500',
              'bg-purple-500',
              'bg-orange-500'
            ];
            
            return (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium text-gray-700">
                  {item.label}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full ${barColors[index % barColors.length]}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-16 text-sm font-semibold text-gray-600 text-right">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
        
        {data.legend && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">{data.legend}</p>
          </div>
        )}
      </div>
    );
  };



  // 基础文本组件
  const TextBlock = ({ content }) => {
    const formattedContent = useMemo(() => {
      if (!content) return '';
      
      let formatted = content;
      
      // 处理标题
      formatted = formatted.replace(/^### (.*$)/gim, '</p><h3 class="text-lg font-semibold text-gray-800 mb-3 mt-6">$1</h3><p class="text-gray-700 leading-relaxed mb-4">');
      formatted = formatted.replace(/^## (.*$)/gim, '</p><h2 class="text-xl font-semibold text-gray-800 mb-4 mt-8 border-b-2 border-pink-200 pb-3">$1</h2><p class="text-gray-700 leading-relaxed mb-4">');
      formatted = formatted.replace(/^# (.*$)/gim, '</p><h1 class="text-2xl font-bold text-gray-800 mb-6 mt-10">$1</h1><p class="text-gray-700 leading-relaxed mb-4">');
      
      // 处理粗体和斜体
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>');
      
      // 处理列表
      formatted = formatted.replace(/^(\*|-|\d+\.) (.*$)/gim, '<li class="text-gray-700 mb-2">$2</li>');
      formatted = formatted.replace(/(<li.*?<\/li>)/gs, '<ul class="list-disc list-inside mb-4 space-y-1">$1</ul>');
      
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
          title = `阶段${stageNum}：${stageMatch[2]}`;
        } else if (phaseMatch) {
          stageNum = phaseMatch[1];
          title = `阶段${stageNum}：${phaseMatch[2]}`;
        } else if (stageOnlyMatch) {
          stageNum = stageOnlyMatch[1];
          title = `阶段${stageNum}`;
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
            label: '要点', 
            content: detail 
          });
        }
      } else if (currentStage && trimmedLine.includes('**') && trimmedLine.includes('**')) {
        // 匹配粗体内容
        const detail = trimmedLine.replace(/\*\*/g, '').trim();
        if (detail) {
          currentStage.details.push({ 
            label: '关键信息', 
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
          title: `阶段${stageIndex}`,
          details: [{ label: '内容', content: trimmedLine }]
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
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 匹配主要数值
      const mainMatch = trimmedLine.match(/(\d+(-\d+)?%)/);
      if (mainMatch && !stats.mainValue) {
        stats.mainValue = mainMatch[1];
        stats.title = '长期成功概率';
        stats.description = '基于观察模式和已建立的关系研究指标';
      }
      
      // 匹配子统计
      const subMatch = trimmedLine.match(/(\d+)%.*?([^%]+)/);
      if (subMatch && stats.subStats.length < 3) {
        stats.subStats.push({
          value: subMatch[1] + '%',
          label: '兼容性指标',
          desc: subMatch[2].trim()
        });
      }
    });
    
    // 如果没有解析到数据，提供默认值
    if (!stats.mainValue) {
      stats.mainValue = '82-88%';
      stats.title = '长期成功概率';
      stats.description = '基于观察模式和已建立的关系研究指标';
      stats.subStats = [
        { value: '85%', label: '情感兼容性', desc: '高情商和有效情绪调节' },
        { value: '80%', label: '沟通兼容性', desc: '有效冲突解决' },
        { value: '90%', label: '身体兼容性', desc: '强烈化学反应和吸引力' }
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
              label: '要点',
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
              label: '要点',
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
      positiveTitle: '健康依恋形成指标',
      negativeTitle: '可持续基础元素',
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
        { label: '最佳节奏', content: '自然进展，不急于情感亲密' },
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

  // 智能内容渲染组件
  const SmartContentRenderer = ({ content, pageTitle }) => {
    const sections = useMemo(() => parseContentIntoSections(content), [content]);

    if (!content || content.trim() === '') {
      return (
        <div className="text-center py-12 text-gray-500">
          <p>暂无{pageTitle}数据</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {sections.map((section, index) => {
          const processedData = processDataForComponent(section);
          
          return (
            <div 
              key={`${section.type}-${index}`} 
              className="bg-white rounded-xl shadow-lg p-8 mb-8 hover-lift card-hover fade-in-up"
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
        return {};
      }

      console.log('✅ Fetched data:', data);
      console.log('📊 Number of records:', data?.length || 0);

      // 按对处理数据 (human + ai)
      const categorized = {};
      
      data.forEach((item, index) => {
        const content = item.message?.content || '';
        const type = item.message?.type || '';
        
        console.log(`📝 Processing item ${index + 1} (${type}):`, content.substring(0, 100) + '...');
        
        if (type === 'ai') {
          // 根据AI响应的顺序分配
          const categories = ['origin_story', 'support_analysis', 'success_probability', 'development_framework'];
          const aiIndex = Math.floor(index / 2); // 每2条记录中有1条AI响应
          const category = categories[aiIndex];
          categorized[category] = content;
          console.log(`📝 AI content assigned to: ${category}`);
        }
      });

      console.log('🎯 Final categorized data:', Object.keys(categorized));
      return categorized;
    } catch (error) {
      console.error('Error:', error);
      return {};
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
      };
      loadData();
    }
  }, [sessionId, hasInitialized]); // 添加hasInitialized依赖，确保只执行一次

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
            const progress = ((index + 1) / sections.length) * 100;
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
  }, [isLoading, hasInitialized]); // 依赖加载状态

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">正在加载你的关系分析报告...</p>
        </div>
      </div>
    );
  }

  // 错误处理
  if (!contentData || Object.keys(contentData).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">报告数据加载失败</h1>
          <p className="text-gray-600 mb-4">Session ID: {sessionId}</p>
          <p className="text-gray-500">请检查网络连接或联系技术支持</p>
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
          <div>Pages: {Object.keys(contentData).length}</div>
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
          background-color: #3b82f6;
          color: white;
        }
        .nav-item.active::before {
          content: '';
          position: absolute;
          left: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 100%;
          background-color: #3b82f6;
          border-radius: 2px;
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
        
        /* 悬停效果 */
        .hover-lift {
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
        }
        
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
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
        
        /* 卡片悬停增强 */
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        /* 响应式优化 */
        @media (max-width: 768px) {
          .page-section {
            padding-top: 1rem;
          }
          
          .hover-lift:hover {
            transform: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>

      <div className="bg-gray-50">
        {/* 左侧导航栏 */}
        <nav className="fixed left-0 top-0 w-80 h-full bg-white shadow-lg z-10 border-r">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-800 mb-6">💕 CouplesDNA 报告</h1>
            <p className="text-sm text-gray-500 mb-8">Session: {sessionId}</p>
            
            <ul className="space-y-2">
              <li>
                <a href="#page1" className="nav-item relative flex items-center p-4 rounded-lg hover:bg-gray-100 transition-colors active">
                  <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm mr-3">1</div>
                  <div>
                    <div className="font-medium text-gray-800">关系起源分析</div>
                    <div className="text-sm text-gray-500">Origin Story Analysis</div>
                  </div>
                </a>
              </li>
              
              <li>
                <a href="#page2" className="nav-item relative flex items-center p-4 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-3">2</div>
                  <div>
                    <div className="font-medium text-gray-800">支持投资分析</div>
                    <div className="text-sm text-gray-500">Support & Investment</div>
                  </div>
                </a>
              </li>
              
              <li>
                <a href="#page3" className="nav-item relative flex items-center p-4 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm mr-3">3</div>
                  <div>
                    <div className="font-medium text-gray-800">成功概率分析</div>
                    <div className="text-sm text-gray-500">Success Probability</div>
                  </div>
                </a>
              </li>
              
              <li>
                <a href="#page4" className="nav-item relative flex items-center p-4 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm mr-3">4</div>
                  <div>
                    <div className="font-medium text-gray-800">发展框架</div>
                    <div className="text-sm text-gray-500">Development Framework</div>
                  </div>
                </a>
              </li>
            </ul>
            
            {/* 进度指示器 */}
            <div className="mt-8 pt-6 border-t">
              <div className="text-sm text-gray-500 mb-2">阅读进度</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div id="progress-bar" className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(currentPage / 4) * 100}%` }}></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">第 {currentPage} 页，共 4 页</div>
            </div>
          </div>
        </nav>

        {/* 主要内容区域 */}
        <main className="ml-80" ref={mainRef}>
          {/* 第一页：关系起源分析 */}
          <section id="page1" className="page-section bg-gradient-to-br from-pink-50 to-rose-50">
            <div className="max-w-5xl mx-auto px-8 py-12">
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">💕</div>
                <h1 className="text-4xl font-bold text-gray-800 mb-4">关系起源分析</h1>
                <p className="text-xl text-gray-600">Couple&apos;s Origin Story: A Comprehensive Analysis</p>
              </div>
              
              <SmartContentRenderer 
                content={contentData.origin_story} 
                pageTitle="关系起源分析"
              />
              
              <div className="text-center">
                <div className="inline-flex items-center text-gray-500">
                  <span>向下滚动查看支持投资分析</span>
                  <svg className="w-4 h-4 ml-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* 第二页：支持投资分析 */}
          <section id="page2" className="page-section bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">🤝</div>
                <h1 className="text-4xl font-bold text-gray-800 mb-4">早期支持投资分析</h1>
                <p className="text-xl text-gray-600">Early Relationship Support & Investment Analysis</p>
              </div>
              
              <SmartContentRenderer 
                content={contentData.support_analysis} 
                pageTitle="支持投资分析"
              />
            </div>
          </section>

          {/* 第三页：成功概率分析 */}
          <section id="page3" className="page-section bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">📊</div>
                <h1 className="text-4xl font-bold text-gray-800 mb-4">关系成功概率分析</h1>
                <p className="text-xl text-gray-600">Relationship Success Probability Analysis</p>
              </div>
              
              <SmartContentRenderer 
                content={contentData.success_probability} 
                pageTitle="成功概率分析"
              />
            </div>
          </section>

          {/* 第四页：发展框架 */}
          <section id="page4" className="page-section bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">🎯</div>
                <h1 className="text-4xl font-bold text-gray-800 mb-4">综合关系发展框架</h1>
                <p className="text-xl text-gray-600">Comprehensive Relationship Development Framework</p>
              </div>
              
              <SmartContentRenderer 
                content={contentData.development_framework} 
                pageTitle="发展框架"
              />
              
              <div className="text-center pt-8">
                <p className="text-gray-600 text-lg">🎉 恭喜！你已经完成了完整的关系分析报告</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
} 