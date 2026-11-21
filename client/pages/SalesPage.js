import { useEffect, useState } from "react";
import { Download, Plus, Search, ShoppingCart } from "lucide-react";
import { api, download } from "../services/api.js";
import { money, queryString, dateTime } from "../services/format.js";
import { useAuth } from "../services/auth.js";
import PageHeader from "../components/PageHeader.js";
import Modal from "../components/Modal.js";
import OrderComposer from "../components/OrderComposer.js";
import Alert from "../components/Alert.js";
import EmptyState from "../components/EmptyState.js";
import StatusBadge from "../components/StatusBadge.js";

export default function SalesPage() {
  const { user } = useAuth();
  const canOverridePrice = ["ADMIN", "INVENTORY_MANAGER"].includes(user?.role);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customerName: "", paymentStatus: "PAID" });
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadSales(page = 1) {
    try {
      const result = await api.get(`/sales${queryString({ page, limit: 10, search })}`);
      setSales(result.data);
      setPagination(result.pagination);
    } catch (reason) { setError(reason.message); }
  }
  useEffect(() => { const timer = setTimeout(() => loadSales(1), 200); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { api.get("/products?limit=100").then((result) => setProducts(result.data)).catch((reason) => setError(reason.message)); }, []);

  function openForm() {
    setForm({ customerName: "", paymentStatus: "PAID" });
    setItems(products.filter((product) => product.currentStock > 0).slice(0, 1).map((product) => ({ productId: product.id, quantity: 1, unitPrice: Number(product.sellingPrice) })));
    setModal(true);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/sales", {
        ...form,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          ...(canOverridePrice ? { unitPrice: Number(item.unitPrice) } : {})
        }))
      }, { "Idempotency-Key": crypto.randomUUID() });
      setModal(false);
      setMessage("Sale recorded and inventory updated.");
      await loadSales();
    } catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }

  async function invoice(sale) {
    try { await download(`/sales/${sale.id}/invoice.pdf`, `${sale.invoiceNumber}.pdf`); }
    catch (reason) { setError(reason.message); }
  }

  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  return (
    <>
      <PageHeader title="Sales" subtitle="Record customer orders and keep inventory in sync." action={<button className="button button-primary" onClick={openForm}><Plus size={16} /> New sale</button>} />
      <Alert message={error} onDismiss={() => setError("")} /><Alert message={message} success onDismiss={() => setMessage("")} />
      <section className="panel product-toolbar">
        <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice or customer…" /></label>
        <span className="toolbar-count"><ShoppingCart size={16} /> {pagination.total} sales</span>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading table-panel-heading"><div><h2>Sales history</h2><p>Each sale deducts stock atomically.</p></div></div>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Invoice</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Date</th><th>Invoice</th></tr></thead>
          <tbody>{sales.map((sale) => <tr key={sale.id}>
            <td><b className="code-text">{sale.invoiceNumber}</b></td><td>{sale.customerName}</td>
            <td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} units</td><td><b>{money(sale.totalAmount)}</b></td>
            <td><StatusBadge>{sale.paymentStatus}</StatusBadge></td><td>{dateTime(sale.createdAt)}</td>
            <td><button className="icon-button" onClick={() => invoice(sale)} aria-label={`Download invoice ${sale.invoiceNumber}`}><Download size={16} /></button></td>
          </tr>)}</tbody>
        </table>{!sales.length && <EmptyState title="No sales yet" description="Record a sale to see it here." />}</div>
        <div className="pagination"><span>Page {pagination.page} of {Math.max(1, pagination.pages)}</span><div><button className="button button-outline button-small" disabled={pagination.page <= 1} onClick={() => loadSales(pagination.page - 1)}>Previous</button><button className="button button-outline button-small" disabled={pagination.page >= pagination.pages} onClick={() => loadSales(pagination.page + 1)}>Next</button></div></div>
      </section>
      {modal && <Modal title="Record a sale" onClose={() => setModal(false)} wide>
        <form className="stack-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field"><span>Customer name</span><input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} required /></label>
            <label className="field"><span>Payment status</span><select value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })}><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="PARTIAL">Partial</option></select></label>
          </div>
          <OrderComposer products={products} items={items} setItems={setItems} showPrice={canOverridePrice} />
          <div className="order-total"><span>Order total</span><strong>{money(total)}</strong></div>
          <p className="field-hint">Stock availability is checked again on save to prevent overselling.</p>
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => setModal(false)}>Cancel</button><button className="button button-primary" disabled={saving || !items.length}>{saving ? "Recording…" : "Record sale"}</button></div>
        </form>
      </Modal>}
    </>
  );
}
