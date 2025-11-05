
import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';

// Initialize the Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const embeddingModel = 'sentence-transformers/all-mpnet-base-v2';

// Function to generate embeddings
async function getEmbedding(text) {
  const cleanedText = text.replace(/\n/g, ' ');
  const response = await hf.featureExtraction({
    model: embeddingModel,
    inputs: cleanedText,
  });
  // Ensure the output is a 1D array
  if (Array.isArray(response) && Array.isArray(response[0])) {
    return response[0];
  }
  return response;
}

// Text splitter function (borrowed from ingest.js for consistency)
function splitText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        const end = i + chunkSize;
        chunks.push(text.substring(i, end));
        i += chunkSize - overlap;
    }
    return chunks;
}

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  switch (req.method) {
    case 'GET':
      try {
        const { page = 1, limit = 20, category, search } = req.query;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin.from('knowledge_vectors').select('*', { count: 'exact' });

        if (category) {
          query = query.eq('category', category);
        }
        if (search) {
          query = query.ilike('content', `%${search}%`);
        }

        const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({
          data,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          totalCount: count
        });
      } catch (error) {
        console.error("Error in GET /api/knowledge:", error);
        res.status(500).json({ error: error.message });
      }
      break;

    case 'POST': // Add new knowledge with chunking
      try {
        const { content, category } = req.body;
        if (!content) {
          return res.status(400).json({ error: 'Content is required.' });
        }
        if (!category) {
          return res.status(400).json({ error: 'Category is required.' });
        }

        const source = 'Manual Entry'; // Default source for manual additions
        const chunks = splitText(content);
        let processedCount = 0;

        console.log(`Splitting content into ${chunks.length} chunks for manual entry.`);

        for (const chunk of chunks) {
            const embedding = await getEmbedding(chunk);
            const { error } = await supabaseAdmin.from('knowledge_vectors').insert({
                content: chunk,
                embedding,
                category,
                source
            });

            if (error) {
                console.error('Supabase insert error during chunking:', error.message);
                // Continue processing other chunks even if one fails
            } else {
                processedCount++;
            }
        }
        
        console.log(`Successfully inserted ${processedCount} chunks from manual entry.`);
        res.status(201).json({ message: `Successfully processed and inserted ${processedCount} out of ${chunks.length} chunks.` });

      } catch (error) {
        console.error("Error in POST /api/knowledge:", error);
        res.status(500).json({ error: error.message });
      }
      break;

    case 'PUT': // This endpoint updates a single chunk. For simplicity, we don't re-chunk on update.
      try {
        const { id, content } = req.body;
        if (!id || !content) {
          return res.status(400).json({ error: 'ID and content are required.' });
        }

        const embedding = await getEmbedding(content);

        const { data, error } = await supabaseAdmin
          .from('knowledge_vectors')
          .update({ content, embedding })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        res.status(200).json(data);
      } catch (error) {
        console.error("Error in PUT /api/knowledge:", error);
        res.status(500).json({ error: error.message });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ error: 'ID is required.' });
        }

        const { error } = await supabaseAdmin.from('knowledge_vectors').delete().eq('id', id);

        if (error) throw error;
        res.status(204).end();
      } catch (error) {
        console.error("Error in DELETE /api/knowledge:", error);
        res.status(500).json({ error: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
