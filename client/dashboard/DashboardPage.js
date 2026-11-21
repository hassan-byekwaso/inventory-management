import { useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, CircleDollarSign, Package, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { dateTime, money } from "../services/format.js";
import PageHeader from "../components/PageHeader.js";
import StatCard from "../components/StatCard.js";
import StatusBadge from "../components/StatusBadge.js";
import Alert from "../components/Alert.js";
import EmptyState from "../components/EmptyState.js";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/dashboard").then((result) => setData(result.data)).catch((reason) => setError(reason.message)); }, []);

  if (error) return <Alert message={error} />;
  if (!data) return <div className="page-loading">Loading dashboard…</div>;
  const { metrics, lowStock, recentSales, recentMovements, salesTrend } = data;
  const trend = salesTrend || [];
  return (
    <>
      <PageHeader title={new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"} subtitle="Here’s what’s happening with your inventory today." action={<span className="date-pill">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>} />
      <section className="stats-grid">
        <StatCard title="Total products" value={metrics.totalProducts.toLocaleString()} note={`${metrics.totalCategories} categories`} icon={Package} tone="blue" />
        <StatCard title="Low stock items" value={metrics.lowStockItems.toLocaleString()} note={`${metrics.outOfStockItems} currently out of stock`} icon={Boxes} tone="amber" />
        <StatCard title="Today's sales" value={money(metrics.todaysSales)} note={`${metrics.todaysOrders} orders today`} icon={CircleDollarSign} tone="green" />
        <StatCard title="Inventory value" value={money(metrics.inventoryValue)} note="Valued at purchase cost" icon={TrendingUp} tone="purple" />
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div><h2>Sales overview</h2><p>Revenue over the last seven days</p></div>
            <Link to="/reports" className="text-link">View reports <ArrowRight size={15} /></Link>
          </div>
          <div className="chart-legend"><span><i /> Revenue</span><strong>{money(metrics.monthlyRevenue)} <small>this month</small></strong></div>
          <div className="chart-wrap">
            {trend.length ? <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#516fe3" stopOpacity={0.22} /><stop offset="90%" stopColor="#516fe3" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)" }} />
                <Area type="monotone" dataKey="revenue" stroke="#516fe3" strokeWidth={2.5} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer> : <EmptyState title="No sales yet" description="Your sales trend will appear here." />}
          </div>
        </article>
        <article className="panel low-stock-panel">
          <div className="panel-heading"><div><h2>Stock attention</h2><p>Items to review or replenish</p></div><Link to="/products?lowStock=true" className="icon-button"><ArrowRight size={17} /></Link></div>
          <div className="attention-list">
            {lowStock.length ? lowStock.slice(0, 5).map((product) => (
              <div className="attention-item" key={product.id}>
                <span className={`attention-mark ${product.currentStock === 0 ? "mark-danger" : "mark-warning"}`}><Package size={16} /></span>
                <span className="attention-copy"><b>{product.name}</b><small>{product.sku}</small></span>
                <span className={`stock-count ${product.currentStock === 0 ? "text-danger" : ""}`}>{product.currentStock}<small> left</small></span>
              </div>
            )) : <EmptyState title="All levels look good" description="No products are below their reorder point." />}
          </div>
          <Link to="/products" className="panel-footer-link">View all products <ArrowRight size={14} /></Link>
        </article>
      </section>
      <section className="dashboard-grid lower-grid">
        <article className="panel">
          <div className="panel-heading"><div><h2>Recent sales</h2><p>Latest customer orders</p></div><Link to="/sales" className="text-link">All sales <ArrowRight size={15} /></Link></div>
          <div className="table-scroll">
            <table className="data-table compact-table">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recentSales.map((sale) => <tr key={sale.id}><td className="text-strong">{sale.invoiceNumber}</td><td>{sale.customerName}</td><td>{money(sale.totalAmount)}</td><td><StatusBadge>{sale.paymentStatus}</StatusBadge></td></tr>)}
              </tbody>
            </table>
            {!recentSales.length && <EmptyState title="No sales recorded" />}
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest stock movements</p></div><Activity size={18} className="panel-heading-icon" /></div>
          <div className="activity-list">
            {recentMovements.map((movement) => {
              const inbound = movement.delta > 0;
              return <div className="activity-item" key={movement.id}>
                <span className={`activity-icon ${inbound ? "activity-in" : "activity-out"}`}>{inbound ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}</span>
                <span className="activity-copy"><b>{movement.product.name}</b><small>{movement.type.toLowerCase()} · {movement.user.name} · {dateTime(movement.createdAt)}</small></span>
                <strong className={inbound ? "text-green" : "text-danger"}>{inbound ? "+" : ""}{movement.delta}</strong>
              </div>;
            })}
            {!recentMovements.length && <EmptyState title="No activity yet" />}
          </div>
        </article>
      </section>
    </>
  );
}
