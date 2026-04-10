import { useState, useEffect } from 'react';
import ProviderList from './components/ProviderList';
import ChannelList from './components/ChannelList';
import PlayerView from './components/PlayerView';
import Skeleton from './components/Skeleton';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [apiUrl, setApiUrl] = useState(null);
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
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/config`);
      const data = await res.json();
      if (data.apiUrl) {
        setApiUrl(data.apiUrl);
        await fetchProviders(data.apiUrl);
      } else {
        setError('Could not fetch API configuration');
      }
    } catch (e) {
      setError('Connection failed. Make sure the backend server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProviders(url) {
    try {
      const res = await fetch(`${API_BASE}/providers?apiUrl=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProviders(data);
      } else {
        setError('Invalid provider data received');
      }
    } catch (e) {
      setError('Failed to load providers');
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
          <div className="badge glass-premium ripple">
            {view === 'providers' ? 'Discovery' :
              view === 'channels' ? 'Live Channels' :
                'Cinema Mode'}
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => { setError(null); fetchConfig(); }}>Retry</button>
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
          <>
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
          </>
        )}
        
        {view === 'player' && selectedChannel && (
          <PlayerView channel={selectedChannel} />
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', zIndex: 10, position: 'relative' }}>
        Made by Utkarsh Gupta (<a href="https://github.com/utkarshgupta188" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>@utkarshgupta188</a>)
      </footer>
    </div>
  );
}

export default App;
