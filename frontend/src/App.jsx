import React, { useState, useEffect } from 'react';
import ChatLayout from './components/layout/ChatLayout/ChatLayout';
import Sidebar from './components/layout/Sidebar/Sidebar';
import ChatScreen from './screens/Chat/ChatScreen';
import KnowledgeBaseScreen from './screens/KnowledgeBase/KnowledgeBaseScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';
import LoginScreen from './screens/Auth/LoginScreen';
import LandingPage from './screens/LandingPage/LandingPage';
import QuizModeScreen from './screens/Quiz/QuizModeScreen';
import VivaModeScreen from './screens/Viva/VivaModeScreen';
import { ROLES } from './config/constants';
import TeacherRegistrationScreen from './screens/TeacherRegistration/TeacherRegistrationScreen';
import SubjectEnrollmentScreen from './screens/SubjectEnrollment/SubjectEnrollmentScreen';
import { supabase } from './services/supabase';
import { getUserProfile } from './services/authService';
import { SubjectProvider, useSubjects } from './context/SubjectContext';


// Inner component that can access SubjectContext
function AppContent({ currentRole, activeScreen, setActiveScreen, currentUser, onLogout, onNavigateSettings }) {
  const {
    activeSubjectId, setActiveSubjectId,
    activeChapterId, setActiveChapterId,
    activeConversationId, setActiveConversationId,
    recentConversations, refreshRecentConversations,
    enrolledSubjects, teacherSubjects,
    refreshEnrollments, refreshTeacherSubjects,
  } = useSubjects();

  const handleSelectSubject = (subjectId) => {
    setActiveSubjectId(subjectId);
    setActiveConversationId(null);
    setActiveScreen('chat');
  };

  // Called from Sidebar when user picks a subject or chapter — starts a new chat
  const handleSelectLecture = (subjectId, chapterId = null) => {
    setActiveSubjectId(subjectId);
    setActiveChapterId(chapterId);
    setActiveConversationId(null);
    setActiveScreen('chat');
  };

  // Called from Sidebar when user clicks a past conversation
  const handleSelectConversation = (conversation) => {
    setActiveSubjectId(conversation.subject_id);
    setActiveChapterId(conversation.chapter_id);
    setActiveConversationId(conversation.id);
    setActiveScreen('chat');
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setActiveScreen('chat');
  };

  const handleGoToEnrollment = () => setActiveScreen('enrollment');
  const handleNavigateKB = () => setActiveScreen('kb');
  const handleNavigateQuiz = () => setActiveScreen('quiz');
  const handleNavigateViva = () => setActiveScreen('viva');

  if (activeScreen === 'settings') {
    return <SettingsScreen onBack={() => setActiveScreen('chat')} currentUser={currentUser} currentRole={currentRole} onLogout={onLogout} />;
  }

  if (activeScreen === 'enrollment') {
    return (
      <SubjectEnrollmentScreen
        onSelectSubject={handleSelectSubject}
        onRefreshEnrollments={refreshEnrollments}
      />
    );
  }

  return (
    <div className="app">
      <ChatLayout
        sidebar={
          <Sidebar
            isOpen={true}
            currentRole={currentRole}
            onNewChat={handleNewChat}
            onNavigateKB={handleNavigateKB}
            onNavigateQuiz={handleNavigateQuiz}
            onNavigateViva={handleNavigateViva}
            onSelectLecture={handleSelectLecture}
            selectedLecture={activeSubjectId}
            selectedChapterId={activeChapterId}
            onGoToEnrollment={handleGoToEnrollment}
            enrolledSubjects={enrolledSubjects}
            teacherSubjects={teacherSubjects}
            recentConversations={recentConversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
          />
        }
        user={currentUser}
        onLogout={onLogout}
        onSettings={onNavigateSettings}
      >
        {activeScreen === 'chat' && (
          <ChatScreen
            currentRole={currentRole}
            selectedLecture={activeSubjectId}
            selectedChapterId={activeChapterId}
            conversationId={activeConversationId}
            onConversationCreated={setActiveConversationId}
            onRefreshRecent={refreshRecentConversations}
          />
        )}
        {activeScreen === 'kb' && (
          <KnowledgeBaseScreen
            onBack={() => setActiveScreen('chat')}
            onRefreshSubjects={refreshTeacherSubjects}
          />
        )}
        {activeScreen === 'quiz' && <QuizModeScreen onExit={() => setActiveScreen('chat')} />}
        {activeScreen === 'viva' && <VivaModeScreen onExit={() => setActiveScreen('chat')} />}
      </ChatLayout>
    </div>
  );
}


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('lummina_is_logged_in') === 'true';
  });

  const [showLanding, setShowLanding] = useState(() => {
    return localStorage.getItem('lummina_is_logged_in') !== 'true';
  });

  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('lummina_user_role') || ROLES.STUDENT;
  });

  const [activeScreen, setActiveScreen] = useState('chat');
  const [supabaseUser, setSupabaseUser] = useState(null);

  // Load existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSupabaseUser(session.user);
    });
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentRole(ROLES.STUDENT);
    localStorage.removeItem('lummina_is_logged_in');
    localStorage.removeItem('lummina_user_role');
    setActiveScreen('chat');
    supabase.auth.signOut();
  };

  // Resolve role from DB and set app state after a successful sign-in.
  // This is the single place where role is determined — always from the server.
  const resolveRoleAndNavigate = async () => {
    try {
      const profile = await getUserProfile();
      const role = profile.role === ROLES.TEACHER ? ROLES.TEACHER : ROLES.STUDENT;
      const pendingRole = localStorage.getItem('lummina_pending_role');
      localStorage.removeItem('lummina_pending_role');

      setCurrentRole(role);
      localStorage.setItem('lummina_user_role', role);
      setIsLoggedIn(true);
      localStorage.setItem('lummina_is_logged_in', 'true');

      if (role === ROLES.TEACHER) {
        // Returning teacher — DB already has teacher role, skip code screen
        setActiveScreen('chat');
      } else if (pendingRole === ROLES.TEACHER) {
        // New user who chose Teacher at login — needs to claim role with invitation token
        setActiveScreen('teacher-code');
      } else {
        setActiveScreen('enrollment');
      }
    } catch (err) {
      console.error('[Auth] Role resolution failed:', err);
      // DB may not be set up yet (schema not run) — still honour the role the
      // user selected at login so the teacher-code screen remains reachable.
      const pendingRole = localStorage.getItem('lummina_pending_role');
      localStorage.removeItem('lummina_pending_role');
      setCurrentRole(ROLES.STUDENT);
      localStorage.setItem('lummina_user_role', ROLES.STUDENT);
      setIsLoggedIn(true);
      localStorage.setItem('lummina_is_logged_in', 'true');
      setActiveScreen(pendingRole === ROLES.TEACHER ? 'teacher-code' : 'enrollment');
    }
  };

  // Handle Supabase auth events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Fresh login (OAuth callback or email/password sign-in)
        setSupabaseUser(session.user);
        resolveRoleAndNavigate();
      } else if (event === 'INITIAL_SESSION') {
        if (session) {
          // Page refresh with an existing session — always re-fetch role from DB
          // so any admin role changes take effect without the user logging out
          setSupabaseUser(session.user);
          if (!isLoggedIn) resolveRoleAndNavigate();
        } else if (localStorage.getItem('lummina_is_logged_in') === 'true') {
          // No valid session but localStorage still says logged in —
          // account was deleted or session expired; force a clean logout
          setSupabaseUser(null);
          setIsLoggedIn(false);
          setCurrentRole(ROLES.STUDENT);
          localStorage.removeItem('lummina_is_logged_in');
          localStorage.removeItem('lummina_user_role');
          setActiveScreen('chat');
        }
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        setIsLoggedIn(false);
        setCurrentRole(ROLES.STUDENT);
        localStorage.removeItem('lummina_is_logged_in');
        localStorage.removeItem('lummina_user_role');
        setActiveScreen('chat');
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentUser = (() => {
    if (supabaseUser) {
      const name = supabaseUser.user_metadata?.full_name
        || supabaseUser.user_metadata?.name
        || supabaseUser.email?.split('@')[0]
        || 'User';
      const email = supabaseUser.email || '';
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
      return { name, email, initials };
    }
    return {
      name:     currentRole === ROLES.TEACHER ? 'Professor Smith' : 'Alex Student',
      email:    currentRole === ROLES.TEACHER ? 'proff.smith@uni.edu' : 'alex.s@uni.edu',
      initials: currentRole === ROLES.TEACHER ? 'PS' : 'AS',
    };
  })();

  // Auth guard — before context
  if (!isLoggedIn) {
    if (showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} />;
    return <LoginScreen />;
  }

  if (activeScreen === 'teacher-code') {
    return (
      <TeacherRegistrationScreen
        onRegistered={() => {
          setCurrentRole(ROLES.TEACHER);
          localStorage.setItem('lummina_user_role', ROLES.TEACHER);
          setActiveScreen('chat');
        }}
        onContinueAsStudent={() => {
          setCurrentRole(ROLES.STUDENT);
          localStorage.setItem('lummina_user_role', ROLES.STUDENT);
          setActiveScreen('enrollment');
        }}
      />
    );
  }

  return (
    <SubjectProvider currentRole={currentRole}>
      <AppContent
        currentRole={currentRole}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateSettings={() => setActiveScreen('settings')}
      />
    </SubjectProvider>
  );
}

export default App;
