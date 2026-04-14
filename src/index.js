const fileUtils = require('./utils/file');
const cache = require('./utils/cache');
const logger = require('./utils/logger');
const whatsappService = require('./services/whatsapp.service');
const messageController = require('./controllers/message.controller');
const downloadQueue = require('./queue/downloadQueue');
const cleanupManager = require('./services/cleanupManager');

// Global Crash Prevention
process.on('uncaughtException', (err) => {
    logger.error('CRITICAL: Uncaught Exception! Bot will forcefully stay alive.', err);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('CRITICAL: Unhandled Rejection at promise.', reason);
});

// Main bootstrapper
const bootstrap = async () => {
    logger.log('Starting WhatsApp Music Bot system...');

    try {
        // Prepare directories & configurations
        fileUtils.checkDirectories();
        cache.initCache();

        // Listen for WhatsApp messages
        whatsappService.client.on('message_create', async (msg) => {
            // Ignore messages from myself/bot if desired
            if (msg.fromMe) return; 
            
            await messageController.handleMessage(msg);
        });

        // Initialize connection
        whatsappService.initClient();

        // Launch Strict Lifecycle Monitoring Processes (LRU + RAM Bounds)
        cleanupManager.startHealthMonitor(downloadQueue);
        cleanupManager.startGarbageCollector();

    } catch (e) {
        logger.error('Fatal initialization error:', e);
        // Do not crash, let the uncaught handler capture anomalies
    }
};

bootstrap();
