module.exports = {
  apps: [{
    name: 'lutruwita2-frontend',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'lutruwita2-backend',
    cwd: 'server',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
