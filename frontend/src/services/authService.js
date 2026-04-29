import { supabase } from './supabase';

/**
 * Fetches the current user's profile (role) from the database.
 *
 * Role is the single source of truth — it comes from the DB, not localStorage
 * or any client-side secret. If the trigger-created profile doesn't exist yet
 * (edge case on first sign-up), a student profile is created as a fallback.
 *
 * @returns {{ id: string, role: 'student'|'teacher', full_name: string }}
 */
export const getUserProfile = async () => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, role, full_name')
    .single();

  // PGRST116 = no rows found — trigger may not have run yet for this user
  if (error?.code === 'PGRST116') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({ id: user.id, role: 'student' })
      .select('id, role, full_name')
      .single();

    if (insertError) throw insertError;
    return newProfile;
  }

  if (error) throw error;
  return data;
};

/**
 * Claims the teacher role using a one-time invitation token.
 *
 * Validation runs entirely server-side via a SECURITY DEFINER RPC.
 * The token is never stored in the frontend bundle.
 * Tokens are single-use and expire after 30 days.
 *
 * @param {string} token - The invitation token provided by an administrator.
 * @returns {{ success: boolean, error?: string }}
 */
export const claimTeacherRole = async (token) => {
  const { data, error } = await supabase.rpc('claim_teacher_role', {
    p_token: token.trim().toLowerCase(),
  });
  if (error) throw error;
  return data; // { success: true } or { success: false, error: 'invalid_or_expired_token' }
};

/**
 * Permanently deletes the current user's account.
 *
 * For teachers: lists all their subject files from storage and removes them
 * before calling the server-side RPC that wipes subjects, profile, and the
 * auth.users row (point of no return).
 *
 * For students: only the RPC is needed (no storage files to clean up).
 *
 * After this resolves, call supabase.auth.signOut() so the SIGNED_OUT event
 * in App.jsx clears local state and navigates to login.
 *
 * @param {boolean} isTeacher - Whether the current user is a teacher.
 */
export const deleteAccount = async (isTeacher) => {
  if (isTeacher) {
    // 1. Collect all storage paths for this teacher's subjects before deletion
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id');

    if (subjects?.length) {
      const subjectIds = subjects.map(s => s.id);
      const { data: files } = await supabase
        .from('subject_files')
        .select('storage_path')
        .in('subject_id', subjectIds);

      if (files?.length) {
        const paths = files.map(f => f.storage_path);
        // Remove in one batch (Supabase storage accepts up to 1000 paths at once)
        await supabase.storage.from('subject-files').remove(paths);
      }
    }
  }

  // 2. Server-side: delete subjects (cascade), user_profiles, and auth.users
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
};

/**
 * Self-registers the current authenticated user as a teacher.
 *
 * No invitation token required — any signed-in user can call this to
 * upgrade their role to 'teacher'. Role update runs server-side via a
 * SECURITY DEFINER RPC so RLS is not a blocker.
 *
 * @param {string} fullName - Display name to store on the profile.
 * @returns {{ success: boolean, error?: string }}
 */
export const registerAsTeacher = async (fullName) => {
  const { data, error } = await supabase.rpc('register_as_teacher', {
    p_full_name: fullName.trim() || null,
  });
  if (error) throw error;
  return data; // { success: true } or { success: false, error: '...' }
};
