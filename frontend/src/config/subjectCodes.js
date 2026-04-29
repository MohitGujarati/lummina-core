// Subject access codes — maps student-entered codes to lecture folder names.
// Add new entries here when new subjects/lectures are available.
// Note: 'leacture_1' folder name has an intentional typo — do not rename.

export const SUBJECT_CODES = {
  'PHYS101': { lectureId: 'leacture_1', label: 'Lecture 1' },
  'CHEM201': { lectureId: 'lecture_2',  label: 'Lecture 2' },
};

/**
 * Validates a subject code entered by a student.
 * @param {string} code - The code entered by the student.
 * @returns {{ lectureId: string, label: string } | null} The subject info, or null if invalid.
 */
export const validateSubjectCode = (code) => {
  return SUBJECT_CODES[code.trim().toUpperCase()] || null;
};

// NOTE: Teacher access validation has been moved server-side.
// Teacher role is granted exclusively via the claim_teacher_role Supabase RPC.
// See: src/services/authService.js → claimTeacherRole()
// See: supabase/schema.sql → claim_teacher_role function + teacher_invitations table
