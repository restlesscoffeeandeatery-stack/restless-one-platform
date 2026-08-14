import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah, formatPercentage } from '../../utils/format';
import { getRecipeHPP } from '../../store/derivedState';
import Modal from '../../components/Modal';
import { Search } from 'lucide-react';

const Recipes = () => {
  const recipes = useStore(state => state.recipes);
  const materials = useStore(state => state.materials);
  const preparations = useStore(state => state.preparations);
  const loadRecipeDetail = useStore(state => state.loadRecipeDetail);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const categories = useMemo(() => [...new Set(recipes.map(recipe => recipe.category || 'Tanpa Kategori'))].sort((a, b) => a.localeCompare(b, 'id')), [recipes]);
  const visibleRecipes = useMemo(() => recipes.map(recipe => {
    const hpp = getRecipeHPP(recipe, materials, preparations);
    const foodCost = recipe.sellingPrice ? hpp / recipe.sellingPrice * 100 : 0;
    const margin = recipe.sellingPrice ? (recipe.sellingPrice - hpp) / recipe.sellingPrice * 100 : 0;
    return { ...recipe, categoryLabel: recipe.category || 'Tanpa Kategori', hpp, foodCost, margin };
  }).filter(recipe => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || String(recipe.name || '').toLowerCase().includes(query);
    return matchesSearch && (category === 'Semua' || recipe.categoryLabel === category);
  }).sort((left, right) => {
    const field = sortKey === 'category' ? 'categoryLabel' : sortKey;
    const a = left[field]; const b = right[field];
    const comparison = typeof a === 'number' || typeof b === 'number'
      ? Number(a || 0) - Number(b || 0)
      : String(a || '').localeCompare(String(b || ''), 'id', { sensitivity: 'base' });
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [recipes, materials, preparations, search, category, sortKey, sortDirection]);
  const openDetail = async recipe => {
    setSelected(recipe); setLoading(true);
    try { const ingredients = recipe.detailLoaded ? recipe.ingredients : await loadRecipeDetail(recipe.id); setSelected({ ...recipe, ingredients }); }
    catch (error) { useStore.getState().addToast(error.message, 'error'); }
    finally { setLoading(false); }
  };
  return <div className="page-container"><div className="flex justify-between items-center mb-6"><div><h1 className="page-title" style={{ margin: 0 }}>Resep / Menu</h1><p className="text-sm text-gray-500 mt-1">HPP dan komposisi dari sheet resep aktif.</p></div></div>
    <section className="card mb-4" aria-label="Filter dan urutan resep menu"><div className="flex gap-4 items-end" style={{ flexWrap: 'wrap' }}>
      <div className="form-group mb-0" style={{ flex: '1 1 230px' }}><label className="form-label" htmlFor="recipe-search">Menu</label><div style={{ position: 'relative' }}><Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 11, top: 12, color: 'var(--color-gray-400)' }}/><input id="recipe-search" type="search" className="form-control" style={{ paddingLeft: 34 }} placeholder="Cari nama menu…" value={search} onChange={event => setSearch(event.target.value)}/></div></div>
      <div className="form-group mb-0" style={{ flex: '1 1 170px' }}><label className="form-label" htmlFor="recipe-category">Kategori</label><select id="recipe-category" className="form-control" value={category} onChange={event => setCategory(event.target.value)}><option>Semua</option>{categories.map(item => <option key={item}>{item}</option>)}</select></div>
      <div className="form-group mb-0" style={{ flex: '1 1 180px' }}><label className="form-label" htmlFor="recipe-sort">Urutkan Berdasarkan</label><select id="recipe-sort" className="form-control" value={sortKey} onChange={event => setSortKey(event.target.value)}><option value="name">Menu</option><option value="category">Kategori</option><option value="sellingPrice">Harga Jual</option><option value="hpp">HPP</option><option value="foodCost">Food Cost</option><option value="margin">Margin</option></select></div>
      <div className="form-group mb-0" style={{ flex: '1 1 160px' }}><label className="form-label" htmlFor="recipe-sort-direction">Arah Urutan</label><select id="recipe-sort-direction" className="form-control" value={sortDirection} onChange={event => setSortDirection(event.target.value)}><option value="asc">Kecil → Besar / A–Z</option><option value="desc">Besar → Kecil / Z–A</option></select></div>
    </div><div className="text-xs text-gray-500 mt-2" role="status">Menampilkan {visibleRecipes.length} dari {recipes.length} menu.</div></section>
    <div className="card"><div className="table-wrapper"><table className="table"><thead><tr><th>Menu</th><th>Kategori</th><th>Harga Jual</th><th>HPP</th><th>Food Cost</th><th>Margin</th><th>Aksi</th></tr></thead><tbody>{visibleRecipes.map(recipe => <tr key={recipe.id}><td className="font-medium">{recipe.name}</td><td>{recipe.categoryLabel}</td><td>{formatRupiah(recipe.sellingPrice)}</td><td className="font-semibold">{formatRupiah(recipe.hpp)}</td><td>{formatPercentage(recipe.foodCost)}</td><td>{formatPercentage(recipe.margin)}</td><td><button type="button" className="link-btn" onClick={() => openDetail(recipe)}>View Details</button></td></tr>)}{visibleRecipes.length === 0 && <tr><td colSpan="7" className="empty-state">Menu tidak ditemukan untuk filter yang dipilih.</td></tr>}</tbody></table></div></div>
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={`Recipe · ${selected?.name || ''}`}><div className="modal-body">{loading ? <p role="status">Memuat komposisi…</p> : <div className="table-wrapper"><table className="table"><thead><tr><th>Bahan</th><th>Jumlah</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>{(selected?.ingredients || []).map((item,index) => <tr key={`${item.id}-${index}`}><td className="font-medium">{item.name || materials.find(row => row.id === item.id)?.name || item.id}</td><td>{item.quantity} {item.unit}</td><td>{formatRupiah(item.price)}</td><td>{formatRupiah(item.subtotal || item.quantity*item.price)}</td></tr>)}</tbody></table></div>}</div><div className="modal-footer"><button className="btn btn-primary" onClick={() => setSelected(null)}>Tutup</button></div></Modal>
  </div>;
};
export default Recipes;
