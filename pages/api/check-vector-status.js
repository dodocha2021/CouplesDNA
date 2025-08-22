import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../../lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing filePath parameter' });
    }

    // First check if the file was successfully processed (has documents)
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('metadata->>source_file_path', filePath)
      .limit(1);

    if (docError) {
      console.error('Error checking documents:', docError);
      return res.status(500).json({ 
        status: 'error',
        error_type: 'database_error',
        message: 'Failed to check processing status'
      });
    }

    if (documents && documents.length > 0) {
      return res.status(200).json({
        status: 'success',
        message: 'File successfully processed and vectorized'
      });
    }

    // If no documents found, try to get the Edge Function status directly
    try {
      // Directly invoke the function to get current status
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('process-chat-log-to-vector', {
        body: {
          record: {
            name: filePath,
            bucket_id: 'chat-logs'
          }
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        console.log('CHECK_VECTOR_STATUS_API_RESPONSE (function_error):', JSON.stringify({
          status: 'error',
          error_type: 'function_error',
          message: 'Processing function failed'
        }, null, 2));
        return res.status(200).json({
          status: 'error',
          error_type: 'function_error',
          message: 'Processing function failed'
        });
      }

      // Return the structured response from Edge Function
      console.log('EDGE_FUNCTION_RAW_RESULT:', JSON.stringify(functionResult, null, 2));
      
      // Handle both old and new Edge Function response formats
      if (functionResult && typeof functionResult === 'object') {
        // New structured format
        if (functionResult.status) {
          console.log('CHECK_VECTOR_STATUS_API_RESPONSE (structured):', JSON.stringify(functionResult, null, 2));
          return res.status(200).json(functionResult);
        }
        
        // Old format - check for specific messages
        if (functionResult.message && functionResult.message.includes('not a chat log')) {
          const response = {
            status: 'rejected',
            reason: 'not_chat_log',
            message: 'File is not a chat log',
            data: functionResult
          };
          console.log('CHECK_VECTOR_STATUS_API_RESPONSE (old_format_not_chat):', JSON.stringify(response, null, 2));
          return res.status(200).json(response);
        }
        
        // Other old format responses
        const response = {
          status: 'error',
          error_type: 'unknown_format',
          message: functionResult.message || 'Unknown processing result',
          data: functionResult
        };
        console.log('CHECK_VECTOR_STATUS_API_RESPONSE (unknown_format):', JSON.stringify(response, null, 2));
        return res.status(200).json(response);
      }
      
      console.log('CHECK_VECTOR_STATUS_API_RESPONSE (direct):', JSON.stringify(functionResult, null, 2));
      return res.status(200).json(functionResult);

    } catch (functionCallError) {
      console.error('Function call error:', functionCallError);
      return res.status(200).json({
        status: 'error',
        error_type: 'function_call_error',
        message: 'Failed to check processing status'
      });
    }

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      status: 'error',
      error_type: 'server_error',
      message: 'Internal server error'
    });
  }
}