/**
 * Maintains interactive state for users utilizing high-performance Map layouts.
 */
const sessions = new Map();

const clearSession = (userId) => {
    if (sessions.has(userId)) {
        const data = sessions.get(userId);
        if (data.timeoutId) {
            clearTimeout(data.timeoutId);
        }
        sessions.delete(userId);
    }
};

const setSession = (userId, data) => {
    // If user already had a session pending, wipe its timeout timer natively
    if (sessions.has(userId)) {
        const oldData = sessions.get(userId);
        if (oldData.timeoutId) {
            clearTimeout(oldData.timeoutId);
        }
    }

    // Auto-expire to avoid session memory leaks and stuck interactions
    const timeoutId = setTimeout(() => {
        clearSession(userId);
    }, 2 * 60 * 1000); // 2 minutes

    sessions.set(userId, { ...data, timestamp: Date.now(), timeoutId });
};

const getSession = (userId) => {
    return sessions.get(userId) || null;
};

module.exports = {
    setSession,
    getSession,
    clearSession
};
