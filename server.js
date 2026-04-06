import express from 'express';
import cors from 'cors';
import CryptoJS from 'crypto-js';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// --- Secrets from the Kodi addon ---
const SECRET1 = '3368487a78594167534749382f68616d:557143766b766a656345497a38343256';
const SECRET2 = '4d7165594743543441594b6f484b7254:6f484b725451755078387a6c386f4a2b';

// Firebase config
const FIREBASE_API_KEY = 'AIzaSyAh9jkEU0E_UYxH0m_BKAt-uUSTiTPqhb8';
const FIREBASE_APP_ID = '1:963020218535:android:47ec53252c64fb3c9c7b82';
const PROJECT_NUMBER = '963020218535';
const PACKAGE_NAME = 'com.cricfy.tv';

const CUSTOM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0',
  'Accept': '*/*',
  'Cache-Control': 'no-cache, no-store',
};

// --- Crypto Helpers ---
function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

function parseKeyInfo(secret) {
  const [keyHex, ivHex] = secret.split(':');
  return {
    key: CryptoJS.enc.Hex.parse(keyHex),
    iv: CryptoJS.enc.Hex.parse(ivHex),
  };
}

function tryDecrypt(cipherBase64, keyInfo) {
  try {
    const decrypted = CryptoJS.AES.decrypt(cipherBase64, keyInfo.key, {
      iv: keyInfo.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    if (text && (text.startsWith('{') || text.startsWith('[') || text.toLowerCase().includes('http'))) {
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

function decryptData(encryptedBase64) {
  const clean = encryptedBase64.replace(/[\n\r\s\t]/g, '');
  const keys = [parseKeyInfo(SECRET1), parseKeyInfo(SECRET2)];
  for (const keyInfo of keys) {
    const result = tryDecrypt(clean, keyInfo);
    if (result) return result;
  }
  return null;
}

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

// --- M3U Parser ---
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

// --- API Routes ---

// Get API URL from Firebase Remote Config
app.get('/api/config', async (req, res) => {
  try {
    const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT_NUMBER}/namespaces/firebase:fetch`;
    const response = await axios.post(url, {
      appInstanceId: crypto.randomUUID().replace(/-/g, ''),
      appInstanceIdToken: '',
      appId: FIREBASE_APP_ID,
      countryCode: 'US',
      languageCode: 'en-US',
      platformVersion: '30',
      timeZone: 'UTC',
      appVersion: '5.0',
      appBuild: '50',
      packageName: PACKAGE_NAME,
      sdkVersion: '22.1.0',
      analyticsUserProperties: {},
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Android-Package': PACKAGE_NAME,
        'X-Goog-Api-Key': FIREBASE_API_KEY,
        'X-Google-GFE-Can-Retry': 'yes',
      },
      timeout: 30000,
    });

    const entries = response.data?.entries || {};
    const apiUrl = entries.cric_api2 || entries.cric_api1 || null;
    res.json({ apiUrl });
  } catch (e) {
    console.error('Firebase config error:', e.message);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Fetch providers
app.get('/api/providers', async (req, res) => {
  try {
    const { apiUrl } = req.query;
    if (!apiUrl) return res.status(400).json({ error: 'apiUrl required' });

    const response = await axios.get(`${apiUrl}/cats.txt`, { headers: CUSTOM_HEADERS, timeout: 15000 });
    const decrypted = decryptData(response.data);
    if (!decrypted) return res.status(500).json({ error: 'Decryption failed' });

    const providers = JSON.parse(decrypted);
    res.json(providers);
  } catch (e) {
    console.error('Providers error:', e.message);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Fetch channels for a provider
app.get('/api/channels', async (req, res) => {
  try {
    const { providerUrl } = req.query;
    if (!providerUrl) return res.status(400).json({ error: 'providerUrl required' });

    const response = await axios.get(providerUrl, { headers: CUSTOM_HEADERS, timeout: 15000 });
    const content = decryptContent(response.data);
    const channels = parseM3U(content);
    res.json(channels);
  } catch (e) {
    console.error('Channels error:', e.message);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Universal proxy — forwards all requests with correct headers
// Shaka Player's networking engine routes all requests here with fully resolved URLs
app.get('/api/proxy', async (req, res) => {
  try {
    const { url, referer, userAgent, cookie, ...extraHeaders } = req.query;
    if (!url) return res.status(400).json({ error: 'url required' });

    let finalUrl = url;
    if (cookie && cookie.includes('__hdnea__')) {
      try {
        // Extract the __hdnea__ value from the cookie
        const cookieMatch = cookie.match(/__hdnea__=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) {
          const freshToken = cookieMatch[1];
          // Replace using string operations to prevent URL-encoding the ~ and = characters
          if (finalUrl.includes('__hdnea__')) {
            finalUrl = finalUrl.replace(/__hdnea__=[^&]+/, '__hdnea__=' + freshToken);
          } else {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + '__hdnea__=' + freshToken;
          }
        }
      } catch (e) {
        // ignore invalid URL
      }
    }

    const headers = { ...CUSTOM_HEADERS };
    if (referer) headers['Referer'] = referer;
    if (userAgent) headers['User-Agent'] = userAgent;
    if (cookie) headers['Cookie'] = cookie;
    if (referer) {
      try { headers['Origin'] = new URL(referer).origin; } catch { }
    }
    // Forward any extra headers from the M3U metadata
    for (const [k, v] of Object.entries(extraHeaders)) {
      if (k !== 'url') headers[k] = v;
    }

    // Log the first request of each type for debugging
    const urlShort = finalUrl.length > 120 ? finalUrl.substring(0, 120) + '...' : finalUrl;
    console.log(`Proxy →`, urlShort);

    const response = await axios.get(finalUrl, {
      headers,
      responseType: 'arraybuffer',
      timeout: 30000,
      maxRedirects: 10,
    });

    // Forward all response headers that matter
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Expose-Headers', '*');

    // Cache segment data for better performance
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Cricfy Backend running on http://localhost:${PORT}`);
});
