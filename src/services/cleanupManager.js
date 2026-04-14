const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/config');

const CACHE_TTL_MS = (config.CACHE_LIFETIME_HOURS || 24) * 60 * 60 * 1000;

/**
 * Enterprise Garbage Collector for physical disk files.
 * Iterates strictly inside the persistent cache block matching TTL mappings natively.
 */
const startGarbageCollector = () => {
    setInterval(() => {
        logger.log('[GC] Running physical Disk-Cache Sweeper...');
        try {
            if (!fs.existsSync(config.DOWNLOAD_DIR)) return;

            const files = fs.readdirSync(config.DOWNLOAD_DIR);
            const now = Date.now();
            files.forEach(file => {
                const filePath = path.join(config.DOWNLOAD_DIR, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtimeMs > CACHE_TTL_MS) {
                    fs.unlinkSync(filePath);
                    logger.log(`[GC] Evicted stale physical mapped object: ${file}`);
                }
            });
        } catch (e) {
            logger.error('[GC] File Sweeper execution failure natively:', e.message);
        }
    }, 60 * 60 * 1000); // Every 1 Hour 
};

/**
 * Validates memory footprint sizes explicitly outputting tracking algorithms.
 */
const startHealthMonitor = (downloadQueue) => {
    setInterval(() => {
        try {
            const memoryUsage = process.memoryUsage();
            const ramMB = Math.round(memoryUsage.rss / 1024 / 1024);
            logger.log(`[HEALTH] RAM: ${ramMB}MB/1024MB | Core Jobs Waiting: ${downloadQueue.queue.length}`);
            
            if (ramMB > 950) {
                logger.warn('WARNING: RAM EXCEEDING SAFE BOUNDARIES (OOM PRECAUTION). Consider halting execution.');
            }
        } catch (e) {
            // Suppress monitor traps
        }
    }, 60 * 1000); // Every 60 Seconds
};

module.exports = {
    startGarbageCollector,
    startHealthMonitor
};
