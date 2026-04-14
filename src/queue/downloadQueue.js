const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Handles concurrent download limitations to prevent server crash.
 */
class DownloadQueue {
    constructor() {
        this.queue = [];
        this.activeJobs = 0;
        this.concurrencyLimit = config.CONCURRENT_DOWNLOADS;
    }

    /**
     * Adds a job into the queue and starts processing if slots are available.
     * @param {object} job { userId, query, messageObject, videoData, quality, processorFn }
     * @returns {number} position in queue
     */
    addJob(job) {
        this.queue.push({ ...job, timestamp: Date.now() });
        const position = this.queue.length;
        this.processNext();
        return position;
    }

    /**
     * Finds the index of the first job belonging to a user (1-based map).
     */
    getQueuePosition(userId) {
        return this.queue.findIndex(j => j.userId === userId) + 1;
    }

    async processNext() {
        if (this.activeJobs >= this.concurrencyLimit || this.queue.length === 0) {
            return;
        }

        this.activeJobs++;
        const job = this.queue.shift();

        try {
            // Executor delegates all WhatsApp messaging & Audio service commands natively
            await job.processorFn(job);
        } catch (error) {
            logger.error(`Job execution entirely failed for user ${job.userId}:`, error.message);
        } finally {
            this.activeJobs--;
            this.processNext(); // Trigger the next waiting job automatically
        }
    }
}

// Export as a singleton
module.exports = new DownloadQueue();
