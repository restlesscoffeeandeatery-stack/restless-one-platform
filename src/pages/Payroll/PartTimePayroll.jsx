import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { Calculator, CheckCircle } from 'lucide-react';
import Modal from '../../components/Modal';

const iso = date => date.toISOString().slice(0, 10);
const buildWeeks = () => {
  const now = new Date(), day = now.getDay() || 7, monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return [-3, -2, -1, 0, 1].map(offset => {
    const start = new Date(monday); start.setDate(monday.getDate() + offset * 7);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { label: `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`, days: 7, start: iso(start), end: iso(end) };
  }).reverse();
};
const WEEKS = buildWeeks();

const PartTimePayroll = () => {
  const employees = useStore(s => s.employees.filter(e => e.type === 'Part-time' && String(e.status).toLowerCase() === 'aktif'));
  const savePayroll = useStore(s => s.savePayroll);
  const previewPayroll = useStore(s => s.previewPayroll);
  const payrollHistory = useStore(s => s.payrollHistory);
  const loadPayroll = useStore(s => s.loadPayroll);

  const [selectedWeek, setSelectedWeek] = useState(WEEKS[1]);
  const [attendance, setAttendance] = useState({});
  const [calculated, setCalculated] = useState(null);
  const [loadingPayroll, setLoadingPayroll] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const applyPreview = result => {
    setCalculated(result.employeesData.map(employee => ({ ...employee, dailyRate: employee.rate, days: employee.present })));
    setAttendance(Object.fromEntries(result.employeesData.map(employee => [employee.id, employee.present])));
  };

  useEffect(() => {
    let active = true;
    setLoadingPayroll(true);
    Promise.all([loadPayroll(), previewPayroll({ scheme: 'Parttime', start: selectedWeek.start, end: selectedWeek.end })])
      .then(([, result]) => { if (active) applyPreview(result); })
      .catch(error => { if (active) useStore.getState().addToast(error.message, 'error'); })
      .finally(() => { if (active) setLoadingPayroll(false); });
    return () => { active = false; };
  }, []); // tarik sekali setiap halaman dibuka

  const handleAttendanceChange = (empId, days) => {
    setAttendance({ ...attendance, [empId]: Math.min(Number(days), selectedWeek.days) });
  };

  const handleCalculate = async () => {
    setLoadingPayroll(true);
    try {
      const result = await previewPayroll({ scheme: 'Parttime', start: selectedWeek.start, end: selectedWeek.end });
      applyPreview(result);
    } catch (error) { useStore.getState().addToast(error.message, 'error'); }
    finally { setLoadingPayroll(false); }
  };

  const handleConfirm = async () => {
    await savePayroll({
      id: `pr_pt_${Date.now()}`,
      period: selectedWeek.label,
      type: 'Part-time',
      start: selectedWeek.start,
      end: selectedWeek.end
    });
    setIsConfirmOpen(false);
    setCalculated(null);
    setAttendance({});
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Part-time Payroll</h1>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4 items-end">
          <div className="form-group mb-0" style={{ flex: 1 }}>
            <label className="form-label">Pilih Minggu</label>
            <select className="form-control" value={selectedWeek.label} onChange={e => { setSelectedWeek(WEEKS.find(w => w.label === e.target.value)); setCalculated(null); }}>
              {WEEKS.map(w => <option key={w.label} value={w.label}>{w.label}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleCalculate} disabled={loadingPayroll}>
            <Calculator size={16} style={{ marginRight: 6 }} /> {loadingPayroll ? 'Memuat…' : 'Hitung Gaji'}
          </button>
        </div>
      </div>

      {/* Input Attendance */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Input Kehadiran — {selectedWeek.label}</h3>
        <table className="table">
          <thead>
            <tr><th>Karyawan</th><th>Jabatan</th><th>Rate Harian</th><th>Hari Hadir</th></tr>
          </thead>
          <tbody>
            {!loadingPayroll && employees.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada karyawan Part-time aktif. Periksa Pengaturan → Data Karyawan.</td></tr>}
            {employees.map(emp => (
              <tr key={emp.id}>
                <td className="font-medium">{emp.name}</td>
                <td className="text-gray-500">{emp.role}</td>
                <td>{formatRupiah(emp.dailyRate)}</td>
                <td>
                  <input type="number" className="form-control" style={{ width: 80 }} min={0} max={selectedWeek.days}
                    value={attendance[emp.id] ?? ''} placeholder={`0-${selectedWeek.days}`}
                    onChange={e => handleAttendanceChange(emp.id, e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {calculated && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Hasil Kalkulasi</h3>
            <button className="btn" style={{ backgroundColor: 'var(--color-success)', color: 'white' }} onClick={() => setIsConfirmOpen(true)}>
              <CheckCircle size={16} style={{ marginRight: 6 }} /> Review & Konfirmasi
            </button>
          </div>
          <table className="table">
            <thead><tr><th>Karyawan</th><th>Rate Harian</th><th>Hari Hadir</th><th style={{ textAlign: 'right' }}>Total Gaji</th></tr></thead>
            <tbody>
              {calculated.map(emp => (
                <tr key={emp.id}>
                  <td className="font-medium">{emp.name}</td>
                  <td>{formatRupiah(emp.dailyRate)}</td>
                  <td><span className="badge badge-primary">{emp.days} hari</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{formatRupiah(emp.totalPay)}</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: 'var(--color-gray-50)' }}>
                <td colSpan="3" className="font-bold">TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>
                  {formatRupiah(calculated.reduce((a, e) => a + e.totalPay, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {payrollHistory.filter(p => p.type === 'Part-time').length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold mb-4">Riwayat Payroll Part-time</h3>
          <table className="table">
            <thead><tr><th>Periode</th><th>Tanggal</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {payrollHistory.filter(p => p.type === 'Part-time').map(run => (
                <tr key={run.id}>
                  <td className="font-medium">{run.period}</td>
                  <td>{run.date}</td>
                  <td className="font-semibold">{formatRupiah(run.totalAmount || run.employeesData?.reduce((a, e) => a + e.totalPay, 0) || 0)}</td>
                  <td><span className={`badge ${run.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{run.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} title="Buat Draft Payroll">
        <div className="modal-body">
          <p className="text-sm text-gray-600 mb-4">Anda akan memproses gaji part-time untuk periode <strong>{selectedWeek.label}</strong>.</p>
          <div className="p-4 rounded-lg text-lg font-semibold flex justify-between" style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
            <span>Total Payout:</span>
            <span style={{ color: 'var(--color-primary)' }}>{formatRupiah(calculated?.reduce((a, e) => a + e.totalPay, 0) || 0)}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setIsConfirmOpen(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleConfirm}>Buat Draft Payroll</button>
        </div>
      </Modal>
    </div>
  );
};

export default PartTimePayroll;
