const fs = require('fs-extra');
const _ = require('lodash');
const axios = require("axios");
const youtubesearchapi = require('youtube-search-api');

const videos_file = './social-data/youtube.json';
const videos_from_file = JSON.parse(fs.readFileSync(videos_file).toString('utf8'));

function transform(item) {
      return {
            "text": item.title,
            "id": item.id,
            "thumbnail": item.thumbnail.thumbnails[0].url,
            "length": item.length.simpleText
      }
}

function fetchLastVideos() {
      return youtubesearchapi.GetPlaylistData('PLHWGfQmqyWtZuFKhNMseGODfsO0LJBp2a')
            .then(new_videos_raw => {
                  if (new_videos_raw) {
                        Promise.all(new_videos_raw.items.map(v => GetVideoDetails(v.id)))
                              .then(videoDetails => ({
                                    data: videoDetails.map((details, i) => ({
                                          ...transform(new_videos_raw.items[i]), ...details
                                    }))
                              }))
                              .then(new_videos => {
                                    console.log(`found ${new_videos.data.length} new videos ...`)
                                    const new_videos_for_file = _([...videos_from_file])
                                          .concat(new_videos.data)
                                          .groupBy('id')
                                          .map(_.spread(_.merge))
                                          .value()
                                    console.log(`saving ${new_videos_for_file.length} videos !`)
                                    fs.writeFileSync(videos_file, JSON.stringify(new_videos_for_file, null, 2));
                              })
                  } else {
                        console.log(`failed to fetch videos`)
                  }
            })
}

const GetYoutubeInitData = async (url) => {
      var initdata = {};
      var apiToken = null;
      var context = null;
      try {
            const page = await axios.get(encodeURI(url))
            const ytInitData = await page.data.split("var ytInitialData =");
            if (ytInitData && ytInitData.length > 1) {
                  const data = await ytInitData[1].split("</script>")[0].slice(0, -1);

                  if (page.data.split("innertubeApiKey").length > 0) {
                        apiToken = await page.data
                              .split("innertubeApiKey")[1]
                              .trim()
                              .split(",")[0]
                              .split('"')[2];
                  }

                  if (page.data.split("INNERTUBE_CONTEXT").length > 0) {
                        context = await JSON.parse(
                              page.data.split("INNERTUBE_CONTEXT")[1].trim().slice(2, -2)
                        );
                  }

                  initdata = {
                        ...await JSON.parse(data),
                        datePublished: page.data.split("datePublished")[1].trim().slice(0,40).split(" ")[1].match(/"([^"]+)"/)[1]
                  }
                  return await Promise.resolve({ initdata, apiToken, context });
            } else {
                  console.error("cannot_get_init_data");
                  return await Promise.reject("cannot_get_init_data");
            }
      } catch (ex) {
            await console.error(ex);
            return await Promise.reject(ex);
      }
};


const GetVideoDetails = async (videoId) => {
      const endpoint = await `https://www.youtube.com/watch?v=${videoId}`;
      try {
            const page = await GetYoutubeInitData(endpoint);
            const result = await page.initdata.contents.twoColumnWatchNextResults;
            const firstContent = await result.results.results.contents[0].videoPrimaryInfoRenderer;
            const secondContent = await result.results.results.contents[1]?.videoSecondaryInfoRenderer;

            const res = await {
                  title: firstContent?.title.runs[0].text,
                  isLive: firstContent?.viewCount.videoViewCountRenderer.hasOwnProperty(
                        "isLive"
                  )
                        ? firstContent?.viewCount.videoViewCountRenderer.isLive
                        : false,
                  channel: secondContent?.owner.videoOwnerRenderer.title.runs[0].text,
                  description: secondContent?.description?.runs
                        .map((x) => x.text)
                        .join()
                        .toString(),
                  datePublished: page.initdata.datePublished
            };

            return await Promise.resolve(res);
      } catch (ex) {
            return await Promise.reject(ex);
      }
};

fetchLastVideos();
