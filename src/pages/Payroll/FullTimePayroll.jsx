import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { Calculator, CheckCircle } from 'lucide-react';
import Modal from '../../components/Modal';

const FullTimePayroll = () => {
  const syncAttendance = useStore(state => state.syncAttendance);
  const savePayroll = useStore(state => state.savePayroll);
  const savePayrollAdjustments = useStore(state => state.savePayrollAdjustments);
  const previewPayroll = useStore(state => state.previewPayroll);
  const payrollHistory = useStore(state => state.payrollHistory);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calculatedPayroll, setCalculatedPayroll] = useState([]);
  const [loadingPayroll, setLoadingPayroll] = useState(true);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const applyPreview = result => setCalculatedPayroll(result.employeesData.map(employee => ({
    ...employee,
    baseSalary: employee.rate,
    actualDays: employee.present,
    expectedDays: employee.present + employee.leave + employee.sick + employee.absent,
    basePay: employee.totalPay - employee.overtime - employee.adjustment,
    originalTotalPay: employee.totalPay,
    originalAdjustment: employee.adjustment,
    totalPayInput: String(employee.totalPay)
  })));

  const totalFee = calculatedPayroll.reduce((sum, employee) => sum + Number(employee.totalPay || 0), 0);

  const updateTotalPay = (employeeId, rawValue) => {
    const digits = rawValue.replace(/[^\d]/g, '');
    const nextTotal = digits === '' ? 0 : Number(digits);
    setCalculatedPayroll(current => current.map(employee => employee.id === employeeId ? {
      ...employee,
      totalPayInput: digits,
      totalPay: nextTotal,
      adjustment: Number(employee.originalAdjustment || 0) + nextTotal - Number(employee.originalTotalPay || 0)
    } : employee));
  };

  useEffect(() => {
    let active = true;
    setLoadingPayroll(true);
    previewPayroll({ scheme: 'Fulltime', month })
      .then(result => { if (active) { applyPreview(result); setLoadError(''); } })
      .catch(error => { if (active) { setLoadError(error.message); useStore.getState().addToast(error.message, 'error'); } })
      .finally(() => { if (active) setLoadingPayroll(false); });
    return () => { active = false; };
  }, []); // tarik sekali setiap halaman dibuka

  const handleCalculate = async () => {
    setLoadingPayroll(true);
    setLoadError('');
    try {
      const result = await previewPayroll({ scheme: 'Fulltime', month });
      applyPreview(result);
    } catch (error) { setLoadError(error.message); useStore.getState().addToast(error.message, 'error'); }
    finally { setLoadingPayroll(false); }
  };

  const handleRefresh = async () => {
    setLoadingPayroll(true); setLoadError('');
    try { await syncAttendance(); await handleCalculate(); }
    catch (error) { setLoadError(error.message); useStore.getState().addToast(error.message, 'error'); setLoadingPayroll(false); }
  };

  const handleConfirm = async () => {
    const editedPayroll = calculatedPayroll;
    setSavingPayroll(true);
    try {
      const result = await savePayroll({ period: month, type: 'Full-time', month });
      const generatedById = Object.fromEntries(result.employeesData.map(employee => [employee.id, employee]));
      const changes = editedPayroll.map(employee => {
        const generated = generatedById[employee.id];
        const generatedTotal = Number(generated?.totalPay || 0);
        const generatedAdjustment = Number(generated?.adjustment || 0);
        return {
          employeeId: employee.id,
          adjustment: generatedAdjustment + Number(employee.totalPay || 0) - generatedTotal,
          note: employee.note || '',
          changed: Number(employee.totalPay || 0) !== generatedTotal
        };
      }).filter(change => change.changed).map(change => ({ employeeId: change.employeeId, adjustment: change.adjustment, note: change.note }));
      if (changes.length) await savePayrollAdjustments(result.id, changes);
      setIsConfirmModalOpen(false);
      setCalculatedPayroll(editedPayroll.map(employee => ({ ...employee, originalTotalPay: employee.totalPay, originalAdjustment: employee.adjustment })));
    } catch (error) { useStore.getState().addToast(error.message, 'error'); }
    finally { setSavingPayroll(false); }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Full-time Payroll</h1>
        <div className="flex gap-4 items-center">
          <div className="text-sm text-gray-500">
            {calculatedPayroll.length} karyawan Full-time
          </div>
          <button className="btn btn-outline" onClick={handleRefresh} disabled={loadingPayroll}>
            Refresh Attendance
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4 items-end">
          <div className="form-group mb-0" style={{ flex: 1 }}>
            <label className="form-label">Payroll Period</label>
            <input type="month" className="form-control" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleCalculate} disabled={loadingPayroll}>
            <Calculator size={16} className="mr-2" style={{ marginRight: '0.5rem' }} />
            {loadingPayroll ? 'Memuat…' : 'Calculate Payroll'}
          </button>
        </div>
      </div>

      <div className="card animate-fade-in">
          <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <h3 className="font-semibold">Calculation Results</h3>
            <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
              <div aria-live="polite"><span className="text-sm text-gray-500">Total Fee</span><div className="font-semibold text-primary" style={{ fontSize: '1.25rem' }}>{formatRupiah(totalFee)}</div></div>
              <button className="btn btn-success" disabled={!calculatedPayroll.length} style={{ backgroundColor: 'var(--color-success)', color: 'white' }} onClick={() => setIsConfirmModalOpen(true)}>
                <CheckCircle size={16} className="mr-2" style={{ marginRight: '0.5rem' }} />
                Review & Confirm
              </button>
            </div>
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
                {loadingPayroll && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Menarik data karyawan Full-time dan absensi…</td></tr>}
                {loadError && !loadingPayroll && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}><strong>Payroll gagal dimuat.</strong><div className="text-sm text-gray-500 mt-1">{loadError}</div><button type="button" className="btn btn-outline mt-4" onClick={handleCalculate}>Coba Lagi</button></td></tr>}
                {!loadingPayroll && !loadError && calculatedPayroll.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada karyawan Full-time aktif. Periksa Pengaturan → Data Karyawan.</td></tr>}
                {calculatedPayroll.map(emp => (
                  <tr key={emp.id}>
                    <td className="font-medium">{emp.name}<div className="text-xs text-gray-500">{emp.role}</div></td>
                    <td>{formatRupiah(emp.baseSalary)}</td>
                    <td>{emp.actualDays}/{emp.expectedDays} days</td>
                    <td>{formatRupiah(emp.basePay)}</td>
                    <td>{formatRupiah(emp.overtime)}</td>
                    <td>
                      <input
                        id={`total-pay-${emp.id}`}
                        aria-label={`Total Pay ${emp.name}`}
                        type="text"
                        inputMode="numeric"
                        className="form-control font-semibold text-primary"
                        style={{ minWidth: 150 }}
                        value={emp.totalPayInput}
                        onChange={event => updateTotalPay(emp.id, event.target.value)}
                        onBlur={() => { if (emp.totalPayInput === '') updateTotalPay(emp.id, '0'); }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
            <span>{formatRupiah(totalFee)}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={() => setIsConfirmModalOpen(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={savingPayroll} onClick={handleConfirm}>{savingPayroll ? 'Menyimpan…' : 'Buat Draft Payroll'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default FullTimePayroll;
