import React from 'react';
import ProfileDropdown from '../ProfileDropdown/ProfileDropdown';

const ChatLayout = ({ sidebar, children, user, onLogout, onSettings }) => {
    const styles = {
        layout: {
            display: 'flex',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            backgroundColor: 'var(--color-bg-surface)',
        },
        mainContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            backgroundColor: 'var(--color-bg-surface)',
            /* Matches Gemini's white main area */
        }
    };

    return (
        <div style={styles.layout}>
            {sidebar}
            <main style={styles.mainContent}>
                {user && (
                    <ProfileDropdown
                        user={user}
                        onLogout={onLogout}
                        onSettings={onSettings}
                    />
                )}
                {children}
            </main>
        </div>
    );
};


export default ChatLayout;
