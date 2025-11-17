/**
 * Service: RAG (Retrieval-Augmented Generation)
 * Handles knowledge and user data retrieval for context building
 */

export interface RAGScope {
  file_id: string;
  threshold: number;
}

export interface RAGChunk {
  content: string;
  similarity: number;
  metadata?: {
    file_id?: string;
    chunk_index?: number;
    [key: string]: any;
  };
}

export interface RAGContext {
  knowledgeContext: string;
  userDataContext: string;
  knowledgeChunks: RAGChunk[];
  userDataChunks: RAGChunk[];
}

/**
 * Retrieve knowledge chunks from the knowledge base
 * @param questionEmbedding - Embedding vector of the question
 * @param supabase - Supabase client
 * @param scope - Array of file IDs and their similarity thresholds
 * @param topK - Number of results to retrieve
 * @param log - Logging function
 * @returns Array of knowledge chunks
 */
export async function retrieveKnowledge(
  questionEmbedding: number[],
  supabase: any,
  scope: RAGScope[],
  topK: number,
  log: (message: string) => void
): Promise<RAGChunk[]> {
  const vectorString = `[${questionEmbedding.join(',')}]`;

  const knowledgePromises = scope.map(({ file_id, threshold }) =>
    supabase.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: parseFloat(threshold),
      match_count: topK,
      p_file_ids: [file_id]
    })
  );

  const knowledgeSearchResults = await Promise.all(knowledgePromises);

  let knowledgeResults: RAGChunk[] = [];
  knowledgeSearchResults.forEach((result: any, index: number) => {
    if (result.error) {
      log(`❌ RPC Error for file ${scope[index].file_id}: ${result.error.message}`);
    }
    if (result.data) {
      log(`  ✓ Found ${result.data.length} chunks from file ${scope[index].file_id}`);
      knowledgeResults.push(...result.data);
    }
  });

  // Remove duplicates and sort by similarity
  const uniqueKnowledge = Array.from(
    new Map(knowledgeResults.map(item => {
      const uniqueKey = `${item.metadata?.file_id || 'unknown'}_${item.metadata?.chunk_index ?? 'unknown'}`;
      return [uniqueKey, item];
    })).values()
  );

  return uniqueKnowledge
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Retrieve user data chunks from uploaded chat logs
 * @param questionEmbedding - Embedding vector of the question
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param selectedFileIds - Array of user upload file IDs
 * @param topK - Number of results to retrieve
 * @returns Array of user data chunks
 */
export async function retrieveUserData(
  questionEmbedding: number[],
  supabase: any,
  userId: string,
  selectedFileIds: string[],
  topK: number
): Promise<RAGChunk[]> {
  const vectorString = `[${questionEmbedding.join(',')}]`;

  const promises = selectedFileIds.map(fileId =>
    supabase.rpc('match_user_data_by_files', {
      p_user_id: userId,
      query_embedding: vectorString,
      match_count: topK,
      p_file_ids: [fileId]
    })
  );

  const results = await Promise.all(promises);

  let allResults: RAGChunk[] = [];
  results.forEach((result: any) => {
    if (result.data) allResults.push(...result.data);
  });

  // Remove duplicates and sort by similarity
  const uniqueResults = Array.from(
    new Map(allResults.map(item => {
      const uniqueKey = `${item.metadata?.file_id || 'unknown'}_${item.metadata?.chunk_index ?? 'unknown'}`;
      return [uniqueKey, item];
    })).values()
  );

  return uniqueResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Build complete RAG context from knowledge and user data
 * @param knowledgeChunks - Retrieved knowledge chunks
 * @param userDataChunks - Retrieved user data chunks
 * @returns Formatted context strings and original chunks
 */
export function buildRAGContext(
  knowledgeChunks: RAGChunk[],
  userDataChunks: RAGChunk[]
): RAGContext {
  const knowledgeContext = knowledgeChunks.length > 0
    ? knowledgeChunks.map((r, i) => `[K${i+1}] ${r.content}`).join('\n\n---\n\n')
    : "No knowledge found.";

  const userDataContext = userDataChunks.length > 0
    ? userDataChunks.map((r, i) => `[U${i+1}] ${r.content}`).join('\n\n---\n\n')
    : "No user data found.";

  return {
    knowledgeContext,
    userDataContext,
    knowledgeChunks,
    userDataChunks
  };
}
