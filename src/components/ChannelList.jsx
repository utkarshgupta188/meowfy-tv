import { useState, useMemo, useEffect, useRef } from 'react';

const INITIAL_BATCH = 60;
const BATCH_SIZE = 40;

export default function ChannelList({ 
  channels, 
  providerTitle, 
  onSelect,
  filter,
  setFilter,
  groupFilter,
  setGroupFilter,
  favorites = [],
  onToggleFavorite
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(false);
  const observerTarget = useRef(null);

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

  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [filter, groupFilter, channels]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filtered.length) {
          setVisibleCount((prev) => prev + BATCH_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  const displayedChannels = filtered.slice(0, visibleCount);

  return (
    <div className="channel-list">
      <h2 className="section-title">{providerTitle} Channels</h2>

      <div className="filters animate-fade-in">
        <div className="search-box glass-premium">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
      </div>

      <div className={`genre-ribbon-container animate-fade-in ${isGroupsExpanded ? 'is-expanded' : ''}`}>
        <div className="genre-ribbon">
          <button 
            className={`genre-tab expansion-toggle glass-premium ${isGroupsExpanded ? 'active' : ''}`}
            onClick={() => setIsGroupsExpanded(!isGroupsExpanded)}
            title="Browse all categories"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isGroupsExpanded ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </>
              )}
            </svg>
            <span>{isGroupsExpanded ? 'Close' : 'Filter'}</span>
          </button>

          {groups.map((g, idx) => (
            <button
              key={g}
              className={`genre-tab glass-premium ${groupFilter === g ? 'active' : ''}`}
              onClick={() => {
                setGroupFilter(g);
                if (isGroupsExpanded) setIsGroupsExpanded(false);
              }}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {g === 'all' ? 'All Channels' : g}
            </button>
          ))}
        </div>
      </div>

      <div className="grid channels-grid">
        {displayedChannels.map((ch, i) => (
          <div
            key={`${ch.title}-${i}`}
            className={`channel-card glass-premium animate-fade-in ${ch.isDrm ? 'drm-exclusive' : ''}`}
            onClick={() => onSelect(ch)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(ch);
              }
            }}
            tabIndex="0"
            role="button"
            aria-label={`Watch ${ch.title}`}
            style={{ 
              animationDelay: i < 50 ? `${i * 0.04}s` : '0s' 
            }}
          >
            <div className="card-status-bar">
              <button 
                className={`favorite-btn ${favorites.some(f => f.title === ch.title) ? 'is-favorite' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(ch);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onToggleFavorite(ch);
                  }
                }}
                aria-label="Toggle Favorite"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={favorites.some(f => f.title === ch.title) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            <div className="logo-container-large">
              {ch.tvgLogo ? (
                <img
                  className="main-logo"
                  src={ch.tvgLogo}
                  alt={ch.title}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="logo-fallback" style={{ display: ch.tvgLogo ? 'none' : 'flex' }}>
                {ch.title.charAt(0)}
              </div>
              
              <div className="hover-play-overlay">
                <div className="play-icon-circle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="channel-info-minimal">
              <h3 className="channel-name-premium">{ch.title}</h3>
              {ch.groupTitle && (
                <span className="channel-category-dim">
                  {ch.groupTitle}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {visibleCount < filtered.length && (
        <div ref={observerTarget} className="scroll-sentinel">
          <div className="spinner"></div>
          <p>Loading more channels...</p>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="empty-state">
          <p>No channels match your search</p>
        </div>
      )}
    </div>
  );
}
