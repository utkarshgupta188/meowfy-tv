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

  useEffect(() => {
    fetchProviders();
  }, []);


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
    <div className="app">
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>
      
      <header className="app-header">
        <div className="header-left">
          {view !== 'providers' && (
            <button className="back-btn" onClick={handleBack} aria-label="Go back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="logo animate-fade-in">
            <span className="logo-icon">📡</span>
            <h1 className="premium-font">CRICFY<span style={{ color: 'var(--accent)', marginLeft: '2px' }}>TV</span></h1>
          </div>
        </div>
        <div className="header-right">
          <div className="badge-live-pulse">
            <span className="pulse-dot"></span>
            SYSTEM ONLINE
          </div>
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
          <div className="animate-scale-in">
            {view === 'providers' && (
              <ProviderList providers={providers} onSelect={handleProviderClick} />
            )}
            {view === 'channels' && (
              <ChannelList
                channels={channels}
                providerTitle={selectedProviderTitle}
                onSelect={handleChannelClick}
                filter={channelFilter}
                setFilter={setChannelFilter}
                groupFilter={channelGroup}
                setGroupFilter={setChannelGroup}
              />
            )}
          </div>
        )}
        
        {view === 'player' && selectedChannel && (
          <div className="animate-scale-in">
            <PlayerView channel={selectedChannel} />
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', zIndex: 10, position: 'relative' }}>
        <p>Premium High-Fidelity IPTV Experience</p>
        <p style={{ marginTop: '8px' }}>
          v3.0 • Made by Utkarsh Gupta • <a href="https://github.com/utkarshgupta188" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' }}>@utkarshgupta188</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
