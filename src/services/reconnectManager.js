const logger = require('../utils/logger');

let reconnectAttempts = 0;

/**
 * Handles seamless recursive re-initialization without disrupting NodeJS natively,
 * executing sophisticated Exponential Algorithms specifically targeted at authentications dropping out.
 */
const handleDisconnection = (client, reason) => {
    reconnectAttempts++;
    
    // Exponential formula capping at exactly 60 seconds of sleep mathematically
    const backoffTimeout = Math.min(2000 * Math.pow(2, reconnectAttempts), 60000); 
    
    logger.warn(`[RECONNECT_MANAGER] WhatsApp instance dropped out. Reason: ${reason}`);
    logger.warn(`[RECONNECT_MANAGER] Triggering Exponential Backoff logic (Attempt ${reconnectAttempts}). Sleeping for ${backoffTimeout/1000}s natively.`);

    setTimeout(() => {
        try {
            logger.log('[RECONNECT_MANAGER] Re-mounting internal initialization engines...');
            client.initialize();
        } catch(e) {
            logger.error(`[RECONNECT_MANAGER] Fatal spawn block failure caught natively:`, e.message);
        }
    }, backoffTimeout);
};

/**
 * Sweeps the tracker perfectly clean upon successful auth validations.
 */
const clearReconnectTracker = () => {
    if (reconnectAttempts > 0) {
        logger.log('[RECONNECT_MANAGER] Session stabilized natively. Resetting internal exponential maps.');
    }
    reconnectAttempts = 0;
};

module.exports = {
    handleDisconnection,
    clearReconnectTracker
};
