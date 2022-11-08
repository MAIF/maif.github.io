const fetch = require('node-fetch');
const fs = require('fs-extra');
const _ = require('lodash');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.argv[2] || 'secret';
const contributors_file = './social-data/contributors.json';

const filterOut = [
  'project-template',
  'otoroshi-jar-clevercloud-template',
  'otoroshi-clevercloud-template',
  'izanami-clevercloud-template',
  '.github',
]

const projectsPerUser = {};

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
          let login = contributor.author.login;
          if (!projectsPerUser[login]) {
            projectsPerUser[login] = []
          }
          projectsPerUser[login].push(repo);
          return {
            name: contributor.author.login,
            avatar_url: contributor.author.avatar_url,
            url: contributor.author.html_url,
            commits_count: contributor.total,
          }
        })
          .filter(c => c.name !== 'gitter-badger')
          .filter(c => c.name !== 'snyk-bot')
          .filter(c => c.name !== 'dependabot[bot]'), c => c.commits_count).reverse()
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
    })
      .then(r => {
        console.log('Get repos', r.status)
        if (r.status === 200) {
          return r.json()
            .then(repositories => {
              const tasks = [...repositories]
                .filter(r => r.private === false)
                .filter(r => r.fork === false)
                .filter(r => filterOut.indexOf(r.name) === -1);

              return Promise.all(tasks
                .map(task => {
                  console.log(task.name);
                  return getCommits(task.name)
                    .then(commits => {
                      return {
                        result: {
                          name: task.name,
                          url: task.html_url,
                          description: task.description,
                          homepage: task.homepage,
                          pushed_at: task.pushed_at,
                          contributors: commits.map(c => c.name),
                          commits_count: commits.map(c => c.commits_count).reduce((a, b) => a + b, 0),
                          commits_per_contributor: commits,
                        },
                        commits
                      };
                    });
                }))
                .then((tasks) => {
                  const results = {};
                  const global = {};
                  tasks.forEach(task => {
                    results[task.name] = task.result;
                    task.commits.map(commit => {
                      const gcommit = global[commit.name];
                      if (!gcommit) {
                        global[commit.name] = { ...commit, commits_count: 0 };
                      }
                      global[commit.name].commits_count = global[commit.name].commits_count + commit.commits_count;
                    })
                  })

                  success({
                    projects: results,
                    contributors: Object.keys(global).map(k => global[k]).map(_user => {
                      const user = { ..._user, projects: projectsPerUser[_user.name] };
                      return user
                    }).reduce((prev, curr) => {
                      prev[curr.name] = curr;
                      return prev;
                    }, {}),
                    commits_per_contributor_sorted: _.sortBy(Object.keys(global).map(k => global[k]), c => c.commits_count).reverse().map(i => i.name),
                  })
                })
            })
        } else {
          return [];
        }
      });
  });


}

getRepos()
  .then(results => {
    console.log(results)
    fs.writeFileSync(contributors_file, JSON.stringify(results, null, 2));
  });
