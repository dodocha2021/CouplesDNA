export function buildReportContext(knowledgeResults, userDataResults) {
  const hasKnowledge = knowledgeResults.length > 0;
  const hasUserData = userDataResults.length > 0;
  
  let context = '';
  
  if (hasKnowledge) {
    context += '=== PROFESSIONAL KNOWLEDGE ===\n\n';
    knowledgeResults.forEach((chunk, i) => {
      context += `[K${i+1}] ${chunk.content}\n\n`;
    });
  }
  
  if (hasUserData) {
    context += '=== USER DATA ===\n\n';
    userDataResults.forEach((chunk, i) => {
      context += `[U${i+1}] ${chunk.content}\n\n`;
    });
  }
  
  if (!hasKnowledge && !hasUserData) {
    context = '=== NO CONTEXT FOUND ===\n';
  }
  
  return { text: context, hasKnowledge, hasUserData };
}

export function buildReportPrompt(systemPrompt, userPrompt, context, question) {
  return `${systemPrompt}\n\n${context.text}\n\nUser Question: ${question}\n\n${userPrompt || ''}`;
}
