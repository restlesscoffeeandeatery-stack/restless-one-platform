import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { Plus, Edit2 } from 'lucide-react';
import Modal from '../../components/Modal';

const Materials = () => {
  const materials = useStore(state => state.materials);
  const updateMaterialPrice = useStore(state => state.updateMaterialPrice);

  const [isEditPriceModalOpen, setIsEditPriceModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [newPrice, setNewPrice] = useState('');

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

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Raw Materials</h1>
        <button className="btn btn-primary">
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
                    <a href="#" style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 500 }}>View Details</a>
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
    </div>
  );
};

export default Materials;
