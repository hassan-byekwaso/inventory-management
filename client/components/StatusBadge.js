export default function StatusBadge({ children }) {
  const value = String(children || "").toLowerCase().replaceAll("_", "-");
  return <span className={`status-badge status-${value.replaceAll(" ", "-")}`}>{String(children || "").replaceAll("_", " ")}</span>;
}
