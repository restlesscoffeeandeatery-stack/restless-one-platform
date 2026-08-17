import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { Plus, Search, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Pencil, CheckCircle2, LoaderCircle } from 'lucide-react';
import Modal from '../../components/Modal';

const emptyTransaction = () => ({
  type: 'Expense', date: new Date().toISOString().split('T')[0],
  category: '', description: '', accountId: '', amount: '', notes: ''
});

const amountDigits = value => String(value ?? '').replace(/\D/g, '');
const formatAmountInput = value => amountDigits(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const Transactions = () => {
  const transactions = useStore(s => s.transactions);
  const accounts = useStore(s => s.accounts);
  const addTransaction = useStore(s => s.addTransaction);
  const updateTransaction = useStore(s => s.updateTransaction);
  const addToast = useStore(s => s.addToast);
  const categories = useStore(s => s.categories);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [editingId, setEditingId] = useState('');
  const [saveState, setSaveState] = useState('idle');

  const [form, setForm] = useState(emptyTransaction);

  const closeModal = () => {
    if (saveState === 'saving') return;
    setIsModalOpen(false);
    setSaveState('idle');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saveState !== 'idle') return;

    setSaveState('saving');
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editingId) await updateTransaction({ ...payload, id: editingId });
      else await addTransaction(payload);

      setSaveState('success');
      await new Promise(resolve => window.setTimeout(resolve, 750));
      setIsModalOpen(false);
      setEditingId('');
      setForm(emptyTransaction());
      setSaveState('idle');
    } catch (error) {
      setSaveState('idle');
      addToast(error?.message || 'Transaksi gagal disimpan. Silakan coba lagi.', 'error');
    }
  };

  const openAdd = () => {
    setEditingId('');
    setForm(emptyTransaction());
    setSaveState('idle');
    setIsModalOpen(true);
  };

  const openEdit = transaction => {
    setEditingId(transaction.id);
    setForm({ type: transaction.type, date: transaction.date, category: transaction.category || '', description: transaction.description || '',
      accountId: transaction.accountId || '', amount: amountDigits(Math.round(Number(transaction.amount) || 0)), notes: transaction.notes || '' });
    setSaveState('idle');
    setIsModalOpen(true);
  };

  const filtered = transactions.filter(t => {
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || t.type === filterType;
    const matchAcc = !filterAccount || t.accountId === filterAccount;
    return matchSearch && matchType && matchAcc;
  });
  const categoryOptions = categories.filter(c => c.active && c.type === (form.type === 'Income' ? 'Pemasukan' : 'Pengeluaran'));

  const getTypeIcon = (type) => {
    if (type === 'Income') return <ArrowDownLeft size={14} style={{ color: 'var(--color-success)' }} />;
    if (type === 'Expense') return <ArrowUpRight size={14} style={{ color: 'var(--color-danger)' }} />;
    return <ArrowRightLeft size={14} style={{ color: 'var(--color-primary)' }} />;
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Transactions</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} style={{ marginRight: 6 }} /> Add Transaction
        </button>
      </div>

      <div className="card">
        <div className="flex gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2" style={{ flex: '1 1 200px' }}>
            <Search size={16} style={{ color: 'var(--color-gray-400)' }} />
            <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ flex: '0 0 150px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option>Income</option>
            <option>Expense</option>
            <option>Transfer</option>
          </select>
          <select className="form-control" style={{ flex: '0 0 200px' }} value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No transactions found.</td></tr>
              )}
              {filtered.map(t => {
                const acc = accounts.find(a => a.id === t.accountId);
                const isCredit = t.type === 'Income';
                return (
                  <tr key={t.id}>
                    <td className="text-sm">{t.date}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(t.type)}
                        <span className={`badge ${t.type === 'Income' ? 'badge-success' : t.type === 'Transfer' ? 'badge-primary' : 'badge-danger'}`}>{t.type}</span>
                      </div>
                    </td>
                    <td className="text-sm">{t.category}</td>
                    <td className="font-medium">{t.description}</td>
                    <td className="text-sm text-gray-500">{acc?.name || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: isCredit ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {isCredit ? '+' : '-'}{formatRupiah(t.amount)}
                    </td>
                    <td><span className="badge badge-success">{t.status}</span></td>
                    <td>{/^(INVOICE:|PAYROLL_RUN:)/.test(t.reference || '') ? <span className="text-xs text-gray-500">Otomatis</span> : <button type="button" className="btn btn-outline text-xs" onClick={() => openEdit(t)}><Pencil size={14} style={{ marginRight: 5 }}/>Edit</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSave}>
          <div className="modal-body flex-col gap-4">
            <div className="flex gap-4">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Type</label>
                <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category: '' })}>
                  <option>Income</option>
                  <option>Expense</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Date</label>
                <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select category...</option>
                {categoryOptions.map(c => <option key={c.id} value={c.name}>{c.parent ? `${c.parent} — ${c.name}` : c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input type="text" className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="flex gap-4">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Account</label>
                <select className="form-control" value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} required>
                  <option value="">Select account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Amount (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control transaction-amount-input"
                  value={formatAmountInput(form.amount)}
                  onChange={e => setForm({ ...form, amount: amountDigits(e.target.value) })}
                  placeholder="0"
                  aria-label="Jumlah transaksi dalam Rupiah"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className={`transaction-save-status ${saveState}`} role="status" aria-live="polite" aria-atomic="true">
              {saveState === 'saving' && <><LoaderCircle size={20} className="spin" /> Menyimpan transaksi ke server…</>}
              {saveState === 'success' && <><CheckCircle2 size={22} className="transaction-save-check" /> Transaksi berhasil tersimpan</>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={saveState === 'saving'}>Cancel</button>
            <button type="submit" className={`btn btn-primary transaction-save-button ${saveState}`} disabled={saveState !== 'idle' || !Number(form.amount)}>
              {saveState === 'saving' && <><LoaderCircle size={16} className="spin" /> Menyimpan…</>}
              {saveState === 'success' && <><CheckCircle2 size={16} /> Tersimpan</>}
              {saveState === 'idle' && (editingId ? 'Save Changes' : 'Save Transaction')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Transactions;
