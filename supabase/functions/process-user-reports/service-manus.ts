/**
 * Service: Manus Slides Generation
 * Handles slide generation via Manus AI API
 */

export interface ManusTaskResult {
  taskId: string;
  shareUrl: string;
}

/**
 * Create a Manus slide generation task
 * @param prompt - The complete prompt for slide generation
 * @returns Task ID and shareable URL
 */
export async function createManusTask(prompt: string): Promise<ManusTaskResult> {
  const apiKey = Deno.env.get("MANUS_API_KEY");
  if (!apiKey) {
    throw new Error("MANUS_API_KEY not configured");
  }

  const response = await fetch('https://api.manus.ai/v1/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API_KEY': apiKey
    },
    body: JSON.stringify({
      prompt: prompt,
      taskMode: 'adaptive',
      agentProfile: 'quality',
      hideInTaskList: false,
      createShareableLink: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Manus API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('🔍 Manus API response:', JSON.stringify(data, null, 2));

  // Validate response data
  if (!data.task_id) {
    throw new Error('Manus API did not return task_id');
  }

  return {
    taskId: data.task_id,
    shareUrl: data.share_url || null
  };
}
