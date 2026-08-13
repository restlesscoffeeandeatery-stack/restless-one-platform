import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#285d43', '#397557', '#56876a', '#71967a', '#8baa8f', '#b2c5b2'];
const Reports = () => {
  const transactions = useStore(s => s.transactions);
  const materials = useStore(s => s.materials);
  const recipes = useStore(s => s.recipes);
  const periods = useMemo(() => [...new Set(transactions.map(row => String(row.date).slice(0, 7)).filter(Boolean))].sort().reverse(), [transactions]);
  const [period, setPeriod] = useState(periods[0] || new Date().toISOString().slice(0, 7));
  const rows = transactions.filter(row => String(row.date).startsWith(period));
  const income = rows.filter(row => row.type === 'Income').reduce((sum, row) => sum + row.amount, 0);
  const expenseRows = rows.filter(row => row.type === 'Expense');
  const expense = expenseRows.reduce((sum, row) => sum + row.amount, 0);
  const categories = Object.entries(expenseRows.reduce((map, row) => ({ ...map, [row.category || 'Tanpa Kategori']: (map[row.category || 'Tanpa Kategori'] || 0) + row.amount }), {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const months = [...new Set(transactions.map(row => String(row.date).slice(0, 7)).filter(Boolean))].sort().slice(-6);
  const cashflow = months.map(month => ({ month, income: transactions.filter(row => row.type === 'Income' && String(row.date).startsWith(month)).reduce((s, r) => s + r.amount, 0), expense: transactions.filter(row => row.type === 'Expense' && String(row.date).startsWith(month)).reduce((s, r) => s + r.amount, 0) }));
  const lowStock = materials.filter(row => row.status !== 'In Stock');

  return <div className="page-container"><div className="flex justify-between items-center mb-6"><div><h1 className="page-title" style={{ margin: 0 }}>Laporan</h1><p className="text-sm text-gray-500 mt-1">Seluruh angka diturunkan dari transaksi real.</p></div><select className="form-control" style={{ width: 'auto' }} value={period} onChange={e => setPeriod(e.target.value)}>{periods.map(key => <option key={key} value={key}>{key}</option>)}</select></div>
    <div className="kpi-grid mb-6">{[['Pendapatan', income], ['Pengeluaran', expense], ['Arus Kas Bersih', income - expense], ['Nilai Persediaan', materials.reduce((s, r) => s + r.stock * r.latestPrice, 0)]].map(([label, value]) => <div key={label} className="card"><div className="text-sm text-gray-500 mb-2">{label}</div><div className="text-xl font-bold">{formatRupiah(value)}</div></div>)}</div>
    <div className="dashboard-grid mb-6"><div className="card"><h3 className="font-semibold mb-4">Pendapatan vs Pengeluaran</h3><ResponsiveContainer width="100%" height={260}><BarChart data={cashflow}><XAxis dataKey="month"/><YAxis tickFormatter={v => `${Math.round(v/1e6)}jt`}/><Tooltip formatter={formatRupiah}/><Bar dataKey="income" fill="#397557"/><Bar dataKey="expense" fill="#9eb49f"/></BarChart></ResponsiveContainer></div><div className="card"><h3 className="font-semibold mb-4">Pengeluaran per Kategori</h3>{categories.length ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={categories} dataKey="value" nameKey="name" outerRadius={85}>{categories.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={formatRupiah}/></PieChart></ResponsiveContainer> : <p className="text-sm text-gray-500">Belum ada pengeluaran pada periode ini.</p>}</div></div>
    <div className="card"><h3 className="font-semibold mb-4">Kontrol Operasional</h3><div className="flex justify-between py-2 border-b"><span>Transaksi periode</span><strong>{rows.length}</strong></div><div className="flex justify-between py-2 border-b"><span>Bahan stok kritis</span><strong>{lowStock.length}</strong></div><div className="flex justify-between py-2"><span>Menu HPP aktif</span><strong>{recipes.length}</strong></div></div>
  </div>;
};
export default Reports;
