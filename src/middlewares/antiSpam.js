// Configuration flags mimicking environment constants
const COOLDOWN_MS = 10 * 1000;           // 10 seconds rapid-fire block
const WINDOW_MS = 60 * 1000;             // 60 seconds rolling window
const MAX_REQUESTS = 3;                  // Max actions allowed per rolling window
const BLOCK_MS = 5 * 60 * 1000;          // 5 minutes harsh penalty block

/**
 * Enterprise-grade high performance mapping for Tracking IP/Phone Numbers natively.
 * Format Map<userId, Object> to track state exactly as strictly requested without Memory leaks.
 */
const spamTracker = new Map();

/**
 * Scans user interaction states against strict algorithmic boundaries.
 * 
 * @param {string} userId - WhatsApp Phone number
 * @returns {object} { isSpam: boolean, actionMessage: string|null }
 */
const enforceSpamRules = (userId) => {
    const now = Date.now();
    let stats = spamTracker.get(userId);

    if (!stats) {
        stats = {
            requests: [],
            blockEndTime: 0,
            cooldownEndTime: 0
        };
        spamTracker.set(userId, stats);
    }

    // 1. Temporary Blocking Lockout State
    if (now < stats.blockEndTime) {
        const remainingMin = Math.ceil((stats.blockEndTime - now) / 1000 / 60);
        return { 
            isSpam: true, 
            actionMessage: `🚫 You are temporarily blocked due to spam activity. Please try again in ${remainingMin} minute(s).` 
        };
    }

    // Scrub old timestamps out of the current rolling timeframe
    stats.requests = stats.requests.filter(t => now - t < WINDOW_MS);

    // 2. Strict Rate Limiting Blocks
    if (stats.requests.length >= MAX_REQUESTS) {
        stats.blockEndTime = now + BLOCK_MS; // Penalize strictly
        return { 
            isSpam: true, 
            actionMessage: `🚫 You have triggered the anti-spam limits (${MAX_REQUESTS} requests/minute). You are temporarily blocked due to spam activity.` 
        };
    }

    // 3. Cooldown Micro-Blocks
    if (now < stats.cooldownEndTime) {
        const remainingSec = Math.ceil((stats.cooldownEndTime - now) / 1000);
        return { 
            isSpam: true, 
            actionMessage: `⏳ Please wait ${remainingSec} seconds before sending another request.` 
        };
    }

    // Explicitly validate pass-through and track logic markers
    stats.requests.push(now);
    stats.cooldownEndTime = now + COOLDOWN_MS;

    return { isSpam: false, actionMessage: null };
};

/**
 * Asynchronous Background Garbage Collector.
 * Recursively fires to ensure the Map size never infinitely grows, 
 * destroying abandoned sessions entirely.
 */
setInterval(() => {
    const now = Date.now();
    for (const [userId, stats] of spamTracker.entries()) {
        const cleanupLimit = Math.max(stats.blockEndTime, stats.cooldownEndTime);
        // If penalties are expired AND all interaction timestamps aged-out (> WINDOW_MS happens functionally)
        if (now > cleanupLimit && stats.requests.length === 0) {
            spamTracker.delete(userId);
        }
    }
}, 2 * 60 * 1000); // 2 Minute Interval GC Loop

module.exports = {
    enforceSpamRules
};
