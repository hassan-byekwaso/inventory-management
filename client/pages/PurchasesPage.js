import { useEffect, useState } from "react";
import { Download, PackageCheck, Plus, Search, ShoppingBag } from "lucide-react";
import { api, download } from "../services/api.js";
import { money, queryString, dateTime } from "../services/format.js";
import { useAuth } from "../services/auth.js";
import PageHeader from "../components/PageHeader.js";
import Modal from "../components/Modal.js";
import OrderComposer from "../components/OrderComposer.js";
import Alert from "../components/Alert.js";
import EmptyState from "../components/EmptyState.js";
import StatusBadge from "../components/StatusBadge.js";

export default function PurchasesPage() {
  const { user } = useAuth();
  const canEdit = ["ADMIN", "INVENTORY_MANAGER"].includes(user?.role);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ supplierId: "", status: "DELIVERED", deliveryDueAt: "", notes: "" });
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadPurchases(page = 1) {
    try {
      const result = await api.get(`/purchases${queryString({ page, limit: 10, search })}`);
      setPurchases(result.data);
      setPagination(result.pagination);
    } catch (reason) { setError(reason.message); }
  }
  useEffect(() => { const timer = setTimeout(() => loadPurchases(1), 200); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    Promise.all([api.get("/products?limit=100"), api.get("/suppliers?limit=100")])
      .then(([productResult, supplierResult]) => {
        setProducts(productResult.data);
        setSuppliers(supplierResult.data);
        setForm((current) => ({ ...current, supplierId: supplierResult.data[0]?.id || "" }));
      })
      .catch((reason) => setError(reason.message));
  }, []);

  function openForm() {
    setForm({ supplierId: suppliers[0]?.id || "", status: "DELIVERED", deliveryDueAt: "", notes: "" });
    setItems(products.slice(0, 1).map((product) => ({ productId: product.id, quantity: 1 })));
    setModal(true);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/purchases", {
        ...form,
        deliveryDueAt: form.deliveryDueAt ? new Date(`${form.deliveryDueAt}T23:59:59`).toISOString() : null,
        items: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) }))
      }, { "Idempotency-Key": crypto.randomUUID() });
      setModal(false);
      setMessage(form.status === "DELIVERED" ? "Purchase recorded and stock received." : "Purchase order created.");
      await loadPurchases();
    } catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }

  async function updateStatus(purchase, status) {
    try {
      await api.patch(`/purchases/${purchase.id}/status`, { status });
      setMessage(status === "DELIVERED" ? "Delivery received; inventory updated." : `Purchase status changed to ${status.toLowerCase()}.`);
      await loadPurchases();
    } catch (reason) { setError(reason.message); }
  }

  async function invoice(purchase) {
    try { await download(`/purchases/${purchase.id}/invoice.pdf`, `${purchase.invoiceNumber}.pdf`); }
    catch (reason) { setError(reason.message); }
  }

  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(products.find((product) => product.id === item.productId)?.purchasePrice || 0), 0);
  return (
    <>
      <PageHeader title="Purchases" subtitle="Create purchase orders, receive deliveries, and update stock." action={canEdit && <button className="button button-primary" onClick={openForm}><Plus size={16} /> New purchase</button>} />
      <Alert message={error} onDismiss={() => setError("")} /><Alert message={message} success onDismiss={() => setMessage("")} />
      <section className="panel product-toolbar">
        <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice or supplier…" /></label>
        <span className="toolbar-count"><ShoppingBag size={16} /> {pagination.total} purchase orders</span>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading table-panel-heading"><div><h2>Purchase orders</h2><p>Stock is added when a delivery is received.</p></div></div>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Purchase order</th><th>Supplier</th><th>Line items</th><th>Amount</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>{purchases.map((purchase) => <tr key={purchase.id}>
            <td><b className="code-text">{purchase.invoiceNumber}</b><small className="cell-subtext">{purchase.deliveryDueAt ? `Due ${new Date(purchase.deliveryDueAt).toLocaleDateString()}` : "No due date"}</small></td>
            <td>{purchase.supplier.companyName}</td><td>{purchase.items.length} products</td><td><b>{money(purchase.totalAmount)}</b></td>
            <td><StatusBadge>{purchase.status}</StatusBadge></td><td>{dateTime(purchase.createdAt)}</td>
            <td><div className="table-actions"><button className="icon-button" onClick={() => invoice(purchase)} title="Download invoice"><Download size={16} /></button>{canEdit && ["PLACED", "IN_TRANSIT"].includes(purchase.status) && <button className="icon-button text-green" onClick={() => updateStatus(purchase, "DELIVERED")} title="Receive delivery"><PackageCheck size={17} /></button>}</div></td>
          </tr>)}</tbody>
        </table>{!purchases.length && <EmptyState title="No purchases yet" description="Create a purchase order to record incoming goods." />}</div>
        <div className="pagination"><span>Page {pagination.page} of {Math.max(1, pagination.pages)}</span><div><button className="button button-outline button-small" disabled={pagination.page <= 1} onClick={() => loadPurchases(pagination.page - 1)}>Previous</button><button className="button button-outline button-small" disabled={pagination.page >= pagination.pages} onClick={() => loadPurchases(pagination.page + 1)}>Next</button></div></div>
      </section>
      {modal && <Modal title="Create purchase order" onClose={() => setModal(false)} wide>
        {!suppliers.length && <Alert message="Add a supplier before creating a purchase." />}
        <form className="stack-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field"><span>Supplier</span><select value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })} required><option value="">Select supplier</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.companyName}</option>)}</select></label>
            <label className="field"><span>Initial status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="DELIVERED">Delivered — receive stock now</option><option value="PLACED">Placed</option><option value="IN_TRANSIT">In transit</option></select></label>
            <label className="field"><span>Expected delivery</span><input type="date" value={form.deliveryDueAt} onChange={(event) => setForm({ ...form, deliveryDueAt: event.target.value })} /></label>
            <label className="field"><span>Notes</span><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          </div>
          <OrderComposer products={products} items={items} setItems={setItems} />
          <div className="order-total"><span>Estimated purchase total</span><strong>{money(total)}</strong></div>
          <p className="field-hint">Purchase prices are taken from the product catalog. Choose Delivered to receive the units immediately.</p>
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => setModal(false)}>Cancel</button><button className="button button-primary" disabled={saving || !items.length || !suppliers.length}>{saving ? "Saving…" : "Create purchase"}</button></div>
        </form>
      </Modal>}
    </>
  );
}
