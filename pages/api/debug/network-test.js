import https from 'https';

export default async function handler(req, res) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Extract Supabase URL from env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    return res.status(500).json({ error: 'No Supabase URL configured' });
  }

  // Parse the URL
  const url = new URL(supabaseUrl);
  
  // Test 1: DNS lookup
  results.tests.dns = await new Promise((resolve) => {
    const dns = require('dns');
    const start = Date.now();
    dns.lookup(url.hostname, (err, address, family) => {
      resolve({
        success: !err,
        hostname: url.hostname,
        address: address || null,
        family: family || null,
        error: err?.message,
        time_ms: Date.now() - start
      });
    });
  });

  // Test 2: HTTPS connection
  results.tests.https = await new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(`${url.protocol}//${url.hostname}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Vercel-Debug'
      }
    }, (response) => {
      resolve({
        success: true,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        time_ms: Date.now() - start
      });
      response.destroy();
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code,
        time_ms: Date.now() - start
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Connection timeout',
        time_ms: Date.now() - start
      });
    });
  });

  // Test 3: API endpoint reachable
  results.tests.api = await new Promise((resolve) => {
    const start = Date.now();
    const apiUrl = `${supabaseUrl}/rest/v1/`;
    const req = https.get(apiUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Vercel-Debug',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          success: response.statusCode < 500,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          data_length: data.length,
          time_ms: Date.now() - start
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code,
        time_ms: Date.now() - start
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Connection timeout',
        time_ms: Date.now() - start
      });
    });
  });

  // Test 4: Check Vercel's IP ranges (might be blocked)
  results.tests.vercel_ip = await new Promise((resolve) => {
    const http = require('http');
    http.get('http://ifconfig.me', (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          ip: data.trim(),
          note: 'This is your Vercel function IP'
        });
      });
    }).on('error', () => {
      resolve({ ip: 'Could not determine' });
    });
  });

  return res.status(200).json(results);
}
