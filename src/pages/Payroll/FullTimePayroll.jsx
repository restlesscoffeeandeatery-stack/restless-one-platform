import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { Calculator, CheckCircle } from 'lucide-react';
import Modal from '../../components/Modal';

const FullTimePayroll = () => {
  const employees = useStore(state => state.employees.filter(e => e.type === 'Full-time'));
  const attendanceData = useStore(state => state.attendanceData);
  const syncAttendance = useStore(state => state.syncAttendance);
  const savePayroll = useStore(state => state.savePayroll);
  const previewPayroll = useStore(state => state.previewPayroll);
  const payrollHistory = useStore(state => state.payrollHistory);
  const loadPayroll = useStore(state => state.loadPayroll);

  const [period, setPeriod] = useState('20 July - 19 August 2026');
  const [calculatedPayroll, setCalculatedPayroll] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  useEffect(() => { if (!employees.length) loadPayroll().catch(() => {}); }, [employees.length, loadPayroll]);

  const handleCalculate = async () => {
    const month = period.includes('August 2026') ? '2026-08' : '2026-07';
    try {
      const result = await previewPayroll({ scheme: 'Fulltime', month });
      setCalculatedPayroll(result.employeesData.map(employee => ({ ...employee, baseSalary: employee.rate, actualDays: employee.present, expectedDays: employee.present + employee.leave + employee.sick + employee.absent, basePay: employee.totalPay - employee.overtime - employee.adjustment })));
    } catch (error) { useStore.getState().addToast(error.message, 'error'); }
  };

  const handleConfirm = () => {
    const month = period.includes('August 2026') ? '2026-08' : '2026-07';
    savePayroll({
      period,
      type: 'Full-time',
      month
    }).then(result => {
      setCalculatedPayroll(result.employeesData.map(employee => ({
        ...employee,
        baseSalary: employee.rate,
        actualDays: employee.present,
        expectedDays: employee.present + employee.leave + employee.sick + employee.absent,
        basePay: employee.totalPay - employee.overtime - employee.adjustment
      })));
      setIsConfirmModalOpen(false);
    }).catch(error => useStore.getState().addToast(error.message, 'error'));
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Full-time Payroll</h1>
        <div className="flex gap-4 items-center">
          <div className="text-sm text-gray-500">
            {attendanceData.length} data absensi dimuat
          </div>
          <button className="btn btn-outline" onClick={syncAttendance}>
            Refresh Attendance
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4 items-end">
          <div className="form-group mb-0" style={{ flex: 1 }}>
            <label className="form-label">Payroll Period</label>
            <select className="form-control" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="20 July - 19 August 2026">20 July - 19 August 2026</option>
              <option value="20 June - 19 July 2026">20 June - 19 July 2026</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleCalculate}>
            <Calculator size={16} className="mr-2" style={{ marginRight: '0.5rem' }} />
            Calculate Payroll
          </button>
        </div>
      </div>

      {calculatedPayroll && (
        <div className="card animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Calculation Results</h3>
            <button className="btn btn-success" style={{ backgroundColor: 'var(--color-success)', color: 'white' }} onClick={() => setIsConfirmModalOpen(true)}>
              <CheckCircle size={16} className="mr-2" style={{ marginRight: '0.5rem' }} />
              Review & Confirm
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Monthly Salary</th>
                  <th>Attendance</th>
                  <th>Base Pay</th>
                  <th>Overtime</th>
                  <th>Total Pay</th>
                </tr>
              </thead>
              <tbody>
                {calculatedPayroll.map(emp => (
                  <tr key={emp.id}>
                    <td className="font-medium">{emp.name}<div className="text-xs text-gray-500">{emp.role}</div></td>
                    <td>{formatRupiah(emp.baseSalary)}</td>
                    <td>{emp.actualDays}/{emp.expectedDays} days</td>
                    <td>{formatRupiah(emp.basePay)}</td>
                    <td>{formatRupiah(emp.overtime)}</td>
                    <td className="font-semibold text-primary">{formatRupiah(emp.totalPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payrollHistory.filter(p => p.type === 'Full-time').length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold mb-4">Recent Payroll Runs</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Run Date</th>
                <th>Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payrollHistory.filter(p => p.type === 'Full-time').map(run => (
                <tr key={run.id}>
                  <td className="font-medium">{run.period}</td>
                  <td>{run.date}</td>
                  <td className="font-semibold">{formatRupiah(run.totalAmount || run.employeesData?.reduce((acc, emp) => acc + emp.totalPay, 0) || 0)}</td>
                  <td><span className={`badge ${run.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{run.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Payroll">
        <div className="modal-body">
          <p className="mb-4 text-gray-700">Buat draft payroll dari data absensi yang sudah tersinkron? Draft dapat diperiksa lalu diposting ke Keuangan Baru melalui Riwayat Payroll.</p>
          <div className="p-4 bg-gray-50 rounded-lg text-lg font-semibold flex justify-between" style={{ backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
            <span>Total Payout:</span>
            <span>{formatRupiah(calculatedPayroll?.reduce((acc, emp) => acc + emp.totalPay, 0) || 0)}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={() => setIsConfirmModalOpen(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>Buat Draft Payroll</button>
        </div>
      </Modal>
    </div>
  );
};

export default FullTimePayroll;
