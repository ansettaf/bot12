require('dotenv').config();
const path = require('path');

module.exports = {
    COMMAND_PREFIX: process.env.COMMAND_PREFIX || '/',
    DEFAULT_QUALITY: process.env.DEFAULT_QUALITY || '320', // Default audio bitrate
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB) || 50, // WhatsApp max doc limit
    CACHE_LIFETIME_HOURS: parseInt(process.env.CACHE_LIFETIME_HOURS) || 24,
    CONCURRENT_DOWNLOADS: parseInt(process.env.CONCURRENT_DOWNLOADS) || 2, // Queue size limit
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3, // Retry fallback attempts
    DOWNLOAD_DIR: path.join(__dirname, '..', '..', 'downloads'),
    CACHE_DIR: path.join(__dirname, '..', '..', 'cache'),
};
