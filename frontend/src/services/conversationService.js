import { supabase } from './supabase';

export const getRecentConversations = async (limit = 25) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, subject_id, chapter_id, updated_at, subjects(name)')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
};

export const createConversation = async (title, subjectId = null, chapterId = null) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: title.trim(),
      subject_id: subjectId || null,
      chapter_id: chapterId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const saveMessage = async (conversationId, sender, text) => {
  const { error: msgError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender, text });
  if (msgError) throw msgError;

  // Bump updated_at so conversation floats to top of recents
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
};

export const getConversationMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender, text, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
};
