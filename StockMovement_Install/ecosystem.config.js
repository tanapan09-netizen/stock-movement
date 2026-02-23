module.exports = {
    apps: [
        {
            name: 'stock-movement',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            args: 'start',
            // cwd: 'C:\\xampp\\htdocs\\stock_movement\\stock-movement-next', // Commented out to use current directory
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            env_development: {
                NODE_ENV: 'development',
                PORT: 3000
            },
            // Logging
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            // Graceful restart
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000
        }
    ]
};
