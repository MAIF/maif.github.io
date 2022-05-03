const fetch = require('node-fetch');
const fs = require('fs-extra');
const _ = require('lodash');

const mediums_file = './social-data/mediums.json';

const mediums_from_file = JSON.parse(fs.readFileSync(mediums_file).toString('utf8'));
const mediums_from_file_map = _.keyBy(mediums_from_file, t => t.id);

function fromXml(mediums) {
  return { data: mediums.items.map(item => {
    return {
      "text": item.title,
      "author_id": item.author,
      "created_at": item.pubDate,
      "id": item.guid,
      "author_username": item.author,
      "author_name": item.author,
      "thumbnail": item.thumbnail,
      "description": item.description
    }
  }) };
}

function fetchLastMediums() {
  return fetch("https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fmedium.com%2Ffeed%2Foss-by-maif", {
    "headers": {
      "accept": "application/json"
      //"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      // "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      // "cache-control": "max-age=0",
      // "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
      // "sec-ch-ua-mobile": "?0",
      // "sec-ch-ua-platform": "\"macOS\"",
      // "sec-fetch-dest": "document",
      // "sec-fetch-mode": "navigate",
      // "sec-fetch-site": "none",
      // "sec-fetch-user": "?1",
      // "upgrade-insecure-requests": "1",
    },
    "method": "GET"
  }).then(r => {
    if (r.status === 200) {
      r.json().then(new_mediums_raw => {
        const new_mediums = fromXml(new_mediums_raw);
        console.log(`found ${new_mediums.data.length} new mediums ...`)
        let new_mediums_for_file = [ ...mediums_from_file ];
        new_mediums.data.map(medium => {
          const existing_medium = mediums_from_file_map[medium.id];
          if (!existing_medium) {
            new_mediums_for_file = [ 
              ...new_mediums_for_file, 
              medium
            ];
          }
        })
        console.log(`saving ${new_mediums_for_file.length} mediums !`)
        fs.writeFileSync(mediums_file, JSON.stringify(new_mediums_for_file, null, 2));
      })
    } else {
      r.text().then(body => {
        console.log(`failed to fetch mediums: ${r.status} - ${body}`)
      })
    }
  })
}

fetchLastMediums();