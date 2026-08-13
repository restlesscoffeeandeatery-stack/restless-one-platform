import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { RefreshCw } from 'lucide-react';

const Attendance = () => {
  const employees = useStore(s => s.employees);
  const attendanceData = useStore(s => s.attendanceData);
  const syncAttendance = useStore(s => s.syncAttendance);
  const loadPayroll = useStore(s => s.loadPayroll);
  const [syncing,setSyncing]=useState(false);
  useEffect(() => { loadPayroll().catch(error => useStore.getState().addToast(error.message,'error')); }, [loadPayroll]);
  const names=Object.fromEntries(employees.map(row=>[row.id,row.name]));
  const handleSync=async()=>{setSyncing(true);try{await syncAttendance();}catch(error){useStore.getState().addToast(error.message,'error');}finally{setSyncing(false)}};
  return <div className="page-container"><div className="flex justify-between items-center mb-6"><div><h1 className="page-title" style={{margin:0}}>Data Absensi</h1><p className="text-sm text-gray-500 mt-1">Menampilkan {attendanceData.length} catatan terbaru dari Payroll_Absensi.</p></div><button className="btn btn-primary" disabled={syncing} onClick={handleSync}><RefreshCw size={16} style={{marginRight:6}}/>{syncing?'Menyinkronkan…':'Sinkronkan Absensi'}</button></div><div className="card"><div className="table-wrapper"><table className="table"><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Masuk</th><th>Keluar</th><th>Total Jam</th><th>Status</th><th>Lembur</th><th>Keterangan</th></tr></thead><tbody>{attendanceData.map(row=><tr key={row.id}><td>{row.date}</td><td className="font-medium">{names[row.employeeId]||row.employeeId}</td><td>{row.inTime||'—'}</td><td>{row.outTime||'—'}</td><td>{Number(row.hours||0).toFixed(2)}</td><td><span className={`badge ${row.status==='Present'?'badge-success':'badge-warning'}`}>{row.status==='Present'?'Hadir':row.status}</span></td><td>{Number(row.overtimeHours||0).toFixed(2)}</td><td className="text-sm text-gray-500">{row.note||'—'}</td></tr>)}{!attendanceData.length&&<tr><td colSpan="8" style={{textAlign:'center',padding:'2rem'}}>Belum ada data absensi yang berhasil dimuat.</td></tr>}</tbody></table></div></div></div>;
};
export default Attendance;
