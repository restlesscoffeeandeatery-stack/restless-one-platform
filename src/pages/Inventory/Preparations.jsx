import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { getPreparationCost } from '../../store/derivedState';
import { Plus, ChevronDown, ChevronUp, Search } from 'lucide-react';
import Modal from '../../components/Modal';

const Preparations = () => {
  const preparations = useStore(s => s.preparations);
  const materials = useStore(s => s.materials);
  const loadPreparationDetail = useStore(s => s.loadPreparationDetail);
  const savePreparation = useStore(s => s.savePreparation);
  const [expanded, setExpanded] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('Semua');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [form, setForm] = useState({ name: '', unit: 'ml', yield: '', ingredients: [{ id: '', type: 'RAW_MATERIAL', quantity: '', unit: '' }] });

  const units = useMemo(() => [...new Set(preparations.map(prep => prep.unit).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')), [preparations]);
  const visiblePreparations = useMemo(() => preparations.map(prep => {
    const totalCost = getPreparationCost(prep, materials, preparations);
    return { ...prep, totalCost, costPerUnit: prep.yield > 0 ? totalCost / prep.yield : 0 };
  }).filter(prep => {
    const matchesSearch = String(prep.name || '').toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (unitFilter === 'Semua' || prep.unit === unitFilter);
  }).sort((left, right) => {
    const a = left[sortKey]; const b = right[sortKey];
    const comparison = typeof a === 'number' || typeof b === 'number'
      ? Number(a || 0) - Number(b || 0)
      : String(a || '').localeCompare(String(b || ''), 'id', { sensitivity: 'base' });
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [preparations, materials, search, unitFilter, sortKey, sortDirection]);

  const addIngredient = () => setForm({ ...form, ingredients: [...form.ingredients, { id: '', type: 'RAW_MATERIAL', quantity: '', unit: '' }] });
  const removeIngredient = (i) => setForm({ ...form, ingredients: form.ingredients.filter((_, idx) => idx !== i) });

  const handleIngChange = (i, field, val) => {
    const newIngs = [...form.ingredients];
    newIngs[i][field] = val;
    if (field === 'id' && newIngs[i].type === 'RAW_MATERIAL') {
      const mat = materials.find(m => m.id === val);
      if (mat) newIngs[i].unit = mat.unit;
    }
    setForm({ ...form, ingredients: newIngs });
  };
  const toggleDetail = async prep => {
    if (expanded === prep.id) return setExpanded(null);
    setExpanded(prep.id);
    if (!prep.detailLoaded) try { await loadPreparationDetail(prep.id); } catch (error) { useStore.getState().addToast(error.message, 'error'); }
  };
  const handleSave = async () => {
    try { await savePreparation(form); setIsModalOpen(false); setForm({ name: '', unit: 'ml', yield: '', ingredients: [{ id: '', type: 'RAW_MATERIAL', quantity: '', unit: '' }] }); }
    catch (error) { useStore.getState().addToast(error.message, 'error'); }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Preparations</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} style={{ marginRight: 6 }} /> Create Preparation
        </button>
      </div>

      <section className="card mb-4" aria-label="Filter dan urutan preparation">
        <div className="flex gap-4 items-end" style={{ flexWrap: 'wrap' }}>
          <div className="form-group mb-0" style={{ flex: '1 1 240px' }}><label className="form-label" htmlFor="prep-search">Cari Preparation</label><div style={{ position: 'relative' }}><Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 11, top: 12, color: 'var(--color-gray-400)' }}/><input id="prep-search" type="search" className="form-control" style={{ paddingLeft: 34 }} placeholder="Cari nama…" value={search} onChange={event => setSearch(event.target.value)}/></div></div>
          <div className="form-group mb-0" style={{ flex: '1 1 150px' }}><label className="form-label" htmlFor="prep-unit-filter">Unit</label><select id="prep-unit-filter" className="form-control" value={unitFilter} onChange={event => setUnitFilter(event.target.value)}><option>Semua</option>{units.map(unit => <option key={unit}>{unit}</option>)}</select></div>
          <div className="form-group mb-0" style={{ flex: '1 1 190px' }}><label className="form-label" htmlFor="prep-sort">Urutkan Berdasarkan</label><select id="prep-sort" className="form-control" value={sortKey} onChange={event => setSortKey(event.target.value)}><option value="name">Preparation</option><option value="unit">Unit</option><option value="yield">Yield</option><option value="totalCost">Total Biaya / HPP</option><option value="costPerUnit">Biaya per Unit</option></select></div>
          <div className="form-group mb-0" style={{ flex: '1 1 150px' }}><label className="form-label" htmlFor="prep-sort-direction">Arah Urutan</label><select id="prep-sort-direction" className="form-control" value={sortDirection} onChange={event => setSortDirection(event.target.value)}><option value="asc">Kecil → Besar / A–Z</option><option value="desc">Besar → Kecil / Z–A</option></select></div>
        </div>
        <div className="text-xs text-gray-500 mt-2" role="status">Menampilkan {visiblePreparations.length} dari {preparations.length} preparation.</div>
      </section>

      <div className="flex-col gap-4" style={{ display: 'flex', gap: '1rem' }}>
        {visiblePreparations.map(prep => {
          const cost = prep.totalCost;
          const costPerUnit = prep.costPerUnit;
          const isExpanded = expanded === prep.id;

          return (
            <div key={prep.id} className="card">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleDetail(prep)} style={{ cursor: 'pointer' }}>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-semibold text-base">{prep.name}</div>
                    <div className="text-sm text-gray-500">Yield: {prep.yield} {prep.unit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total Biaya</div>
                    <div className="font-bold text-primary" style={{ color: 'var(--color-primary)' }}>{formatRupiah(Math.round(cost))}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Biaya / {prep.unit}</div>
                    <div className="font-semibold">{formatRupiah(Math.round(costPerUnit))}</div>
                  </div>
                  <button className="icon-btn">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-gray-100)' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Bahan</th>
                        <th>Tipe</th>
                        <th>Jumlah</th>
                        <th>Harga Terkini</th>
                        <th style={{ textAlign: 'right' }}>Biaya</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prep.ingredients?.map((ing, i) => {
                        const mat = materials.find(m => m.id === ing.id);
                        const subPrep = preparations.find(p => p.id === ing.id);
                        const name = mat?.name || subPrep?.name || ing.id;
                        const price = mat ? mat.latestPrice : (subPrep ? getPreparationCost(subPrep, materials, preparations) / subPrep.yield : 0);
                        const lineCost = price * ing.quantity;
                        return (
                          <tr key={i}>
                            <td className="font-medium">{name}</td>
                            <td><span className={`badge ${ing.type === 'RAW_MATERIAL' ? 'badge-primary' : 'badge-warning'}`}>{ing.type}</span></td>
                            <td>{ing.quantity} {ing.unit}</td>
                            <td>{formatRupiah(Math.round(price))}/{ing.unit}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(Math.round(lineCost))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {visiblePreparations.length === 0 && <div className="card empty-state" role="status">Preparation tidak ditemukan untuk filter yang dipilih.</div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Preparation">
        <div className="modal-body">
          <p className="text-sm text-gray-500 mb-4">Fitur ini akan menambahkan preparation ke database spreadsheet Anda.</p>
          <div className="flex gap-4 mb-4">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Nama Preparation</label>
              <input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Unit</label>
              <input type="text" className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Yield</label>
              <input type="number" className="form-control" value={form.yield} onChange={e => setForm({ ...form, yield: e.target.value })} />
            </div>
          </div>
          <h4 className="font-semibold mb-3">Bahan-bahan</h4>
          {form.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <select className="form-control" style={{ flex: 2 }} value={ing.id} onChange={e => handleIngChange(i, 'id', e.target.value)}>
                <option value="">Pilih bahan...</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="number" className="form-control" placeholder="Qty" style={{ flex: 1 }} value={ing.quantity} onChange={e => handleIngChange(i, 'quantity', e.target.value)} />
              <input type="text" className="form-control" placeholder="Unit" style={{ flex: 1 }} value={ing.unit} onChange={e => handleIngChange(i, 'unit', e.target.value)} />
              <button type="button" className="btn btn-outline text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => removeIngredient(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-outline text-xs mt-2" onClick={addIngredient}>+ Tambah Bahan</button>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" disabled={!form.name || !form.yield} onClick={handleSave}>Simpan Preparation</button>
        </div>
      </Modal>
    </div>
  );
};

export default Preparations;
