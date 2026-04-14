const youtubeService = require('../services/youtube.service');
const audioService = require('../services/audio.service');
const whatsappService = require('../services/whatsapp.service');
const fileUtils = require('../utils/file');
const logger = require('../utils/logger');
const config = require('../config/config');
const cache = require('../utils/cache');
const sessionUtil = require('../utils/session');
const downloadQueue = require('../queue/downloadQueue');
const antiSpam = require('../middlewares/antiSpam');

// In-memory user preferences mapping. e.g. "123456789@c.us" -> { quality: '320' }
const userPrefs = {};

const handleMessage = async (msg) => {
    const text = msg.body.trim();
    const sender = msg.from;
    const session = sessionUtil.getSession(sender);

    // Provide an escape word to exit interactive sessions safely
    if (text.toLowerCase() === 'cancel' && session) {
        sessionUtil.clearSession(sender);
        return await whatsappService.sendReply(msg, `❌ Song selection cancelled.`);
    }

    // 1. Check if the user is in an active selection state (expected to reply with 1-5)
    if (session && session.state === 'AWAITING_SELECTION') {
        const selectionIndex = parseInt(text);
        if (isNaN(selectionIndex) || selectionIndex < 1 || selectionIndex > session.results.length) {
            return await whatsappService.sendReply(msg, `⚠️ Invalid selection. Please reply with a number between 1 and ${session.results.length}, or type *cancel*.`);
        }

        const chosenVideo = session.results[selectionIndex - 1];
        sessionUtil.clearSession(sender); // Clear state instantly

        // Construct the Processor Function that the Queue will execute asynchronously
        const processorFn = async (job) => {
            const { videoData, quality, msgRef } = job;
            try {
                // 1. Notify Processing
                await whatsappService.sendReply(msgRef, `🚀 Processing your song: *${videoData.title}*...`);

                // 2. Download audio (auto-retries handle errors natively beneath)
                const tempPath = await audioService.downloadAudio(videoData.videoId, quality);

                // 3. Size validation
                const sizeMB = fileUtils.getFileSizeMB(tempPath);
                if (sizeMB > config.MAX_FILE_SIZE_MB) {
                    fileUtils.deleteFile(tempPath);
                    return await whatsappService.sendReply(msgRef, `❌ Failed! The audio file is too large (*${sizeMB.toFixed(2)}MB*). Max limit is *${config.MAX_FILE_SIZE_MB}MB*.`);
                }

                // 4. Send Cover Art and Format Metadata
                const infoMsg = `🎵 *Title:* ${videoData.title}\n👤 *Artist:* ${videoData.artist}\n⏱️ *Duration:* ${videoData.duration}`;
                if (videoData.thumbnail) {
                    await whatsappService.sendImageFromUrl(msgRef, videoData.thumbnail, infoMsg);
                } else {
                    await whatsappService.sendReply(msgRef, infoMsg);
                }

                // 5. Send Mp3 Payload
                await whatsappService.sendAudio(msgRef, tempPath, false); 

                // 6. Delete file IMMEDIATELY after transmission to fulfill strict memory guidelines
                setTimeout(() => {
                    try {
                        fileUtils.deleteFile(tempPath);
                        cache.removeCachedAudio(videoData.videoId, quality);
                    } catch(err) {
                        logger.error('Failed to immediately clean cache mapping:', err.message);
                    }
                }, 1000); // Exits disk block instantly

            } catch (error) {
                logger.error(`Critical failure executing Queue Job for ${sender}:`, error.message);
                await whatsappService.sendReply(msgRef, `❌ All automated attempts failed while trying to download *${videoData.title}*. Please try another song.`);
            }
        };

        // Inject into Task Queue!
        const quality = (userPrefs[sender] && userPrefs[sender].quality) || config.DEFAULT_QUALITY;
        const position = downloadQueue.addJob({
            userId: sender,
            msgRef: msg,
            videoData: chosenVideo,
            quality: quality,
            processorFn: processorFn
        });

        // Advise User
        if (downloadQueue.activeJobs >= downloadQueue.concurrencyLimit && position > 0) {
             return await whatsappService.sendReply(msg, `⏳ Your request is in queue *(Position: ${position})*. It will start processing shortly!`);
        } else {
             // System has free workers, downloading begins instantly but silently, so no extra text needed!
             return;
        }
    }


    // 2. Initial Command Parser
    const isCommand = text.startsWith(config.COMMAND_PREFIX) 
        || text.toLowerCase().startsWith('song ')
        || text.toLowerCase() === 'help'
        || text.toLowerCase() === 'status'
        || text.toLowerCase().startsWith('quality ');

    if (!isCommand) {
        return; // Ignore general conversation
    }

    try {
        if (text.toLowerCase() === 'status' || text === `${config.COMMAND_PREFIX}status`) {
            const pos = downloadQueue.getQueuePosition(sender);
            if (pos > 0) {
                return await whatsappService.sendReply(msg, `📊 You are currently at *Position ${pos}* in the queue!`);
            } else {
                return await whatsappService.sendReply(msg, `📊 You have no pending downloads in the queue right now.`);
            }
        }

        if (text.toLowerCase().startsWith('help') || text === `${config.COMMAND_PREFIX}help`) {
            const helpText = `*🎵 WhatsApp Music Bot V2 🎵*\n\n` + 
                `Commands:\n` +
                `👉 *song <music name>* - Searches and starts interactive downloader.\n` +
                `👉 *status* - Checks your position in the processing queue.\n` +
                `👉 *quality <128|320>* - Changes your audio quality (Default: 320).\n` +
                `👉 *help* - Shows this menu.\n\n` +
                `_Powered by yt-dlp & ffmpeg_`;
            return await whatsappService.sendReply(msg, helpText);
        }

        if (text.toLowerCase().startsWith('quality ') || text.startsWith(`${config.COMMAND_PREFIX}quality `)) {
            const requestedQuality = text.split(' ')[1];
            if (['128', '320'].includes(requestedQuality)) {
                userPrefs[sender] = { quality: requestedQuality };
                return await whatsappService.sendReply(msg, `✅ Quality successfully set to *${requestedQuality}kbps*.`);
            } else {
                return await whatsappService.sendReply(msg, `❌ Invalid quality. Use: *quality 128* or *quality 320*`);
            }
        }

        let searchQuery = text;
        if (text.toLowerCase().startsWith('song ')) {
            searchQuery = text.slice(5).trim();
        } else if (text.startsWith(config.COMMAND_PREFIX)) {
            searchQuery = text.slice(config.COMMAND_PREFIX.length).trim();
        }

        if (!searchQuery) {
            return await whatsappService.sendReply(msg, `❌ Give me a song name! Example: *song Numb Linkin Park*`);
        }

        // 3. Handle Searching with Advanced Spam Protection
        const spamCheck = antiSpam.enforceSpamRules(sender);
        if (spamCheck.isSpam) {
            return await whatsappService.sendReply(msg, spamCheck.actionMessage);
        }

        logger.log(`User ${sender} searched for: ${searchQuery}`);
        const results = await youtubeService.searchMusic(searchQuery);

        if (!results || results.length === 0) {
            return await whatsappService.sendReply(msg, `❌ Could not find any results for *${searchQuery}* on YouTube.`);
        }

        // Store session so we remember this user is choosing
        sessionUtil.setSession(sender, {
            state: 'AWAITING_SELECTION',
            results: results
        });

        // Draw Menu
        let menuText = `🔎 Found these top results. *Reply with a number (1-${results.length}) to download:*\n\n`;
        results.forEach((vid, idx) => {
            menuText += `*${idx + 1}.* ${vid.title} _(${vid.duration})_\n`;
        });
        menuText += `\n_Type *cancel* to stop._`;

        return await whatsappService.sendReply(msg, menuText);

    } catch (error) {
        logger.error(`Error processing command from ${sender}:`, error.message);
        await whatsappService.sendReply(msg, `❌ Sorry, an internal system error occurred. Please try again later.`);
    }
};

module.exports = {
    handleMessage
};
