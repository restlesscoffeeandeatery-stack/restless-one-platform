import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const Attendance = () => {
  const employees = useStore(s => s.employees);
  const attendanceData = useStore(s => s.attendanceData);
  const syncAttendance = useStore(s => s.syncAttendance);
  const loadPayroll = useStore(s => s.loadPayroll);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('Hari ini, 08:32');
  useEffect(() => { if (!employees.length) loadPayroll().catch(() => {}); }, [employees.length, loadPayroll]);

  const handleSync = async () => {
    setSyncing(true);
    try { await syncAttendance(); setLastSync(`Hari ini, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`); }
    finally { setSyncing(false); }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Attendance Data</h1>
      </div>

      {/* Sync Banner */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, var(--color-primary-light), #f1f6ef)', border: '1px solid #bcd3c2' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="font-semibold text-base" style={{ color: 'var(--color-primary-dark)' }}>Sumber Data Kehadiran</div>
            <div className="text-sm" style={{ color: 'var(--color-primary)' }}>Disinkronkan dari Spreadsheet Kehadiran</div>
            <div className="text-xs text-gray-500 mt-1">Sinkronisasi terakhir: {lastSync}</div>
          </div>
          <button className="btn btn-primary" onClick={handleSync} disabled={syncing} style={{ minWidth: 150 }}>
            <RefreshCw size={16} style={{ marginRight: 6, animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Menyinkronkan...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Tipe</th>
                <th>Jabatan</th>
                {attendanceData.length > 0 && <th>Tanggal</th>}
                <th>Status Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const att = attendanceData.find(a => a.employeeId === emp.id);
                return (
                  <tr key={emp.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: emp.type === 'Full-time' ? 'var(--color-primary-light)' : 'var(--color-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', color: emp.type === 'Full-time' ? 'var(--color-primary)' : 'var(--color-warning)' }}>
                          {emp.name.charAt(0)}
                        </div>
                        <span className="font-medium">{emp.name}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${emp.type === 'Full-time' ? 'badge-primary' : 'badge-warning'}`}>{emp.type}</span></td>
                    <td className="text-sm text-gray-500">{emp.role}</td>
                    {attendanceData.length > 0 && <td className="text-sm">{att?.date || '-'}</td>}
                    <td>
                      {att ? (
                        att.status === 'Present'
                          ? <span className="flex items-center gap-1 badge badge-success"><CheckCircle size={12} /> Hadir</span>
                          : <span className="flex items-center gap-1 badge badge-danger"><XCircle size={12} /> Tidak Hadir</span>
                      ) : (
                        <span className="badge badge-gray">Belum Sinkron</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Attendance;
