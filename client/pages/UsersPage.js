import { useEffect, useState } from "react";
import { Plus, Search, ShieldCheck, UserRound, UserRoundX } from "lucide-react";
import { api } from "../services/api.js";
import { dateOnly } from "../services/format.js";
import PageHeader from "../components/PageHeader.js";
import Modal from "../components/Modal.js";
import Alert from "../components/Alert.js";
import EmptyState from "../components/EmptyState.js";
import StatusBadge from "../components/StatusBadge.js";

const emptyUser = { name: "", email: "", password: "", role: "STAFF" };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyUser);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const result = await api.get(`/users?limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      setUsers(result.data);
    } catch (reason) { setError(reason.message); }
  }
  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer); }, [search]);

  async function create(event) {
    event.preventDefault();
    try {
      await api.post("/users", form);
      setModal(false);
      setForm(emptyUser);
      setMessage("Team member created.");
      await load();
    } catch (reason) { setError(reason.message); }
  }

  async function update(user, patch) {
    try {
      await api.patch(`/users/${user.id}`, patch);
      setMessage(`${user.name}'s account was updated.`);
      await load();
    } catch (reason) { setError(reason.message); }
  }

  return (
    <>
      <PageHeader title="Team" subtitle="Manage workspace access and team roles." action={<button className="button button-primary" onClick={() => setModal(true)}><Plus size={16} /> Add team member</button>} />
      <Alert message={error} onDismiss={() => setError("")} /><Alert message={message} success onDismiss={() => setMessage("")} />
      <section className="panel product-toolbar">
        <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" /></label><span className="toolbar-count"><ShieldCheck size={16} /> Admin only</span>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading table-panel-heading"><div><h2>Workspace members</h2><p>Role changes apply to new requests immediately.</p></div></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Member</th><th>Role</th><th>Joined</th><th>Account</th><th>Actions</th></tr></thead>
          <tbody>{users.map((user) => <tr key={user.id}>
            <td><div className="product-card"><span className="profile-avatar table-avatar">{user.name.slice(0, 1)}</span><span><b>{user.name}</b><small>{user.email}</small></span></div></td>
            <td><StatusBadge>{user.role}</StatusBadge></td><td>{dateOnly(user.createdAt)}</td><td><StatusBadge>{user.isActive ? "Active" : "Inactive"}</StatusBadge></td>
            <td><div className="table-actions"><select aria-label={`Set role for ${user.name}`} value={user.role} onChange={(event) => update(user, { role: event.target.value })}><option value="ADMIN">Admin</option><option value="INVENTORY_MANAGER">Inventory Manager</option><option value="STAFF">Staff</option></select><button className={`icon-button ${user.isActive ? "danger-icon" : "text-green"}`} onClick={() => update(user, { isActive: !user.isActive })} title={user.isActive ? "Deactivate user" : "Activate user"}>{user.isActive ? <UserRoundX size={16} /> : <UserRound size={16} />}</button></div></td>
          </tr>)}</tbody>
        </table>{!users.length && <EmptyState title="No team members found" />}</div>
      </section>
      {modal && <Modal title="Add team member" onClose={() => setModal(false)}>
        <form className="stack-form" onSubmit={create}>
          <label className="field"><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength="2" /></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label className="field"><span>Temporary password</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength="10" /></label>
          <label className="field"><span>Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="STAFF">Staff</option><option value="INVENTORY_MANAGER">Inventory Manager</option><option value="ADMIN">Admin</option></select></label>
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => setModal(false)}>Cancel</button><button className="button button-primary">Create member</button></div>
        </form>
      </Modal>}
    </>
  );
}
