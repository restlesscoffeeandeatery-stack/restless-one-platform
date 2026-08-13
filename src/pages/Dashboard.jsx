import React from 'react';
import { useStore } from '../store/useStore';
import { formatRupiah } from '../utils/format';
import { getRecipeHPP } from '../store/derivedState';
import { Wallet, TrendingUp, TrendingDown, HandCoins, ReceiptText, Boxes, CookingPot, BadgeDollarSign, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const KPI = ({ title, value, note, icon: Icon, tone = 'green' }) => <article className={`kpi-card tone-${tone}`}>
  <div className="kpi-head"><span>{title}</span><i><Icon size={17}/></i></div><strong>{value}</strong>{note && <small>{note}</small>}
</article>;

const Dashboard = () => {
  const accounts = useStore(s => s.accounts), transactions = useStore(s => s.transactions), invoices = useStore(s => s.invoices);
  const materials = useStore(s => s.materials), recipes = useStore(s => s.recipes), preparations = useStore(s => s.preparations);
  const payroll = useStore(s => s.payrollHistory), refreshing = useStore(s => s.refreshing), error = useStore(s => s.error);
  const totalCash = accounts.reduce((s,a) => s + a.balance, 0);
  const income = transactions.filter(t => t.type === 'Income').reduce((s,t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'Expense').reduce((s,t) => s + t.amount, 0);
  const payables = invoices.filter(i => i.status !== 'Paid').reduce((s,i) => s + i.total - i.paid, 0);
  const inventory = materials.reduce((s,m) => s + m.stock * m.latestPrice, 0);
  const avgHpp = recipes.length ? recipes.reduce((s,r) => s + getRecipeHPP(r, materials, preparations), 0) / recipes.length : 0;
  const upcomingPayroll = payroll.find(p => p.status !== 'Paid')?.totalAmount || 0;
  const monthNames = ['Mar','Apr','Mei','Jun','Jul','Agu'];
  const chart = monthNames.map((month,index) => {
    const monthNo = index + 3, rows = transactions.filter(t => new Date(`${t.date}T00:00:00`).getMonth() + 1 === monthNo);
    return { month, income: rows.filter(t => t.type === 'Income').reduce((s,t) => s+t.amount,0), expense: rows.filter(t => t.type === 'Expense').reduce((s,t) => s+t.amount,0) };
  });
  const activeInvoices = invoices.filter(i => i.status !== 'Paid').slice(0,6), lowStock = materials.filter(m => m.status !== 'In Stock').slice(0,5);

  return <div className="page-container dashboard-page">
    <div className="page-heading"><div><p className="eyebrow">EXECUTIVE OVERVIEW</p><h2>Selamat datang kembali, Rayhan</h2><p>Ringkasan operasional dan kondisi bisnis Restless hari ini.</p></div><span className={`live-pill ${error ? 'error' : ''}`}><i/>{error ? 'Data cache' : refreshing ? 'Memperbarui data' : 'Data terhubung'}</span></div>
    <section className="kpi-grid">
      <KPI title="Total Kas & Bank" value={formatRupiah(totalCash)} icon={Wallet}/><KPI title="Pemasukan" value={formatRupiah(income)} icon={TrendingUp} tone="mint"/>
      <KPI title="Pengeluaran" value={formatRupiah(expense)} icon={TrendingDown} tone="sage"/><KPI title="Laba Bersih" value={formatRupiah(income-expense)} icon={HandCoins} tone="forest"/>
      <KPI title="Hutang Supplier" value={formatRupiah(payables)} note={`${activeInvoices.length} invoice aktif`} icon={ReceiptText} tone="olive"/>
      <KPI title="Nilai Inventory" value={formatRupiah(inventory)} icon={Boxes} tone="mint"/><KPI title="Rata-rata HPP Menu" value={formatRupiah(avgHpp)} icon={CookingPot} tone="sage"/>
      <KPI title="Payroll Berikutnya" value={formatRupiah(upcomingPayroll)} note="Menunggu periode berikutnya" icon={BadgeDollarSign} tone="forest"/>
    </section>
    <section className="dashboard-grid wide-left">
      <article className="card chart-card"><div className="card-heading"><div><p className="eyebrow">ARUS KAS</p><h3>Pemasukan vs Pengeluaran</h3></div><span className="legend"><i className="income"/>Pemasukan <i className="expense"/>Pengeluaran</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f8f70" stopOpacity=".28"/><stop offset="1" stopColor="#4f8f70" stopOpacity="0"/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9eb49f" stopOpacity=".3"/><stop offset="1" stopColor="#9eb49f" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#e7eee9" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000000)}jt`}/><Tooltip formatter={v => formatRupiah(v)}/><Area type="monotone" dataKey="income" stroke="#397557" strokeWidth={2.5} fill="url(#incomeFill)"/><Area type="monotone" dataKey="expense" stroke="#8aa18d" strokeWidth={2.5} fill="url(#expenseFill)"/></AreaChart></ResponsiveContainer></div></article>
      <article className="card"><div className="card-heading"><div><p className="eyebrow">POSISI DANA</p><h3>Kas & Rekening</h3></div></div><div className="account-list">{accounts.slice(0,6).map((a,i) => <div key={a.id}><span className={`account-dot dot-${i%4}`}/><div><strong>{a.name}</strong><small>{a.type}</small></div><b>{formatRupiah(a.balance)}</b></div>)}</div></article>
    </section>
    <section className="dashboard-grid equal">
      <article className="card"><div className="card-heading"><div><p className="eyebrow">JATUH TEMPO</p><h3>Invoice Supplier</h3></div><a href="#/invoices">Lihat semua <ArrowUpRight size={14}/></a></div><div className="compact-table"><table><thead><tr><th>Supplier</th><th>Jatuh tempo</th><th>Sisa</th><th>Status</th></tr></thead><tbody>{activeInvoices.map(i => <tr key={i.id}><td><strong>{i.supplierName}</strong><small>{i.invoiceNo}</small></td><td>{i.dueDate}</td><td>{formatRupiah(i.total-i.paid)}</td><td><span className={`badge ${i.status==='Overdue'?'badge-danger':'badge-warning'}`}>{i.status}</span></td></tr>)}</tbody></table>{!activeInvoices.length && <div className="empty-state">Tidak ada invoice aktif.</div>}</div></article>
      <article className="card"><div className="card-heading"><div><p className="eyebrow">PERLU TINDAKAN</p><h3>Peringatan Inventory</h3></div><a href="#/materials">Buka inventory <ArrowUpRight size={14}/></a></div><div className="alert-list">{lowStock.map(m => <div key={m.id}><span className="alert-icon"><AlertTriangle size={16}/></span><div><strong>{m.name}</strong><small>{m.category} · {m.stock} {m.unit}</small></div><span className={`badge ${m.status==='Out of Stock'?'badge-danger':'badge-warning'}`}>{m.status}</span></div>)}{!lowStock.length && <div className="empty-state">Semua stok dalam kondisi aman.</div>}</div></article>
    </section>
  </div>;
};

export default Dashboard;
