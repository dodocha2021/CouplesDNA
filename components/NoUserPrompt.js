import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const WEBHOOK_URL = 'https://couplesdna.app.n8n.cloud/webhook-test/e3c61533-a245-425c-84fa-00e2405ff680';

export default function NoUserPrompt() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webhookStatus, setWebhookStatus] = useState('idle'); // 'idle', 'sending', 'success', 'error'
  const [expandedPrompts, setExpandedPrompts] = useState({});
  const [editablePrompts, setEditablePrompts] = useState({});
  const [improvingPrompts, setImprovingPrompts] = useState({});

  // --- Toggle function ---
  const togglePrompt = (promptId) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [promptId]: !prev[promptId]
    }));
  };

  // --- Update editable prompt ---
  const updateEditablePrompt = (promptId, newText) => {
    setEditablePrompts(prev => ({
      ...prev,
      [promptId]: newText
    }));
  };

  // --- Check if any operation is in progress ---
  const isAnyOperationInProgress = () => {
    return webhookStatus === 'sending' || Object.values(improvingPrompts).some(status => status === true);
  };

  // --- Improve prompt with AI ---
  const improvePrompt = async (promptId, currentText) => {
    // Don't allow if generate is in progress
    if (webhookStatus === 'sending') {
      console.log('❌ Cannot improve prompt while Generate is in progress');
      return;
    }
    
    setImprovingPrompts(prev => ({ ...prev, [promptId]: true }));
    
    try {
      const response = await axios.post('https://couplesdna.app.n8n.cloud/webhook-test/beae6862-96c0-42f3-86eb-4647bf6f6778', {
        prompt: currentText,
        user_id: user?.id,
        email: user?.email,
        fullname: profile?.full_name,
        age_range: profile?.age_range,
        relationship_stage: profile?.relationship_stage,
        default_focus: profile?.default_focus,
        conversation_feeling: profile?.conversation_feeling
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Webhook response:', response.data);
      console.log('Response type:', typeof response.data);
      console.log('Response keys:', Object.keys(response.data || {}));
      
      let improvedText = null;
      
      // Handle the specific response format from your n8n workflow
      if (response.data) {
        // First check if there's an error but original_data is available
        if (response.data.error && response.data.original_data) {
          console.log('Found error with original_data, attempting to parse...');
          try {
            const originalData = JSON.parse(response.data.original_data);
            console.log('Parsed original_data:', originalData);
            improvedText = originalData.output || originalData.text || originalData.result;
          } catch (parseError) {
            console.error('Failed to parse original_data:', parseError);
            // If JSON parsing fails, try to extract the text content directly
            const rawText = response.data.original_data;
            if (typeof rawText === 'string') {
              // Try to extract text between quotes or find the main content
              const match = rawText.match(/'output':'([^']+)'/);
              if (match && match[1]) {
                improvedText = match[1].replace(/\\n/g, '\n').replace(/\'/g, "'");
              }
            }
          }
        } else {
          // Try standard field names
          improvedText = response.data.improved_prompt || 
                        response.data.improvedPrompt ||
                        response.data.result || 
                        response.data.response || 
                        response.data.output ||
                        response.data.text ||
                        response.data.content ||
                        response.data.prompt ||
                        (typeof response.data === 'string' ? response.data : null);
        }
      }
      
      console.log('Extracted improved text:', improvedText);
      console.log('Improved text type:', typeof improvedText);
      
      // Update the editable prompt with the improved version
      if (improvedText && typeof improvedText === 'string' && improvedText.trim() !== '') {
        setEditablePrompts(prev => ({
          ...prev,
          [promptId]: improvedText.trim()
        }));
        console.log('✅ Successfully updated editable prompts for ID:', promptId);
        setError(null); // Clear any previous errors
      } else {
        console.warn('❌ No valid improved prompt found in response');
        console.log('Full response data:', JSON.stringify(response.data, null, 2));
        setError('Failed to extract improved prompt from response. Check console for details.');
      }
    } catch (error) {
      console.error('Error improving prompt:', error);
      setError('Failed to improve prompt. Please try again.');
    } finally {
      setImprovingPrompts(prev => ({ ...prev, [promptId]: false }));
    }
  };

  // --- Get user and profile data ---
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the currently logged in user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Failed to get user info: ${userError.message}`);
        if (!user) throw new Error('User not logged in. Please login first.');

        setUser(user);

        // Get the user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw new Error(`Failed to get profile: ${profileError.message}`);
        }

        if (!profileData) {
          throw new Error('User profile not found. Please complete your profile first.');
        }

        setProfile(profileData);

        // Get the latest 5 prompts
        await fetchPrompts(user.id);

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndProfile();
  }, []);

  // --- Get prompts data ---
  const fetchPrompts = async (userId) => {
    try {
      const { data: promptsData, error: promptsError } = await supabase
        .from('generated_prompts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (promptsError) {
        console.error('Error fetching prompts:', promptsError);
      } else {
        setPrompts(promptsData || []);
        // Initialize editable prompts with original content
        const editableContent = {};
        (promptsData || []).forEach(prompt => {
          editableContent[prompt.id] = prompt.prompt_text;
        });
        setEditablePrompts(editableContent);
      }
    } catch (err) {
      console.error('Error fetching prompts:', err);
    }
  };

  // --- Retry getting new prompts ---
  const fetchNewPromptsWithRetry = async (retryCount = 0) => {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    
    try {
      console.log(`🔄 Fetching new prompts (attempt ${retryCount + 1}/${maxRetries})`);
      
      const { data: newPromptsData, error: newPromptsError } = await supabase
        .from('generated_prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (newPromptsError) {
        console.error('Error fetching new prompts:', newPromptsError);
        throw newPromptsError;
      }

      if (newPromptsData && newPromptsData.length > 0) {
        console.log(`✅ Found ${newPromptsData.length} new prompts`);
        setPrompts(newPromptsData);
        
        // Initialize editable prompts with new content
        const editableContent = {};
        newPromptsData.forEach(prompt => {
          editableContent[prompt.id] = prompt.prompt_text;
        });
        setEditablePrompts(editableContent);
        
        setWebhookStatus('success');
        setTimeout(() => setWebhookStatus('idle'), 3000);
        setError(null);
        return true;
      } else {
        console.log(`❌ No new prompts found (attempt ${retryCount + 1})`);
        
        if (retryCount < maxRetries - 1) {
          console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return await fetchNewPromptsWithRetry(retryCount + 1);
        } else {
          console.log('❌ Max retries reached, no new prompts found');
          setError('No new prompts generated. Please try again.');
          setWebhookStatus('error');
          return false;
        }
      }
    } catch (err) {
      console.error(`Error in retry ${retryCount + 1}:`, err);
      
      if (retryCount < maxRetries - 1) {
        console.log(`⏳ Retrying in ${retryDelay/1000} seconds due to error...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return await fetchNewPromptsWithRetry(retryCount + 1);
      } else {
        console.log('❌ Max retries reached due to errors');
        setError('Failed to fetch new prompts after multiple attempts.');
        setWebhookStatus('error');
        return false;
      }
    }
  };

  // --- Send profile to webhook ---
  const handleSendProfileToWebhook = async () => {
    if (!user || !profile) {
      setError('User or profile data incomplete, cannot send.');
      return;
    }

    // Don't allow if any prompt improvement is in progress
    if (Object.values(improvingPrompts).some(status => status === true)) {
      console.log('❌ Cannot generate while prompt improvement is in progress');
      return;
    }

    try {
      setWebhookStatus('sending');
      setError(null);

      const payload = {
        user_id: user.id,
        email: user.email,
        fullname: profile.full_name,
        age_range: profile.age_range,
        relationship_stage: profile.relationship_stage,
        default_focus: profile.default_focus,
        conversation_feeling: profile.conversation_feeling,
      };

      console.log('Sending data to Webhook:', payload);

      // Use axios to send a POST request
      await axios.post(WEBHOOK_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('✅ Webhook request successful, now fetching new prompts...');
      
      // Wait a moment and then start retrying to get new data
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchNewPromptsWithRetry();

    } catch (err) {
      console.error('Error sending data to Webhook:', err);
      setError('Failed to send profile data. Please check console for details.');
      setWebhookStatus('error');
    }
  };

  // --- Conditional Rendering ---
  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-medium text-black">Prompt Suggestions</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p>Loading user data...</p>
        </div>
      </>
    );
  }

  if (error && !profile) {
     return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-medium text-black">Prompt Suggestions</h2>
        </div>
        <div className="bg-red-50 p-4 border border-red-200">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </>
    );
  }

  // --- Main Component UI ---
  return (
    <>
      {/* Header with title and generate button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-black">Prompt Suggestions</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSendProfileToWebhook}
            disabled={isAnyOperationInProgress()}
            className={`w-16 h-8 border border-black font-medium text-xs transition-all duration-200 ${ 
              isAnyOperationInProgress()
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {webhookStatus === 'sending' && 'Loading...'}
            {webhookStatus === 'idle' && 'Generate'}
            {webhookStatus === 'success' && '✅ Success!'}
            {webhookStatus === 'error' && 'Retry'}
          </button>
        </div>
      </div>
      
      {/* AI Prompts Count */}
      <div className="mb-4 p-3 bg-white border border-black">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-black">AI Prompts: {prompts.length}</span>
          <div className="text-xs text-gray-500">
            Send your profile to our AI to get personalized prompt suggestions.
          </div>
        </div>
        {error && webhookStatus === 'error' && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
      </div>

      {/* Individual Prompt Collapsible Sections */}
      {prompts.length > 0 ? (
        <div className="space-y-4">
          {prompts.map((prompt, index) => (
            <div key={prompt.id} className="mb-4 bg-white border border-black">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => togglePrompt(prompt.id)}
                  className="flex-1 px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-black">Prompt {index + 1}</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  </div>
                  <span className="text-black">
                    {expandedPrompts[prompt.id] ? '−' : '+'}
                  </span>
                </button>
                <div className="px-2">
                  <button
                    onClick={() => {
                      const currentText = editablePrompts[prompt.id] || prompt.prompt_text;
                      improvePrompt(prompt.id, currentText);
                    }}
                    disabled={improvingPrompts[prompt.id] || webhookStatus === 'sending'}
                    className={`w-8 h-8 border border-black font-medium text-sm transition-all duration-200 flex items-center justify-center ${ 
                      improvingPrompts[prompt.id] || webhookStatus === 'sending'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-gray-100'
                    }`}
                    title="Improve this prompt with AI"
                  >
                    {improvingPrompts[prompt.id] ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-500"></div>
                    ) : (
                      <span>✨</span>
                    )}
                  </button>
                </div>
              </div>
              
              {expandedPrompts[prompt.id] && (
                <div className="px-4 pb-4">
                  <div className="mb-2">
                    <span className="text-xs text-gray-400">
                      {new Date(prompt.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="border border-gray-200">
                    <textarea
                      value={editablePrompts[prompt.id] || prompt.prompt_text}
                      onChange={(e) => updateEditablePrompt(prompt.id, e.target.value)}
                      className="w-full h-32 px-3 py-2 bg-white focus:outline-none resize-none text-sm"
                      placeholder="Edit your prompt here..."
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 bg-white border border-black p-6 text-center text-gray-500">
          <p className="text-sm">No prompts yet.</p>
          <p className="text-xs mt-1">Generate your first suggestion above!</p>
        </div>
      )}
    </>
  );
}
