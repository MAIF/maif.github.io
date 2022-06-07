const fetch = require('node-fetch');
const fs = require('fs-extra');
const _ = require('lodash');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'secret';
const contributors_file = './social-data/contributors.json';
const filterOut = [
  'project-template',
  'otoroshi-jar-clevercloud-template',
  'otoroshi-clevercloud-template',
  'izanami-clevercloud-template',
  '.github',
]

function getCommits(repo) {
  return fetch(`https://api.github.com/repos/MAIF/${repo}/stats/contributors`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${GITHUB_TOKEN}`
    }
  }).then(r => {
    if (r.status === 200) {
      return r.json().then(contributors => {
        return _.sortBy(contributors.map(contributor => {
          return {
            login: contributor.author.login,
            avatar_url: contributor.author.avatar_url,
            commits: contributor.total
          }
        }).filter(c => c.login !== 'snyk-bot').filter(c => c.login !== 'dependabot[bot]'), c => c.commits).reverse()
      })
    } else {
      return [];
    }
  });
}

function getRepos() {

  return new Promise((success) => {
    return fetch(`https://api.github.com/users/MAIF/repos`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${GITHUB_TOKEN}`
      }
    }).then(r => {
      if (r.status === 200) {
        return r.json().then(repositories => {
          const results = {};
          const tasks = [...repositories]
            .filter(r => r.private === false)
            .filter(r => r.fork === false)
            .filter(r => filterOut.indexOf(r.name) === -1);
  
          function next() {
            if (tasks.length === 0) {
              success(results)
            } else {
              const task = tasks.pop();
              getCommits(task.name).then(commits => {
                results[task.name] = commits;
                console.log(task.name);
                next();
              });
            }
          }
  
          next();
        })
      } else {
        return [];
      }
    });
  });

  
}

getRepos().then(results => {
  fs.writeFileSync(contributors_file, JSON.stringify(results, null, 2));
});
