import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function Alert({ message, success = false, onDismiss }) {
  if (!message) return null;
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div className={`alert ${success ? "alert-success" : "alert-error"}`} role={success ? "status" : "alert"}>
      <Icon size={17} />
      <span>{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss message">×</button>}
    </div>
  );
}
