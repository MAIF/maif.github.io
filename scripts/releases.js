const fetch = require("node-fetch");
const fs = require("fs-extra");
const showdown = require("showdown");
//const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.argv[2] || "secret";
const output_file = "./social-data/releases.json";

const converter = new showdown.Converter();

function fetchReleases(repo) {
  console.log(`https://api.github.com/repos/maif/${repo}/releases?per_page=20`);
  return fetch(
    `https://api.github.com/repos/maif/${repo}/releases?per_page=20`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        //        authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    }
  )
    .then((response) => {
      return response.json();
    })
    .then((releases) => {
      return releases
        .map((r) => {
          return {
            body: r.body,
            date: r.published_at,
            name: r.name,
            zip: r.zipball_url,
            url: r.html_url,
          };
        })
        .map(({ body, ...rest }) => ({
          highlights: extractReleaseThumbnail(body),
          project: repo,
          ...rest,
        }))
        .filter(({ highlights, date }) => Boolean(highlights));
    });
}

function extractReleaseThumbnail(body) {
  if (!body.includes(`<div id="release-thumbnail">`)) {
    return undefined;
  }
  const goodPart = body
    .split(`<div id="release-thumbnail">`)[1]
    .split("</div>")[0];
  try {
    return converter.makeHtml(goodPart);
  } catch {
    return undefined;
  }
}

Promise.all(
  [
    "otoroshi",
    "izanami",
    "daikoku",
    "wasm4s",
    "wasmo",
    "thoth",
    "nio",
    "shapash",
    "lets-automate",
    "eurybia",
    "melusine",
    "arta",
    "meteole",
  ].map((name) => fetchReleases(name))
).then((bodies) =>
  fs.writeFileSync(
    output_file,
    JSON.stringify(
      bodies.flat().filter((r) => r),
      null,
      2
    )
  )
);
