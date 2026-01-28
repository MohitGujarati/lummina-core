import React, { useState } from 'react';
import ChatLayout from './components/layout/ChatLayout/ChatLayout';
import Sidebar from './components/layout/Sidebar/Sidebar';
import ChatScreen from './screens/Chat/ChatScreen';
import KnowledgeBaseScreen from './screens/KnowledgeBase/KnowledgeBaseScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';
import LoginScreen from './screens/Auth/LoginScreen';
import QuizModeScreen from './screens/Quiz/QuizModeScreen';
import { ROLES } from './config/constants';


function App() {
  // Initialize state from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('lummina_is_logged_in') === 'true';
  });

  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('lummina_user_role') || ROLES.STUDENT;
  });

  const [activeScreen, setActiveScreen] = useState('chat'); // 'chat' or 'kb'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedLecture, setSelectedLecture] = useState(null);

  // Login Handler
  const handleLogin = (role) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
    // Persist
    localStorage.setItem('lummina_is_logged_in', 'true');
    localStorage.setItem('lummina_user_role', role);
    // Reset screen on login
    setActiveScreen('chat');
  };

  // Toggle Role
  const toggleRole = () => {
    const newRole = currentRole === ROLES.TEACHER ? ROLES.STUDENT : ROLES.TEACHER;
    setCurrentRole(newRole);
    // Persist new role
    localStorage.setItem('lummina_user_role', newRole);

    // If switching to student while on KB, go back to chat
    if (newRole === ROLES.STUDENT && activeScreen === 'kb') {
      setActiveScreen('chat');
    }
  };

  const handleNewChat = () => {
    setActiveScreen('chat');
    // In a real app, this would also reset conversation ID
  };

  const handleNavigateKB = () => {
    setActiveScreen('kb');
  };

  const handleNavigateSettings = () => {
    setActiveScreen('settings');
  };

  const handleNavigateQuiz = () => {
    setActiveScreen('quiz');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentRole(ROLES.STUDENT);
    // Clear persistence
    localStorage.removeItem('lummina_is_logged_in');
    localStorage.removeItem('lummina_user_role');

    setActiveScreen('chat');
  };

  const currentUser = {
    name: currentRole === ROLES.TEACHER ? 'Professor Smith' : 'Alex Student',
    email: currentRole === ROLES.TEACHER ? 'proff.smith@uni.edu' : 'alex.s@uni.edu',
    initials: currentRole === ROLES.TEACHER ? 'PS' : 'AS'
  };

  // Auth Guard
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (activeScreen === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setActiveScreen('chat')}
      />
    );
  }

  return (
    <div className="app">
      <ChatLayout
        sidebar={
          <Sidebar
            isOpen={isSidebarOpen}
            currentRole={currentRole}
            onToggleRole={toggleRole}
            onNewChat={handleNewChat}
            onNavigateKB={handleNavigateKB}
            onNavigateQuiz={handleNavigateQuiz}
            onSelectLecture={setSelectedLecture}
            selectedLecture={selectedLecture}
          />
        }
        user={currentUser}
        onLogout={handleLogout}
        onSettings={handleNavigateSettings}
      >
        {activeScreen === 'chat' && (
          <ChatScreen
            currentRole={currentRole}
            selectedLecture={selectedLecture}
          />
        )}
        {activeScreen === 'kb' && <KnowledgeBaseScreen />}
        {activeScreen === 'quiz' && <QuizModeScreen onExit={() => setActiveScreen('chat')} />}
      </ChatLayout>
    </div>
  );
}

export default App;
