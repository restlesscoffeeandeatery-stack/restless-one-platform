import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { CreditCard, Banknote, ArrowRightLeft } from 'lucide-react';
import Modal from '../../components/Modal';

const BankCash = () => {
  const accounts = useStore(state => state.accounts);
  const transferMoney = useStore(state => state.transferMoney);
  const transactions = useStore(state => state.transactions);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    fromAccId: '',
    toAccId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleTransfer = (e) => {
    e.preventDefault();
    transferMoney(
      formData.fromAccId,
      formData.toAccId,
      Number(formData.amount),
      formData.date,
      formData.notes
    );
    setIsTransferModalOpen(false);
    setFormData({ fromAccId: '', toAccId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Bank & Cash</h1>
        <button className="btn btn-primary" onClick={() => setIsTransferModalOpen(true)}>
          <ArrowRightLeft size={16} className="mr-2" style={{ marginRight: '0.5rem' }} />
          Transfer Money
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {accounts.map(acc => (
          <div key={acc.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex justify-between items-center">
              <span className="font-medium">{acc.name}</span>
              <div className="badge badge-gray">
                {acc.type === 'Bank' ? <CreditCard size={14} className="mr-1" style={{ marginRight: '0.25rem' }} /> : <Banknote size={14} className="mr-1" style={{ marginRight: '0.25rem' }} />}
                {acc.type}
              </div>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatRupiah(acc.balance)}
            </div>
            <div className="text-xs text-gray-500">
              <a href="#" style={{ color: 'var(--color-primary)' }}>View Transactions</a>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Recent Transactions</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map(trx => {
                const acc = accounts.find(a => a.id === trx.accountId);
                const isExpense = trx.type === 'Expense' || (trx.type === 'Transfer' && trx.description.startsWith('Transfer to'));
                return (
                  <tr key={trx.id}>
                    <td>{trx.date}</td>
                    <td>{trx.description}</td>
                    <td>{acc?.name}</td>
                    <td>{trx.category}</td>
                    <td style={{ textAlign: 'right', color: isExpense ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 500 }}>
                      {isExpense ? '-' : '+'}{formatRupiah(trx.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Money"
      >
        <form onSubmit={handleTransfer}>
          <div className="modal-body flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-control" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
            </div>

            <div className="form-group">
              <label className="form-label">From Account</label>
              <select className="form-control" value={formData.fromAccId} onChange={e => setFormData({...formData, fromAccId: e.target.value})} required>
                <option value="">Select source account...</option>
                {accounts.filter(a => a.id !== formData.toAccId).map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({formatRupiah(a.balance)})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">To Account</label>
              <select className="form-control" value={formData.toAccId} onChange={e => setFormData({...formData, toAccId: e.target.value})} required>
                <option value="">Select destination account...</option>
                {accounts.filter(a => a.id !== formData.fromAccId).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (Rp)</label>
              <input type="number" className="form-control" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required min="1" />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input type="text" className="form-control" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional description" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Confirm Transfer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BankCash;
