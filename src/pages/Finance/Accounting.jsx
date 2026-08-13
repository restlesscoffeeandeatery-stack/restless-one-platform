import React, { useState } from 'react';
import { formatRupiah } from '../../utils/format';

const TABS = ['Chart of Accounts', 'Profit & Loss', 'Balance Sheet'];

const COA = [
  { code: '1100', name: 'Kas & Bank', group: 'Assets', balance: 184500000, type: 'Debit' },
  { code: '1200', name: 'Piutang Usaha', group: 'Assets', balance: 0, type: 'Debit' },
  { code: '1300', name: 'Persediaan Bahan Baku', group: 'Assets', balance: 34200000, type: 'Debit' },
  { code: '1400', name: 'Aset Tetap', group: 'Assets', balance: 120000000, type: 'Debit' },
  { code: '2100', name: 'Hutang Usaha (Supplier)', group: 'Liabilities', balance: 28450000, type: 'Credit' },
  { code: '2200', name: 'Hutang Gaji', group: 'Liabilities', balance: 31800000, type: 'Credit' },
  { code: '3100', name: 'Modal Pemilik', group: 'Equity', balance: 235000000, type: 'Credit' },
  { code: '3200', name: 'Laba Ditahan', group: 'Equity', balance: 43650000, type: 'Credit' },
  { code: '4100', name: 'Pendapatan Penjualan', group: 'Revenue', balance: 126400000, type: 'Credit' },
  { code: '5100', name: 'Harga Pokok Penjualan', group: 'COGS', balance: 42700000, type: 'Debit' },
  { code: '6100', name: 'Gaji & Upah', group: 'Expenses', balance: 29500000, type: 'Debit' },
  { code: '6200', name: 'Biaya Bahan Baku', group: 'Expenses', balance: 4500000, type: 'Debit' },
  { code: '6300', name: 'Biaya Sewa', group: 'Expenses', balance: 3000000, type: 'Debit' },
  { code: '6400', name: 'Listrik & Air', group: 'Expenses', balance: 1500000, type: 'Debit' },
  { code: '6500', name: 'Marketing & Promosi', group: 'Expenses', balance: 1050000, type: 'Debit' },
  { code: '6600', name: 'Biaya Lain-lain', group: 'Expenses', balance: 500000, type: 'Debit' },
];

const GROUP_ORDER = ['Assets', 'Liabilities', 'Equity', 'Revenue', 'COGS', 'Expenses'];
const GROUP_COLORS = { Assets: 'primary', Liabilities: 'danger', Equity: 'warning', Revenue: 'success', COGS: 'warning', Expenses: 'danger' };

const Accounting = () => {
  const [tab, setTab] = useState('Chart of Accounts');
  const [period, setPeriod] = useState('Aug 2026');

  const revenue = 126400000;
  const cogs = 42700000;
  const grossProfit = revenue - cogs;
  const opex = 29500000 + 4500000 + 3000000 + 1500000 + 1050000 + 500000;
  const netProfit = grossProfit - opex;

  const totalAssets = 184500000 + 34200000 + 120000000;
  const totalLiabilities = 28450000 + 31800000;
  const totalEquity = 235000000 + 43650000;

  const grouped = GROUP_ORDER.reduce((acc, g) => {
    acc[g] = COA.filter(a => a.group === g);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Accounting</h1>
        <select className="form-control" style={{ width: 'auto' }} value={period} onChange={e => setPeriod(e.target.value)}>
          <option>Aug 2026</option>
          <option>Jul 2026</option>
          <option>Jun 2026</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b" style={{ borderColor: 'var(--color-gray-200)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--color-primary)' : 'var(--color-gray-500)', cursor: 'pointer', transition: 'all .2s' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Chart of Accounts' && (
        <div className="flex-col gap-6" style={{ display: 'flex', gap: '1.5rem' }}>
          {GROUP_ORDER.map(group => (
            <div key={group} className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">{group}</h3>
                <span className={`badge badge-${GROUP_COLORS[group]}`}>{grouped[group]?.length} accounts</span>
              </div>
              <table className="table">
                <thead><tr><th>Kode</th><th>Nama Akun</th><th>Tipe</th><th style={{ textAlign: 'right' }}>Saldo</th></tr></thead>
                <tbody>
                  {grouped[group]?.map(a => (
                    <tr key={a.code}>
                      <td className="font-medium text-primary" style={{ color: 'var(--color-primary)' }}>{a.code}</td>
                      <td>{a.name}</td>
                      <td><span className={`badge badge-${a.type === 'Debit' ? 'primary' : 'success'}`}>{a.type}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {tab === 'Profit & Loss' && (
        <div className="card" style={{ maxWidth: 700 }}>
          <h2 className="text-xl font-semibold mb-1">Laporan Laba Rugi</h2>
          <p className="text-sm text-gray-500 mb-6">Periode: {period}</p>
          {[
            { label: 'Pendapatan Penjualan', value: revenue, bold: false, indent: false },
            { label: 'Harga Pokok Penjualan (COGS)', value: -cogs, bold: false, indent: true },
            { label: 'Laba Kotor', value: grossProfit, bold: true, indent: false, border: true },
            { label: 'Biaya Gaji & Upah', value: -29500000, bold: false, indent: true },
            { label: 'Biaya Bahan Baku', value: -4500000, bold: false, indent: true },
            { label: 'Biaya Sewa', value: -3000000, bold: false, indent: true },
            { label: 'Listrik & Air', value: -1500000, bold: false, indent: true },
            { label: 'Marketing', value: -1050000, bold: false, indent: true },
            { label: 'Lain-lain', value: -500000, bold: false, indent: true },
            { label: 'Total Beban Operasional', value: -opex, bold: true, indent: false, border: true },
            { label: 'LABA BERSIH', value: netProfit, bold: true, indent: false, highlight: true },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: `${row.highlight ? '1rem' : '0.5rem'} ${row.indent ? '1.5rem' : '0'}`, borderTop: row.border ? '1px solid var(--color-gray-200)' : 'none', borderBottom: row.highlight ? '2px solid var(--color-gray-200)' : 'none', backgroundColor: row.highlight ? 'var(--color-gray-50)' : 'transparent', borderRadius: row.highlight ? 'var(--radius-md)' : 0, marginTop: row.border ? '0.5rem' : 0 }}>
              <span style={{ fontWeight: (row.bold || row.highlight) ? 600 : 400, fontSize: row.highlight ? '1rem' : '0.875rem', color: row.indent ? 'var(--color-gray-600)' : 'var(--color-gray-900)' }}>{row.label}</span>
              <span style={{ fontWeight: (row.bold || row.highlight) ? 700 : 400, color: row.value >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: row.highlight ? '1.125rem' : '0.875rem' }}>
                {row.value >= 0 ? '' : '-'}{formatRupiah(Math.abs(row.value))}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Balance Sheet' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 className="font-semibold mb-4">Aset</h3>
            {[['Kas & Bank', 184500000], ['Persediaan', 34200000], ['Aset Tetap', 120000000]].map(([n, v]) => (
              <div key={n} className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-gray-100)' }}>
                <span className="text-sm">{n}</span>
                <span className="font-medium">{formatRupiah(v)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 font-bold text-primary" style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>
              <span>Total Aset</span><span>{formatRupiah(totalAssets)}</span>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4">Kewajiban & Ekuitas</h3>
            {[['Hutang Supplier', 28450000], ['Hutang Gaji', 31800000], ['Modal Pemilik', 235000000], ['Laba Ditahan', 43650000]].map(([n, v]) => (
              <div key={n} className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-gray-100)' }}>
                <span className="text-sm">{n}</span>
                <span className="font-medium">{formatRupiah(v)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 font-bold" style={{ color: 'var(--color-success)', fontSize: '0.95rem' }}>
              <span>Total Liabilitas + Ekuitas</span><span>{formatRupiah(totalLiabilities + totalEquity)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
