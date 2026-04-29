import React from 'react';
import ProfileDropdown from '../ProfileDropdown/ProfileDropdown';

const ChatLayout = ({ sidebar, children, user, onLogout, onSettings }) => {
    const styles = {
        layout: {
            display: 'flex',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            backgroundColor: 'var(--color-bg-app)',
            fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        mainContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            backgroundColor: 'var(--color-bg-surface)',
            borderLeft: '1px solid var(--color-border)',
            overflow: 'hidden',
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
