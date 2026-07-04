/** Centered loading state shown while the skin catalog is being fetched. */
export function LoadingComponent() {
  return (
    <div className="center-state">
      <span className="blink">▍</span>
      <span>Loading skin catalog…</span>
    </div>
  );
}
