import { PackageOpen } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", description = "Try changing your filters or add a new record." }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><PackageOpen size={22} /></span>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}
