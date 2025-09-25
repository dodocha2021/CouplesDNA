
import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';

// This function determines if a user is an admin based on the request.
// It should be adapted to your actual user role logic.
// For this example, it checks a 'profiles' table for an 'admin' role.
async function isAdmin(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // You might need a more robust way to get the user ID,
  // depending on how your authentication is set up.
  // This is a placeholder for getting the user from the request.
  const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.authorization.split(' ')[1]);

  if (!user) {
    return false;
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return !error && data && data.role === 'admin';
}

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

export default async function handler(req, res) {
  // Uncomment the following lines to enforce admin-only access
  // const userIsAdmin = await isAdmin(req);
  // if (!userIsAdmin) {
  //   return res.status(403).json({ error: 'Forbidden: Admins only.' });
  // }

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
        res.status(500).json({ error: error.message });
      }
      break;

    case 'PUT':
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
        res.status(500).json({ error: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
