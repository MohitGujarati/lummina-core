import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../components/common/Card/Card';

const SourceCard = ({ title, icon, description, badge, children }) => {
    const [isHovered, setIsHovered] = useState(false);



    const styles = {
        sourceCard: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            border: isHovered ? '1px solid var(--color-border-hover)' : '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: 0,
            overflow: 'hidden',
            boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            transform: isHovered ? 'translateY(-2px)' : 'none',
        },
        header: {
            padding: '1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            position: 'relative',
            backgroundColor: 'transparent',
        },
        iconWrapper: {
            fontSize: '1.25rem',
            color: 'var(--color-primary)',
            backgroundColor: 'var(--color-bg-app)',
            padding: '0.625rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerContent: {
            flex: 1,
        },
        title: {
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '0.25rem',
        },
        description: {
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
        },
        badge: {
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--color-accent)',
            backgroundColor: 'var(--color-accent-subtle)',
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(59, 130, 246, 0.1)',
        },
        content: {
            padding: '1.5rem',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-bg-surface)',
        }
    };

    return (
        <Card
            style={styles.sourceCard}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={styles.header}>
                <div style={styles.iconWrapper}>{icon}</div>
                <div style={styles.headerContent}>
                    <h3 style={styles.title}>{title}</h3>
                    <p style={styles.description}>{description}</p>
                </div>
                {badge && <span style={styles.badge}>{badge}</span>}
            </div>

            <div style={styles.content}>
                {children}
            </div>
        </Card>
    );
};

SourceCard.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    description: PropTypes.string,
    badge: PropTypes.string,
    children: PropTypes.node,
};

export default SourceCard;
