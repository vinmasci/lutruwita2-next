module.exports = {
  apps: [{
    name: 'lutruwita2-frontend',
    script: 'npm',
    args: 'run preview -- --port 3000',
    env: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'lutruwita2-backend',
    cwd: 'server',
    script: 'node',
    args: 'build/server.js',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
