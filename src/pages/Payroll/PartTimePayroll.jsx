import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { Calculator, CheckCircle } from 'lucide-react';
import Modal from '../../components/Modal';

const WEEKS = [
  { label: 'Minggu 1 (1-7 Agu 2026)', days: 7, start: '2026-08-01', end: '2026-08-07' },
  { label: 'Minggu 2 (8-14 Agu 2026)', days: 7, start: '2026-08-08', end: '2026-08-14' },
  { label: 'Minggu 3 (15-21 Agu 2026)', days: 7, start: '2026-08-15', end: '2026-08-21' },
  { label: 'Minggu 4 (22-28 Agu 2026)', days: 7, start: '2026-08-22', end: '2026-08-28' },
];

const PartTimePayroll = () => {
  const employees = useStore(s => s.employees.filter(e => e.type === 'Part-time'));
  const savePayroll = useStore(s => s.savePayroll);
  const previewPayroll = useStore(s => s.previewPayroll);
  const payrollHistory = useStore(s => s.payrollHistory);
  const loadPayroll = useStore(s => s.loadPayroll);

  const [selectedWeek, setSelectedWeek] = useState(WEEKS[1]);
  const [attendance, setAttendance] = useState({});
  const [calculated, setCalculated] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  useEffect(() => { if (!employees.length) loadPayroll().catch(() => {}); }, [employees.length, loadPayroll]);

  const handleAttendanceChange = (empId, days) => {
    setAttendance({ ...attendance, [empId]: Math.min(Number(days), selectedWeek.days) });
  };

  const handleCalculate = async () => {
    try {
      const result = await previewPayroll({ scheme: 'Parttime', start: selectedWeek.start, end: selectedWeek.end });
      setCalculated(result.employeesData.map(employee => ({ ...employee, dailyRate: employee.rate, days: employee.present })));
      setAttendance(Object.fromEntries(result.employeesData.map(employee => [employee.id, employee.present])));
    } catch (error) { useStore.getState().addToast(error.message, 'error'); }
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
          <button className="btn btn-primary" onClick={handleCalculate}>
            <Calculator size={16} style={{ marginRight: 6 }} /> Hitung Gaji
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
