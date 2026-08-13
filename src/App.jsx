import React, { Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { useStore } from './store/useStore';
import { useEffect } from 'react';
import { LockKeyhole, Delete } from 'lucide-react';

// Finance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Transactions = React.lazy(() => import('./pages/Finance/Transactions'));
const BankCash = React.lazy(() => import('./pages/Finance/BankCash'));
const Accounting = React.lazy(() => import('./pages/Finance/Accounting'));
const Reports = React.lazy(() => import('./pages/Finance/Reports'));

// Suppliers
const SupplierInvoices = React.lazy(() => import('./pages/Suppliers/SupplierInvoices'));
const Suppliers = React.lazy(() => import('./pages/Suppliers/Suppliers'));

// Inventory
const Materials = React.lazy(() => import('./pages/Inventory/Materials'));
const StockMovement = React.lazy(() => import('./pages/Inventory/StockMovement'));
const Preparations = React.lazy(() => import('./pages/Inventory/Preparations'));
const Recipes = React.lazy(() => import('./pages/Inventory/Recipes'));

// Payroll
const Attendance = React.lazy(() => import('./pages/Payroll/Attendance'));
const FullTimePayroll = React.lazy(() => import('./pages/Payroll/FullTimePayroll'));
const PartTimePayroll = React.lazy(() => import('./pages/Payroll/PartTimePayroll'));
const PayrollHistory = React.lazy(() => import('./pages/Payroll/PayrollHistory'));
const EmployeeSettings = React.lazy(() => import('./pages/Settings/EmployeeSettings'));

const Placeholder = ({ title }) => (
  <div className="page-container">
    <h1 className="page-title">{title}</h1>
    <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-gray-400)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚧</div>
      Halaman ini sedang dalam pengembangan.
    </div>
  </div>
);

const LoginScreen = () => {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const verifyPin = useStore(state => state.verifyPin);
  const fetchState = useStore(state => state.fetchState);

  const submit = async value => {
    if (value.length !== 4 || busy) return;
    setBusy(true); setError('');
    try { await verifyPin(value); await fetchState(); }
    catch (err) { setError(err.message || 'PIN salah.'); setPin(''); }
    finally { setBusy(false); }
  };
  const press = digit => {
    if (pin.length >= 4 || busy) return;
    const next = pin + digit; setPin(next); if (next.length === 4) setTimeout(() => submit(next), 120);
  };
  React.useEffect(() => {
    const onKey = e => { if (/^[0-9]$/.test(e.key)) press(e.key); if (e.key === 'Backspace') setPin(v => v.slice(0, -1)); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });
  return <main className="login-screen">
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-mark"><span>R</span></div>
      <p className="eyebrow">RESTLESS COFFEE & EATERY</p>
      <h1 id="login-title">One Platform</h1>
      <p className="login-copy">Masukkan PIN akun Rayhan atau Iman untuk membuka operasional bisnis.</p>
      <div className="pin-dots" aria-label={`${pin.length} dari 4 digit terisi`}>{[0,1,2,3].map(i => <span key={i} className={i < pin.length ? 'filled' : ''} />)}</div>
      <div className="pin-grid">{['1','2','3','4','5','6','7','8','9'].map(n => <button key={n} type="button" onClick={() => press(n)} disabled={busy}>{n}</button>)}<span/><button type="button" onClick={() => press('0')} disabled={busy}>0</button><button type="button" aria-label="Hapus digit" onClick={() => setPin(v => v.slice(0,-1))} disabled={busy}><Delete size={20}/></button></div>
      <div className={`login-message ${error ? 'error' : ''}`} role="status"><LockKeyhole size={15}/>{busy ? 'Memverifikasi akun…' : error || 'PIN akun tersimpan aman di Apps Script Properties'}</div>
    </section>
  </main>;
};

function App() {
  const fetchState = useStore(state => state.fetchState);
  const loading = useStore(state => state.loading);
  const authenticated = useStore(state => state.authenticated);

  useEffect(() => {
    if (authenticated) fetchState().catch(() => {});
  }, [fetchState, authenticated]);

  if (!authenticated) return <LoginScreen />;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '1rem', background: 'var(--color-gray-50)' }}>
        <div style={{ width: 48, height: 48, border: '4px solid var(--color-gray-200)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div className="font-semibold text-gray-600">Memuat Restless One Platform...</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <HashRouter>
      <Suspense fallback={<div className="route-loader"><span/>Memuat modul…</div>}><Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />

          <Route path="transactions" element={<Transactions />} />
          <Route path="bank-cash" element={<BankCash />} />
          <Route path="accounting" element={<Accounting />} />
          <Route path="reports" element={<Reports />} />

          <Route path="invoices" element={<SupplierInvoices />} />
          <Route path="suppliers" element={<Suppliers />} />

          <Route path="materials" element={<Materials />} />
          <Route path="stock-movement" element={<StockMovement />} />
          <Route path="preparations" element={<Preparations />} />
          <Route path="recipes" element={<Recipes />} />

          <Route path="attendance" element={<Attendance />} />
          <Route path="payroll-full" element={<FullTimePayroll />} />
          <Route path="payroll-part" element={<PartTimePayroll />} />
          <Route path="payroll-history" element={<PayrollHistory />} />

          <Route path="settings" element={<EmployeeSettings />} />
          <Route path="profile" element={<Placeholder title="User Profile" />} />
        </Route>
      </Routes></Suspense>
    </HashRouter>
  );
}

export default App;
