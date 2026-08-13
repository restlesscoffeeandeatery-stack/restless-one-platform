import { create } from 'zustand';

const WORKER_URL = 'https://restless-one-platform-api.rekap-keuangan.workers.dev';
export const PIN_STORAGE_KEY = 'restless_platform_admin_pin_v3';
export const AUTH_STORAGE_KEY = 'restless_platform_auth_ok_v3';
const CACHE_KEY = 'restless_backoffice_state_v1';

const getPin = () => localStorage.getItem(PIN_STORAGE_KEY) || '';

async function rpc(fn, ...args) {
  const pin = getPin();
  if (!pin) throw new Error('PIN admin belum dimasukkan.');
  const response = await fetch(`${WORKER_URL}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'X-Restless-Admin-Key': pin },
    body: JSON.stringify({ fn, args, adminKey: pin }),
    cache: 'no-store',
    credentials: 'omit'
  });
  const result = await response.json().catch(() => { throw new Error('Respons server tidak valid.'); });
  if (!response.ok || !result.ok) throw new Error(result.error || 'Server gagal memproses data.');
  return result.data;
}

const uiType = type => type === 'Pemasukan' ? 'Income' : type === 'Pengeluaran' ? 'Expense' : type;
const serverType = type => type === 'Income' ? 'Pemasukan' : 'Pengeluaran';
const statusInvoice = status => status === 'Dibayar' ? 'Paid' : status === 'Terlambat' ? 'Overdue' : status === 'Terkirim' ? 'Unpaid' : 'Unpaid';

function normalize(finance = {}, hppMaterials = {}, hppProducts = {}, hppPreparations = {}, platform = {}) {
  const accounts = (finance.accounts || platform.accounts || []).filter(a => a.active !== false).map(a => ({
    id: String(a.id), name: a.name, type: a.kind || a.type || 'Bank / Cash', balance: Number(a.balance || 0)
  }));
  const transactions = (finance.transactions || []).map(t => ({
    id: String(t.id), date: t.date, type: uiType(t.type), category: t.category,
    description: t.description, accountId: t.type === 'Pemasukan' ? t.destinationAccount : t.sourceAccount,
    amount: Number(t.amount || 0), status: 'Completed', notes: t.note || ''
  }));
  const rawInvoices = finance.invoices || [];
  const supplierNames = [...new Set(rawInvoices.map(i => String(i.supplier || i.client || '').trim()).filter(Boolean))];
  const suppliers = supplierNames.map((name, index) => {
    const rows = rawInvoices.filter(i => (i.supplier || i.client) === name);
    return { id: `SUP-${index + 1}`, name, contact: '-', phone: '-', totalPurchases: rows.reduce((s, i) => s + Number(i.total || 0), 0), outstanding: rows.filter(i => i.status !== 'Dibayar').reduce((s, i) => s + Number(i.total || 0), 0) };
  });
  const supplierId = name => suppliers.find(s => s.name === name)?.id || '';
  const invoices = rawInvoices.map(i => ({
    id: String(i.id), supplierId: supplierId(i.supplier || i.client), supplierName: i.supplier || i.client,
    invoiceNo: i.number, date: i.invoiceDate, dueDate: i.dueDate, total: Number(i.total || 0),
    paid: i.status === 'Dibayar' ? Number(i.total || 0) : 0, status: statusInvoice(i.status), items: i.items || []
  }));
  const stockMap = Object.fromEntries((platform.stock || []).map(s => [String(s.id), s]));
  const materials = (hppMaterials.items || []).map(m => {
    const stock = stockMap[String(m.id)] || {};
    const quantity = Number(stock.stock || 0);
    return { id: String(m.id), name: m.nama, category: m.kategori, unit: m.satuan, stock: quantity,
      latestPrice: Number(stock.average || m.harga || 0), status: quantity <= 0 ? 'Out of Stock' : quantity <= 5 ? 'Low Stock' : 'In Stock' };
  });
  const preparations = (hppPreparations.items || []).map(p => ({
    id: String(p.id), name: p.nama, unit: p.satuanHasil, yield: Number(p.yield || 0),
    hppTotal: Number(p.hppTotal || 0), hppPerUnit: Number(p.hppPerSatuan || 0), ingredients: []
  }));
  const recipes = (hppProducts.items || []).map(p => ({
    id: String(p.id), name: p.nama, category: p.kategori, sellingPrice: Number(p.hargaJual || 0),
    hppTotal: Number(p.hppTotal || 0), margin: Number(p.marginPct || 0), ingredients: []
  }));
  const payrollHistory = (platform.payrollRuns || []).map(r => ({
    id: r.runId, period: `${r.start} – ${r.end}`, type: r.scheme === 'Fulltime' ? 'Full-time' : 'Part-time',
    date: r.end, status: r.status === 'POSTED' ? 'Paid' : 'Draft', totalAmount: Number(r.total || 0), employeesData: []
  }));
  return { accounts, transactions, categories: finance.categories || [], invoices, suppliers, materials,
    preparations, recipes, stockHistory: [], priceHistory: [], employees: [], attendanceData: [], payrollHistory,
    summary: platform.summary || {}, syncLog: platform.sync || [] };
}

const emptyState = {
  accounts: [], suppliers: [], materials: [], preparations: [], recipes: [], invoices: [], employees: [],
  transactions: [], categories: [], stockHistory: [], priceHistory: [], payrollHistory: [], attendanceData: [],
  summary: {}, syncLog: [], loading: true, refreshing: false, error: ''
};

export const useStore = create((set, get) => ({
  ...emptyState,
  authenticated: localStorage.getItem(AUTH_STORAGE_KEY) === '1' && Boolean(getPin()),
  addToast: (message, type = 'success') => window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } })),

  fetchState: async ({ silent = false } = {}) => {
    if (!getPin()) return set({ loading: false });
    if (!silent) {
      try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (cached) set({ ...cached, loading: false, refreshing: true }); } catch { /* ignore cache */ }
    }
    try {
      set(silent ? { refreshing: true, error: '' } : { loading: !get().accounts.length, refreshing: true, error: '' });
      const [finance, materials, products, preparations, platform] = await Promise.all([
        rpc('getAppData'), rpc('getBahanBaku'), rpc('getProduk'), rpc('getPreparations'), rpc('getPlatformData', getPin())
      ]);
      const next = normalize(finance, materials, products, preparations, platform);
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      set({ ...next, loading: false, refreshing: false });
    } catch (error) {
      set({ loading: false, refreshing: false, error: error.message });
      if (!get().accounts.length) throw error;
      get().addToast('Data terakhir ditampilkan. Sinkronisasi tertunda.', 'error');
    }
  },

  verifyPin: async pin => {
    localStorage.setItem(PIN_STORAGE_KEY, pin);
    try { await rpc('verifyAdminLogin', pin); localStorage.setItem(AUTH_STORAGE_KEY, '1'); set({ authenticated: true }); return true; }
    catch (error) { localStorage.removeItem(PIN_STORAGE_KEY); throw error; }
  },
  logout: () => { localStorage.removeItem(AUTH_STORAGE_KEY); set({ ...emptyState, authenticated: false, loading: false }); },

  transferMoney: async (fromAccId, toAccId, amount, date, notes) => {
    await rpc('createAccountTransfer', { sourceAccount: fromAccId, destinationAccount: toAccId, amount: Number(amount), date, description: notes || 'Transfer antar rekening', note: notes || '' });
    get().addToast('Transfer berhasil disimpan.'); await get().fetchState({ silent: true });
  },

  createInvoice: async (invoiceData, items) => {
    const expenseCategories = get().categories.filter(c => c.type === 'Pengeluaran' && c.active);
    const selectedCategory = expenseCategories.find(c => !c.parent) || expenseCategories[0];
    if (!selectedCategory) throw new Error('Kategori pengeluaran belum tersedia.');
    const supplier = get().suppliers.find(s => s.id === invoiceData.supplierId);
    await rpc('saveInvoice', { supplier: supplier?.name || invoiceData.supplierId, number: invoiceData.invoiceNo,
      invoiceDate: invoiceData.date, dueDate: invoiceData.dueDate, category: selectedCategory.parent || selectedCategory.name,
      subcategory: selectedCategory.parent ? selectedCategory.name : '', status: 'Draft', tax: 0, discount: 0,
      items: items.map(item => ({ name: get().materials.find(m => m.id === item.materialId)?.name || item.materialId, qty: Number(item.quantity), price: Number(item.price) })) });
    for (const item of items) await rpc('postStockMovement', getPin(), { materialId: item.materialId, type: 'MASUK', qty: Number(item.quantity), price: Number(item.price), date: invoiceData.date, category: 'Pembelian Supplier', note: invoiceData.invoiceNo });
    get().addToast('Invoice supplier berhasil dibuat.'); await get().fetchState({ silent: true });
  },

  recordPayment: async (invoiceId, amount) => {
    const invoice = get().invoices.find(i => i.id === invoiceId), outstanding = Number(invoice?.total || 0) - Number(invoice?.paid || 0);
    if (Number(amount) < outstanding) throw new Error('Backend aktif belum mendukung pembayaran sebagian. Gunakan pembayaran penuh.');
    await rpc('updateInvoiceStatus', invoiceId, 'Dibayar');
    get().addToast('Invoice ditandai sudah dibayar.'); await get().fetchState({ silent: true });
  },

  stockOut: async (materialId, quantity, category, date, notes) => {
    const result = await rpc('postStockMovement', getPin(), { materialId, type: 'KELUAR', qty: Number(quantity), category, date, note: notes });
    set({ materials: get().materials.map(m => m.id === materialId ? { ...m, stock: Number(result.stock || 0), status: Number(result.stock || 0) <= 0 ? 'Out of Stock' : Number(result.stock || 0) <= 5 ? 'Low Stock' : 'In Stock' } : m), stockHistory: [{ id: `OUT-${Date.now()}`, materialId, date, type: 'OUT', category, reference: notes, qtyIn: 0, qtyOut: Number(quantity), balance: Number(result.stock || 0) }, ...get().stockHistory] });
    get().addToast('Stok keluar berhasil dicatat.');
  },

  stockIn: async (materialId, quantity, price, date, notes) => {
    const result = await rpc('postStockMovement', getPin(), { materialId, type: 'MASUK', qty: Number(quantity), price: Number(price), category: 'Stock In', date, note: notes });
    set({ materials: get().materials.map(m => m.id === materialId ? { ...m, stock: Number(result.stock || 0), latestPrice: Number(result.average || price), status: Number(result.stock || 0) <= 5 ? 'Low Stock' : 'In Stock' } : m), stockHistory: [{ id: `IN-${Date.now()}`, materialId, date, type: 'IN', category: 'Stock In', reference: notes, qtyIn: Number(quantity), qtyOut: 0, balance: Number(result.stock || 0) }, ...get().stockHistory] });
    get().addToast('Stok masuk berhasil dicatat.');
  },

  updateMaterialPrice: async (materialId, newPrice) => {
    const material = get().materials.find(m => m.id === materialId);
    await rpc('saveBahanBaku', { id: materialId, nama: material.name, satuan: material.unit, kategori: material.category, harga: Number(newPrice) });
    get().addToast('Harga bahan dan HPP terkait diperbarui.'); await get().fetchState({ silent: true });
  },

  syncAttendance: async () => {
    await rpc('syncReceivingAndAttendance', getPin());
    const live = await rpc('refreshPayrollLive', getPin(), '');
    const employees = (live.payrollAdmin?.employees || []).map(e => ({ id: e.id, name: e.name, type: e.type === 'Fulltime' ? 'Full-time' : 'Part-time', baseSalary: e.type === 'Fulltime' ? Number(e.rate) : 0, dailyRate: e.type === 'Parttime' ? Number(e.rate) : 0, status: e.status }));
    const attendanceData = (live.payrollAdmin?.attendance || []).map(a => ({ id: a.id, employeeId: a.employeeId, date: a.date, status: a.status === 'Hadir' ? 'Present' : a.status, hours: a.hours, overtimeHours: a.overtimeHours }));
    set({ employees, attendanceData }); get().addToast('Absensi dan payroll berhasil disinkronkan.');
  },

  loadPayroll: async () => {
    const live = await rpc('refreshPayrollLive', getPin(), '');
    const employees = (live.payrollAdmin?.employees || []).map(e => ({ id: e.id, name: e.name, type: e.type === 'Fulltime' ? 'Full-time' : 'Part-time', baseSalary: e.type === 'Fulltime' ? Number(e.rate) : 0, dailyRate: e.type === 'Parttime' ? Number(e.rate) : 0, status: e.status }));
    const attendanceData = (live.payrollAdmin?.attendance || []).map(a => ({ id: a.id, employeeId: a.employeeId, date: a.date, status: a.status === 'Hadir' ? 'Present' : a.status, hours: a.hours, overtimeHours: a.overtimeHours }));
    set({ employees, attendanceData }); return live;
  },

  savePayroll: async payrollRun => {
    const request = payrollRun.type === 'Full-time'
      ? { scheme: 'Fulltime', month: payrollRun.month }
      : { scheme: 'Parttime', start: payrollRun.start, end: payrollRun.end };
    const result = await rpc('generatePayroll', getPin(), request);
    const employeesData = (result.details || []).map(detail => ({
      id: String(detail[1]), name: detail[2], rate: Number(detail[3] || 0),
      present: Number(detail[4] || 0), leave: Number(detail[5] || 0), sick: Number(detail[6] || 0),
      absent: Number(detail[7] || 0), overtime: Number(detail[8] || 0), adjustment: Number(detail[9] || 0),
      totalPay: Number(detail[10] || 0), note: detail[11] || ''
    }));
    const saved = {
      id: result.runId, period: `${result.start} – ${result.end}`, type: payrollRun.type,
      date: result.end, status: 'Draft', totalAmount: Number(result.total || 0), employeesData
    };
    set({ payrollHistory: [saved, ...get().payrollHistory.filter(run => run.id !== saved.id)] });
    get().addToast('Draft payroll berhasil dihitung dari data absensi.');
    return saved;
  },

  postPayroll: async (runId, accountId) => {
    await rpc('postPayroll', getPin(), runId, accountId);
    set({ payrollHistory: get().payrollHistory.map(run => run.id === runId ? { ...run, status: 'Paid' } : run) });
    get().addToast('Payroll berhasil diposting ke Keuangan Baru.');
    await get().fetchState({ silent: true });
  },

  addTransaction: async form => {
    const type = serverType(form.type);
    await rpc('saveTransaction', { date: form.date, type, category: form.category, description: form.description,
      accountId: form.accountId, amount: Number(form.amount), note: form.notes || '', method: 'Transfer' });
    get().addToast('Transaksi berhasil disimpan.'); await get().fetchState({ silent: true });
  }
}));

export { rpc };
