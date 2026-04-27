import axios from 'axios';

export default async function handler(req, res) {
  const { method, query, body, headers } = req;
  const odooTarget = process.env.VITE_ODOO_URL || 'https://erp.maxmin.co.in';
  const odooDB = process.env.VITE_ODOO_DB || 'stage';
  
  // Prioritize the path passed via Vercel rewrites (?path=...)
  // This is the most reliable way to get the original requested endpoint.
  const rawPath = query.path || req.url;
  const path = rawPath.split('?')[0];
  
  // Construct the target URL with the db parameter
  const targetUrl = new URL(path, odooTarget);
  targetUrl.searchParams.set('db', odooDB);
  
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
      params: {},
      headers: {
        'Content-Type': headers['content-type'] || 'application/json',
        'X-Odoo-Database': odooDB,
        'Origin': odooTarget,
        'Referer': `${odooTarget}/web/login?db=${odooDB}`,
        'User-Agent': headers['user-agent'],
        'Cookie': headers['cookie'],
        'Authorization': headers['authorization'],
        'X-Odoo-Session-ID': headers['x-odoo-session-id'],
      },
      timeout: 15000,
      responseType: 'arraybuffer', // Crucial for handling images and binary data
      validateStatus: () => true,
    });

    // Copy essential response headers
    const contentType = response.headers['content-type'];
    if (contentType) res.setHeader('Content-Type', contentType);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Odoo-Session-ID');
    
    if (response.headers['set-cookie']) {
      res.setHeader('Set-Cookie', response.headers['set-cookie']);
    }

    // Send the data as a Buffer
    res.status(response.status).send(Buffer.from(response.data));
  } catch (error) {
    console.error('[Proxy Error]', error.message);
    res.status(502).json({
      success: false,
      error: 'Proxy Error',
      message: error.message
    });
  }
}
