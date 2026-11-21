import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useAuth } from "../services/auth.js";
import { api, download } from "../services/api.js";
import { money, queryString } from "../services/format.js";
import PageHeader from "../components/PageHeader.js";
import Alert from "../components/Alert.js";
import EmptyState from "../components/EmptyState.js";

const reports = [
  { id: "sales", label: "Sales", financial: true },
  { id: "purchases", label: "Purchases", financial: true },
  { id: "inventory", label: "Inventory valuation" },
  { id: "profit", label: "Profit", financial: true },
  { id: "low-stock", label: "Low stock" },
  { id: "best-sellers", label: "Best sellers", financial: true }
];

export default function ReportsPage() {
  const { user } = useAuth();
  const availableReports = user?.role === "STAFF" ? reports.filter((report) => !report.financial) : reports;
  const [type, setType] = useState(user?.role === "STAFF" ? "inventory" : "sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState({ title: "", data: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await api.get(`/reports/${type}${queryString({ from, to })}`);
      setReport(result);
      setError("");
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [type, from, to]);

  async function exportReport(format) {
    try {
      await download(`/reports/${type}${queryString({ from, to, format })}`, `${type}-report.${format}`);
    } catch (reason) { setError(reason.message); }
  }

  const columns = report.data.length ? Object.keys(report.data[0]) : [];
  function display(value, key) {
    if (typeof value === "number" && /price|value|revenue|profit|total/i.test(key)) return money(value);
    if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value)) return new Date(value).toLocaleString();
    return String(value ?? "—");
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Explore inventory health, sales performance, and profitability." action={<div className="export-actions"><button className="button button-outline" onClick={() => exportReport("pdf")}><FileText size={16} /> Export PDF</button><button className="button button-outline" onClick={() => exportReport("csv")}><FileSpreadsheet size={16} /> Export CSV</button></div>} />
      <Alert message={error} onDismiss={() => setError("")} />
      <section className="panel report-toolbar">
        <div className="report-tabs">{availableReports.map((item) => <button key={item.id} className={item.id === type ? "report-tab active" : "report-tab"} onClick={() => setType(item.id)}>{item.label}</button>)}</div>
        <div className="date-filters"><label className="field"><span>From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="field"><span>To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading table-panel-heading"><div><h2>{report.title || "Report data"}</h2><p>{report.data.length} records · {from || to ? "selected date range" : "all available dates"}</p></div><span className="report-export-hint"><Download size={15} /> Export in PDF or Excel</span></div>
        <div className="table-scroll">
          {report.data.length ? <table className="data-table report-table"><thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll(/([A-Z])/g, " $1")}</th>)}</tr></thead>
            <tbody>{report.data.map((row, index) => <tr key={`${row.invoice || row.sku || row.product || index}-${index}`}>{columns.map((column) => <td key={column}>{display(row[column], column)}</td>)}</tr>)}</tbody>
          </table> : !loading && <EmptyState title="No report data" description="There are no records for the selected report or date range." />}
          {loading && <div className="table-loading">Preparing report…</div>}
        </div>
      </section>
    </>
  );
}
