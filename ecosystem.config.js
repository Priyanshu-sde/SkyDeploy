module.exports = {
  apps: [
    {
      name: 'deploy-service',
      cwd: './Deploy-service',
      script: 'ts-node',
      args: 'src/index.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env_file: '../.env',
      log_file: '/var/log/pm2/deploy-service.log',
      out_file: '/var/log/pm2/deploy-service-out.log',
      error_file: '/var/log/pm2/deploy-service-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'request-handler',
      cwd: './request-handler', 
      script: 'ts-node',
      args: 'src/index.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env_file: '../.env',
      log_file: '/var/log/pm2/request-handler.log',
      out_file: '/var/log/pm2/request-handler-out.log',
      error_file: '/var/log/pm2/request-handler-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'upload-service',
      cwd: './Upload_Service',
      script: 'ts-node',
      args: 'src/index.ts', 
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env_file: '../.env',
      log_file: '/var/log/pm2/upload-service.log',
      out_file: '/var/log/pm2/upload-service-out.log',
      error_file: '/var/log/pm2/upload-service-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};