// Temporary test endpoint to debug vector status checking
export default async function handler(req, res) {
  // Simulate the Edge Function response for a rejected PDF file
  const mockEdgeFunctionResponse = {
    status: "rejected",
    reason: "not_chat_log", 
    message: "File is not a chat log, skipping",
    data: {
      classification: "GARBAGE_TEXT",
      file_path: "users/test/test.pdf",
      user_id: "test-user"
    }
  };

  console.log('Mock Edge Function Response:', JSON.stringify(mockEdgeFunctionResponse, null, 2));
  
  return res.status(200).json(mockEdgeFunctionResponse);
}