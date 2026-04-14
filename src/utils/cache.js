const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// A very basic persistent cache map
let cacheMap = {};
const cacheFile = path.join(config.CACHE_DIR, 'cacheMap.json');

const initCache = () => {
    if (fs.existsSync(cacheFile)) {
        try {
            cacheMap = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        } catch (e) {
            cacheMap = {};
        }
    }
};

const saveCache = () => {
    fs.writeFileSync(cacheFile, JSON.stringify(cacheMap, null, 2));
};

const getCachedAudio = (videoId, quality) => {
    const key = `${videoId}_${quality}`;
    if (cacheMap[key] && fs.existsSync(cacheMap[key])) {
        return cacheMap[key];
    }
    // Cleanup invalid cache
    if (cacheMap[key]) {
        delete cacheMap[key];
        saveCache();
    }
    return null;
};

const setCachedAudio = (videoId, quality, filePath) => {
    const key = `${videoId}_${quality}`;
    cacheMap[key] = filePath;
    saveCache();
};

const removeCachedAudio = (videoId, quality) => {
    const key = `${videoId}_${quality}`;
    if (cacheMap[key]) {
        delete cacheMap[key];
        saveCache();
    }
};

module.exports = {
    initCache,
    getCachedAudio,
    setCachedAudio,
    removeCachedAudio
};
