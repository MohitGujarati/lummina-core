/**
 * Application Constants
 * 
 * Centralized store for all text, labels, and messages.
 */

export const APP_INFO = {
  NAME: 'Lummina',
  VERSION: '1.0.0',
};

export const ROLES = {
  TEACHER: 'teacher',
  STUDENT: 'student',
};

export const UI_TEXT = {
  SIDEBAR: {
    NEW_CHAT: 'New chat',
    RECENT_TITLE: 'Recent',
    KB_LINK: 'Knowledge Base',
    SETTINGS: 'Settings',
  },
  CHAT: {
    GREETING: {
      TEACHER: 'Hello, Teacher',
      STUDENT: 'Hello, Student',
    },
    SUB_GREETING: 'How can I help you today?',
    INPUT_PLACEHOLDER: 'Enter your prompt here',
    DISCLAIMER: 'Lummina may display inaccurate info, including about people, so double-check its responses.',
  },
  KB: {
    HEADER: {
      TITLE: 'Knowledge Base',
      SUBTITLE: 'Manage the data sources for your RAG applications.',
    },
    STATS: {
      DOCUMENTS: 'Documents',
      LINKS: 'Links',
    },
    CARDS: {
      DOCUMENTS: {
        TITLE: 'Documents',
        DESC: 'Upload PDF, DOCX, or PPT files to be indexed.',
        DROP_TEXT: 'Drag & Drop files here',
        SELECT_BTN: 'Select Files',
        RECENT_LABEL: 'Recent Uploads',
      },
      LINKS: {
        TITLE: 'Web Links',
        DESC: 'Add URLs to verified websites or articles.',
        PLACEHOLDER: 'https://example.com/article',
        ADD_BTN: 'Add',
      },
      VIDEO: {
        TITLE: 'Video Sources',
        DESC: 'Index content from YouTube or Vimeo URLs.',
        PLACEHOLDER: 'https://youtube.com/watch?v=...',
        ADD_BTN: 'Add',
        EMPTY: 'No video sources added yet.',
      },
      AUDIO: {
        TITLE: 'Audio Recorder',
        DESC: 'Record lectures and save transcripts automatically.',
        BTN_STOP: 'Stop Recording',
        BTN_START: 'Start Recording',
        STATUS_RECORDING: 'Recording in progress...',
        STATUS_IDLE: 'Click microphone to start recording',
        RECENT_LABEL: 'Recent Transcripts',
        VIEW_BTN: 'View',
      }
    },
    MODAL: {
      TITLE: 'Transcript Viewer',
      DELETE_BTN: 'Delete',
      EDIT_BTN: 'Edit Manually',
      ENHANCE_BTN: 'Enhance with AI',
    }
  },
  SETTINGS: {
    BACK_BTN: 'Back to Chat',
    SIDEBAR: {
      ACCOUNT_TITLE: 'Account',
      GENERAL: 'General',
      PROFILE: 'Profile',
      SECURITY: 'Security',
      BILLING: 'Billing',
    },
    PROFILE: {
      TITLE: 'Profile',
      SUBTITLE: 'Manage your public profile and bio.',
      AVATAR_TITLE: 'Profile Picture',
      AVATAR_HELPER: 'JPG, GIF or PNG. Max size 800K',
      UPLOAD_BTN: 'Upload New',
      REMOVE_BTN: 'Remove',
      DISPLAY_NAME_LABEL: 'Display Name',
      BIO_LABEL: 'Bio',
      BIO_HELPER: 'Brief description for your profile.',
    },
    GENERAL: {
      TITLE: 'General Settings',
      SUBTITLE: 'Manage account preferences and security.',
      ACCOUNT_INFO_TITLE: 'Account Info',
      EMAIL_LABEL: 'Email Address',
      EMAIL_HELPER: 'Contact support to change your email.',
      PREFERENCES_TITLE: 'Preferences',
      EMAIL_NOTIFS_LABEL: 'Email Notifications',
      EMAIL_NOTIFS_DESC: 'Receive summarized updates',
      MARKETING_LABEL: 'Marketing Emails',
      MARKETING_DESC: 'Receive product news and offers',
      DARK_MODE_LABEL: 'Dark Mode',
      DARK_MODE_DESC: 'Switch between light and dark themes',
      DANGER_ZONE_TITLE: 'Danger Zone',
      DANGER_WARNING: 'Once you delete your account, there is no going back. Please be certain.',
      DELETE_BTN: 'Delete Account',
    }
  },
  PROFILE_DROPDOWN: {
    SETTINGS: 'Settings',
    LOGOUT: 'Log out',
  },
  LOGIN: {
    APP_NAME: 'Lummina AI',
    WELCOME: 'Welcome back',
    SUBTITLE: 'Enter your details to access your account.',
    EMAIL_LABEL: 'Email',
    EMAIL_PLACEHOLDER: 'name@example.com',
    PASSWORD_LABEL: 'Password',
    PASSWORD_PLACEHOLDER: '••••••••',
    SUBMIT_BTN: 'Sign in',
    GOOGLE_BTN: 'Continue with Google',
    DIVIDER: 'OR',
    ROLES: {
      TEACHER: 'Teacher',
      STUDENT: 'Student',
    },
    FOOTER: '© 2026 Lummina AI. All rights reserved.'
  }
};
