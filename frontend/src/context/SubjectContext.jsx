import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import {
    getTeacherSubjects,
    getStudentEnrollments,
} from '../services/subjectService';
import { getRecentConversations } from '../services/conversationService';
import { ROLES } from '../config/constants';

const SubjectContext = createContext(null);

export const SubjectProvider = ({ children, currentRole }) => {
    const isTeacher = currentRole === ROLES.TEACHER;

    const [enrolledSubjects,      setEnrolledSubjects]      = useState([]);
    const [teacherSubjects,       setTeacherSubjects]       = useState([]);
    const [activeSubjectId,       setActiveSubjectId]       = useState(null);
    const [activeChapterId,       setActiveChapterId]       = useState(null);
    const [activeConversationId,  setActiveConversationId]  = useState(null);
    const [recentConversations,   setRecentConversations]   = useState([]);
    const [loading,               setLoading]               = useState(true);

    // Check if a real Supabase session exists (Google OAuth users)
    const hasSession = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    }, []);

    const refreshRecentConversations = useCallback(async () => {
        if (!(await hasSession())) { setRecentConversations([]); return; }
        try {
            const data = await getRecentConversations();
            setRecentConversations(data);
        } catch (err) {
            console.error('[SubjectContext] refreshRecentConversations:', err.message);
        }
    }, [hasSession]);

    const refreshTeacherSubjects = useCallback(async () => {
        if (!isTeacher) return;
        if (!(await hasSession())) { setTeacherSubjects([]); return; }
        try {
            const data = await getTeacherSubjects();
            setTeacherSubjects(data);
        } catch (err) {
            console.error('[SubjectContext] refreshTeacherSubjects:', err.message);
        }
    }, [isTeacher, hasSession]);

    const refreshEnrollments = useCallback(async () => {
        if (isTeacher) return;
        if (!(await hasSession())) { setEnrolledSubjects([]); return; }
        try {
            const data = await getStudentEnrollments();
            setEnrolledSubjects(data);
        } catch (err) {
            console.error('[SubjectContext] refreshEnrollments:', err.message);
        }
    }, [isTeacher, hasSession]);

    // Load on mount and when role changes
    useEffect(() => {
        setLoading(true);
        Promise.all([
            refreshTeacherSubjects(),
            refreshEnrollments(),
            refreshRecentConversations(),
        ]).finally(() => setLoading(false));
    }, [refreshTeacherSubjects, refreshEnrollments, refreshRecentConversations]);

    // Reset active subject + chapter + conversation when role changes
    useEffect(() => {
        setActiveSubjectId(null);
        setActiveChapterId(null);
        setActiveConversationId(null);
    }, [currentRole]);

    // Reset active chapter when subject changes
    useEffect(() => {
        setActiveChapterId(null);
    }, [activeSubjectId]);

    const value = {
        // Student
        enrolledSubjects,
        refreshEnrollments,
        // Teacher
        teacherSubjects,
        refreshTeacherSubjects,
        // Shared
        activeSubjectId,
        setActiveSubjectId,
        activeChapterId,
        setActiveChapterId,
        // Conversations
        activeConversationId,
        setActiveConversationId,
        recentConversations,
        refreshRecentConversations,
        isTeacher,
        loading,
    };

    return (
        <SubjectContext.Provider value={value}>
            {children}
        </SubjectContext.Provider>
    );
};

export const useSubjects = () => {
    const ctx = useContext(SubjectContext);
    if (!ctx) throw new Error('useSubjects must be used within SubjectProvider');
    return ctx;
};
