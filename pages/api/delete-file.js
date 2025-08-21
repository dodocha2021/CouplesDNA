import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../../lib/supabase';

// IMPORTANT: Use the service role key for admin-level operations like deleting storage items
// and bypassing RLS for cleanup tasks. This key should be kept secret and only used on the server.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Step 1: Authenticate the user from the incoming request.
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: No user session found.' });
    }

    const { filePath } = req.body;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'Invalid request: filePath is required.' });
    }

    // Step 2: Security check to ensure the user is deleting a file in their own directory.
    if (!filePath.startsWith(`users/${user.id}/`)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this file.' });
    }

    // Step 3: Delete associated vector data from the 'documents' table.
    // This targets all rows where the metadata links to the specific file.
    const { error: documentsError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('metadata->>source_file_path', filePath);

    if (documentsError) {
      // Log the error but don't immediately fail. Proceed to delete the main file anyway.
      // In a production environment, you might implement a more robust transaction or logging system.
      console.error(`Error deleting documents for ${filePath}:`, documentsError.message);
    }

    // Step 4: Delete the file's metadata record from the 'chat-logs' table.
    const { error: chatLogError } = await supabaseAdmin
      .from('chat-logs')
      .delete()
      .eq('file_path', filePath);

    if (chatLogError) {
      console.error(`Error deleting chat log metadata for ${filePath}:`, chatLogError.message);
    }

    // Step 5: Delete the actual file from Supabase Storage.
    const { data, error: storageError } = await supabaseAdmin.storage
      .from('chat-logs') // The bucket name
      .remove([filePath]);

    if (storageError) {
      // If storage deletion fails, this is a more critical error.
      console.error(`Critical error deleting file from storage: ${filePath}`, storageError.message);
      throw new Error(`Failed to delete file from storage: ${storageError.message}`);
    }

    // Step 6: Return a success response.
    return res.status(200).json({ message: 'File and associated data deleted successfully.', deletedFile: filePath });

  } catch (error) {
    console.error('Error in delete-file handler:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
}
