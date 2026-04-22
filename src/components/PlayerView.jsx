import { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui';
import 'shaka-player/dist/controls.css';
import Hls from 'hls.js';

const PROXY_BASE = 'http://localhost:3001/api/proxy';

function buildProxyUrl(originalUrl, channel) {
  const params = new URLSearchParams({ url: originalUrl });
  if (channel.referer) params.set('referer', channel.referer);
  if (channel.userAgent) params.set('userAgent', channel.userAgent);
  if (channel.cookie) params.set('cookie', channel.cookie);
  if (channel.headers && typeof channel.headers === 'object') {
    for (const [k, v] of Object.entries(channel.headers)) {
      params.set(k, v);
    }
  }
  return `${PROXY_BASE}?${params.toString()}`;
}

/**
 * Determines which playback engine to use.
 * - Hls.js: for non-DRM HLS (.m3u8) streams — much better MPEG-TS transmuxing
 * - Shaka: for DASH (.mpd), DRM-protected, or non-HLS streams
 */
function selectEngine(channel, providerTitle) {
  const url = (channel.url || '').toLowerCase();
  const title = (channel.title || '').toLowerCase();
  const provider = (providerTitle || '').toLowerCase();
  const isHls = url.includes('.m3u8');
  const isDrm = !!channel.isDrm;

  if (provider.includes('kids')) {
    if (!title.includes('hungama') && !title.includes('disney')) {
      return 'shaka';
    }
  }

  if (isHls && !isDrm && Hls.isSupported()) {
    return 'hlsjs';
  }
  return 'shaka';
}

export default function PlayerView({ channel, providerTitle }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const playerRef = useRef(null);   // Shaka player instance
  const hlsRef = useRef(null);      // Hls.js instance
  const uiRef = useRef(null);       // Shaka UI overlay
  const [playerError, setPlayerError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [engineName, setEngineName] = useState('');

  // Handle global hotkeys for Play/Pause and Fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Toggle Play/Pause using Spacebar
      if (e.code === 'Space' || key === ' ') {
        e.preventDefault();
        const video = videoRef.current;
        if (video) {
          if (video.paused) video.play().catch(() => { });
          else video.pause();
        }
      }
      // Toggle Fullscreen using 'F' key
      else if (key === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          const wrapper = wrapperRef.current;
          if (wrapper) {
            if (wrapper.requestFullscreen) wrapper.requestFullscreen().catch(() => { });
            else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    shaka.polyfill.installAll();

    let destroyed = false;

    const init = async () => {
      setIsLoading(true);
      setPlayerError(null);

      // --- Cleanup previous instances ---
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (uiRef.current) {
        await uiRef.current.destroy();
        uiRef.current = null;
      }
      if (playerRef.current) {
        await playerRef.current.destroy();
        playerRef.current = null;
      }

      if (destroyed) return;

      const video = videoRef.current;
      const engine = selectEngine(channel, providerTitle);
      setEngineName(engine === 'hlsjs' ? 'HLS.js' : 'Shaka Pro v5');
      console.log(`[PlayerView] Using engine: ${engine} for ${channel.url}`);

      try {
        if (engine === 'hlsjs') {
          await initHlsJs(video, channel, destroyed, setPlayerError, setIsLoading, hlsRef);
        } else {
          await initShaka(video, channel, destroyed, setPlayerError, setIsLoading, playerRef, uiRef, wrapperRef);
        }
      } catch (err) {
        console.error('Player init error:', err);
        if (!destroyed) {
          const code = err.code || '';
          const msg = err.message || String(err);
          setPlayerError(`Failed to load stream (${code}): ${msg}`);
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      destroyed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy().catch(() => { });
        playerRef.current = null;
      }
      if (uiRef.current) {
        uiRef.current.destroy().catch(() => { });
        uiRef.current = null;
      }
    };
  }, [channel]);

  return (
    <>
      <div className="player-header">
        <div className="player-title-section">
          <h2 className="premium-font">{channel.title}</h2>
          <div className="player-meta-tags">
            {channel.groupTitle && <span className="genre-tab glass-premium" style={{ pointerEvents: 'none' }}>{channel.groupTitle}</span>}
            {channel.isDrm && <span className="card-badge" style={{ position: 'static' }}>SECURE DRM</span>}
            <div className="badge-live-pulse">
              <span className="pulse-dot"></span>
              LIVE STREAM
            </div>
          </div>
        </div>
      </div>

      <div className="player-main-container" ref={containerRef}>
        <div className="player-atmosphere"></div>
        <div className="player-wrapper" ref={wrapperRef}>
          {isLoading && (
            <div className="player-overlay loading-overlay">
              <div className="spinner"></div>
              <p>Establishing Secure Connection...</p>
            </div>
          )}
          {playerError && (
            <div className="player-overlay error-overlay">
              <span className="error-icon">⚠️</span>
              <h3 className="premium-font">Playback Unavailable</h3>
              <p>{playerError}</p>
              <button
                className="btn-primary"
                onClick={() => window.location.reload()}
              >
                Reconnect Stream
              </button>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls={engineName === 'HLS.js'}
            className="video-element"
            style={{ objectFit: 'fill', width: '100%', height: '100%' }}
          />
        </div>
      </div>

      <div className="player-details-section">
        <div className="details-card glass-premium" style={{ display: 'none' }}>
          <div className="card-header">
            <h4 className="premium-font">Stream Intelligence</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="meta-label" style={{ margin: 0 }}>Network Status</span>
              <span className="status-dot online"></span>
            </div>
          </div>
          <div className="metadata-grid">
            <div className="meta-item">
              <span className="meta-label">Primary Source</span>
              <span className="meta-value" title={channel.url}>{truncateUrl(channel.url)}</span>
            </div>
            {channel.referer && (
              <div className="meta-item">
                <span className="meta-label">Request Origin</span>
                <span className="meta-value">{channel.referer}</span>
              </div>
            )}
            <div className="meta-item">
              <span className="meta-label">Encryption Type</span>
              <span className="meta-value">{channel.isDrm ? 'ClearKey AES-128 (Secure)' : 'Open Stream (Unencrypted)'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Playback Engine</span>
              <span className="meta-value">{engineName}</span>
            </div>
            {channel.licenseString && (
              <div className="meta-item">
                <span className="meta-label">DRM Context</span>
                <span className="meta-value">{truncateUrl(channel.licenseString)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── HLS.JS ENGINE ────────────────────────────────────────────────
async function initHlsJs(video, channel, destroyed, setPlayerError, setIsLoading, hlsRef) {
  const proxyManifestUrl = buildProxyUrl(channel.url, channel);

  const hls = new Hls({
    maxBufferLength: 30,
    backBufferLength: 30,
    enableWorker: true,
    lowLatencyMode: true,
    xhrSetup: (xhr, url) => {
      // Route all sub-requests through our proxy
      if (!url.includes('localhost')) {
        const proxied = buildProxyUrl(url, channel);
        xhr.open('GET', proxied, true);
      }
    },
  });

  hlsRef.current = hls;

  return new Promise((resolve, reject) => {
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (destroyed) return;
      console.log('[HLS.js] Manifest parsed, starting playback');
      video.play().catch(() => { });
      setIsLoading(false);
      resolve();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.warn('[HLS.js] Error:', data.type, data.details, data);

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.warn('[HLS.js] Fatal network error, trying recovery...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.warn('[HLS.js] Fatal media error, trying recovery...');
            hls.recoverMediaError();
            break;
          default:
            if (!destroyed) {
              setPlayerError(`HLS Error: ${data.details}`);
              setIsLoading(false);
            }
            hls.destroy();
            reject(new Error(data.details));
            break;
        }
      }
    });

    hls.loadSource(proxyManifestUrl);
    hls.attachMedia(video);
  });
}

// ─── SHAKA ENGINE ─────────────────────────────────────────────────
async function initShaka(video, channel, destroyed, setPlayerError, setIsLoading, playerRef, uiRef, wrapperRef) {
  if (!shaka.Player.isBrowserSupported()) {
    setPlayerError('Your browser does not support Shaka Player.');
    return;
  }

  const player = new shaka.Player();
  await player.attach(video);
  playerRef.current = player;

  const ui = new shaka.ui.Overlay(player, wrapperRef.current, video);
  uiRef.current = ui;
  ui.configure({
    controlPanelElements: [
      'play_pause',
      'time_and_duration',
      'spacer',
      'mute',
      'volume',
      'fullscreen',
      'overflow_menu',
    ],
    overflowMenuButtons: ['quality', 'playback_rate', 'captions'],
  });

  player.addEventListener('error', (event) => {
    console.error('Shaka player error:', event.detail);
    if (event.detail && event.detail.severity !== shaka.util.Error.Severity.CRITICAL) {
      console.warn('Ignored non-critical Shaka error:', event.detail.code);
      return;
    }
    if (!destroyed) {
      setPlayerError(`Player Error ${event.detail.code}: ${event.detail.message || 'Unknown error'}`);
    }
  });

  // DRM configuration
  let licenseStr = channel.licenseString;
  if (channel.isDrm && licenseStr) {
    if (licenseStr.startsWith('http') && (licenseStr.includes('key.php') || licenseStr.includes('.json'))) {
      try {
        const fetchUrl = buildProxyUrl(licenseStr, channel);
        const response = await fetch(fetchUrl);
        const text = await response.text();
        if (text.includes('"keys"')) {
          licenseStr = text;
        }
      } catch (err) {
        console.warn('Failed to pre-fetch clear keys:', err);
      }
    }

    const drmConfig = parseLicenseString(licenseStr, channel);
    console.log('DRM config:', drmConfig, 'license:', licenseStr);
    if (drmConfig) {
      if (drmConfig.type === 'clearkeys') {
        player.configure({
          drm: {
            clearKeys: drmConfig.clearKeys,
          },
        });
      } else if (drmConfig.type === 'license_server') {
        const proxyLicenseUrl = buildProxyUrl(drmConfig.serverUrl, channel);
        player.configure({
          drm: {
            servers: {
              'org.w3.clearkey': proxyLicenseUrl,
              'com.widevine.alpha': proxyLicenseUrl,
              'com.microsoft.playready': proxyLicenseUrl
            },
          },
        });
      }
    }
  }

  player.configure({
    streaming: {
      bufferingGoal: 30,
      rebufferingGoal: 2,
      ignoreTextStreamFailures: true,
      stallThreshold: 5,
      bufferBehind: 0,
      retryParameters: {
        maxAttempts: 4,
        baseDelay: 1000,
        backoffFactor: 2,
        fuzzFactor: 0.5,
      },
    },
    manifest: {
      hls: {
        ignoreTextStreamFailures: true,
        sequenceMode: true,
        ignoreManifestTimestampsInSegmentsMode: true,
      },
      retryParameters: {
        maxAttempts: 4,
        baseDelay: 1000,
        backoffFactor: 2,
        fuzzFactor: 0.5,
      },
    },
    mediaSource: {
      forceTransmux: true,
    },
  });

  const netEngine = player.getNetworkingEngine();

  if (netEngine) {
    netEngine.registerRequestFilter((type, request) => {
      if (request.uris[0].includes('localhost')) return;

      const uri = request.uris[0];
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        request.uris[0] = buildProxyUrl(uri, channel);
      }
    });

    netEngine.registerResponseFilter((type, response) => {
      const finalUrl = response.headers['x-final-url'];
      if (finalUrl) {
        response.uri = finalUrl;
      }

      if (type === shaka.net.NetworkingEngine.RequestType.MANIFEST) {
        if (response.uri.includes('.m3u8')) {
          response.headers['content-type'] = 'application/x-mpegurl';
        } else if (response.uri.includes('.mpd')) {
          response.headers['content-type'] = 'application/dash+xml';
        }
      }
    });
  }

  if (destroyed) return;

  console.log('Loading stream via Shaka:', channel.url);
  await player.load(channel.url);

  if (!destroyed) {
    video.play().catch(() => { });
    setIsLoading(false);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────

function base64UrlToHex(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const raw = atob(base64);
  let hex = '';
  for (let i = 0; i < raw.length; i++) {
    hex += raw.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

function parseLicenseString(licenseString, channel) {
  if (!licenseString) return null;

  if (licenseString.startsWith('http')) {
    return {
      type: 'license_server',
      serverUrl: licenseString,
    };
  }

  try {
    const rawJson = licenseString.trim();
    if (rawJson.startsWith('{') && rawJson.endsWith('}')) {
      const parsed = JSON.parse(rawJson);
      if (parsed.keys && Array.isArray(parsed.keys)) {
        const clearKeys = {};
        for (const keyObj of parsed.keys) {
          if (keyObj.kid && keyObj.k) {
            const hexKid = base64UrlToHex(keyObj.kid);
            const hexKey = base64UrlToHex(keyObj.k);
            clearKeys[hexKid] = hexKey;
          }
        }
        if (Object.keys(clearKeys).length > 0) {
          return { type: 'clearkeys', clearKeys };
        }
      }
    }
  } catch (e) { }

  const hexPairRegex = /^[0-9a-fA-F]+:[0-9a-fA-F]+$/;

  const parts = licenseString.split('|').filter((p) => p.trim());
  for (const part of parts) {
    const trimmed = part.trim();
    if (hexPairRegex.test(trimmed)) {
      const [keyId, key] = trimmed.split(':').map((s) => s.trim().toLowerCase());
      return { type: 'clearkeys', clearKeys: { [keyId]: key } };
    }
  }

  if (hexPairRegex.test(licenseString.trim())) {
    const [keyId, key] = licenseString.trim().split(':').map((s) => s.trim().toLowerCase());
    return { type: 'clearkeys', clearKeys: { [keyId]: key } };
  }

  console.warn('Unknown license format:', licenseString);
  return null;
}

function truncateUrl(url) {
  if (!url) return '';
  return url.length > 80 ? url.substring(0, 80) + '...' : url;
}
