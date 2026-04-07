/* ============================================================================
   AGENT MEMORY — 3-tier memory with localStorage persistence
   - longTerm:     lecture knowledge maps, survives page refresh
   - working:      current task scratch space, cleared per task
   - transactions: audit trail of all memory operations
   ============================================================================ */

const LS_PREFIX = 'lummina_km_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class AgentMemory {
    constructor() {
        this.longTerm = new Map();
        this.working = { currentTask: null, context: {}, history: [] };
        this.transactions = [];
    }

    storeLongTerm(key, value) {
        const entry = { ...value, timestamp: Date.now(), accessCount: 0 };
        this.longTerm.set(key, entry);
        try {
            localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
        } catch (_) {
            // Storage full — in-memory cache still works
        }
        this._log('STORE_LONG_TERM', { key });
    }

    recallLongTerm(key) {
        // Hydrate from localStorage if not already in memory
        if (!this.longTerm.has(key)) {
            try {
                const stored = localStorage.getItem(LS_PREFIX + key);
                if (stored) this.longTerm.set(key, JSON.parse(stored));
            } catch (_) {}
        }
        const data = this.longTerm.get(key);
        if (!data) return null;

        // Evict if expired
        if (Date.now() - data.timestamp > CACHE_TTL) {
            this.longTerm.delete(key);
            try { localStorage.removeItem(LS_PREFIX + key); } catch (_) {}
            return null;
        }

        data.accessCount = (data.accessCount || 0) + 1;
        data.lastAccessed = Date.now();
        this._log('RECALL_LONG_TERM', { key });
        return data;
    }

    updateWorking(updates) {
        this.working.context = { ...this.working.context, ...updates };
        this.working.history.push({ timestamp: Date.now(), updates });
        this._log('UPDATE_WORKING', updates);
    }

    getWorking() {
        return this.working.context;
    }

    clearWorking() {
        this.working = { currentTask: null, context: {}, history: [] };
    }

    getAuditTrail() {
        return this.transactions;
    }

    _log(action, data) {
        this.transactions.push({ timestamp: Date.now(), action, data });
    }
}

// Singleton — one memory system for the whole app session
export const agentMemory = new AgentMemory();
