const logger = require('../utils/logger');

/**
 * Enterprise Timeout Manager preventing infinite event-loop hanging.
 * Wraps critical child-processes natively, issuing formal AbortSignals to kill stalled threads.
 */
const executeWithTimeout = (promise, abortController, timeoutMs = 120000) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            logger.warn(`Thread execution limit (${timeoutMs}ms) breached. Issuing SIGTERM AbortSignal.`);
            try {
                abortController.abort(); // Triggers native signal pass-downs to child_process nodes
            } catch (e) {
                logger.error('Failed to dispatch AbortSignal natively:', e.message);
            }
            reject(new Error("TIMEOUT_EXCEEDED"));
        }, timeoutMs);

        promise
            .then((res) => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

module.exports = { 
    executeWithTimeout 
};
