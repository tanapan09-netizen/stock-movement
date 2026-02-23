const fs = require('fs');
const https = require('https');
const path = require('path');

// 1. Read .env file manually
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();

        // Remove quotes
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
        }

        env[key] = value;
    }
});

const TOKEN = env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_ID = env.LINE_ADMIN_ID;

console.log('--- LINE Messaging API Test ---');
console.log(`Target ID: ${USER_ID}`);
// Safe logging of token
const maskedToken = TOKEN ? `${TOKEN.substring(0, 5)}...${TOKEN.substring(TOKEN.length - 5)}` : 'MISSING';
console.log(`Token: ${maskedToken}`);

if (!TOKEN || !USER_ID) {
    console.error('ERROR: Missing configuration in .env');
    process.exit(1);
}

// 2. Prepare Request
const data = JSON.stringify({
    to: USER_ID,
    messages: [
        {
            type: 'text',
            text: '🔔 Test Message: LINE Messaging API is working! \n(Migration from Notify successful)'
        }
    ]
});

const options = {
    hostname: 'api.line.me',
    path: '/v2/bot/message/push',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(data) // FIX: Use byteLength for multi-byte chars
    }
};

// 3. Send Request
const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ SUCCESS: Message sent!');
            console.log('Response:', responseBody);
        } else {
            console.error('❌ FAILED: API response:');
            console.error(responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Network Error:', error);
});

req.write(data);
req.end();
