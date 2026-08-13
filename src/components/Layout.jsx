import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, Menu, LogOut, RefreshCw, Download, Share, X } from 'lucide-react';
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
  const [installReady, setInstallReady] = useState(Boolean(window.__restlessInstallPrompt));
  const [showInstallGuide, setShowInstallGuide] = useState(false);
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

  useEffect(() => {
    const ready = () => setInstallReady(true);
    const installed = () => { setInstallReady(false); setShowInstallGuide(false); useStore.getState().addToast('Restless One Platform berhasil di-install.'); };
    window.addEventListener('pwa-install-ready', ready);
    window.addEventListener('pwa-installed', installed);
    return () => { window.removeEventListener('pwa-install-ready', ready); window.removeEventListener('pwa-installed', installed); };
  }, []);

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isAndroid = /android/i.test(window.navigator.userAgent);
  const canShowInstall = !isStandalone && (installReady || isIos || isAndroid);
  const installApp = async () => {
    const prompt = window.__restlessInstallPrompt;
    if (!prompt) { setShowInstallGuide(true); return; }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') setInstallReady(false);
    window.__restlessInstallPrompt = null;
  };

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
          {canShowInstall && <button className="btn btn-install" type="button" onClick={installApp}><Download size={16}/>Install App</button>}
          <label className="period-control"><span>Periode</span><select defaultValue="2026-08"><option value="2026-08">Agustus 2026</option><option value="2026-07">Juli 2026</option></select></label>
          <label className="header-search"><Search size={17}/><input type="search" placeholder="Cari data…" aria-label="Cari data"/></label>
          <button className="icon-btn" title="Muat ulang data" aria-label="Muat ulang data" onClick={() => fetchState({ silent: true })}><RefreshCw size={19} className={refreshing ? 'spin' : ''}/></button>
          <button className="icon-btn notification-btn" title="Notifikasi" aria-label="Notifikasi"><Bell size={19}/><span/></button>
          <button className="profile-menu" type="button" onClick={logout} title="Log out manager"><span className="user-avatar">IM</span><span className="profile-copy"><strong>Iman</strong><small>Manager</small></span><LogOut size={16}/></button>
        </div>
      </header>
      <main className="workspace"><Outlet /></main>
    </div>
    <div className="toast-container" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast ${t.type || ''}`}>{t.message}</div>)}</div>
    {showInstallGuide && <div className="pwa-guide-backdrop" role="presentation" onMouseDown={() => setShowInstallGuide(false)}>
      <section className="pwa-guide" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title" onMouseDown={event => event.stopPropagation()}>
        <button type="button" className="icon-btn pwa-guide-close" aria-label="Tutup petunjuk install" onClick={() => setShowInstallGuide(false)}><X size={20}/></button>
        <div className="pwa-guide-icon"><Download size={24}/></div>
        <h2 id="pwa-guide-title">Install Restless</h2>
        {isAndroid ? <><p>Buka platform menggunakan Chrome, lalu:</p><ol><li>Tekan menu <strong>⋮</strong> di kanan atas.</li><li>Pilih <strong>Install app</strong> atau <strong>Add to Home screen</strong>.</li><li>Tekan <strong>Install</strong>.</li></ol></> : <><p>Buka platform menggunakan Safari, lalu:</p><ol><li>Tekan tombol <strong>Share</strong> <Share size={16}/></li><li>Pilih <strong>Add to Home Screen</strong>.</li><li>Tekan <strong>Add</strong>.</li></ol></>}
      </section>
    </div>}
  </div>;
};

export default Layout;
