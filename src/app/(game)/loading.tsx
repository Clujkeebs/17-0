export default function Loading() {
  return (
    <div className="container section" aria-busy="true" aria-label="Loading game">
      <div className="skeleton" style={{ height: 56, width: '50%', marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 240 }} />
    </div>
  );
}
