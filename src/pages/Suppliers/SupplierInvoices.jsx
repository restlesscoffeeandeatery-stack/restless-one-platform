import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah } from '../../utils/format';
import Modal from '../../components/Modal';
import SearchableSelect from '../../components/SearchableSelect';
import { Plus } from 'lucide-react';

const SupplierInvoices = () => {
  const invoices = useStore(state => state.invoices);
  const suppliers = useStore(state => state.suppliers);
  const materials = useStore(state => state.materials);
  const accounts = useStore(state => state.accounts);

  const createInvoice = useStore(state => state.createInvoice);
  const recordPayment = useStore(state => state.recordPayment);

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'paid'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // New Invoice Form State
  const [newInvoice, setNewInvoice] = useState({
    supplierId: '',
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: ''
  });
  const [invoiceItems, setInvoiceItems] = useState([
    { materialId: '', quantity: 1, price: 0 }
  ]);

  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');

  const activeInvoices = invoices.filter(i => i.status !== 'Paid');
  const paidInvoices = invoices.filter(i => i.status === 'Paid');
  const displayedInvoices = activeTab === 'active' ? activeInvoices : paidInvoices;
  const materialOptions = useMemo(() => materials.map(material => ({
    value: material.id,
    label: `${material.name} (${material.unit})`,
    meta: material.category || ''
  })), [materials]);

  const handleAddItem = () => {
    setInvoiceItems([...invoiceItems, { materialId: '', quantity: 1, price: 0 }]);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceItems];
    newItems[index][field] = value;

    // Auto-fill price based on latest if material is selected
    if (field === 'materialId') {
      const mat = materials.find(m => m.id === value);
      if (mat) newItems[index].price = mat.latestPrice;
    }

    setInvoiceItems(newItems);
  };

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    if (invoiceItems.some(item => !item.materialId)) {
      useStore.getState().addToast('Pilih material yang valid pada setiap item invoice.', 'error');
      return;
    }
    createInvoice(newInvoice, invoiceItems).then(() => {
      setIsAddModalOpen(false);
      setNewInvoice({ supplierId: '', invoiceNo: '', date: new Date().toISOString().split('T')[0], dueDate: '' });
      setInvoiceItems([{ materialId: '', quantity: 1, price: 0 }]);
    }).catch(error => useStore.getState().addToast(error.message, 'error'));
  };

  const openPayModal = (inv) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.total - inv.paid);
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    recordPayment(
      selectedInvoice.id,
      Number(payAmount),
      payAccountId,
      new Date().toISOString().split('T')[0],
      `Payment for ${selectedInvoice.invoiceNo}`
    );
    setIsPayModalOpen(false);
    setSelectedInvoice(null);
  };

  const getStatusBadge = (status) => {
    if (status === 'Paid') return <span className="badge badge-success">Paid</span>;
    if (status === 'Partial') return <span className="badge badge-warning">Partial</span>;
    if (status === 'Overdue') return <span className="badge badge-danger">Overdue</span>;
    return <span className="badge badge-gray">Unpaid</span>;
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Supplier Invoices</h1>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} className="mr-2" style={{ marginRight: '0.5rem' }} />
          Add Invoice
        </button>
      </div>

      <div className="card">
        <div className="flex gap-4 mb-4 border-b" style={{ borderColor: 'var(--color-gray-200)' }}>
          <button
            className={`pb-2 ${activeTab === 'active' ? 'font-semibold border-b-2' : 'text-gray-500'}`}
            style={{ borderColor: activeTab === 'active' ? 'var(--color-primary)' : 'transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
            onClick={() => setActiveTab('active')}
          >
            Active Invoices ({activeInvoices.length})
          </button>
          <button
            className={`pb-2 ${activeTab === 'paid' ? 'font-semibold border-b-2' : 'text-gray-500'}`}
            style={{ borderColor: activeTab === 'paid' ? 'var(--color-primary)' : 'transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
            onClick={() => setActiveTab('paid')}
          >
            Payment History
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Supplier</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedInvoices.map(inv => {
                const supplier = suppliers.find(s => s.id === inv.supplierId);
                const outstanding = inv.total - inv.paid;
                return (
                  <tr key={inv.id}>
                    <td className="font-medium">{inv.invoiceNo}</td>
                    <td><div className="font-medium">{supplier?.name || inv.supplierName}</div><div className="text-xs text-gray-500 mt-1">Tanggal invoice: {inv.date}</div></td>
                    <td>{inv.dueDate}</td>
                    <td>{formatRupiah(inv.total)}</td>
                    <td>{formatRupiah(inv.paid)}</td>
                    <td className="font-semibold">{formatRupiah(outstanding)}</td>
                    <td>{getStatusBadge(inv.status)}</td>
                    <td>
                      {inv.status !== 'Paid' && (
                        <button className="btn btn-outline text-xs" onClick={() => openPayModal(inv)}>
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {displayedInvoices.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-500)' }}>
                    No {activeTab} invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Invoice Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Supplier Invoice">
        <form onSubmit={handleCreateInvoice}>
          <div className="modal-body flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select className="form-control" required value={newInvoice.supplierId} onChange={e => setNewInvoice({...newInvoice, supplierId: e.target.value})}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="form-group flex-1">
                <label className="form-label">Invoice Number</label>
                <input type="text" className="form-control" required value={newInvoice.invoiceNo} onChange={e => setNewInvoice({...newInvoice, invoiceNo: e.target.value})} />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Date</label>
                <input type="date" className="form-control" required value={newInvoice.date} onChange={e => setNewInvoice({...newInvoice, date: e.target.value})} />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-control" required value={newInvoice.dueDate} onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})} />
              </div>
            </div>

            <div className="mt-2">
              <h4 className="font-semibold mb-2">Invoice Items</h4>
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center mb-2">
                  <div style={{ flex: 2, minWidth: 220 }}>
                    <SearchableSelect
                      id={`invoice-material-${idx}`}
                      value={item.materialId}
                      onChange={value => handleItemChange(idx, 'materialId', value)}
                      options={materialOptions}
                      placeholder="Cari material..."
                      ariaLabel={`Cari material untuk item ${idx + 1}`}
                      required
                    />
                  </div>
                  <input type="number" className="form-control" placeholder="Qty" style={{ flex: 1 }} required value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} />
                  <input type="number" className="form-control" placeholder="Price" style={{ flex: 1 }} required value={item.price} onChange={e => handleItemChange(idx, 'price', Number(e.target.value))} />
                  <div className="font-semibold text-right" style={{ width: '100px' }}>
                    {formatRupiah(item.quantity * item.price)}
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-outline text-xs mt-2" onClick={handleAddItem}>+ Add Item</button>
            </div>

            <div className="mt-4 pt-4 border-t text-right text-lg font-bold" style={{ borderColor: 'var(--color-gray-200)' }}>
              Total: {formatRupiah(invoiceItems.reduce((acc, item) => acc + (item.quantity * item.price), 0))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Invoice</button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Record Payment">
          <form onSubmit={handleRecordPayment}>
            <div className="modal-body flex-col gap-4">
              <div className="p-4 bg-gray-50 rounded-lg mb-4" style={{ backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex justify-between mb-2">
                  <span>Invoice Total:</span>
                  <span className="font-semibold">{formatRupiah(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Already Paid:</span>
                  <span className="font-semibold text-success">{formatRupiah(selectedInvoice.paid)}</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2 mt-2">
                  <span>Outstanding:</span>
                  <span className="font-bold text-danger">{formatRupiah(selectedInvoice.total - selectedInvoice.paid)}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (Rp)</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  max={selectedInvoice.total - selectedInvoice.paid}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pay From Account</label>
                <select className="form-control" required value={payAccountId} onChange={e => setPayAccountId(e.target.value)}>
                  <option value="">Select account...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatRupiah(a.balance)})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Confirm Payment</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SupplierInvoices;
