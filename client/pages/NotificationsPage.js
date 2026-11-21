import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Bell, Package, Truck, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { dateTime } from "../services/format.js";
import PageHeader from "../components/PageHeader.js";
import Alert from "../components/Alert.js";
import EmptyState from "../components/EmptyState.js";

function iconFor(type) {
  if (type === "OUT_OF_STOCK") return XCircle;
  if (type === "LOW_STOCK") return AlertTriangle;
  if (type === "DELIVERY_DELAYED") return Truck;
  return Package;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({});
  const [error, setError] = useState("");
  useEffect(() => { api.get("/notifications").then((result) => { setNotifications(result.data); setSummary(result.summary); }).catch((reason) => setError(reason.message)); }, []);

  return (
    <>
      <PageHeader title="Notifications" subtitle="A live view of stock alerts and expected supplier deliveries." />
      <Alert message={error} />
      <section className="notification-summary">
        <div className="panel notification-count"><span className="notification-count-icon critical"><XCircle size={18} /></span><span><b>{summary.outOfStock || 0}</b><small>Out of stock</small></span></div>
        <div className="panel notification-count"><span className="notification-count-icon warning"><AlertTriangle size={18} /></span><span><b>{summary.lowStock || 0}</b><small>Low stock</small></span></div>
        <div className="panel notification-count"><span className="notification-count-icon info"><Truck size={18} /></span><span><b>{summary.arrivals || 0}</b><small>Arriving</small></span></div>
        <div className="panel notification-count"><span className="notification-count-icon critical"><Bell size={18} /></span><span><b>{summary.delayed || 0}</b><small>Delayed deliveries</small></span></div>
      </section>
      <section className="panel notification-panel">
        <div className="panel-heading"><div><h2>All alerts</h2><p>{notifications.length} active notifications</p></div></div>
        {notifications.length ? notifications.map((item) => {
          const Icon = iconFor(item.type);
          return <div className="notification-row" key={item.id}>
            <span className={`notification-icon notification-${item.severity}`}><Icon size={18} /></span>
            <div className="notification-copy"><strong>{item.title}</strong><p>{item.message}</p><small>{dateTime(item.createdAt)}{item.warehouseLocation ? ` · ${item.warehouseLocation}` : ""}</small></div>
            {item.purchaseId && <Link to="/purchases" className="text-link">View order <ArrowRight size={14} /></Link>}
            {item.productId && <Link to="/products" className="text-link">View stock <ArrowRight size={14} /></Link>}
          </div>;
        }) : <EmptyState title="You're all caught up" description="New stock and delivery alerts will appear here." />}
      </section>
    </>
  );
}
