import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import geminiRoutes from './routes/gemini.js';
import vivaRoutes from './routes/viva.js';
import { handleVivaLiveWebSocket } from './routes/vivaLive.js';

// Env vars are loaded via --env-file=.env flag at startup (see package.json scripts).
// Do NOT use dotenv here — ESM hoisting means module-level code in imported files
// (like createClient in fileLoader.js) runs before dotenv.config() would execute.

const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from Vite dev server
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || /^http:\/\/localhost:\d+$/ }));

// Parse JSON bodies up to 10mb (for large file parts if ever needed)
app.use(express.json({ limit: '10mb' }));

app.use('/api/gemini', geminiRoutes);
app.use('/api/viva', vivaRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Attach WebSocket server on the same port as Express.
// All existing HTTP routes remain unchanged — only /ws/viva is new.
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws/viva' });

wss.on('connection', (socket, req) => {
    console.log('[vivaLive] Browser connected via WebSocket');
    handleVivaLiveWebSocket(socket, req);
});

httpServer.listen(PORT, () => {
    console.log(`✅ Lummina server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket proxy listening on ws://localhost:${PORT}/ws/viva`);
    console.log(`🔑 Gemini key: ${process.env.GEMINI_API_KEY ? 'configured' : '⚠️  MISSING'}`);
    console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? 'configured' : '⚠️  MISSING'}`);
});
