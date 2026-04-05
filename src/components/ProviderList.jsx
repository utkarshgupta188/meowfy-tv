export default function ProviderList({ providers, onSelect }) {
  return (
    <div className="provider-list">
      <h2 className="section-title">Choose a Provider</h2>
      <div className="grid">
        {providers
          .filter((p) => p.catLink && p.catLink.startsWith('http'))
          .map((provider, i) => (
            <div
              key={i}
              className="card provider-card glass-premium magnetic-card animate-fade-in"
              onClick={() => onSelect(provider)}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="card-badge">Provider</div>
              <div className="card-image-container">
                <img
                  src={provider.image || 'https://placehold.co/120x120/1a1a2f/ff2e63?text=TV'}
                  alt={provider.title}
                  className="provider-logo"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/120x120/1a1a2f/ff2e63?text=TV';
                  }}
                />
              </div>
              <div className="card-content">
                <h3>{provider.title || 'Unknown Provider'}</h3>
                <div className="card-footer">
                  <span className="channel-count">Live Content</span>
                  <span className="action-hint">Browse →</span>
                </div>
              </div>
            </div>
          ))}
      </div>
      {providers.length === 0 && (
        <div className="empty-state">
          <p>No providers available</p>
        </div>
      )}
    </div>
  );
}
