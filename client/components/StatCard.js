export default function StatCard({ title, value, note, icon: Icon, tone = "blue" }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon"><Icon size={18} /></span>
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}
