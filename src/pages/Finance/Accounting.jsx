import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';

const TABS = ['Rekening', 'Laba Rugi', 'Posisi Keuangan'];
const monthLabel = key => new Date(`${key}-01T12:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

const Accounting = () => {
  const accounts = useStore(s => s.accounts);
  const transactions = useStore(s => s.transactions);
  const materials = useStore(s => s.materials);
  const invoices = useStore(s => s.invoices);
  const [tab, setTab] = useState('Rekening');
  const periods = useMemo(() => [...new Set(transactions.map(row => String(row.date).slice(0, 7)).filter(Boolean))].sort().reverse(), [transactions]);
  const [period, setPeriod] = useState(periods[0] || new Date().toISOString().slice(0, 7));
  const rows = transactions.filter(row => String(row.date).startsWith(period));
  const income = rows.filter(row => row.type === 'Income').reduce((sum, row) => sum + row.amount, 0);
  const expenseRows = rows.filter(row => row.type === 'Expense');
  const expense = expenseRows.reduce((sum, row) => sum + row.amount, 0);
  const byCategory = Object.entries(expenseRows.reduce((map, row) => ({ ...map, [row.category || 'Tanpa Kategori']: (map[row.category || 'Tanpa Kategori'] || 0) + row.amount }), {})).sort((a, b) => b[1] - a[1]);
  const cash = accounts.reduce((sum, row) => sum + row.balance, 0);
  const inventory = materials.reduce((sum, row) => sum + row.stock * row.latestPrice, 0);
  const payables = invoices.filter(row => row.status !== 'Paid').reduce((sum, row) => sum + row.total - row.paid, 0);

  return <div className="page-container">
    <div className="flex justify-between items-center mb-6"><div><h1 className="page-title" style={{ margin: 0 }}>Akuntansi</h1><p className="text-sm text-gray-500 mt-1">Dihitung langsung dari transaksi, rekening, invoice, dan persediaan.</p></div><select className="form-control" style={{ width: 'auto' }} value={period} onChange={e => setPeriod(e.target.value)}>{periods.map(key => <option key={key} value={key}>{monthLabel(key)}</option>)}</select></div>
    <div className="flex gap-0 mb-6 border-b" style={{ borderColor: 'var(--color-gray-200)' }}>{TABS.map(item => <button key={item} onClick={() => setTab(item)} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: tab === item ? '2px solid var(--color-primary)' : '2px solid transparent', fontWeight: tab === item ? 700 : 400, color: tab === item ? 'var(--color-primary)' : 'var(--color-gray-500)' }}>{item}</button>)}</div>
    {tab === 'Rekening' && <div className="card"><table className="table"><thead><tr><th>Rekening</th><th>Jenis</th><th style={{ textAlign: 'right' }}>Saldo Real</th></tr></thead><tbody>{accounts.map(account => <tr key={account.id}><td className="font-semibold">{account.name}<div className="text-xs text-gray-500">{account.id}</div></td><td>{account.type}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(account.balance)}</td></tr>)}</tbody></table></div>}
    {tab === 'Laba Rugi' && <div className="card" style={{ maxWidth: 820 }}><h2 className="text-xl font-semibold mb-1">Laba Rugi · {monthLabel(period)}</h2><p className="text-sm text-gray-500 mb-6">{rows.length} transaksi pada periode ini</p><div className="flex justify-between py-3 border-b"><span>Pendapatan</span><strong style={{ color: 'var(--color-success)' }}>{formatRupiah(income)}</strong></div>{byCategory.map(([name, value]) => <div key={name} className="flex justify-between py-2 border-b"><span className="text-sm text-gray-600">{name}</span><span>-{formatRupiah(value)}</span></div>)}<div className="flex justify-between py-3 border-b"><strong>Total Pengeluaran</strong><strong style={{ color: 'var(--color-danger)' }}>-{formatRupiah(expense)}</strong></div><div className="flex justify-between p-4 mt-4" style={{ background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}><strong>Laba / (Rugi) Bersih</strong><strong style={{ color: income - expense >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatRupiah(income - expense)}</strong></div></div>}
    {tab === 'Posisi Keuangan' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '1.5rem' }}><div className="card"><h3 className="font-semibold mb-4">Aset Operasional</h3><div className="flex justify-between py-2 border-b"><span>Kas & Bank</span><strong>{formatRupiah(cash)}</strong></div><div className="flex justify-between py-2 border-b"><span>Persediaan bahan</span><strong>{formatRupiah(inventory)}</strong></div><div className="flex justify-between py-3"><strong>Total aset terukur</strong><strong>{formatRupiah(cash + inventory)}</strong></div></div><div className="card"><h3 className="font-semibold mb-4">Kewajiban Supplier</h3><div className="flex justify-between py-2 border-b"><span>Invoice belum dibayar</span><strong>{formatRupiah(payables)}</strong></div><div className="flex justify-between py-3"><strong>Aset neto operasional</strong><strong>{formatRupiah(cash + inventory - payables)}</strong></div><p className="text-xs text-gray-500 mt-4">Belum memasukkan aset tetap/modal karena sheet master tidak memiliki buku besar akun tersebut.</p></div></div>}
  </div>;
};

export default Accounting;
