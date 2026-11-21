import { useCallback, useEffect, useState } from "react";
import { Barcode, ClipboardList, Edit3, PackagePlus, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";
import { money, queryString, dateTime } from "../services/format.js";
import { useAuth } from "../services/auth.js";
import PageHeader from "../components/PageHeader.js";
import Modal from "../components/Modal.js";
import StatusBadge from "../components/StatusBadge.js";
import Alert from "../components/Alert.js";
import EmptyState from "../components/EmptyState.js";

const emptyProduct = {
  name: "", sku: "", category: "", brand: "", purchasePrice: "", sellingPrice: "",
  currentStock: 0, reorderLevel: 5, barcode: "", warehouseLocation: "Main warehouse"
};

export default function ProductsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lowStock, setLowStock] = useState(searchParams.get("lowStock") === "true");
  const [modal, setModal] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [adjustment, setAdjustment] = useState({ delta: "", reason: "" });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const canEdit = ["ADMIN", "INVENTORY_MANAGER"].includes(user?.role);

  const loadProducts = useCallback(async (page = 1, term = search, filter = lowStock) => {
    setLoading(true);
    try {
      const result = await api.get(`/products${queryString({ page, limit: 10, search: term, lowStock: filter ? "true" : "" })}`);
      setProducts(result.data);
      setPagination(result.pagination);
      setError("");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, [search, lowStock]);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(1), 250);
    return () => clearTimeout(timer);
  }, [search, lowStock, loadProducts]);

  function openCreate() {
    setEditing(null);
    setForm(emptyProduct);
    setModal("product");
  }

  function openEdit(product) {
    setEditing(product);
    setForm({ ...product, purchasePrice: Number(product.purchasePrice), sellingPrice: Number(product.sellingPrice), barcode: product.barcode || "" });
    setModal("product");
  }

  async function saveProduct(event) {
    event.preventDefault();
    const payload = {
      ...form,
      purchasePrice: Number(form.purchasePrice),
      sellingPrice: Number(form.sellingPrice),
      ...(editing ? { barcode: form.barcode || null } : { currentStock: Number(form.currentStock), reorderLevel: Number(form.reorderLevel) })
    };
    try {
      if (editing) await api.patch(`/products/${editing.id}`, payload);
      else await api.post("/products", payload);
      setModal("");
      setMessage(editing ? "Product updated." : "Product created.");
      await loadProducts();
    } catch (reason) {
      setError(reason.message);
    }
  }

  async function archive(product) {
    if (!window.confirm(`Archive ${product.name}? It will be hidden from the active inventory.`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      setMessage("Product archived.");
      await loadProducts();
    } catch (reason) {
      setError(reason.message);
    }
  }

  async function submitAdjustment(event) {
    event.preventDefault();
    try {
      await api.post(`/products/${editing.id}/adjustments`, { delta: Number(adjustment.delta), reason: adjustment.reason });
      setModal("");
      setMessage("Stock adjustment recorded.");
      await loadProducts();
    } catch (reason) {
      setError(reason.message);
    }
  }

  async function showHistory(product) {
    setEditing(product);
    try {
      const result = await api.get(`/products/${product.id}/history?limit=30`);
      setHistory(result.data);
      setModal("history");
    } catch (reason) {
      setError(reason.message);
    }
  }

  async function lookupBarcode(event) {
    event.preventDefault();
    if (!barcode.trim()) return;
    try {
      const result = await api.get(`/products/barcode/${encodeURIComponent(barcode.trim())}`);
      setSearch(result.data.name);
      setLowStock(false);
      setMessage(`Found ${result.data.name} (${result.data.sku}).`);
      setBarcode("");
    } catch (reason) {
      setError(reason.message);
    }
  }

  return (
    <>
      <PageHeader title="Products" subtitle="Manage your catalog, stock levels, and product details." action={canEdit && <button className="button button-primary" onClick={openCreate}><Plus size={16} /> Add product</button>} />
      <Alert message={error} onDismiss={() => setError("")} />
      <Alert message={message} success onDismiss={() => setMessage("")} />
      <section className="panel product-toolbar">
        <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, brand, category…" /></label>
        <form className="barcode-search" onSubmit={lookupBarcode}><Barcode size={17} /><input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Scan barcode or enter SKU" /><button className="button button-outline button-small" type="submit">Find</button></form>
        <button className={`button button-outline button-small ${lowStock ? "filter-active" : ""}`} onClick={() => setLowStock(!lowStock)}><SlidersHorizontal size={15} /> Low stock</button>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading table-panel-heading"><div><h2>Product catalog</h2><p>{pagination.total} active products</p></div><span className="table-caption">Stock on hand · valued at purchase cost</span></div>
        <div className="table-scroll">
          <table className="data-table product-table">
            <thead><tr><th>Product</th><th>SKU / Barcode</th><th>Category</th><th>Price</th><th>Stock</th><th>Location</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td><div className="product-card"><span className="product-thumb">{product.name.slice(0, 1).toUpperCase()}</span><span><b>{product.name}</b><small>{product.brand}</small></span></div></td>
                  <td><b className="code-text">{product.sku}</b><small className="cell-subtext">{product.barcode || "No barcode"}</small></td>
                  <td>{product.category}</td>
                  <td><b>{money(product.sellingPrice)}</b><small className="cell-subtext">{product.purchasePrice === undefined ? "Cost hidden" : `Cost ${money(product.purchasePrice)}`}</small></td>
                  <td><div className="stock-cell"><b>{product.currentStock}</b><StatusBadge>{product.currentStock === 0 ? "Out of stock" : product.currentStock <= product.reorderLevel ? "Low stock" : "In stock"}</StatusBadge></div><small className="cell-subtext">Reorder at {product.reorderLevel}</small></td>
                  <td>{product.warehouseLocation}</td>
                  <td><div className="table-actions">
                    <button className="icon-button" onClick={() => showHistory(product)} title="Stock history"><ClipboardList size={16} /></button>
                    {canEdit && <><button className="icon-button" onClick={() => { setEditing(product); setAdjustment({ delta: "", reason: "" }); setModal("adjust"); }} title="Adjust stock"><PackagePlus size={16} /></button><button className="icon-button" onClick={() => openEdit(product)} title="Edit product"><Edit3 size={15} /></button><button className="icon-button danger-icon" onClick={() => archive(product)} title="Archive product"><Trash2 size={15} /></button></>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && products.length === 0 && <EmptyState title="No products found" description="Try a different search or add your first product." />}
          {loading && <div className="table-loading">Loading products…</div>}
        </div>
        <div className="pagination">
          <span>Page {pagination.page} of {Math.max(1, pagination.pages)}</span>
          <div><button className="button button-outline button-small" disabled={pagination.page <= 1} onClick={() => loadProducts(pagination.page - 1)}>Previous</button><button className="button button-outline button-small" disabled={pagination.page >= pagination.pages} onClick={() => loadProducts(pagination.page + 1)}>Next</button></div>
        </div>
      </section>

      {modal === "product" && <Modal title={editing ? "Edit product" : "Add a product"} onClose={() => setModal("")} wide>
        <form className="form-grid" onSubmit={saveProduct}>
          <label className="field"><span>Product name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength="160" /></label>
          <label className="field"><span>SKU</span><input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required maxLength="64" /></label>
          <label className="field"><span>Category</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></label>
          <label className="field"><span>Brand</span><input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} required /></label>
          <label className="field"><span>Purchase price</span><input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })} required /></label>
          <label className="field"><span>Selling price</span><input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} required /></label>
          {!editing && <label className="field"><span>Opening stock</span><input type="number" min="0" value={form.currentStock} onChange={(event) => setForm({ ...form, currentStock: event.target.value })} /></label>}
          <label className="field"><span>Reorder level</span><input type="number" min="0" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: event.target.value })} required /></label>
          <label className="field"><span>Barcode</span><input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></label>
          <label className="field"><span>Warehouse location</span><input value={form.warehouseLocation} onChange={(event) => setForm({ ...form, warehouseLocation: event.target.value })} required /></label>
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => setModal("")}>Cancel</button><button className="button button-primary" type="submit">{editing ? "Save changes" : "Create product"}</button></div>
        </form>
      </Modal>}
      {modal === "adjust" && <Modal title={`Adjust stock · ${editing?.name}`} onClose={() => setModal("")}>
        <form className="stack-form" onSubmit={submitAdjustment}>
          <p className="modal-description">Current balance: <b>{editing?.currentStock}</b> units. Use a negative number to record a loss.</p>
          <label className="field"><span>Quantity change</span><input type="number" step="1" value={adjustment.delta} onChange={(event) => setAdjustment({ ...adjustment, delta: event.target.value })} required /></label>
          <label className="field"><span>Reason / reference</span><input value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} placeholder="Cycle count, damage, etc." required minLength="3" /></label>
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => setModal("")}>Cancel</button><button className="button button-primary">Record adjustment</button></div>
        </form>
      </Modal>}
      {modal === "history" && <Modal title={`Stock history · ${editing?.name}`} onClose={() => setModal("")} wide>
        <div className="history-list">{history.length ? history.map((item) => <div className="history-row" key={item.id}><span className={`activity-icon ${item.delta > 0 ? "activity-in" : "activity-out"}`}>{item.delta > 0 ? "+" : ""}{item.delta}</span><span><b>{item.type} · {item.reference}</b><small>{item.user.name} · {dateTime(item.createdAt)} · balance {item.balanceBefore} → {item.balanceAfter}</small></span><StatusBadge>{item.warehouseLocation}</StatusBadge></div>) : <EmptyState title="No stock movements" />}</div>
      </Modal>}
    </>
  );
}
