import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import { Building2, Phone, Package, ChevronRight } from 'lucide-react';
import Modal from '../../components/Modal';

const Suppliers = () => {
  const suppliers = useStore(s => s.suppliers);
  const invoices = useStore(s => s.invoices);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const supplierInvoices = selected
    ? invoices.filter(i => i.supplierId === selected.id)
    : [];

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Suppliers</h1>
        <input className="form-control" style={{ width: 260 }} placeholder="Search supplier..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Total Pembelian</th>
              <th>Saldo Hutang</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={16} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td>{s.contact}</td>
                <td>{s.phone}</td>
                <td>{formatRupiah(s.totalPurchases)}</td>
                <td>
                  {Number(s.outstanding) > 0
                    ? <span className="font-semibold" style={{ color: 'var(--color-danger)' }}>{formatRupiah(s.outstanding)}</span>
                    : <span className="badge badge-success">Lunas</span>
                  }
                </td>
                <td>
                  <button className="btn btn-outline text-xs" onClick={() => setSelected(s)}>
                    Detail <ChevronRight size={12} style={{ marginLeft: 4 }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        <div className="modal-body flex-col gap-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} style={{ color: 'var(--color-gray-400)' }} />
              <span>{selected?.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package size={14} style={{ color: 'var(--color-gray-400)' }} />
              <span>Total: {formatRupiah(selected?.totalPurchases)}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: '1rem' }}>
            <h4 className="font-semibold mb-3">Invoice Aktif</h4>
            {supplierInvoices.filter(i => i.status !== 'Paid').length === 0
              ? <p className="text-sm text-gray-500">Tidak ada invoice aktif.</p>
              : supplierInvoices.filter(i => i.status !== 'Paid').map(inv => (
                <div key={inv.id} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-gray-100)' }}>
                  <div>
                    <div className="font-medium text-sm">{inv.invoiceNo}</div>
                    <div className="text-xs text-gray-500">Jatuh tempo: {inv.dueDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatRupiah(inv.total - inv.paid)}</div>
                    <span className={`badge badge-${inv.status === 'Overdue' ? 'danger' : inv.status === 'Partial' ? 'warning' : 'gray'}`}>{inv.status}</span>
                  </div>
                </div>
              ))
            }
          </div>

          <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: '1rem' }}>
            <h4 className="font-semibold mb-3">Invoice Lunas</h4>
            {supplierInvoices.filter(i => i.status === 'Paid').length === 0
              ? <p className="text-sm text-gray-500">Tidak ada invoice lunas.</p>
              : supplierInvoices.filter(i => i.status === 'Paid').map(inv => (
                <div key={inv.id} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-gray-100)' }}>
                  <div className="font-medium text-sm">{inv.invoiceNo}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{formatRupiah(inv.total)}</span>
                    <span className="badge badge-success">Paid</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setSelected(null)}>Tutup</button>
        </div>
      </Modal>
    </div>
  );
};

export default Suppliers;
