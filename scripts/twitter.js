const fetch = require('node-fetch');
const fs = require('fs-extra');
const _ = require('lodash');
const moment = require('moment');

const TWITTER_BEARER = process.env.TWITTER_BEARER || 'secret';
const tweets_file = './social-data/tweets.json';
const tweets_from_file = JSON.parse(fs.readFileSync(tweets_file).toString('utf8'));
const tweets_from_file_map = _.keyBy(tweets_from_file, t => t.id);

function fetchLastTweets() {
  const latest_tweet = tweets_from_file[tweets_from_file.length - 1];
  const start_date_raw = latest_tweet.created_at;
  const start_date_moment = moment(start_date_raw);
  const max_start_date = moment().subtract(7, 'days').add(1, 'minutes');
  const start_date = start_date_moment.isBefore(max_start_date) ? max_start_date : start_date_moment;
  const start_date_str = start_date.format('YYYY-MM-DDTHH:mm:ss') + '.000Z';
  const query_from = latest_tweet ? `&start_time=${start_date_str}` : '';
  return fetch(`https://api.twitter.com/2/tweets/search/recent?query=ossbymaif&tweet.fields=author_id,created_at,referenced_tweets,entities&user.fields=username,profile_image_url&media.fields=url&expansions=author_id,attachments.media_keys&max_results=100${query_from}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${TWITTER_BEARER}`
    }
  }).then(r => {
    if (r.status === 200) {
      r.json().then(new_tweets => {
        // console.log(JSON.stringify(new_tweets, null, 2))
        if (new_tweets.data && new_tweets.meta && new_tweets.meta.result_count > 0) {
          console.log(`found ${new_tweets.data.length} new tweets ...`)
          const users = new_tweets.includes.users;
          const media = new_tweets.includes.media;
          const users_by_id = _.keyBy(users, u => u.id);
          const media_by_id = _.keyBy(media, u => u.media_key);
          let new_tweets_for_file = [ ...tweets_from_file ];
          new_tweets.data.map(tweet => {
            const existing_tweet = tweets_from_file_map[tweet.id];
            if (!existing_tweet) {
              const maybe_user = users_by_id[tweet.author_id];
              const new_tweet = { 
                ...tweet, 
                author_username: maybe_user.username, 
                author_name:  maybe_user.name,
                author_avatar: maybe_user.profile_image_url,
              };
              if (new_tweet.entities && new_tweet.entities.urls) {
                new_tweet.media_urls = [ ...new_tweet.entities.urls.map(u => {
                  console.log(u);
                  if (u.media_key) {
                    const med = media_by_id[u.media_key];
                    if (med) {
                      return med.url;
                    } else {
                      return u.display_url;
                    }
                  } else {
                    return u.display_url;
                  }
                }) ];
              }
              delete new_tweet.referenced_tweets;
              delete new_tweet.entities;
              delete new_tweet.attachments;
              new_tweets_for_file = [ 
                ...new_tweets_for_file, 
                new_tweet
              ];
            }
          })
          console.log(`saving ${new_tweets_for_file.length} tweets !`)
          fs.writeFileSync(tweets_file, JSON.stringify(new_tweets_for_file, null, 2));
        }
      })
    } else {
      r.text().then(body => {
        console.log(`failed to fetch tweets: ${r.status} - ${body}`)
      })
    }
  })
}

fetchLastTweets();
