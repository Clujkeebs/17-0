export default function Loading() {
  return (
    <div className="container section" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 14, width: 140, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 56, width: '60%', marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );
}
