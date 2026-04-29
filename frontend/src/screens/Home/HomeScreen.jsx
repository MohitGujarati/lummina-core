import React, { useState } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import { UI_TEXT, ROLES } from '../../config/constants';

const HomeScreen = ({ onSelectRole }) => {
    const [hoveredCard, setHoveredCard] = useState(false);



    return (
        <div style={styles.container}>
            <div
                style={styles.roleCard}
                onMouseEnter={() => setHoveredCard(true)}
                onMouseLeave={() => setHoveredCard(false)}
            >
                <h1 style={styles.title}>{UI_TEXT.HOME.WELCOME}</h1>
                <p style={styles.subtitle}>{UI_TEXT.HOME.SELECT_ROLE}</p>

                <div style={styles.buttonGroup}>
                    <Button
                        style={styles.roleButton}
                        onClick={() => onSelectRole(ROLES.TEACHER)}
                    >
                        {UI_TEXT.HOME.TEACHER_BTN}
                    </Button>

                    <Button
                        variant="secondary"
                        style={styles.roleButton}
                        onClick={() => onSelectRole(ROLES.STUDENT)}
                    >
                        {UI_TEXT.HOME.STUDENT_BTN}
                    </Button>
                </div>
            </div>
        </div>
    );
    const styles = {
        container: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-bg-app)',
            padding: '1rem',
        },
        roleCard: {
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            padding: '3.5rem 2.5rem',
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: hoveredCard ? 'var(--shadow-float)' : 'var(--shadow-lg)',
            transition: 'all 0.3s var(--ease-snappy)',
            border: '1px solid var(--color-border)',
        },
        title: {
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            marginBottom: '0.75rem',
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
        },
        subtitle: {
            color: 'var(--color-text-secondary)',
            marginBottom: '3rem',
            fontSize: '1rem',
            lineHeight: 1.6,
        },
        buttonGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        },
        roleButton: {
            width: '100%',
            justifyContent: 'center',
            height: '3rem',
            fontSize: '1rem',
        }
    };
};

export default HomeScreen;