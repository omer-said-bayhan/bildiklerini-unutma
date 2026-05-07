// Netlify Serverless Function - API Proxy
// Bu dosya sunucuda çalışır, kullanıcı göremez

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY; // Environment variable'dan al
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// Rate limiting için basit cache
const requestCache = new Map();
const RATE_LIMIT = 100; // IP başına 100 istek/saat
const RATE_WINDOW = 60 * 60 * 1000; // 1 saat

// Rate limit kontrolü
function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestCache.get(ip) || [];
  
  // Eski istekleri temizle
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false; // Limit aşıldı
  }
  
  recentRequests.push(now);
  requestCache.set(ip, recentRequests);
  return true;
}

// CORS headers - backwards compatible for ALLOWED_ORIGIN / ALLOWED_ORIGINS
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS || 'https://akilda-kal.netlify.app';
const headers = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Rate limiting kontrolü
  const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: 3600 
      })
    };
  }

  let parsedBody = {};
  try {
    parsedBody = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  try {
    const { action, binId, data, binName } = parsedBody;

    // API key kontrolü
    if (!JSONBIN_API_KEY) {
      throw new Error('API key not configured');
    }

    // Input Validation
    if (binId && !/^[a-zA-Z0-9_-]{10,25}$/.test(binId)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid binId format' })
        };
    }

    let url = JSONBIN_BASE_URL;
    let method = 'GET';
    let requestHeaders = {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_API_KEY
    };
    let body = null;

    // Action'a göre istek hazırla
    switch (action) {
      case 'create':
        method = 'POST';
        requestHeaders['X-Bin-Name'] = binName;
        body = JSON.stringify(data);
        break;

      case 'read':
        url = `${JSONBIN_BASE_URL}/${binId}`;
        method = 'GET';
        break;

      case 'update':
        url = `${JSONBIN_BASE_URL}/${binId}`;
        method = 'PUT';
        body = JSON.stringify(data);
        break;

      case 'list':
        url = 'https://api.jsonbin.io/v3/c/bins';
        method = 'GET';
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    // JSONBin API'ye istek at
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body
    });

    const result = await response.json();

    // Başarılı yanıt
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('API Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
