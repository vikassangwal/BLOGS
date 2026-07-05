const https = require('https');

https.get('https://www.knowora.in/api/auto-blog?secret=knowora-cron-2026', (res) => {
  let data = '';
  console.log('STATUS:', res.statusCode);
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('RESPONSE:', data));
}).on('error', (err) => console.log('ERROR:', err.message));
