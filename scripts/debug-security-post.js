
async function run() {
    try {
        const payload = {
            csrfEnabled: true,
            rateLimitEnabled: true,
            ipWhitelistEnabled: false,
            allowedIPs: [], // Empty array
            maxRequests: 100,
            windowWindow: 60000,
            loginProtectionEnabled: true,
            security_max_attempts: "5",
            security_lockout_duration: "5",
            security_log_retention_days: "90"
        };

        const response = await fetch('http://localhost:3000/api/settings/security', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
