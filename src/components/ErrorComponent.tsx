interface Props {
  message: string;
}

/** Centered error state shown when the skin catalog fails to load. */
export function ErrorComponent({ message }: Props) {
  return (
    <div className="center-state">
      <span style={{ color: "var(--red)" }}>Failed to load skins</span>
      <span>{message}</span>
    </div>
  );
}
