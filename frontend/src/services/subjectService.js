import { supabase } from './supabase';

// ── Subjects ─────────────────────────────────────────────────────────────────

export const createSubject = async (code, name, description = '') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('subjects')
    .insert({ code: code.trim().toUpperCase(), name: name.trim(), description: description.trim(), teacher_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getTeacherSubjects = async () => {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, code, name, description, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const getSubjectByCode = async (code) => {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, code, name, description, teacher_id')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data; // null if not found
};

export const deleteSubject = async (subjectId) => {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', subjectId);
  if (error) throw error;
};

// ── Enrollments ───────────────────────────────────────────────────────────────

export const enrollStudent = async (subjectId) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('enrollments')
    .insert({ student_id: user.id, subject_id: subjectId });
  if (error) throw error;
};

export const unenrollStudent = async (subjectId) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('student_id', user.id)
    .eq('subject_id', subjectId);
  if (error) throw error;
};

export const getStudentEnrollments = async () => {
  const { data, error } = await supabase
    .from('enrollments')
    .select('enrolled_at, subjects(id, code, name, description)')
    .order('enrolled_at', { ascending: true });
  if (error) throw error;
  // Flatten: return array of subject objects with enrolled_at attached
  return (data ?? []).map(row => ({ ...row.subjects, enrolled_at: row.enrolled_at }));
};

// ── Subject Files ─────────────────────────────────────────────────────────────

export const getSubjectFiles = async (subjectId, chapterId = undefined) => {
  let query = supabase
    .from('subject_files')
    .select('id, file_name, storage_path, mime_type, file_size, chapter_id, created_at')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true });

  if (chapterId === null) {
    // Explicitly fetch only unassigned (General) files
    query = query.is('chapter_id', null);
  } else if (chapterId !== undefined) {
    // Fetch files for a specific chapter
    query = query.eq('chapter_id', chapterId);
  }
  // If chapterId is undefined, fetch all files regardless of chapter

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

export const uploadSubjectFile = async (subjectId, teacherId, file, chapterId = null) => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${teacherId}/${subjectId}/${Date.now()}_${safeName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('subject-files')
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  // Insert metadata into DB
  const { error: dbError } = await supabase
    .from('subject_files')
    .insert({
      subject_id: subjectId,
      chapter_id: chapterId,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: teacherId,
    });

  if (dbError) {
    // Rollback storage on DB failure
    await supabase.storage.from('subject-files').remove([storagePath]);
    throw dbError;
  }
};

export const deleteSubjectFile = async (fileId, storagePath) => {
  const { error: storageError } = await supabase.storage
    .from('subject-files')
    .remove([storagePath]);
  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from('subject_files')
    .delete()
    .eq('id', fileId);
  if (dbError) throw dbError;
};

// ── Chapters ──────────────────────────────────────────────────────────────────

export const getSubjectChapters = async (subjectId) => {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, title, description, order_index, created_at')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const createChapter = async (subjectId, title, description = '', orderIndex = 0) => {
  const { data, error } = await supabase
    .from('chapters')
    .insert({ subject_id: subjectId, title: title.trim(), description: description.trim(), order_index: orderIndex })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteChapter = async (chapterId) => {
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId);
  if (error) throw error;
};
