import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Landmark, BookOpen, ChartNoAxesCombined, ReceiptText, UsersRound, PackageOpen, Boxes, FlaskConical, CookingPot, CalendarCheck, BadgeDollarSign, History, Settings, UserRound, Leaf, X } from 'lucide-react';

const groups = [
  { title: 'Ringkasan', items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }] },
  { title: 'Keuangan', items: [
    { name: 'Transaksi', path: '/transactions', icon: ArrowLeftRight }, { name: 'Bank & Kas', path: '/bank-cash', icon: Landmark },
    { name: 'Akuntansi', path: '/accounting', icon: BookOpen }, { name: 'Laporan', path: '/reports', icon: ChartNoAxesCombined }
  ]},
  { title: 'Supplier', items: [{ name: 'Invoice Supplier', path: '/invoices', icon: ReceiptText }, { name: 'Data Supplier', path: '/suppliers', icon: UsersRound }] },
  { title: 'Inventory & HPP', items: [
    { name: 'Bahan Baku', path: '/materials', icon: PackageOpen }, { name: 'Pergerakan Stok', path: '/stock-movement', icon: Boxes },
    { name: 'Preparation', path: '/preparations', icon: FlaskConical }, { name: 'Resep / Menu', path: '/recipes', icon: CookingPot }
  ]},
  { title: 'Payroll', items: [
    { name: 'Data Absensi', path: '/attendance', icon: CalendarCheck }, { name: 'Payroll Full-time', path: '/payroll-full', icon: BadgeDollarSign },
    { name: 'Payroll Part-time', path: '/payroll-part', icon: BadgeDollarSign }, { name: 'Riwayat Payroll', path: '/payroll-history', icon: History }
  ]}
];

const Sidebar = ({ mobileOpen, onClose }) => <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
  <div className="sidebar-header"><div className="brand-icon"><Leaf size={20}/></div><div><strong>RESTLESS</strong><small>ONE PLATFORM</small></div><button className="icon-btn sidebar-close" aria-label="Tutup menu" onClick={onClose}><X size={20}/></button></div>
  <nav className="sidebar-nav" aria-label="Navigasi utama">{groups.map(group => <section className="nav-group" key={group.title}><h2 className="nav-group-title">{group.title}</h2>{group.items.map(item => <NavLink key={item.path} to={item.path} onClick={onClose} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><item.icon className="nav-link-icon"/><span>{item.name}</span></NavLink>)}</section>)}</nav>
  <nav className="sidebar-footer" aria-label="Navigasi akun"><NavLink to="/settings" onClick={onClose} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><Settings className="nav-link-icon"/>Pengaturan</NavLink><NavLink to="/profile" onClick={onClose} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><UserRound className="nav-link-icon"/>Profil Admin</NavLink></nav>
</aside>;

export default Sidebar;
