-- ============================================================
-- Lummina — Auth & Role Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================


-- ── 1. user_profiles ─────────────────────────────────────────────────────────
-- Mirrors auth.users. Stores the app-level role for each user.
-- Roles are assigned here — never trusted from the client/localStorage.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role        TEXT        NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "profiles_select_own"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile, but only as 'student'
-- (teacher role is granted exclusively via the claim_teacher_role RPC)
CREATE POLICY "profiles_insert_own_as_student"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'student');


-- ── 2. Auto-create profile on sign-up ────────────────────────────────────────
-- Every new Supabase Auth user gets a student profile automatically.
-- This removes any race condition where a new user has no profile yet.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'student',
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 3. teacher_invitations ───────────────────────────────────────────────────
-- One-time invitation tokens that grant teacher role.
-- Admin creates tokens in the Supabase dashboard (or via SQL).
-- Tokens are: single-use, expiring, and never exposed in the frontend bundle.
--
-- HOW TO CREATE A TEACHER INVITATION:
--   INSERT INTO public.teacher_invitations (label)
--   VALUES ('Prof. Smith — Computer Science');
--
--   SELECT token FROM public.teacher_invitations
--   WHERE label = 'Prof. Smith — Computer Science';
--
--   Share that token with the professor. It expires in 30 days by default.
--   Once used, it cannot be used again by anyone else.

CREATE TABLE IF NOT EXISTS public.teacher_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  label       TEXT,                                             -- Human-readable note (who this is for)
  used_by     UUID        REFERENCES auth.users(id),
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;
-- No client-side reads — tokens are only accessed via the RPC (server-side)
-- Admin can read/write via service role key in the dashboard


-- ── 6. delete_own_account RPC ───────────────────────────────────────────────
-- Allows a user to permanently delete their own account.
-- For teachers: deletes all subjects (cascades to enrollments + subject_files metadata).
-- Storage files must be removed from the frontend BEFORE calling this RPC.
-- Finally, deletes the auth.users row which cascades to user_profiles.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Delete all subjects created by this teacher (cascades to enrollments + subject_files)
  DELETE FROM public.subjects WHERE teacher_id = v_user_id;

  -- Delete user profile (auth.users CASCADE will also do this, but be explicit)
  DELETE FROM public.user_profiles WHERE id = v_user_id;

  -- Delete the auth user — this is the point of no return
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;


-- ── 5. register_as_teacher RPC ──────────────────────────────────────────────
-- Open self-registration: any authenticated user can call this to set their
-- own role to 'teacher'. No admin token required.
-- Run this in your Supabase SQL Editor after the rest of the schema.

CREATE OR REPLACE FUNCTION public.register_as_teacher(p_full_name TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.user_profiles (id, role, full_name)
  VALUES (v_user_id, 'teacher', p_full_name)
  ON CONFLICT (id) DO UPDATE SET
    role      = 'teacher',
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name);

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ── 8. conversations & messages ─────────────────────────────────────────────
-- Stores chat history per user. Each conversation is tied to an optional
-- subject/chapter so history can be restored with the right context.

CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id  UUID        REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id  UUID        REFERENCES public.chapters(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL DEFAULT 'New Conversation',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_own"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender          TEXT        NOT NULL CHECK (sender IN ('user', 'system')),
  text            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_own"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );


-- ── 7. chapters ──────────────────────────────────────────────────────────────
-- Each subject can have multiple ordered chapters.
-- Files in subject_files can optionally be linked to a chapter (chapter_id nullable).

CREATE TABLE IF NOT EXISTS public.chapters (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID        REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT        DEFAULT '',
  order_index INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Teachers can fully manage chapters for their own subjects
CREATE POLICY "chapters_teacher_all"
  ON public.chapters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.subjects
      WHERE subjects.id = chapters.subject_id
        AND subjects.teacher_id = auth.uid()
    )
  );

-- Students can read chapters of subjects they are enrolled in
CREATE POLICY "chapters_student_select"
  ON public.chapters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.subject_id = chapters.subject_id
        AND enrollments.student_id = auth.uid()
    )
  );

-- Add chapter_id FK to subject_files (nullable — NULL means "General / unassigned")
ALTER TABLE public.subject_files
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;


-- ── 4. claim_teacher_role RPC ────────────────────────────────────────────────
-- SECURITY DEFINER: runs as the DB owner, bypassing RLS.
-- This is the ONLY way a user can become a teacher.
-- Validates: token exists, unused, not expired, user is authenticated.
-- Atomically marks the token used and upgrades the user's role.

CREATE OR REPLACE FUNCTION public.claim_teacher_role(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation  public.teacher_invitations%ROWTYPE;
  v_user_id     UUID;
BEGIN
  v_user_id := auth.uid();

  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Atomically find and lock a valid, unused, unexpired invitation
  SELECT * INTO v_invitation
  FROM public.teacher_invitations
  WHERE token      = LOWER(TRIM(p_token))
    AND used_by    IS NULL
    AND expires_at > NOW()
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_expired_token');
  END IF;

  -- Mark the invitation as consumed
  UPDATE public.teacher_invitations
  SET used_by = v_user_id,
      used_at = NOW()
  WHERE id = v_invitation.id;

  -- Grant teacher role (upsert handles existing profiles)
  INSERT INTO public.user_profiles (id, role)
  VALUES (v_user_id, 'teacher')
  ON CONFLICT (id) DO UPDATE SET role = 'teacher';

  RETURN jsonb_build_object('success', true);
END;
$$;
