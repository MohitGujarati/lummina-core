import React, { useState } from 'react';
import ChatLayout from './components/layout/ChatLayout/ChatLayout';
import Sidebar from './components/layout/Sidebar/Sidebar';
import ChatScreen from './screens/Chat/ChatScreen';
import KnowledgeBaseScreen from './screens/KnowledgeBase/KnowledgeBaseScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';
import LoginScreen from './screens/Auth/LoginScreen';
import { ROLES } from './config/constants';


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRole, setCurrentRole] = useState(ROLES.STUDENT);
  const [activeScreen, setActiveScreen] = useState('chat'); // 'chat' or 'kb'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedLecture, setSelectedLecture] = useState(null);

  // Login Handler
  const handleLogin = (role) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
    // Reset screen on login
    setActiveScreen('chat');
  };

  // Toggle Role
  const toggleRole = () => {
    const newRole = currentRole === ROLES.TEACHER ? ROLES.STUDENT : ROLES.TEACHER;
    setCurrentRole(newRole);
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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentRole(ROLES.STUDENT);
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
      </ChatLayout>
    </div>
  );
}

export default App;
