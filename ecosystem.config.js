module.exports = {
  apps: [
    {
      name: 'deploy-service',
      cwd: './Deploy-service',
      script: 'node',
      args: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env_file: '../.env',
      log_file: '/var/log/pm2/deploy-service.log',
      out_file: '/var/log/pm2/deploy-service-out.log',
      error_file: '/var/log/pm2/deploy-service-error.log'
    },
    {
      name: 'request-handler',
      cwd: './request-handler', 
      script: 'node',
      args: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env_file: '../.env',
      log_file: '/var/log/pm2/request-handler.log',
      out_file: '/var/log/pm2/request-handler-out.log',
      error_file: '/var/log/pm2/request-handler-error.log'
    },
    {
      name: 'upload-service',
      cwd: './Upload_Service',
      script: 'node',
      args: 'dist/index.js', 
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env_file: '../.env',
      log_file: '/var/log/pm2/upload-service.log',
      out_file: '/var/log/pm2/upload-service-out.log',
      error_file: '/var/log/pm2/upload-service-error.log'
    }
  ]
};