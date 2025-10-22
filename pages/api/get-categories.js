
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_vectors')
      .select('category');

    if (error) throw error;

    // Use a Set to get unique categories and filter out any null/empty values
    const categories = [...new Set(data.map(item => item.category).filter(Boolean))];

    // Return the unique, sorted categories
    res.status(200).json(categories.sort());

  } catch (error) {
    console.error("Error fetching distinct categories:", error.message);
    res.status(500).json({ error: "Failed to fetch categories." });
  }
}
