const http = require('http');

http.get('http://localhost:5000/api/v1/daily-leads?date=2026-08-25&lead_type=positive', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    const data = JSON.parse(body);
    console.log('SUCCESS:', data.success);
    console.log('TOTAL:', data.data?.total);
    console.log('LEADS:', data.data?.leads?.length);
    process.exit(0);
  });
}).on('error', err => {
  console.error('ERROR:', err);
  process.exit(1);
});
