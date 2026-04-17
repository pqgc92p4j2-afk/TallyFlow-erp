import { useState, useEffect } from 'react';
import { productAPI } from '../services/api';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiBox } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    name: '', description: '', hsnSac: '', unit: 'Nos', 
    rate: 0, gstRate: 18, cessRate: 0, priceType: 'exclusive',
    openingStock: 0, currentStock: 0
  });

  const units = ['Nos', 'Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Dozen', 'Pack', 'Roll', 'Set', 'Ton'];
  const gstRates = [0, 0.1, 0.25, 3, 5, 12, 18, 28];

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const res = await productAPI.getAll({ search });
      setProducts(res.data.data);
    } catch (err) { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); loadProducts(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await productAPI.update(editingId, form); toast.success('Product updated'); }
      else { await productAPI.create(form); toast.success('Product added'); }
      setShowModal(false); resetForm(); loadProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save product'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete product "${name}"?`)) return;
    try { await productAPI.delete(id); toast.success('Product deleted'); loadProducts(); }
    catch (err) { toast.error('Failed to delete product'); }
  };

  const openEdit = (p) => {
    setForm({
      name: p.name, description: p.description || '', hsnSac: p.hsnSac || '', 
      unit: p.unit || 'Nos', rate: p.rate || 0, gstRate: p.gstRate || 0, 
      cessRate: p.cessRate || 0, priceType: p.priceType || 'exclusive',
      openingStock: p.openingStock || 0, currentStock: p.currentStock || 0
    });
    setEditingId(p._id); setShowModal(true);
  };

  const resetForm = () => {
    setForm({ name: '', description: '', hsnSac: '', unit: 'Nos', rate: 0, gstRate: 18, cessRate: 0, priceType: 'exclusive', openingStock: 0, currentStock: 0 });
    setEditingId(null);
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>📦 Products / Inventory</h1><p>Manage products, rates, and HSN codes for auto-billing</p></div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}><FiPlus /> Add Product</button>
      </div>

      <div className="filter-bar">
        <form onSubmit={handleSearch} className="search-bar">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Search products by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{products.length} Items</span>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>HSN/SAC</th>
              <th>Rate / Unit</th>
              <th>Stock In-Hand</th>
              <th>GST %</th>
              <th style={{ width: '90px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan="6"><div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-icon"><FiBox /></div><h3>No products found</h3><p>Create products to auto-fill invoices quickly</p>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Add Product</button>
              </div></td></tr>
            ) : products.map(p => (
              <tr key={p._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description}</div>}
                </td>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>{p.hsnSac || '—'}</td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(p.rate)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>per {p.unit}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div className={`badge ${p.currentStock <= 0 ? 'badge-danger' : p.currentStock < 10 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                    {p.currentStock} {p.unit}
                  </div>
                </td>
                <td><span className="badge badge-default">{p.gstRate}%</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => openEdit(p)}><FiEdit2 /></button>
                    <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => handleDelete(p._id, p.name)} style={{ color: 'var(--danger)' }}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Product' : 'Add Product'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Product Name *</label>
                  <input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
                </div>
                <div className="form-group"><label className="form-label">Description (optional)</label>
                  <input type="text" className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                
                <div className="form-row">
                  <div className="form-group"><label className="form-label">HSN / SAC Code</label>
                    <input type="text" className="form-input" value={form.hsnSac} onChange={e => setForm({ ...form, hsnSac: e.target.value })} />
                  </div>
                  <div className="form-group"><label className="form-label">Unit of Measure</label>
                    <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group"><label className="form-label">Standard Rate (₹) *</label>
                    <input type="number" step="0.01" className="form-input" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div className="form-group"><label className="form-label">Price Includes GST?</label>
                    <select className="form-select" value={form.priceType} onChange={e => setForm({ ...form, priceType: e.target.value })}>
                      <option value="exclusive">Exclusive (Tax calculated on top)</option>
                      <option value="inclusive">Inclusive (Tax baked into rate)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group"><label className="form-label">GST Rate %</label>
                    <select className="form-select" value={form.gstRate} onChange={e => setForm({ ...form, gstRate: parseFloat(e.target.value) || 0 })}>
                      {gstRates.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Current Stock Quantity *</label>
                    <input type="number" className="form-input" style={{ borderColor: 'var(--accent)', fontWeight: 600 }} 
                      value={form.currentStock} onChange={e => setForm({ ...form, currentStock: parseFloat(e.target.value) || 0 })} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Add'} Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
