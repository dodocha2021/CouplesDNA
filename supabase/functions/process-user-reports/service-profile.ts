/**
 * Service: User Profile
 * Handles fetching and formatting user profile information
 */

export interface UserProfile {
  relationship_status?: string;
  gender?: string;
  age_range?: string;
  relationship_duration?: string;
  consultation_focus?: string[];
}

/**
 * Fetch user profile from profiles table
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns User profile data or null
 */
export async function fetchUserProfile(
  supabase: any,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('relationship_status, gender, age_range, relationship_duration, consultation_focus')
    .eq('id', userId)
    .single();

  if (error) {
    console.log(`⚠️ Warning: Could not fetch user profile: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Format user profile into human-readable text
 * @param profile - User profile data
 * @returns Formatted profile text
 */
export function formatUserProfile(profile: UserProfile | null): string {
  if (!profile) {
    return '';
  }

  const topicsText = Array.isArray(profile.consultation_focus) && profile.consultation_focus.length > 0
    ? profile.consultation_focus.join(', ')
    : 'Not specified';

  return `
User Profile Context:
- Relationship Status: ${profile.relationship_status || 'Not specified'}
- Gender: ${profile.gender || 'Not specified'}
- Age Range: ${profile.age_range || 'Not specified'}
- Relationship Duration: ${profile.relationship_duration || 'Not specified'}
- Topics of Interest: ${topicsText}

`;
}

/**
 * Fetch and format user profile in one step
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param log - Logging function
 * @returns Formatted profile text
 */
export async function getUserProfileContext(
  supabase: any,
  userId: string,
  log: (message: string) => void
): Promise<string> {
  log('  > Fetching user profile information...');

  const profile = await fetchUserProfile(supabase, userId);

  if (profile) {
    log(`  ✓ User profile loaded: ${profile.relationship_status || 'N/A'}, ${profile.gender || 'N/A'}, ${profile.age_range || 'N/A'}`);
  } else {
    log('  ⚠️ No user profile information available');
  }

  return formatUserProfile(profile);
}
