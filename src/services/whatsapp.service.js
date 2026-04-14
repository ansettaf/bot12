const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('../config/config');
const logger = require('../utils/logger');
const reconnectManager = require('./reconnectManager');

// Initialize the WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './cache/auth' }),
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--mute-audio',
            '--js-flags=--max-old-space-size=250',
            '--disable-extensions'
        ],
    }
});

/**
 * Bootstraps the WhatsApp client connection.
 */
const initClient = () => {
    client.on('qr', (qr) => {
        logger.log('Scan the QR code below to log in:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        logger.log('Client is ready!');
        reconnectManager.clearReconnectTracker(); // Auth restored successfully
    });

    client.on('authenticated', () => {
        logger.log('Session Authenticated.');
    });

    client.on('auth_failure', msg => {
        logger.error('Authentication failure:', msg);
    });

    client.on('disconnected', (reason) => {
        reconnectManager.handleDisconnection(client, reason);
    });

    client.initialize();
};

/**
 * Sends a text message back to a user/chat.
 */
const sendReply = async (messageObject, text) => {
    try {
        await messageObject.reply(text);
    } catch (e) {
        logger.error('Failed to send text reply:', e.message);
    }
};

/**
 * Sends a media file directly as audio.
 */
const sendAudio = async (messageObject, filePath, sendAsDocument = false) => {
    try {
        const media = MessageMedia.fromFilePath(filePath);
        await client.sendMessage(messageObject.from, media, {
            sendMediaAsDocument: sendAsDocument,
            quotedMessageId: messageObject.id._serialized
        });
        logger.log(`Successfully sent payload to ${messageObject.from}`);
    } catch (e) {
        logger.error('Failed to send audio media:', e.message);
        throw e;
    }
};

/**
 * Sends a media downloaded from a URL (e.g. video thumbnails).
 */
const sendImageFromUrl = async (messageObject, url, caption = '') => {
    try {
        const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
        await client.sendMessage(messageObject.from, media, {
            caption: caption,
            quotedMessageId: messageObject.id._serialized
        });
        logger.log(`Successfully sent image cover to ${messageObject.from}`);
    } catch (e) {
        logger.error('Failed to send image media:', e.message);
    }
};

module.exports = {
    client,
    initClient,
    sendReply,
    sendAudio,
    sendImageFromUrl
};
