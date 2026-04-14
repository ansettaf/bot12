const ytSearch = require('yt-search');
ytSearch('tflow').then(res => {
    const v = res.videos[0];
    console.log(v.videoId);
});
