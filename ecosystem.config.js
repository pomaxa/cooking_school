module.exports = {
  apps: [{
    name: 'cooking-school',
    script: './server.js',

    // Instances
    instances: 1,
    exec_mode: 'fork', // or 'cluster' for multiple instances

    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },

    // Logs
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Restart behavior
    autorestart: true,
    watch: false, // Set to true for development if you want auto-reload
    max_memory_restart: '500M',

    // Advanced features
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,

    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,

    // Additional options
    ignore_watch: [
      'node_modules',
      'logs',
      '*.db',
      '*.sqlite',
      '.git'
    ],

    // Time-based restart (optional)
    // cron_restart: '0 0 * * *', // Restart every day at midnight
  }]
};
