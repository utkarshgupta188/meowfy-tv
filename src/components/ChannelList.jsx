import { useState, useMemo } from 'react';

export default function ChannelList({ channels, providerTitle, onSelect }) {
  const [filter, setFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  const groups = useMemo(() => {
    const g = new Set();
    channels.forEach((ch) => {
      if (ch.groupTitle) g.add(ch.groupTitle);
    });
    return ['all', ...Array.from(g).sort()];
  }, [channels]);

  const filtered = useMemo(() => {
    return channels.filter((ch) => {
      const matchName = ch.title.toLowerCase().includes(filter.toLowerCase());
      const matchGroup = groupFilter === 'all' || ch.groupTitle === groupFilter;
      return matchName && matchGroup;
    });
  }, [channels, filter, groupFilter]);

  return (
    <div className="channel-list">
      <h2 className="section-title">{providerTitle} Channels</h2>

      <div className="filters">
        <div className="search-box glass-premium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search channels..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {groups.length > 2 && (
          <select
            className="group-select glass-premium"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g === 'all' ? 'All Groups' : g}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid channels-grid animated-grid">
        {filtered.map((ch, i) => (
          <div
            key={i}
            className={`card channel-card glass-premium magnetic-card animate-fade-in ${ch.isDrm ? 'drm-exclusive' : ''}`}
            onClick={() => onSelect(ch)}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="card-top">
              {ch.tvgLogo ? (
                <div className="logo-wrapper">
                  <img
                    className="channel-logo"
                    src={ch.tvgLogo}
                    alt={ch.title}
                    onError={(e) => {
                      e.target.parentElement.classList.add('logo-error');
                    }}
                  />
                </div>
              ) : (
                <div className="channel-logo-placeholder">
                  <span>{ch.title.charAt(0)}</span>
                </div>
              )}
              <div className="channel-indicators">
                {ch.isDrm && <span className="badge-exclusive">DRM</span>}
                <span className="badge-live">LIVE</span>
              </div>
            </div>
            
            <div className="card-body">
              <h3>{ch.title}</h3>
              {ch.groupTitle && (
                <span className="category-tag">
                  {ch.groupTitle}
                </span>
              )}
            </div>

            <div className="card-action">
              <span className="play-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Now
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <p>No channels match your search</p>
        </div>
      )}
    </div>
  );
}
