import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import Modal from '../../components/Modal';

const STOCK_OUT_CATEGORIES = ['Production / Usage', 'Waste / Damaged', 'Complimentary', 'Stock Adjustment', 'Others'];

const StockMovement = () => {
  const materials = useStore(s => s.materials);
  const stockHistory = useStore(s => s.stockHistory);
  const stockOut = useStore(s => s.stockOut);
  const stockIn = useStore(s => s.stockIn);
  const suppliers = useStore(s => s.suppliers);

  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);

  const [inForm, setInForm] = useState({ materialId: '', quantity: '', price: '', date: new Date().toISOString().split('T')[0], supplierId: '', notes: '' });
  const [outForm, setOutForm] = useState({ materialId: '', quantity: '', category: '', date: new Date().toISOString().split('T')[0], notes: '', reason: '' });

  const handleStockIn = async (e) => {
    e.preventDefault();
    await stockIn(inForm.materialId, Number(inForm.quantity), Number(inForm.price), inForm.date, inForm.notes);
    setIsStockInOpen(false);
    setInForm({ materialId: '', quantity: '', price: '', date: new Date().toISOString().split('T')[0], supplierId: '', notes: '' });
  };

  const handleStockOut = async (e) => {
    e.preventDefault();
    const notes = outForm.category === 'Others' ? outForm.reason : outForm.notes;
    await stockOut(outForm.materialId, Number(outForm.quantity), outForm.category, outForm.date, notes);
    setIsStockOutOpen(false);
    setOutForm({ materialId: '', quantity: '', category: '', date: new Date().toISOString().split('T')[0], notes: '', reason: '' });
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Stock Movement</h1>
        <div className="flex gap-3">
          <button className="btn btn-outline" onClick={() => setIsStockOutOpen(true)}>
            <ArrowUpFromLine size={16} style={{ marginRight: 6 }} /> Stock Out
          </button>
          <button className="btn btn-primary" onClick={() => setIsStockInOpen(true)}>
            <ArrowDownToLine size={16} style={{ marginRight: 6 }} /> Stock In
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Material</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Referensi</th>
                <th style={{ textAlign: 'right' }}>Qty In</th>
                <th style={{ textAlign: 'right' }}>Qty Out</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {stockHistory.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>Belum ada riwayat pergerakan stok.</td></tr>
              )}
              {stockHistory.map(h => {
                const mat = materials.find(m => m.id === h.materialId);
                return (
                  <tr key={h.id}>
                    <td className="text-sm">{h.date}</td>
                    <td className="font-medium">{mat?.name || h.materialId}</td>
                    <td>
                      <span className={`badge ${h.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>{h.type}</span>
                    </td>
                    <td className="text-sm text-gray-500">{h.category}</td>
                    <td className="text-sm text-gray-500">{h.reference || '-'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>{Number(h.qtyIn) > 0 ? `+${h.qtyIn}` : '-'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontWeight: 600 }}>{Number(h.qtyOut) > 0 ? `-${h.qtyOut}` : '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{h.balance} {mat?.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock In Modal */}
      <Modal isOpen={isStockInOpen} onClose={() => setIsStockInOpen(false)} title="Stock In">
        <form onSubmit={handleStockIn}>
          <div className="modal-body flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Material</label>
              <select className="form-control" required value={inForm.materialId} onChange={e => {
                const mat = materials.find(m => m.id === e.target.value);
                setInForm({ ...inForm, materialId: e.target.value, price: mat?.latestPrice || '' });
              }}>
                <option value="">Pilih material...</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Jumlah</label>
                <input type="number" className="form-control" required min="0.01" step="0.01" value={inForm.quantity} onChange={e => setInForm({ ...inForm, quantity: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Harga Beli (Rp)</label>
                <input type="number" className="form-control" required min="0" value={inForm.price} onChange={e => setInForm({ ...inForm, price: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Tanggal</label>
                <input type="date" className="form-control" required value={inForm.date} onChange={e => setInForm({ ...inForm, date: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Supplier (Opsional)</label>
                <select className="form-control" value={inForm.supplierId} onChange={e => setInForm({ ...inForm, supplierId: e.target.value })}>
                  <option value="">Pilih supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <input type="text" className="form-control" value={inForm.notes} onChange={e => setInForm({ ...inForm, notes: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setIsStockInOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan Stock In</button>
          </div>
        </form>
      </Modal>

      {/* Stock Out Modal */}
      <Modal isOpen={isStockOutOpen} onClose={() => setIsStockOutOpen(false)} title="Stock Out">
        <form onSubmit={handleStockOut}>
          <div className="modal-body flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Material</label>
              <select className="form-control" required value={outForm.materialId} onChange={e => setOutForm({ ...outForm, materialId: e.target.value })}>
                <option value="">Pilih material...</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} (Stok: {m.stock} {m.unit})</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Jumlah</label>
                <input type="number" className="form-control" required min="0.01" step="0.01" value={outForm.quantity} onChange={e => setOutForm({ ...outForm, quantity: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Tanggal</label>
                <input type="date" className="form-control" required value={outForm.date} onChange={e => setOutForm({ ...outForm, date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="form-control" required value={outForm.category} onChange={e => setOutForm({ ...outForm, category: e.target.value })}>
                <option value="">Pilih kategori...</option>
                {STOCK_OUT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {outForm.category === 'Others' && (
              <div className="form-group">
                <label className="form-label">Alasan <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="text" className="form-control" required value={outForm.reason} onChange={e => setOutForm({ ...outForm, reason: e.target.value })} placeholder="Tulis alasan..." />
              </div>
            )}
            {outForm.category !== 'Others' && (
              <div className="form-group">
                <label className="form-label">Catatan</label>
                <input type="text" className="form-control" value={outForm.notes} onChange={e => setOutForm({ ...outForm, notes: e.target.value })} />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setIsStockOutOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan Stock Out</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockMovement;
