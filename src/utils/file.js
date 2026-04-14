const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Ensure necessary directories exist
const checkDirectories = () => {
    if (!fs.existsSync(config.DOWNLOAD_DIR)) fs.mkdirSync(config.DOWNLOAD_DIR, { recursive: true });
    if (!fs.existsSync(config.CACHE_DIR)) fs.mkdirSync(config.CACHE_DIR, { recursive: true });
};

// Returns file size in Megabytes
const getFileSizeMB = (filePath) => {
    if (!fs.existsSync(filePath)) return 0;
    const stats = fs.statSync(filePath);
    return stats.size / (1024 * 1024);
};

// Deletes a file safely
const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error(`Failed to delete file: ${filePath}`, error.message);
        }
    }
};

module.exports = {
    checkDirectories,
    getFileSizeMB,
    deleteFile
};
