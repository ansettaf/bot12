const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const fileUtils = require('../utils/file');
const timeoutManager = require('./timeoutManager');

/**
 * Executes a native yt-dlp spawn. 
 * Resolves with the filepath on success, rejects on failure.
 */
const executeYtDlp = (videoId, quality, signal) => {
    return new Promise((resolve, reject) => {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const outputTemplate = path.join(config.DOWNLOAD_DIR, `${videoId}_${quality}.%(ext)s`);
        const finalFilePath = path.join(config.DOWNLOAD_DIR, `${videoId}_${quality}.mp3`);

        const cached = cache.getCachedAudio(videoId, quality);
        if (cached && fs.existsSync(cached)) {
            logger.log(`Using cached audio for ${videoId} (${quality}kbps).`);
            return resolve(finalFilePath); 
        }

        const cookiesPath = path.join(__dirname, '../../www.youtube.com_cookies.txt');
        const args = [
            '--cookies', cookiesPath,
            '-f', 'ba/18/b',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', quality === '128' ? '5' : '0',
            '--embed-thumbnail',
            '--add-metadata',
            '--output', outputTemplate,
            url
        ];

        // Pass native AbortSignal payload downstream natively.
        const ytDlp = spawn('yt-dlp', args, { signal });

        ytDlp.stderr.on('data', (data) => {
            const msg = data.toString().toLowerCase();
            if (msg.includes('error')) {
                logger.warn(`[yt-dlp] ${msg.trim()}`);
            }
        });

        ytDlp.on('close', (code) => {
            if (code === 0 && fs.existsSync(finalFilePath)) {
                cache.setCachedAudio(videoId, quality, finalFilePath);
                resolve(finalFilePath);
            } else {
                reject(new Error(`yt-dlp exited with code ${code}. File mapping failed.`));
            }
        });

        ytDlp.on('error', (err) => {
            reject(new Error(`Spawn error: ${err.message}`));
        });
    });
};

/**
 * Fallback compressor utilizing ffmpeg directly to squash large files down to 128k CBR.
 */
const compressAudio = (inputPath, signal) => {
    return new Promise((resolve, reject) => {
        const outPath = inputPath.replace('.mp3', '_compressed.mp3');
        logger.log(`Compressing ${inputPath} down to 128kbps logic to avoid file limits...`);
        const proc = spawn('ffmpeg', [
            '-i', inputPath,
            '-b:a', '128k',
            outPath,
            '-y'
        ], { signal });

        proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(outPath)) {
                // Safely swap the raw file with our massively compressed version natively
                fs.unlinkSync(inputPath); 
                fs.renameSync(outPath, inputPath);
                resolve(inputPath);
            } else {
                reject(new Error(`Failed to execute fallback ffmpeg compression limits.`));
            }
        });
        
        proc.on('error', (e) => reject(new Error(`FFmpeg spawn exception: ${e.message}`)));
    });
};

/**
 * Generates Exponential Backoff timeouts natively.
 */
const getBackoffTimeout = (attempt) => {
    switch(attempt) {
        case 1: return 1000;  // 1s
        case 2: return 3000;  // 3s
        case 3: return 6000;  // 6s
        default: return attempt * 2000; 
    }
}

/**
 * Robustly downloads, validates limits, and strictly incorporates dynamic compression & retries.
 */
const downloadAudio = async (videoId, quality = config.DEFAULT_QUALITY, attempt = 1) => {
    try {
        if (attempt === 1) {
            logger.log(`Starting yt-dlp payload pipeline for ${videoId}...`);
        }
        
        const extractController = new AbortController();
        const extractPromise = executeYtDlp(videoId, quality, extractController.signal);
        let filePath = await timeoutManager.executeWithTimeout(extractPromise, extractController, 120000); // 2 min strict TTL

        // Dynamic Bitrate Fallback Logic
        const sizeMB = fileUtils.getFileSizeMB(filePath);
        if (sizeMB > config.MAX_FILE_SIZE_MB) {
            logger.warn(`File is ${sizeMB.toFixed(2)}MB, bursting the ${config.MAX_FILE_SIZE_MB}MB safety limit. Triggering dynamic compression protocols.`);
            const compressController = new AbortController();
            const compressPromise = compressAudio(filePath, compressController.signal);
            filePath = await timeoutManager.executeWithTimeout(compressPromise, compressController, 60000); // 60s processing TTL
        }

        return filePath;
    } catch (error) {
        if (attempt <= config.MAX_RETRIES) {
            const ms = getBackoffTimeout(attempt);
            logger.warn(`Download thread failed for ${videoId}. Retrying in ${ms/1000}s... (${attempt}/${config.MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, ms)); 
            return await downloadAudio(videoId, quality, attempt + 1);
        } else {
            logger.error(`Exhausted all ${config.MAX_RETRIES} iterative fallbacks for ${videoId}.`);
            throw error;
        }
    }
};

module.exports = {
    downloadAudio
};
