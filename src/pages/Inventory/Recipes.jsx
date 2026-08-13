import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah, formatPercentage } from '../../utils/format';
import { getRecipeHPP } from '../../store/derivedState';
import Modal from '../../components/Modal';

const Recipes = () => {
  const recipes = useStore(state => state.recipes);
  const materials = useStore(state => state.materials);
  const preparations = useStore(state => state.preparations);
  const loadRecipeDetail = useStore(state => state.loadRecipeDetail);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const openDetail = async recipe => {
    setSelected(recipe); setLoading(true);
    try { const ingredients = recipe.detailLoaded ? recipe.ingredients : await loadRecipeDetail(recipe.id); setSelected({ ...recipe, ingredients }); }
    catch (error) { useStore.getState().addToast(error.message, 'error'); }
    finally { setLoading(false); }
  };
  return <div className="page-container"><div className="flex justify-between items-center mb-6"><div><h1 className="page-title" style={{ margin: 0 }}>Resep / Menu</h1><p className="text-sm text-gray-500 mt-1">HPP dan komposisi dari sheet resep aktif.</p></div></div><div className="card"><div className="table-wrapper"><table className="table"><thead><tr><th>Menu</th><th>Kategori</th><th>Harga Jual</th><th>HPP</th><th>Food Cost</th><th>Margin</th><th>Aksi</th></tr></thead><tbody>{recipes.map(recipe => { const hpp=getRecipeHPP(recipe,materials,preparations),food=recipe.sellingPrice?hpp/recipe.sellingPrice*100:0,margin=recipe.sellingPrice?(recipe.sellingPrice-hpp)/recipe.sellingPrice*100:0; return <tr key={recipe.id}><td className="font-medium">{recipe.name}</td><td>{recipe.category}</td><td>{formatRupiah(recipe.sellingPrice)}</td><td className="font-semibold">{formatRupiah(hpp)}</td><td>{formatPercentage(food)}</td><td>{formatPercentage(margin)}</td><td><button type="button" className="link-btn" onClick={() => openDetail(recipe)}>View Details</button></td></tr>; })}</tbody></table></div></div>
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={`Recipe · ${selected?.name || ''}`}><div className="modal-body">{loading ? <p role="status">Memuat komposisi…</p> : <div className="table-wrapper"><table className="table"><thead><tr><th>Bahan</th><th>Jumlah</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>{(selected?.ingredients || []).map((item,index) => <tr key={`${item.id}-${index}`}><td className="font-medium">{item.name || materials.find(row => row.id === item.id)?.name || item.id}</td><td>{item.quantity} {item.unit}</td><td>{formatRupiah(item.price)}</td><td>{formatRupiah(item.subtotal || item.quantity*item.price)}</td></tr>)}</tbody></table></div>}</div><div className="modal-footer"><button className="btn btn-primary" onClick={() => setSelected(null)}>Tutup</button></div></Modal>
  </div>;
};
export default Recipes;
