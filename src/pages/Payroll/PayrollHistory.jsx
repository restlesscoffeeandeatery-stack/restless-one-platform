import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import Modal from '../../components/Modal';

const PayrollHistory = () => {
  const payrollHistory = useStore(s => s.payrollHistory);
  const accounts = useStore(s => s.accounts);
  const postPayroll = useStore(s => s.postPayroll);
  const loadPayrollRunDetail = useStore(s => s.loadPayrollRunDetail);
  const savePayrollAdjustments = useStore(s => s.savePayrollAdjustments);
  const [selectedRun, setSelectedRun] = useState(null);
  const [accountId, setAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handlePost = async () => {
    if (!accountId) return useStore.getState().addToast('Pilih rekening pembayaran.', 'error');
    setSubmitting(true);
    try { await postPayroll(selectedRun.id, accountId); setSelectedRun(null); setAccountId(''); }
    catch (error) { useStore.getState().addToast(error.message, 'error'); }
    finally { setSubmitting(false); }
  };
  const openDetail = async run => {
    setDetailLoading(true);
    try { setDetail(await loadPayrollRunDetail(run.id)); }
    catch (error) { useStore.getState().addToast(error.message, 'error'); }
    finally { setDetailLoading(false); }
  };
  const updateAdjustment = (employeeId, value) => setDetail({ ...detail, employeesData: detail.employeesData.map(row => row.id === employeeId ? { ...row, adjustment: value, totalPay: Math.max(0, row.totalPay - Number(row._previousAdjustment ?? row.adjustment) + Number(value || 0)), _previousAdjustment: Number(row._previousAdjustment ?? row.adjustment) } : row) });
  const persistAdjustments = async () => {
    setSubmitting(true);
    try { await savePayrollAdjustments(detail.runId, detail.employeesData.map(row => ({ employeeId: row.id, adjustment: Number(row.adjustment || 0), note: row.note || '' }))); setDetail(await loadPayrollRunDetail(detail.runId)); }
    catch (error) { useStore.getState().addToast(error.message, 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Payroll History</h1>
      </div>

      <div className="card">
        {payrollHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-gray-400)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <div className="font-medium">Belum ada riwayat payroll.</div>
            <div className="text-sm mt-1">Proses payroll dari halaman Full-time atau Part-time Payroll.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Tipe Karyawan</th>
                <th>Jumlah Karyawan</th>
                <th>Total Pembayaran</th>
                <th>Tanggal Bayar</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {payrollHistory.map(run => {
                const totalAmount = run.totalAmount || run.employeesData?.reduce((a, e) => a + e.totalPay, 0) || 0;
                const empCount = run.employeesData?.length || 0;
                return (
                  <tr key={run.id}>
                    <td className="font-medium">{run.period}</td>
                    <td>
                      <span className={`badge ${run.type === 'Full-time' ? 'badge-primary' : 'badge-warning'}`}>{run.type}</span>
                    </td>
                    <td>{empCount} karyawan</td>
                    <td className="font-bold" style={{ color: 'var(--color-primary)' }}>{formatRupiah(totalAmount)}</td>
                    <td>{run.date}</td>
                    <td><span className={`badge ${run.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{run.status}</span></td>
                    <td><div className="flex gap-2"><button className="btn btn-outline btn-sm" onClick={() => openDetail(run)}>{detailLoading ? 'Memuat…' : 'Detail'}</button>{run.status === 'Draft' && <button className="btn btn-primary btn-sm" onClick={() => setSelectedRun(run)}>Post</button>}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={Boolean(selectedRun)} onClose={() => !submitting && setSelectedRun(null)} title="Post Payroll ke Keuangan Baru">
        <div className="modal-body">
          <p className="mb-4">Pilih rekening sumber untuk pembayaran <strong>{selectedRun?.period}</strong>.</p>
          <label className="form-label" htmlFor="payroll-account">Rekening pembayaran</label>
          <select id="payroll-account" className="form-control" value={accountId} onChange={event => setAccountId(event.target.value)}>
            <option value="">Pilih rekening</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name} · {formatRupiah(account.balance)}</option>)}
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" disabled={submitting} onClick={() => setSelectedRun(null)}>Batal</button>
          <button className="btn btn-primary" disabled={submitting || !accountId} onClick={handlePost}>{submitting ? 'Memposting…' : 'Post & Catat Pengeluaran'}</button>
        </div>
      </Modal>
      <Modal isOpen={Boolean(detail)} onClose={() => !submitting && setDetail(null)} title={`Detail Payroll · ${detail?.start || ''} – ${detail?.end || ''}`}>
        <div className="modal-body"><div className="table-wrapper"><table className="table"><thead><tr><th>Karyawan</th><th>Hadir</th><th>Lembur</th><th>Penyesuaian</th><th>Gaji Bersih</th></tr></thead><tbody>{detail?.employeesData?.map(row => <tr key={row.id}><td className="font-medium">{row.name}<div className="text-xs text-gray-500">{row.note}</div></td><td>{row.present}</td><td>{formatRupiah(row.overtime)}</td><td><input type="number" className="form-control" style={{ width: 140 }} disabled={detail.status === 'POSTED'} value={row.adjustment} onChange={event => updateAdjustment(row.id,event.target.value)}/></td><td className="font-semibold">{formatRupiah(row.totalPay)}</td></tr>)}</tbody></table></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setDetail(null)}>Tutup</button>{detail?.status !== 'POSTED' && <button className="btn btn-primary" disabled={submitting} onClick={persistAdjustments}>{submitting ? 'Menyimpan…' : 'Simpan Perubahan'}</button>}</div>
      </Modal>
    </div>
  );
};

export default PayrollHistory;
