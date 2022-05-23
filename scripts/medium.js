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
        // new_mediums_for_file.sort((a,b) =>  a.created_at-b.created_at )
        new_mediums_for_file.sort(function(a, b) {
          var keyA = new Date(a.created_at),
            keyB = new Date(b.created_at);
          // Compare the 2 dates
          if (keyA < keyB) return -1;
          if (keyA > keyB) return 1;
          return 0;
        });

        console.log(new_mediums_for_file)
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