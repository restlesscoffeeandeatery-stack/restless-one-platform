import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Power, Search, Trash2, UsersRound } from 'lucide-react';
import Modal from '../../components/Modal';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';

const blankForm = () => ({ id: '', name: '', type: 'Full-time', baseSalary: '', dailyRate: '', status: 'Aktif', startDate: new Date().toISOString().slice(0, 10) });

const EmployeeSettings = () => {
  const employees = useStore(state => state.employees);
  const loadPayroll = useStore(state => state.loadPayroll);
  const saveEmployee = useStore(state => state.saveEmployee);
  const setEmployeeActive = useStore(state => state.setEmployeeActive);
  const removeEmployee = useStore(state => state.removeEmployee);
  const [form, setForm] = useState(blankForm());
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPayroll().catch(error => useStore.getState().addToast(error.message, 'error')); }, [loadPayroll]);

  const filtered = useMemo(() => employees.filter(employee => {
    const matchesSearch = !search || employee.name.toLowerCase().includes(search.toLowerCase()) || employee.id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === 'Semua' || employee.status === statusFilter);
  }), [employees, search, statusFilter]);

  const openAdd = () => { setForm(blankForm()); setOpen(true); };
  const openEdit = employee => {
    setForm({ ...blankForm(), ...employee, baseSalary: employee.baseSalary || '', dailyRate: employee.dailyRate || '', startDate: employee.startDate || new Date().toISOString().slice(0, 10) });
    setOpen(true);
  };
  const submit = async event => {
    event.preventDefault(); setSaving(true);
    try { await saveEmployee(form); setOpen(false); }
    catch (error) { useStore.getState().addToast(error.message, 'error'); }
    finally { setSaving(false); }
  };
  const remove = async employee => {
    if (!window.confirm(`Hapus ${employee.name}? Jika sudah memiliki histori, data akan dinonaktifkan agar payroll lama tetap aman.`)) return;
    try { await removeEmployee(employee.id); } catch (error) { useStore.getState().addToast(error.message, 'error'); }
  };

  return <div className="page-container">
    <div className="flex justify-between items-center mb-6">
      <div><h1 className="page-title" style={{ margin: 0 }}>Pengaturan Karyawan</h1><p className="text-sm text-gray-500 mt-1">Sumber data aktif untuk Absensi dan Payroll.</p></div>
      <button type="button" className="btn btn-primary" onClick={openAdd}><Plus size={16} style={{ marginRight: 6 }}/>Tambah Karyawan</button>
    </div>

    <div className="card mb-6">
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2" style={{ flex: '1 1 260px' }}><Search size={17}/><input className="form-control" aria-label="Cari karyawan" placeholder="Cari nama atau ID…" value={search} onChange={event => setSearch(event.target.value)}/></div>
        <select className="form-control" aria-label="Filter status karyawan" style={{ flex: '0 0 180px' }} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>Semua</option><option>Aktif</option><option>Nonaktif</option></select>
      </div>
    </div>

    <div className="card">
      <div className="flex items-center gap-2 mb-4"><UsersRound size={18}/><strong>{employees.filter(employee => employee.status === 'Aktif').length} aktif</strong><span className="text-sm text-gray-500">dari {employees.length} karyawan</span></div>
      <div className="table-wrapper"><table className="table">
        <thead><tr><th>Nama</th><th>Tipe</th><th>Rate</th><th>Tanggal Masuk</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Data karyawan tidak ditemukan.</td></tr>}
          {filtered.map(employee => <tr key={employee.id}>
            <td><div className="font-medium">{employee.name}</div><div className="text-xs text-gray-500">ID: {employee.id}</div></td>
            <td><span className="badge badge-primary">{employee.type}</span></td>
            <td>{formatRupiah(employee.type === 'Full-time' ? employee.baseSalary : employee.dailyRate)}<div className="text-xs text-gray-500">{employee.type === 'Full-time' ? 'per bulan' : 'per hari'}</div></td>
            <td>{employee.startDate || '-'}</td>
            <td><span className={`badge ${employee.status === 'Aktif' ? 'badge-success' : 'badge-gray'}`}>{employee.status}</span></td>
            <td><div className="flex gap-2">
              <button type="button" className="btn btn-outline text-xs" onClick={() => openEdit(employee)}><Pencil size={14} style={{ marginRight: 5 }}/>Edit</button>
              <button type="button" className="btn btn-outline text-xs" onClick={() => setEmployeeActive(employee, employee.status !== 'Aktif').catch(error => useStore.getState().addToast(error.message, 'error'))} aria-label={`${employee.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'} ${employee.name}`}><Power size={14} style={{ marginRight: 5 }}/>{employee.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <button type="button" className="btn btn-outline text-xs" onClick={() => remove(employee)} style={{ color: 'var(--color-danger)' }}><Trash2 size={14}/></button>
            </div></td>
          </tr>)}
        </tbody>
      </table></div>
    </div>

    <Modal isOpen={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Karyawan' : 'Tambah Karyawan'}>
      <form onSubmit={submit}>
        <div className="modal-body flex-col gap-4">
          <div className="form-group"><label className="form-label" htmlFor="employee-name">Nama</label><input id="employee-name" autoFocus className="form-control" required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></div>
          <div className="flex gap-4">
            <div className="form-group" style={{ flex: 1 }}><label className="form-label" htmlFor="employee-type">Tipe Kerja</label><select id="employee-type" className="form-control" value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option>Full-time</option><option>Part-time</option></select></div>
            <div className="form-group" style={{ flex: 1 }}><label className="form-label" htmlFor="employee-start">Tanggal Masuk</label><input id="employee-start" type="date" className="form-control" required value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })}/></div>
          </div>
          {form.type === 'Full-time' ? <div className="form-group"><label className="form-label" htmlFor="employee-salary">Gaji Bulanan</label><input id="employee-salary" type="number" min="1" className="form-control" required value={form.baseSalary} onChange={event => setForm({ ...form, baseSalary: event.target.value })}/></div> : <div className="form-group"><label className="form-label" htmlFor="employee-rate">Rate Harian</label><input id="employee-rate" type="number" min="1" className="form-control" required value={form.dailyRate} onChange={event => setForm({ ...form, dailyRate: event.target.value })}/></div>}
          <div className="form-group"><label className="form-label" htmlFor="employee-status">Status</label><select id="employee-status" className="form-control" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option>Aktif</option><option>Nonaktif</option></select></div>
        </div>
        <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Batal</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Karyawan'}</button></div>
      </form>
    </Modal>
  </div>;
};

export default EmployeeSettings;
