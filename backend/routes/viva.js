/**
 * server/routes/viva.js
 * Express routes for Viva exam session management.
 */

import { Router } from 'express';
import { startVivaSession, processVivaTurn, endVivaSession } from '../services/vivaAgent.js';

const router = Router();

// POST /api/viva/start
router.post('/start', async (req, res) => {
    const { lectureId } = req.body;
    if (!lectureId) return res.status(400).json({ error: 'lectureId is required' });

    try {
        const session = await startVivaSession(lectureId);
        res.json(session);
    } catch (error) {
        console.error('[/api/viva/start]', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/viva/turn
router.post('/turn', async (req, res) => {
    const { sessionId, userText, currentRound, totalRounds } = req.body;
    if (!sessionId || !userText) return res.status(400).json({ error: 'sessionId and userText are required' });

    try {
        const result = await processVivaTurn(sessionId, userText, currentRound, totalRounds);
        res.json(result);
    } catch (error) {
        console.error('[/api/viva/turn]', error.message);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/viva/end
router.delete('/end', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    try {
        const summary = endVivaSession(sessionId);
        res.json(summary || { message: 'Session ended' });
    } catch (error) {
        console.error('[/api/viva/end]', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
