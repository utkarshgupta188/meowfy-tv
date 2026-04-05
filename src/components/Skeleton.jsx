import './Skeleton.css';

export const CardSkeleton = () => (
  <div className="card skeleton-card">
    <div className="skeleton skeleton-image"></div>
    <div className="card-body">
      <div className="skeleton skeleton-text title"></div>
    </div>
  </div>
);

export const RowSkeleton = () => (
  <div className="card channel-card skeleton-row">
    <div className="channel-info">
      <div className="skeleton skeleton-logo"></div>
      <div className="channel-info-text">
        <div className="skeleton skeleton-text title"></div>
        <div className="skeleton skeleton-text subtitle"></div>
      </div>
    </div>
    <div className="channel-badges">
      <div className="skeleton skeleton-badge"></div>
    </div>
  </div>
);

export default function Skeleton({ type, count = 1 }) {
  const skeletons = Array(count).fill(null);
  
  return (
    <div className={`grid ${type === 'card' ? 'skeleton-grid-cards' : 'skeleton-grid-rows'}`}>
      {skeletons.map((_, i) => (
        type === 'card' ? <CardSkeleton key={i} /> : <RowSkeleton key={i} />
      ))}
    </div>
  );
}
