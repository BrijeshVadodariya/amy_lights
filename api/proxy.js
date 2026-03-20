import axios from 'axios';

export default async function handler(req, res) {
  const { method, query, body, headers } = req;
  const odooTarget = 'http://103.212.121.196:8069';
  
  // Use x-forwarded-uri (original URL) or fallback to path query param
  const originalUrl = headers['x-forwarded-uri'] || query.path || req.url;
  const path = originalUrl.split('?')[0];
  
  // Construct the target URL with the db=stage parameter
  const targetUrl = new URL(path, odooTarget);
  targetUrl.searchParams.set('db', 'stage');
  
  // Copy relevant query parameters from the original request
  Object.keys(query).forEach(key => {
    if (key !== 'db') targetUrl.searchParams.set(key, query[key]);
  });

  console.log(`[Proxy] Forwarding ${method} to ${targetUrl.toString()}`);

  try {
    const response = await axios({
      method: method.toLowerCase(),
      url: targetUrl.toString(),
      data: body,
      params: {}, // Already in targetUrl
      headers: {
        'Content-Type': 'application/json',
        'X-Odoo-Database': 'stage',
        'Origin': odooTarget,
        'Referer': `${odooTarget}/web/login?db=stage`,
        // Forward parts of original headers if needed, but be careful with Host
        'User-Agent': headers['user-agent'],
        'Cookie': headers['cookie'],
      },
      timeout: 10000,
      validateStatus: () => true, // Handle all status codes
    });

    // Copy response headers back (CORS, etc.)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Odoo-Session-ID');
    
    // Set cookies if Odoo sends them
    if (response.headers['set-cookie']) {
      res.setHeader('Set-Cookie', response.headers['set-cookie']);
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Proxy Error]', error.message);
    res.status(502).json({
      success: false,
      error: 'Proxy Error',
      message: error.message
    });
  }
}
