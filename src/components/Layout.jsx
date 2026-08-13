import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, Menu, LogOut, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';

const TITLES = {
  '/': 'Dashboard', '/transactions': 'Transaksi', '/bank-cash': 'Bank & Kas', '/accounting': 'Akuntansi',
  '/reports': 'Laporan', '/invoices': 'Invoice Supplier', '/suppliers': 'Supplier', '/materials': 'Bahan Baku',
  '/stock-movement': 'Pergerakan Stok', '/preparations': 'Preparation', '/recipes': 'Resep & Menu',
  '/attendance': 'Data Absensi', '/payroll-full': 'Payroll Full-time', '/payroll-part': 'Payroll Part-time',
  '/payroll-history': 'Riwayat Payroll', '/settings': 'Pengaturan', '/profile': 'Profil Admin'
};

const Layout = () => {
  const [toasts, setToasts] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const logout = useStore(s => s.logout);
  const fetchState = useStore(s => s.fetchState);
  const refreshing = useStore(s => s.refreshing);

  useEffect(() => {
    const handleToast = e => {
      const next = { id: Date.now(), ...e.detail }; setToasts(prev => [...prev, next]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== next.id)), 3500);
    };
    window.addEventListener('toast', handleToast); return () => window.removeEventListener('toast', handleToast);
  }, []);

  return <div className="app-layout">
    <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    {mobileOpen && <button className="sidebar-scrim" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />}
    <div className="main-content">
      <header className="top-header">
        <div className="header-title-wrap">
          <button className="icon-btn menu-btn" aria-label="Buka menu" onClick={() => setMobileOpen(true)}><Menu size={21}/></button>
          <div><span className="header-kicker">RESTLESS ONE PLATFORM</span><h1>{TITLES[location.pathname] || 'One Platform'}</h1></div>
        </div>
        <div className="header-tools">
          <label className="period-control"><span>Periode</span><select defaultValue="2026-08"><option value="2026-08">Agustus 2026</option><option value="2026-07">Juli 2026</option></select></label>
          <label className="header-search"><Search size={17}/><input type="search" placeholder="Cari data…" aria-label="Cari data"/></label>
          <button className="icon-btn" title="Muat ulang data" aria-label="Muat ulang data" onClick={() => fetchState({ silent: true })}><RefreshCw size={19} className={refreshing ? 'spin' : ''}/></button>
          <button className="icon-btn notification-btn" title="Notifikasi" aria-label="Notifikasi"><Bell size={19}/><span/></button>
          <button className="profile-menu" type="button" onClick={logout} title="Log out admin"><span className="user-avatar">RR</span><span className="profile-copy"><strong>Rayhan</strong><small>Owner</small></span><LogOut size={16}/></button>
        </div>
      </header>
      <main className="workspace"><Outlet /></main>
    </div>
    <div className="toast-container" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast ${t.type || ''}`}>{t.message}</div>)}</div>
  </div>;
};

export default Layout;
