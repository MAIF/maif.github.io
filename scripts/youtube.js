const fs = require('fs-extra');
const _ = require('lodash');
const youtubesearchapi = require('youtube-search-api');

const videos_file = './social-data/youtube.json';
const videos_from_file = JSON.parse(fs.readFileSync(videos_file).toString('utf8'));
const videos_from_file_map = _.keyBy(videos_from_file, t => t.id);

function transform(videos) {
  return { data: videos.items.map(item => {
    return {
      "text": item.title,
      "id": item.id,
      "thumbnail": item.thumbnail.thumbnails[0].url,
      "length": item.length.simpleText
    }
  }) };
}

function fetchLastVideos() {
  return youtubesearchapi.GetPlaylistData('PLHWGfQmqyWtZuFKhNMseGODfsO0LJBp2a').then(new_videos_raw => {
    if (new_videos_raw) {
      const new_videos = transform(new_videos_raw);
      console.log(`found ${new_videos.data.length} new videos ...`)
      let new_videos_for_file = [ ...videos_from_file ];
      new_videos.data.map(video => {
        const existing_video = videos_from_file_map[video.id];
        if (!existing_video) {
          new_videos_for_file = [ 
            ...new_videos_for_file, 
            video
          ];
        }
      })
      console.log(`saving ${new_videos_for_file.length} videos !`)
      fs.writeFileSync(videos_file, JSON.stringify(new_videos_for_file, null, 2));
    } else {
      console.log(`failed to fetch videos`)
    }
  })
}

fetchLastVideos();