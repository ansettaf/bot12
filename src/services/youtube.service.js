const ytSearch = require('yt-search');
const logger = require('../utils/logger');

/**
 * Searches YouTube for a given query and returns the top result.
 * @param {string} query 
 * @returns {object|null} { videoId, title, url, duration }
 */
const searchMusic = async (query) => {
    try {
        logger.log(`Searching YouTube for: "${query}"`);
        const searchResults = await ytSearch(query);
        
        if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
            return null;
        }

        // Get top 5 videos
        const topVideos = searchResults.videos.slice(0, 5).map(video => {
            let artist = 'Unknown Artist';
            let title = video.title;
            
            // Try parsing standard "Artist - Title" music format
            if (video.title.includes('-')) {
                const parts = video.title.split('-');
                artist = parts[0].trim();
                title = parts.slice(1).join('-').trim();
            } else if (video.author && video.author.name) {
                artist = video.author.name;
            }

            return {
                videoId: video.videoId,
                title: title,
                artist: artist,
                originalTitle: video.title,
                url: video.url,
                duration: video.timestamp,
                seconds: video.seconds,
                thumbnail: video.thumbnail || video.image
            };
        });
        
        return topVideos;
    } catch (error) {
        logger.error(`Error searching YouTube for "${query}":`, error.message);
        throw error;
    }
};

module.exports = {
    searchMusic
};
