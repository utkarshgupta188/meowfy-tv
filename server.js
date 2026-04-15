import express from 'express';
import cors from 'cors';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.raw({ type: ['application/octet-stream', 'application/x-www-form-urlencoded', '*/*'], limit: '10mb' }));

const PROVIDER_WORKER_URL = 'https://cricfy-providers.utkarshg.workers.dev';


const CUSTOM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0',
  'Accept': '*/*',
  'Cache-Control': 'no-cache, no-store',
};


function decryptContent(content) {
  content = content.trim();
  if (content.startsWith('#EXTM3U') || content.startsWith('#EXTINF') || content.startsWith('#KODIPROP')) {
    return content;
  }
  if (content.length < 79) return content;
  try {
    const part1 = content.substring(0, 10);
    const part2 = content.substring(34, content.length - 54);
    const part3 = content.substring(content.length - 10);
    const encryptedDataStr = part1 + part2 + part3;

    const ivBase64 = content.substring(10, 34);
    const keyBase64 = content.substring(content.length - 54, content.length - 10);

    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const key = CryptoJS.enc.Base64.parse(keyBase64);

    const decrypted = CryptoJS.AES.decrypt(encryptedDataStr, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Content decryption failed:', e.message);
    return content;
  }
}

function parseM3U(content) {
  const lines = content.split('\n');
  const items = [];
  let bufUserAgent = null, bufCookie = null, bufReferer = null;
  let bufLicenseString = null, bufAttrs = null, bufTitle = null;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const matches = [...line.matchAll(/([a-zA-Z0-9_-]+)=("([^"]*)"|[^,]+)/g)];
      bufAttrs = {};
      for (const m of matches) {
        bufAttrs[m[1]] = (m[2] || '').replace(/"/g, '');
      }
      const titleSplit = line.split(',');
      bufTitle = titleSplit.length > 1 ? titleSplit[titleSplit.length - 1].trim() : 'Unknown Channel';
    } else if (line.startsWith('#EXTVLCOPT')) {
      if (line.includes('http-user-agent=')) bufUserAgent = line.split('http-user-agent=')[1];
      if (line.includes('http-referrer=')) bufReferer = line.split('http-referrer=')[1];
    } else if (line.startsWith('#EXTHTTP')) {
      try {
        const data = JSON.parse(line.replace('#EXTHTTP:', ''));
        if (data.cookie) bufCookie = data.cookie;
        if (data['user-agent']) bufUserAgent = data['user-agent'];
      } catch { }
    } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      bufLicenseString = line.split('=').slice(1).join('=');
    } else if (!line.startsWith('#')) {
      const item = {
        title: bufTitle || 'Unknown',
        url: line,
        tvgLogo: bufAttrs?.['tvg-logo'] || '',
        groupTitle: bufAttrs?.['group-title'] || '',
        userAgent: bufUserAgent || '',
        cookie: bufCookie || '',
        referer: bufReferer || '',
        licenseString: bufLicenseString || '',
        isDrm: !!bufLicenseString,
        headers: {},
      };

      if (line.includes('|')) {
        const [url, paramStr] = line.split('|');
        item.url = url;
        for (const p of paramStr.split('&')) {
          const [k, ...vParts] = p.split('=');
          const v = vParts.join('=');
          const kl = k.toLowerCase();
          if (kl === 'user-agent') item.userAgent = v;
          else if (kl === 'referer') item.referer = v;
          else if (kl === 'cookie') item.cookie = v;
          else item.headers[k] = v;
        }
      }

      bufUserAgent = null; bufCookie = null; bufReferer = null;
      bufLicenseString = null; bufAttrs = null; bufTitle = null;
      items.push(item);
    }
  }
  return items;
}


app.get('/api/providers', async (req, res) => {
  try {
    const response = await axios.get(PROVIDER_WORKER_URL, { timeout: 15000 });
    res.json(response.data);
  } catch (e) {
    console.error('Providers error:', e.message);
    res.status(500).json({ error: 'Failed to fetch providers via worker' });
  }
});

app.get('/api/channels', async (req, res) => {
  try {
    const { providerUrl } = req.query;
    if (!providerUrl) return res.status(400).json({ error: 'providerUrl required' });

    const response = await axios.get(providerUrl, { headers: CUSTOM_HEADERS, timeout: 15000 });

    if (typeof response.data === 'object' && Array.isArray(response.data)) {
      const jsonChannels = response.data.map(c => ({
        title: c.name || c.title || 'Unknown',
        url: c.mpd_url || c.url || '',
        tvgLogo: c.logo || c.tvgLogo || '',
        groupTitle: c.group || c.groupTitle || '',
        userAgent: c.user_agent || c.userAgent || '',
        cookie: c.headers?.cookie || c.cookie || '',
        referer: c.headers?.referer || c.referer || '',
        licenseString: c.license_url || c.licenseString || '',
        isDrm: !!(c.license_url || c.licenseString || c.isDrm),
        headers: c.headers || {},
      })).filter(c => c.url);
      return res.json(jsonChannels);
    }

    const contentData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const content = decryptContent(contentData);
    const channels = parseM3U(content);
    res.json(channels);
  } catch (e) {
    console.error('Channels error:', e.message);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

app.all('/api/proxy', async (req, res) => {
  try {
    const { url, referer, userAgent, cookie, ...extraHeaders } = req.query;
    if (!url) return res.status(400).json({ error: 'url required' });

    let finalUrl = url;
    if (cookie && cookie.includes('__hdnea__')) {
      try {
        const cookieMatch = cookie.match(/__hdnea__=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) {
          const freshToken = cookieMatch[1];
          if (finalUrl.includes('__hdnea__')) {
            finalUrl = finalUrl.replace(/__hdnea__=[^&]+/, '__hdnea__=' + freshToken);
          } else {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + '__hdnea__=' + freshToken;
          }
        }
      } catch (e) { }
    }

    // Forward relevant headers from the browser
    const headers = { ...CUSTOM_HEADERS };
    if (referer) headers['Referer'] = referer;
    if (userAgent) headers['User-Agent'] = userAgent;
    if (cookie) headers['Cookie'] = cookie;
    
    // Pass the Range header if present in the original request
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    if (referer) {
      try { headers['Origin'] = new URL(referer).origin; } catch { }
    }
    for (const [k, v] of Object.entries(extraHeaders)) {
      if (k !== 'url') headers[k] = v;
    }

    const urlShort = finalUrl.length > 120 ? finalUrl.substring(0, 120) + '...' : finalUrl;
    console.log(`Proxy ${req.method} →`, urlShort, req.headers.range ? `[Range: ${req.headers.range}]` : '');

    const data = (req.method === 'POST' || req.method === 'PUT') ? req.body : undefined;
    delete headers['host'];
    delete headers['content-length'];

    const response = await axios({
      method: req.method,
      url: finalUrl,
      headers,
      data,
      responseType: 'arraybuffer',
      timeout: 20000,
      maxRedirects: 10,
      validateStatus: () => true,
    });

    // Set the response status from the target server (crucial for 206 Partial Content)
    res.status(response.status);

    let contentType = response.headers['content-type'] || 'application/octet-stream';
    
    // Explicitly force video/mp2t for .ts files if incorrectly served by source
    if (finalUrl.split('?')[0].endsWith('.ts') && (contentType === 'application/octet-stream' || contentType === 'text/plain')) {
      contentType = 'video/mp2t';
    }

    res.set('Content-Type', contentType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Range, x-final-url');
    res.set('x-final-url', finalUrl);

    // Forward important headers back to the browser
    if (response.headers['content-range']) res.set('Content-Range', response.headers['content-range']);
    if (response.headers['accept-ranges']) res.set('Accept-Ranges', response.headers['accept-ranges']);
    if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);

    if (!contentType.includes('mpd') && !contentType.includes('m3u') && !contentType.includes('xml')) {
      res.set('Cache-Control', 'public, max-age=5');
    }

    res.send(Buffer.from(response.data));
  } catch (e) {
    const status = e.response?.status || 500;
    console.error(`Proxy ${status}:`, e.message, '→', req.query.url?.substring(0, 100));
    res.status(status).json({ error: 'Proxy failed', detail: e.message });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 MeowfyTV Backend running on http://localhost:${PORT}`);
});
