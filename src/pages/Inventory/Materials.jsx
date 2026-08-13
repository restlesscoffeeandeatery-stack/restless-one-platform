import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { Plus, Edit2 } from 'lucide-react';
import Modal from '../../components/Modal';

const Materials = () => {
  const materials = useStore(state => state.materials);
  const updateMaterialPrice = useStore(state => state.updateMaterialPrice);
  const addMaterial = useStore(state => state.addMaterial);
  const stockHistory = useStore(state => state.stockHistory);

  const [isEditPriceModalOpen, setIsEditPriceModalOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailMaterial, setDetailMaterial] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [form, setForm] = useState({ name: '', category: '', unit: 'gram', price: '', openingStock: '', date: new Date().toISOString().slice(0, 10) });

  const getStatusBadge = (status) => {
    if (status === 'In Stock') return <span className="badge badge-success">In Stock</span>;
    if (status === 'Low Stock') return <span className="badge badge-warning">Low Stock</span>;
    if (status === 'Out of Stock') return <span className="badge badge-danger">Out of Stock</span>;
    return <span className="badge badge-gray">{status}</span>;
  };

  const openEditPrice = (mat) => {
    setSelectedMaterial(mat);
    setNewPrice(mat.latestPrice);
    setIsEditPriceModalOpen(true);
  };

  const handleUpdatePrice = (e) => {
    e.preventDefault();
    updateMaterialPrice(selectedMaterial.id, Number(newPrice));
    setIsEditPriceModalOpen(false);
  };

  const handleAdd = async e => {
    e.preventDefault();
    try { await addMaterial(form); setIsAddOpen(false); setForm({ name: '', category: '', unit: 'gram', price: '', openingStock: '', date: new Date().toISOString().slice(0, 10) }); }
    catch (error) { useStore.getState().addToast(error.message, 'error'); }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Raw Materials</h1>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} className="mr-2" style={{ marginRight: '0.5rem' }} />
          Add Material
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Unit</th>
                <th>Latest Purchase Price</th>
                <th>Inventory Value</th>
                <th>Stock Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(mat => (
                <tr key={mat.id}>
                  <td className="font-medium">{mat.name}</td>
                  <td>{mat.category}</td>
                  <td className="font-semibold">{mat.stock}</td>
                  <td>{mat.unit}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {formatRupiah(mat.latestPrice)}
                      <button className="icon-btn" style={{ padding: '2px' }} onClick={() => openEditPrice(mat)}>
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </td>
                  <td>{formatRupiah(mat.stock * mat.latestPrice)}</td>
                  <td>{getStatusBadge(mat.status)}</td>
                  <td>
                    <button type="button" className="link-btn" onClick={() => setDetailMaterial(mat)}>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Price Modal (Demo Flow D) */}
      <Modal isOpen={isEditPriceModalOpen} onClose={() => setIsEditPriceModalOpen(false)} title="Update Latest Price">
        <form onSubmit={handleUpdatePrice}>
          <div className="modal-body flex-col gap-4">
            <div className="p-4 bg-gray-50 rounded-lg mb-4 text-sm text-gray-700" style={{ backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
              <strong>Demo Note:</strong> Changing this price will automatically recalculate the HPP of all affected Preparations and Recipes.
            </div>
            <div className="form-group">
              <label className="form-label">Material</label>
              <input type="text" className="form-control" value={selectedMaterial?.name || ''} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">New Latest Purchase Price (Rp) / {selectedMaterial?.unit}</label>
              <input type="number" className="form-control" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setIsEditPriceModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Update Price</button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Material">
        <form onSubmit={handleAdd}><div className="modal-body flex-col gap-4"><div className="form-group"><label className="form-label">Nama material</label><input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></div><div className="flex gap-4"><div className="form-group flex-1"><label className="form-label">Kategori</label><input className="form-control" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}/></div><div className="form-group flex-1"><label className="form-label">Satuan</label><input className="form-control" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}/></div></div><div className="flex gap-4"><div className="form-group flex-1"><label className="form-label">Harga awal</label><input type="number" min="0" className="form-control" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}/></div><div className="form-group flex-1"><label className="form-label">Stok awal</label><input type="number" min="0" step="0.01" className="form-control" value={form.openingStock} onChange={e => setForm({ ...form, openingStock: e.target.value })}/></div></div></div><div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setIsAddOpen(false)}>Batal</button><button className="btn btn-primary">Simpan Material</button></div></form>
      </Modal>
      <Modal isOpen={Boolean(detailMaterial)} onClose={() => setDetailMaterial(null)} title={`Riwayat Stok · ${detailMaterial?.name || ''}`}>
        <div className="modal-body"><div className="table-wrapper"><table className="table"><thead><tr><th>Tanggal</th><th>Tipe</th><th>Jumlah</th><th>Harga</th><th>Catatan</th></tr></thead><tbody>{stockHistory.filter(row => row.materialId === detailMaterial?.id).map(row => <tr key={row.id}><td>{row.date}</td><td><span className={`badge ${row.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>{row.type}</span></td><td>{row.qtyIn || row.qtyOut} {detailMaterial?.unit}</td><td>{formatRupiah(row.price || 0)}</td><td>{row.reference || row.category || '—'}</td></tr>)}{stockHistory.filter(row => row.materialId === detailMaterial?.id).length === 0 && <tr><td colSpan="5" className="text-gray-500" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada histori stok.</td></tr>}</tbody></table></div></div><div className="modal-footer"><button className="btn btn-primary" onClick={() => setDetailMaterial(null)}>Tutup</button></div>
      </Modal>
    </div>
  );
};

export default Materials;
