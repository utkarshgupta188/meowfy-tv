import { useState, useEffect } from 'react';
import ProviderList from './components/ProviderList';
import ChannelList from './components/ChannelList';
import PlayerView from './components/PlayerView';
import Skeleton from './components/Skeleton';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [providers, setProviders] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [view, setView] = useState('providers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProviderTitle, setSelectedProviderTitle] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [channelGroup, setChannelGroup] = useState('all');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('meowfy_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('meowfy_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    fetchProviders();
  }, []);

  // TV/Keyboard: Auto-focus first element on view change
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstFocusable = document.querySelector('button, [tabindex="0"], input');
      if (firstFocusable && view !== 'player') {
        firstFocusable.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [view]);


  useEffect(() => {
    const handleGlobalBack = (e) => {
      if (e.key === 'Backspace' || e.key === 'Escape') {
        // Only go back if not typing in an input
        if (document.activeElement.tagName !== 'INPUT') {
          e.preventDefault();
          handleBack();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalBack);
    return () => window.removeEventListener('keydown', handleGlobalBack);
  }, [view]);

  async function fetchProviders() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/providers`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProviders(data);
      } else {
        setError('Invalid provider data received');
      }
    } catch (e) {
      setError('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }

  async function handleProviderClick(provider) {
    try {
      setLoading(true);
      setError(null);
      setSelectedProviderTitle(provider.title || 'Unknown');
      const res = await fetch(
        `${API_BASE}/channels?providerUrl=${encodeURIComponent(provider.catLink)}`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setChannels(data);
        setChannelFilter('');
        setChannelGroup('all');
        setView('channels');
      } else {
        setError('No channels found');
      }
    } catch (e) {
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }

  function handleChannelClick(channel) {
    setSelectedChannel(channel);
    setView('player');
  }

  function toggleFavorite(channel) {
    setFavorites(prev => {
      const exists = prev.some(f => f.title === channel.title && f.catLink === channel.catLink);
      if (exists) {
        return prev.filter(f => !(f.title === channel.title && f.catLink === channel.catLink));
      }
      return [...prev, channel];
    });
  }

  function handleBack() {
    if (view === 'player') {
      setSelectedChannel(null);
      setView('channels');
    } else if (view === 'channels') {
      setChannels([]);
      setChannelFilter('');
      setChannelGroup('all');
      setView('providers');
    }
  }

  return (
    <div className="app-container">
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <div 
            className={`sidebar-item ${view === 'providers' ? 'active' : ''}`}
            onClick={() => setView('providers')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setView('providers'); }}
            tabIndex="0"
            role="button"
            title="Explore"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            <span className="sidebar-label"></span>
          </div>
          <div 
            className={`sidebar-item ${view === 'saved' ? 'active' : ''}`}
            onClick={() => setView('saved')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setView('saved'); }}
            tabIndex="0"
            role="button"
            title="Saved"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="sidebar-label"></span>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <div className="app">
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>

      <header className="app-header">
        <div className="header-left">
          {view !== 'providers' && view !== 'saved' && (
            <button className="back-btn" onClick={handleBack} aria-label="Go back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div 
            className="logo animate-fade-in" 
            onClick={() => { setView('providers'); setSelectedChannel(null); setChannels([]); }}
            tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setView('providers'); setSelectedChannel(null); setChannels([]); }}}
            role="button"
            aria-label="Home"
            style={{ cursor: 'pointer' }}
          >
            <span className="logo-icon">🐱</span>
            <h1 className="premium-font">MEOWFY<span style={{ color: 'var(--accent)', marginLeft: '2px' }}>TV</span></h1>
          </div>
        </div>
        <div className="header-right">
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner animate-fade-in">
            <span>⚠️</span>
            <p>{error}</p>
            <button className="btn-primary" onClick={() => { setError(null); fetchProviders(); }}>Retry</button>
          </div>
        )}

        {loading && view === 'providers' && (
          <div className="animate-fade-in">
            <h2 className="section-title">Providers</h2>
            <Skeleton type="card" count={8} />
          </div>
        )}

        {loading && view === 'channels' && (
          <div className="animate-fade-in">
            <h2 className="section-title">{selectedProviderTitle} Channels</h2>
            <Skeleton type="row" count={10} />
          </div>
        )}

        {!loading && (
          <div className="view-transition-container">
            {view === 'providers' && (
              <div className="animate-scale-in">
                <ProviderList providers={providers} onSelect={handleProviderClick} />
              </div>
            )}
            {view === 'channels' && (
              <div className="animate-scale-in">
                <ChannelList
                  channels={channels}
                  providerTitle={selectedProviderTitle}
                  onSelect={handleChannelClick}
                  filter={channelFilter}
                  setFilter={setChannelFilter}
                  groupFilter={channelGroup}
                  setGroupFilter={setChannelGroup}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            )}
            {view === 'saved' && (
              <div className="animate-scale-in">
                {favorites.length === 0 ? (
                  <div className="empty-favorites animate-fade-in">
                    <div className="empty-icon">❤️</div>
                    <h3>No Saved Channels</h3>
                    <p>Channels you heart will appear here for quick access.</p>
                    <button className="btn-primary" onClick={() => setView('providers')}>Explore Channels</button>
                  </div>
                ) : (
                  <ChannelList
                    channels={favorites}
                    providerTitle="My Saved"
                    onSelect={handleChannelClick}
                    filter={channelFilter}
                    setFilter={setChannelFilter}
                    groupFilter={channelGroup}
                    setGroupFilter={setChannelGroup}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                  />
                )}
              </div>
            )}
            {view === 'settings' && (
              <div className="settings-view animate-scale-in">
                <h2 className="section-title">Settings</h2>
                <div className="settings-grid">
                  <div className="settings-card glass-premium">
                    <div className="settings-info">
                      <h3>App Version</h3>
                      <p>v3.3.0 Professional Edition</p>
                    </div>
                    <span className="mini-badge live">LATEST</span>
                  </div>
                  <div className="settings-card glass-premium">
                    <div className="settings-info">
                      <h3>Theme Mode</h3>
                      <p>Deep Obsidian (Premium)</p>
                    </div>
                    <div className="theme-toggle-dummy">
                      <div className="toggle-bg active"><div className="toggle-knob"></div></div>
                    </div>
                  </div>
                  <div className="settings-card glass-premium">
                    <div className="settings-info">
                      <h3>Hardware Acceleration</h3>
                      <p>Optimized for FireTV & WebGL</p>
                    </div>
                    <div className="theme-toggle-dummy">
                      <div className="toggle-bg active"><div className="toggle-knob"></div></div>
                    </div>
                  </div>
                  <div className="settings-card glass-premium clickable" onClick={() => setFavorites([])}>
                    <div className="settings-info">
                      <h3>Clear Favorites</h3>
                      <p>Remove all saved channels</p>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'player' && selectedChannel && (
          <div className="animate-scale-in">
            <PlayerView channel={selectedChannel} providerTitle={selectedProviderTitle} />
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', zIndex: 10, position: 'relative' }}>
        <p>Premium High-Fidelity IPTV Experience</p>
        <p style={{ marginTop: '8px' }}>
          v3.3.0 • Made by Utkarsh Gupta • <a href="https://github.com/utkarshgupta188" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' }}>@utkarshgupta188</a>
        </p>
      </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
