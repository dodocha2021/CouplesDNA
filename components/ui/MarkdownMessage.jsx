import React from 'react';
import ReactMarkdown from 'react-markdown';

export function MarkdownMessage({ content }) {
  // Ensure content is a string
  const contentString = typeof content === 'string' ? content : 
                       typeof content === 'object' ? JSON.stringify(content) : 
                       String(content || '');
  
  return (
    <ReactMarkdown
      components={{
        // Custom title style
        h1: ({node, ...props}) => <h1 style={{fontSize: '1.5em', fontWeight: 'bold', margin: '8px 0'}} {...props} />,
        h2: ({node, ...props}) => <h2 style={{fontSize: '1.3em', fontWeight: 'bold', margin: '8px 0'}} {...props} />,
        h3: ({node, ...props}) => <h3 style={{fontSize: '1.1em', fontWeight: 'bold', margin: '6px 0'}} {...props} />,
        // Custom paragraph style
        p: ({node, ...props}) => <p style={{margin: '4px 0', lineHeight: '1.5'}} {...props} />,
        // Custom list style
        ul: ({node, ...props}) => <ul style={{margin: '4px 0', paddingLeft: '20px'}} {...props} />,
        ol: ({node, ...props}) => <ol style={{margin: '4px 0', paddingLeft: '20px'}} {...props} />,
        // Custom code style
        code: ({node, inline, ...props}) => 
          inline ? 
            <code style={{background: '#f0f0f0', padding: '2px 4px', borderRadius: '3px', fontSize: '0.9em'}} {...props} /> :
            <code style={{background: '#f5f5f5', padding: '8px', borderRadius: '4px', display: 'block', fontSize: '0.9em'}} {...props} />,
        // Custom link style
        a: ({node, ...props}) => <a style={{color: '#0066cc', textDecoration: 'underline'}} {...props} />,
      }}
    >
      {contentString}
    </ReactMarkdown>
  );
} 