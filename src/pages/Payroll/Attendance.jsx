import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, RefreshCw } from 'lucide-react';
import Modal from '../../components/Modal';

const today = () => new Date().toISOString().slice(0, 10);
const blankAttendance = () => ({ employeeId: '', date: today(), status: 'Hadir', inTime: '', outTime: '', hours: '', overtimeHours: '0', overtimeRate: '0', note: '' });
const calculateHours = (inTime, outTime) => {
  if (!inTime || !outTime) return '';
  const [inHour, inMinute] = inTime.split(':').map(Number), [outHour, outMinute] = outTime.split(':').map(Number);
  let minutes = outHour * 60 + outMinute - (inHour * 60 + inMinute);
  if (minutes < 0) minutes += 1440;
  return Math.round(minutes / 60 * 100) / 100;
};

const Attendance = () => {
  const employees = useStore(s => s.employees);
  const attendanceData = useStore(s => s.attendanceData);
  const syncAttendance = useStore(s => s.syncAttendance);
  const loadPayroll = useStore(s => s.loadPayroll);
  const saveAttendance = useStore(s => s.saveAttendance);
  const [syncing,setSyncing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [isManualOpen,setIsManualOpen]=useState(false);
  const [form,setForm]=useState(blankAttendance);
  useEffect(() => { loadPayroll().catch(error => useStore.getState().addToast(error.message,'error')); }, [loadPayroll]);
  const names=Object.fromEntries(employees.map(row=>[row.id,row.name]));
  const handleSync=async()=>{setSyncing(true);try{await syncAttendance();}catch(error){useStore.getState().addToast(error.message,'error');}finally{setSyncing(false)}};
  const updateTime=(field,value)=>setForm(current=>{const next={...current,[field]:value};next.hours=calculateHours(next.inTime,next.outTime);return next});
  const handleManualSave=async event=>{event.preventDefault();setSaving(true);try{await saveAttendance(form);setIsManualOpen(false);setForm(blankAttendance());}catch(error){useStore.getState().addToast(error.message,'error');}finally{setSaving(false)}};
  return <div className="page-container"><div className="flex justify-between items-center mb-6" style={{gap:'1rem',flexWrap:'wrap'}}><div><h1 className="page-title" style={{margin:0}}>Data Absensi</h1><p className="text-sm text-gray-500 mt-1">Menampilkan {attendanceData.length} catatan terbaru langsung dari sheet Absensi.</p></div><div className="flex gap-2" style={{flexWrap:'wrap'}}><button className="btn btn-outline" type="button" onClick={()=>setIsManualOpen(true)}><Plus size={16} style={{marginRight:6}}/>Input Absensi Manual</button><button className="btn btn-primary" disabled={syncing} onClick={handleSync}><RefreshCw size={16} style={{marginRight:6}}/>{syncing?'Menyinkronkan…':'Sinkronkan Absensi'}</button></div></div><div className="card"><div className="table-wrapper"><table className="table"><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Masuk</th><th>Keluar</th><th>Total Jam</th><th>Status</th><th>Lembur</th><th>Keterangan</th></tr></thead><tbody>{attendanceData.map(row=><tr key={row.id}><td>{row.date}</td><td className="font-medium">{names[row.employeeId]||row.employeeId}</td><td>{row.inTime||'—'}</td><td>{row.outTime||'—'}</td><td>{Number(row.hours||0).toFixed(2)}</td><td><span className={`badge ${row.status==='Present'?'badge-success':'badge-warning'}`}>{row.status==='Present'?'Hadir':row.status}</span></td><td>{Number(row.overtimeHours||0).toFixed(2)}</td><td className="text-sm text-gray-500">{row.note||'—'}</td></tr>)}{!attendanceData.length&&<tr><td colSpan="8" style={{textAlign:'center',padding:'2rem'}}>Belum ada data absensi yang berhasil dimuat.</td></tr>}</tbody></table></div></div>
    <Modal isOpen={isManualOpen} onClose={()=>setIsManualOpen(false)} title="Input Absensi Manual"><form onSubmit={handleManualSave}><div className="modal-body"><div className="form-group"><label className="form-label" htmlFor="manual-employee">Karyawan</label><select id="manual-employee" autoFocus required className="form-control" value={form.employeeId} onChange={event=>setForm({...form,employeeId:event.target.value})}><option value="">Pilih karyawan…</option>{employees.filter(employee=>String(employee.status).toLowerCase()==='aktif').map(employee=><option key={employee.id} value={employee.id}>{employee.name} · {employee.type}</option>)}</select></div><div className="flex gap-4"><div className="form-group flex-1"><label className="form-label" htmlFor="manual-date">Tanggal</label><input id="manual-date" type="date" required className="form-control" value={form.date} onChange={event=>setForm({...form,date:event.target.value})}/></div><div className="form-group flex-1"><label className="form-label" htmlFor="manual-status">Status</label><select id="manual-status" className="form-control" value={form.status} onChange={event=>setForm({...form,status:event.target.value})}><option>Hadir</option><option>Izin</option><option>Sakit</option><option>Alpha</option></select></div></div><div className="flex gap-4"><div className="form-group flex-1"><label className="form-label" htmlFor="manual-in">Jam Masuk</label><input id="manual-in" type="time" className="form-control" value={form.inTime} onChange={event=>updateTime('inTime',event.target.value)}/></div><div className="form-group flex-1"><label className="form-label" htmlFor="manual-out">Jam Keluar</label><input id="manual-out" type="time" className="form-control" value={form.outTime} onChange={event=>updateTime('outTime',event.target.value)}/></div><div className="form-group flex-1"><label className="form-label" htmlFor="manual-hours">Total Jam</label><input id="manual-hours" type="number" min="0" step="0.01" className="form-control" value={form.hours} onChange={event=>setForm({...form,hours:event.target.value})}/></div></div><div className="flex gap-4"><div className="form-group flex-1"><label className="form-label" htmlFor="manual-overtime">Jam Lembur</label><input id="manual-overtime" type="number" min="0" step="0.01" className="form-control" value={form.overtimeHours} onChange={event=>setForm({...form,overtimeHours:event.target.value})}/></div><div className="form-group flex-1"><label className="form-label" htmlFor="manual-overtime-rate">Tarif Lembur</label><input id="manual-overtime-rate" type="number" min="0" className="form-control" value={form.overtimeRate} onChange={event=>setForm({...form,overtimeRate:event.target.value})}/></div></div><div className="form-group mb-0"><label className="form-label" htmlFor="manual-note">Keterangan</label><textarea id="manual-note" rows="3" className="form-control" value={form.note} onChange={event=>setForm({...form,note:event.target.value})}/></div></div><div className="modal-footer"><button type="button" className="btn btn-outline" onClick={()=>setIsManualOpen(false)}>Batal</button><button className="btn btn-primary" disabled={saving||!form.employeeId}>{saving?'Menyimpan…':'Simpan Absensi'}</button></div></form></Modal>
  </div>;
};
export default Attendance;
