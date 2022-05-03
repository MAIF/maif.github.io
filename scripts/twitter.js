const fetch = require('node-fetch');
const fs = require('fs-extra');
const _ = require('lodash');

const TWITTER_BEARER = process.env.TWITTER_BEARER || 'secret';
const tweets_file = './social-data/tweets.json';

const tweets_from_file = JSON.parse(fs.readFileSync(tweets_file).toString('utf8'));
const tweets_from_file_map = _.keyBy(tweets_from_file, t => t.id);

function fetchLastTweets() {
  const latest_tweet = tweets_from_file[0];
  const query_from = latest_tweet ? `&start_time=${latest_tweet.created_at}` : '';
  return fetch(`https://api.twitter.com/2/tweets/search/recent?query=ossbymaif&tweet.fields=author_id,created_at&user.fields=username&expansions=author_id&max_results=100${query_from}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${TWITTER_BEARER}`
    }
  }).then(r => {
    if (r.status === 200) {
      r.json().then(new_tweets => {
        console.log(`found ${new_tweets.data.length} new tweets ...`)
        const users = new_tweets.includes.users;
        const users_by_id = _.keyBy(users, u => u.id);
        let new_tweets_for_file = [ ...tweets_from_file ];
        new_tweets.data.map(tweet => {
          const existing_tweet = tweets_from_file_map[tweet.id];
          if (!existing_tweet) {
            const new_tweet = { 
              ...tweet, 
              author_username: users_by_id[tweet.author_id].username, 
              author_name:  users_by_id[tweet.author_id].name 
            };
            console.log(new_tweet)
            new_tweets_for_file = [ 
              ...new_tweets_for_file, 
              new_tweet
            ];
          }
        })
        console.log(`saving ${new_tweets_for_file.length} tweets !`)
        fs.writeFileSync(tweets_file, JSON.stringify(new_tweets_for_file, null, 2));
      })
    } else {
      r.text().then(body => {
        console.log(`failed to fetch tweets: ${r.status} - ${body} `)
      })
    }
  })
}

fetchLastTweets();