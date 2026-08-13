import React from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { getRecipeHPP } from '../../store/derivedState';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const cashflowData = [
  { month: 'Mar', income: 98000000, expense: 67000000 },
  { month: 'Apr', income: 104000000, expense: 71000000 },
  { month: 'Mei', income: 112000000, expense: 75000000 },
  { month: 'Jun', income: 108000000, expense: 73000000 },
  { month: 'Jul', income: 119000000, expense: 78000000 },
  { month: 'Agu', income: 126400000, expense: 82750000 },
];
const expenseCategories = [
  { name: 'Gaji', value: 29500000 },
  { name: 'Bahan Baku', value: 4500000 },
  { name: 'Sewa', value: 3000000 },
  { name: 'Listrik', value: 1500000 },
  { name: 'Marketing', value: 1050000 },
  { name: 'Lain-lain', value: 500000 },
];
const PIE_COLORS = ['#285d43', '#397557', '#56876a', '#71967a', '#8baa8f', '#b2c5b2'];

const Reports = () => {
  const materials = useStore(s => s.materials);
  const recipes = useStore(s => s.recipes);
  const preparations = useStore(s => s.preparations);

  const totalIncome = 126400000;
  const totalExpense = 82750000;
  const netProfit = totalIncome - totalExpense;
  const avgHPP = recipes.length
    ? recipes.reduce((acc, r) => acc + getRecipeHPP(r, materials, preparations), 0) / recipes.length
    : 0;

  const lowStock = materials.filter(m => m.status === 'Low Stock' || m.status === 'Out of Stock');

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Reports</h1>
        <select className="form-control" style={{ width: 'auto' }}>
          <option>August 2026</option>
          <option>July 2026</option>
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Pendapatan', value: formatRupiah(totalIncome), color: 'var(--color-success)' },
          { label: 'Total Pengeluaran', value: formatRupiah(totalExpense), color: 'var(--color-danger)' },
          { label: 'Laba Bersih', value: formatRupiah(netProfit), color: 'var(--color-primary)' },
          { label: 'Rata-rata HPP Menu', value: formatRupiah(Math.round(avgHPP)), color: 'var(--color-warning)' },
        ].map(k => (
          <div key={k.label} className="card">
            <div className="text-sm text-gray-500 mb-2">{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 className="font-semibold mb-4">Cashflow — Pendapatan vs Pengeluaran</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cashflowData} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `${(v/1000000).toFixed(0)}jt`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatRupiah(v)} />
              <Legend />
              <Bar dataKey="income" name="Pendapatan" fill="#397557" radius={[4,4,0,0]} />
              <Bar dataKey="expense" name="Pengeluaran" fill="#9eb49f" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Breakdown Pengeluaran</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={expenseCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {expenseCategories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => formatRupiah(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Alerts */}
      {lowStock.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">⚠️ Peringatan Stok</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {lowStock.map(m => (
              <div key={m.id} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${m.status === 'Out of Stock' ? 'var(--color-danger)' : 'var(--color-warning)'}`, backgroundColor: m.status === 'Out of Stock' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)' }}>
                <div className="font-semibold">{m.name}</div>
                <div className="text-sm" style={{ color: m.status === 'Out of Stock' ? 'var(--color-danger)' : 'var(--color-warning)' }}>{m.status}</div>
                <div className="text-sm mt-1">Stok: {m.stock} {m.unit}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HPP Summary Table */}
      <div className="card">
        <h3 className="font-semibold mb-4">Ringkasan HPP Menu</h3>
        <table className="table">
          <thead><tr><th>Menu</th><th>Harga Jual</th><th>HPP</th><th>Food Cost %</th><th>Margin</th></tr></thead>
          <tbody>
            {recipes.map(r => {
              const hpp = getRecipeHPP(r, materials, preparations);
              const fc = (hpp / r.sellingPrice * 100).toFixed(1);
              const margin = ((r.sellingPrice - hpp) / r.sellingPrice * 100).toFixed(1);
              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td>{formatRupiah(r.sellingPrice)}</td>
                  <td className="font-semibold">{formatRupiah(hpp)}</td>
                  <td><span className={`badge ${Number(fc) > 40 ? 'badge-danger' : 'badge-success'}`}>{fc}%</span></td>
                  <td><span className={`badge ${Number(margin) < 60 ? 'badge-warning' : 'badge-success'}`}>{margin}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
