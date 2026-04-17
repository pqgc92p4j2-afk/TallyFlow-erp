import { useState, useEffect } from 'react';
import { groupAPI } from '../services/api';
import { FiPlus, FiChevronRight, FiChevronDown, FiFolder, FiFolderPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

function TreeNode({ group, allGroups, onRefresh }) {
  const [expanded, setExpanded] = useState(group.level === 0);
  const children = allGroups.filter(g => g.parent?._id === group._id || g.parent === group._id);
  const hasChildren = children.length > 0;

  const natureColors = {
    Assets: 'var(--info)', Liabilities: 'var(--warning)', Income: 'var(--success)', Expenses: 'var(--danger)',
  };

  return (
    <li>
      <div className="tree-item" onClick={() => hasChildren && setExpanded(!expanded)}>
        <span className="tree-toggle" style={{ visibility: hasChildren ? 'visible' : 'hidden' }}>
          {expanded ? <FiChevronDown /> : <FiChevronRight />}
        </span>
        <FiFolder style={{ color: natureColors[group.nature] || 'var(--text-muted)', fontSize: '1rem' }} />
        <span style={{ flex: 1, fontWeight: group.isPrimary ? 600 : 400 }}>{group.name}</span>
        <span className="badge" style={{ 
          background: `${natureColors[group.nature]}20`, 
          color: natureColors[group.nature],
          fontSize: '0.65rem'
        }}>
          {group.nature}
        </span>
        {group.isDefault && <span className="badge badge-default" style={{ fontSize: '0.6rem' }}>Default</span>}
      </div>
      {expanded && hasChildren && (
        <ul className="tree-children">
          {children.map(child => (
            <TreeNode key={child._id} group={child} allGroups={allGroups} onRefresh={onRefresh} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', parent: '', nature: 'Assets' });

  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => {
    try {
      const res = await groupAPI.getAll();
      setGroups(res.data.data);
    } catch (err) { toast.error('Failed to load groups'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await groupAPI.create({
        name: form.name,
        parent: form.parent || undefined,
        nature: form.nature,
      });
      toast.success('Group created');
      setShowModal(false);
      setForm({ name: '', parent: '', nature: 'Assets' });
      loadGroups();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create group'); }
  };

  const rootGroups = groups.filter(g => !g.parent);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Account Groups</h1>
          <p>Tally-style hierarchical account structure</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FiFolderPlus /> New Group
        </button>
      </div>

      <div className="card">
        {groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No groups found</h3>
            <p>Account groups will be auto-created when you set up a company</p>
          </div>
        ) : (
          <ul className="tree-view">
            {rootGroups.map(group => (
              <TreeNode key={group._id} group={group} allGroups={groups} onRefresh={loadGroups} />
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        {['Assets', 'Liabilities', 'Income', 'Expenses'].map(nature => {
          const count = groups.filter(g => g.nature === nature).length;
          const colors = { Assets: 'blue', Liabilities: 'orange', Income: 'green', Expenses: 'red' };
          return (
            <div className="stat-card" key={nature} style={{ flex: '1', minWidth: '180px' }}>
              <div className={`stat-icon ${colors[nature]}`}><FiFolder /></div>
              <div className="stat-info">
                <div className="stat-label">{nature}</div>
                <div className="stat-value" style={{ fontSize: '1.3rem' }}>{count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Account Group</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Group Name *</label>
                  <input type="text" className="form-input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus
                    placeholder="e.g. Bank of India" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nature *</label>
                  <select className="form-select" value={form.nature}
                    onChange={e => setForm({ ...form, nature: e.target.value })}>
                    <option value="Assets">Assets</option>
                    <option value="Liabilities">Liabilities</option>
                    <option value="Income">Income</option>
                    <option value="Expenses">Expenses</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parent Group</label>
                  <select className="form-select" value={form.parent}
                    onChange={e => setForm({ ...form, parent: e.target.value })}>
                    <option value="">— Primary (No Parent) —</option>
                    {groups.map(g => (
                      <option value={g._id} key={g._id}>{'  '.repeat(g.level || 0)}{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
