import { useEffect, useState } from "react";
import { Edit3, Mail, MapPin, Phone, Plus, Search, Truck, Trash2 } from "lucide-react";
import { api } from "../services/api.js";
import { queryString } from "../services/format.js";
import { useAuth } from "../services/auth.js";
import PageHeader from "../components/PageHeader.js";
import Modal from "../components/Modal.js";
import Alert from "../components/Alert.js";
import EmptyState from "../components/EmptyState.js";
import StatusBadge from "../components/StatusBadge.js";

const emptySupplier = { companyName: "", contactPerson: "", phone: "", email: "", address: "", deliveryStatus: "On schedule", deliveryNotes: "" };

export default function SuppliersPage() {
  const { user } = useAuth();
  const canEdit = ["ADMIN", "INVENTORY_MANAGER"].includes(user?.role);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupplier);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const result = await api.get(`/suppliers${queryString({ search, limit: 100 })}`);
      setSuppliers(result.data);
      setError("");
    } catch (reason) { setError(reason.message); }
  }
  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer); }, [search]);

  function openForm(supplier) {
    setEditing(supplier || null);
    setForm(supplier ? { ...supplier } : emptySupplier);
    setModal(true);
  }

  async function submit(event) {
    event.preventDefault();
    try {
      if (editing) await api.patch(`/suppliers/${editing.id}`, form);
      else await api.post("/suppliers", form);
      setModal(false);
      setMessage(editing ? "Supplier updated." : "Supplier added.");
      await load();
    } catch (reason) { setError(reason.message); }
  }

  async function archive(supplier) {
    if (!window.confirm(`Archive ${supplier.companyName}?`)) return;
    try { await api.delete(`/suppliers/${supplier.id}`); setMessage("Supplier archived."); await load(); }
    catch (reason) { setError(reason.message); }
  }

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Keep supplier details and delivery notes in one place." action={canEdit && <button className="button button-primary" onClick={() => openForm()}><Plus size={16} /> Add supplier</button>} />
      <Alert message={error} onDismiss={() => setError("")} /><Alert message={message} success onDismiss={() => setMessage("")} />
      <section className="panel product-toolbar">
        <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search companies, contacts, email…" /></label>
        <span className="toolbar-count"><Truck size={16} /> {suppliers.length} suppliers</span>
      </section>
      {suppliers.length ? <section className="supplier-grid">
        {suppliers.map((supplier) => (
          <article className="panel supplier-card" key={supplier.id}>
            <div className="supplier-card-top"><span className="supplier-avatar">{supplier.companyName.slice(0, 1)}</span><StatusBadge>{supplier.deliveryStatus}</StatusBadge></div>
            <h2>{supplier.companyName}</h2><p className="supplier-contact">{supplier.contactPerson}</p>
            <div className="supplier-info"><span><Phone size={15} />{supplier.phone}</span><span><Mail size={15} />{supplier.email}</span><span><MapPin size={15} />{supplier.address}</span></div>
            {supplier.deliveryNotes && <p className="supplier-note">{supplier.deliveryNotes}</p>}
            {canEdit && <div className="supplier-actions"><button className="button button-outline button-small" onClick={() => openForm(supplier)}><Edit3 size={14} /> Edit</button><button className="icon-button danger-icon" onClick={() => archive(supplier)} title="Archive supplier"><Trash2 size={15} /></button></div>}
          </article>
        ))}
      </section> : <section className="panel"><EmptyState title="No suppliers found" description="Add a supplier or adjust your search." /></section>}
      {modal && <Modal title={editing ? "Edit supplier" : "Add supplier"} onClose={() => setModal(false)}>
        <form className="stack-form" onSubmit={submit}>
          {[
            ["companyName", "Company name"], ["contactPerson", "Contact person"], ["phone", "Phone"], ["email", "Email address"], ["address", "Address"], ["deliveryStatus", "Delivery status"], ["deliveryNotes", "Delivery notes"]
          ].map(([key, label]) => <label className="field" key={key}><span>{label}</span>{key === "deliveryNotes" ? <textarea rows="3" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /> : <input type={key === "email" ? "email" : "text"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={key !== "deliveryNotes"} />}</label>)}
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => setModal(false)}>Cancel</button><button className="button button-primary">{editing ? "Save changes" : "Add supplier"}</button></div>
        </form>
      </Modal>}
    </>
  );
}
