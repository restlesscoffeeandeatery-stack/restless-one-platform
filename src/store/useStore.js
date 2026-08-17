import { create } from 'zustand';

const WORKER_URL = 'https://restless-one-platform-api.rekap-keuangan.workers.dev';
export const PIN_STORAGE_KEY = 'restless_platform_admin_pin_v3';
export const AUTH_STORAGE_KEY = 'restless_platform_auth_ok_v3';
export const USER_STORAGE_KEY = 'restless_platform_user_v1';
const CACHE_KEY = 'restless_backoffice_state_v1';

const getPin = () => localStorage.getItem(PIN_STORAGE_KEY) || '';
const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null'); }
  catch { return null; }
};

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

function normalize(finance = {}, inventory = {}, platform = {}) {
  const accounts = (finance.accounts || platform.accounts || []).filter(a => a.active !== false).map(a => ({
    id: String(a.id), name: a.name, type: a.kind || a.type || 'Bank / Cash', balance: Number(a.balance || 0)
  }));
  const transactions = (finance.transactions || []).map(t => ({
    id: String(t.id), date: t.date, type: uiType(t.type), category: t.category,
    description: t.description, accountId: t.type === 'Pemasukan' ? t.destinationAccount : t.sourceAccount,
    sourceAccount: t.sourceAccount || '', destinationAccount: t.destinationAccount || '',
    amount: Number(t.amount || 0), status: 'Completed', notes: t.note || '', reference: t.reference || '', period: t.period || ''
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
  const materials = (inventory.materials || []).map(m => {
    const quantity = Number(m.stock || 0);
    return { id: String(m.id), name: m.name || m.nama, category: m.category || m.kategori, unit: m.unit || m.satuan, stock: quantity,
      latestPrice: Number(m.average || m.harga || 0), updated: m.updated || '', status: quantity <= 0 ? 'Out of Stock' : quantity <= 5 ? 'Low Stock' : 'In Stock' };
  });
  const preparations = (inventory.preparations || []).map(p => ({
    id: String(p.id), name: p.name || p.nama, unit: p.unit || p.satuanHasil, yield: Number(p.yield || 0),
    hppTotal: Number(p.hppTotal || 0), hppPerUnit: Number(p.hppPerSatuan || 0), ingredients: []
  }));
  const recipes = (inventory.products || []).map(p => ({
    id: String(p.id), name: p.name || p.nama, category: p.category || p.kategori, sellingPrice: Number(p.price || p.hargaJual || 0),
    hppTotal: Number(p.hpp || p.hppTotal || 0), margin: Number(p.margin || p.marginPct || 0), ingredients: []
  }));
  const stockHistory = (inventory.stockHistory || []).map(row => ({
    id: String(row.id), materialId: String(row.materialId), date: row.date, timestamp: row.timestamp,
    type: row.type, category: row.category, reference: row.reference, user: row.user,
    qtyIn: row.type === 'IN' ? Number(row.quantity || 0) : 0,
    qtyOut: row.type === 'OUT' ? Number(row.quantity || 0) : 0,
    price: Number(row.price || 0), value: Number(row.value || 0)
  }));
  const payrollHistory = (platform.payrollRuns || []).map(r => ({
    id: r.runId, period: `${r.start} – ${r.end}`, type: r.scheme === 'Fulltime' ? 'Full-time' : 'Part-time',
    date: r.end, status: r.status === 'POSTED' ? 'Paid' : 'Draft', totalAmount: Number(r.total || 0), employeesData: []
  }));
  const payrollEmployees = (platform.payrollAdmin?.employees || []).map(e => ({ id: String(e.id), name: e.name,
    type: String(e.type).toLowerCase().replace(/[-\s]/g, '') === 'fulltime' ? 'Full-time' : 'Part-time',
    baseSalary: String(e.type).toLowerCase().replace(/[-\s]/g, '') === 'fulltime' ? Number(e.rate || 0) : 0,
    dailyRate: String(e.type).toLowerCase().replace(/[-\s]/g, '') === 'parttime' ? Number(e.rate || 0) : 0,
    rate: Number(e.rate || 0), status: e.status || 'Aktif', startDate: e.startDate || '' }));
  return { accounts, transactions, categories: finance.categories || [], invoices, suppliers, materials,
    preparations, recipes, stockHistory, priceHistory: [], employees: payrollEmployees, attendanceData: [], payrollHistory,
    budgets: finance.budgets || [], allocationRules: finance.allocationRules || [],
    summary: platform.summary || {}, syncLog: platform.sync || [] };
}

const emptyState = {
  accounts: [], suppliers: [], materials: [], preparations: [], recipes: [], invoices: [], employees: [],
  transactions: [], categories: [], stockHistory: [], priceHistory: [], payrollHistory: [], attendanceData: [],
  budgets: [], allocationRules: [], summary: {}, syncLog: [], loading: true, refreshing: false, error: ''
};

export const useStore = create((set, get) => ({
  ...emptyState,
  authenticated: localStorage.getItem(AUTH_STORAGE_KEY) === '1' && Boolean(getPin()),
  currentUser: getStoredUser() || { name: 'Rayhan', role: 'Owner', initials: 'RR' },
  addToast: (message, type = 'success') => window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } })),

  fetchState: async ({ silent = false } = {}) => {
    if (!getPin()) return set({ loading: false });
    if (!silent) {
      try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (cached) set({ ...cached, loading: false, refreshing: true }); } catch { /* ignore cache */ }
    }
    try {
      set(silent ? { refreshing: true, error: '' } : { loading: !get().accounts.length, refreshing: true, error: '' });
      const inventoryRequest = rpc('getInventoryWorkspace').catch(async () => {
        const [materials, products, preparations] = await Promise.all([rpc('getBahanBaku'), rpc('getProduk'), rpc('getPreparations')]);
        return { materials: (materials.items || []).map(m => ({ ...m, name: m.nama, unit: m.satuan, category: m.kategori, average: m.harga })), products: products.items || [], preparations: preparations.items || [], stockHistory: [] };
      });
      const [finance, inventory, platform] = await Promise.all([
        rpc('getAppData'), inventoryRequest, rpc('getPlatformData')
      ]);
      const next = normalize(finance, inventory, platform);
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
    try { const result = await rpc('verifyAdminLogin'); const user = result.user || { name: 'Rayhan', role: 'Owner', initials: 'RR' }; localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user)); localStorage.setItem(AUTH_STORAGE_KEY, '1'); set({ authenticated: true, currentUser: user }); return user; }
    catch (error) { localStorage.removeItem(PIN_STORAGE_KEY); throw error; }
  },
  logout: () => { localStorage.removeItem(AUTH_STORAGE_KEY); localStorage.removeItem(PIN_STORAGE_KEY); localStorage.removeItem(USER_STORAGE_KEY); set({ ...emptyState, authenticated: false, currentUser: null, loading: false }); },

  transferMoney: async (fromAccId, toAccId, amount, date, notes) => {
    await rpc('createAccountTransfer', { sourceAccount: fromAccId, destinationAccount: toAccId, amount: Number(amount), date, description: notes || 'Transfer antar rekening', note: notes || '' });
    get().addToast('Transfer berhasil disimpan.'); await get().fetchState({ silent: true });
  },

  createInvoice: async (invoiceData, items) => {
    const expenseCategories = get().categories.filter(c => c.type === 'Pengeluaran' && c.active);
    const selectedCategory = expenseCategories.find(c => !c.parent) || expenseCategories[0];
    if (!selectedCategory) throw new Error('Kategori pengeluaran belum tersedia.');
    const supplier = get().suppliers.find(s => s.id === invoiceData.supplierId);
    await rpc('saveSupplierInvoiceWithStock', { supplier: supplier?.name || invoiceData.supplierId, number: invoiceData.invoiceNo,
      invoiceDate: invoiceData.date, dueDate: invoiceData.dueDate, category: selectedCategory.parent || selectedCategory.name,
      subcategory: selectedCategory.parent ? selectedCategory.name : '', status: 'Draft', tax: 0, discount: 0,
      items: items.map(item => ({ materialId: item.materialId, name: get().materials.find(m => m.id === item.materialId)?.name || item.materialId, qty: Number(item.quantity), price: Number(item.price) })) });
    get().addToast('Invoice tersimpan; stok dan harga rata-rata sudah diperbarui.'); await get().fetchState({ silent: true });
  },

  recordPayment: async (invoiceId, amount) => {
    const invoice = get().invoices.find(i => i.id === invoiceId), outstanding = Number(invoice?.total || 0) - Number(invoice?.paid || 0);
    if (Number(amount) < outstanding) throw new Error('Backend aktif belum mendukung pembayaran sebagian. Gunakan pembayaran penuh.');
    await rpc('updateInvoiceStatus', invoiceId, 'Dibayar');
    get().addToast('Invoice ditandai sudah dibayar.'); await get().fetchState({ silent: true });
  },

  stockOut: async (materialId, quantity, category, date, notes) => {
    const result = await rpc('postStockMovement', { materialId, type: 'KELUAR', qty: Number(quantity), category, date, note: notes });
    set({ materials: get().materials.map(m => m.id === materialId ? { ...m, stock: Number(result.stock || 0), status: Number(result.stock || 0) <= 0 ? 'Out of Stock' : Number(result.stock || 0) <= 5 ? 'Low Stock' : 'In Stock' } : m), stockHistory: [{ id: `OUT-${Date.now()}`, materialId, date, type: 'OUT', category, reference: notes, qtyIn: 0, qtyOut: Number(quantity), balance: Number(result.stock || 0) }, ...get().stockHistory] });
    get().addToast('Stok keluar berhasil dicatat.');
  },

  stockIn: async (materialId, quantity, price, date, notes) => {
    const result = await rpc('postStockMovement', { materialId, type: 'MASUK', qty: Number(quantity), price: Number(price), category: 'Stock In', date, note: notes });
    set({ materials: get().materials.map(m => m.id === materialId ? { ...m, stock: Number(result.stock || 0), latestPrice: Number(result.average || price), status: Number(result.stock || 0) <= 5 ? 'Low Stock' : 'In Stock' } : m), stockHistory: [{ id: `IN-${Date.now()}`, materialId, date, type: 'IN', category: 'Stock In', reference: notes, qtyIn: Number(quantity), qtyOut: 0, balance: Number(result.stock || 0) }, ...get().stockHistory] });
    get().addToast('Stok masuk berhasil dicatat.');
  },

  updateStockMovement: async form => {
    await rpc('updateStockMovement', { id: form.id, qty: Number(form.quantity), price: Number(form.price || 0), date: form.date, category: form.category, note: form.notes || '' });
    get().addToast('Pergerakan stok berhasil diperbarui.');
    await get().fetchState({ silent: true });
  },

  addMaterial: async data => {
    const result = await rpc('saveBahan', { name: data.name, unit: data.unit, category: data.category, price: Number(data.price || 0), active: true });
    const material = { id: String(result.id), name: data.name, unit: data.unit, category: data.category, stock: 0, latestPrice: Number(data.price || 0), status: 'Out of Stock' };
    set({ materials: [...get().materials, material].sort((a, b) => a.name.localeCompare(b.name)) });
    if (Number(data.openingStock) > 0) await get().stockIn(material.id, Number(data.openingStock), Number(data.price || 0), data.date, 'Stok awal material');
    get().addToast('Material baru berhasil ditambahkan.');
    return material;
  },

  loadPreparationDetail: async preparationId => {
    const rows = await rpc('getPrepDetail', preparationId);
    const ingredients = (rows || []).map(row => ({ id: String(row.bahanId), type: 'RAW_MATERIAL', quantity: Number(row.jumlah || 0), unit: row.satuan, price: Number(row.hargaSatuan || 0), subtotal: Number(row.subtotal || 0), name: row.namaBahan }));
    set({ preparations: get().preparations.map(prep => prep.id === preparationId ? { ...prep, ingredients, detailLoaded: true } : prep) });
    return ingredients;
  },

  savePreparation: async form => {
    const bahan = form.ingredients.filter(item => item.id && Number(item.quantity) > 0).map(item => {
      const material = get().materials.find(row => row.id === item.id);
      return { bahanId: item.id, namaBahan: material?.name || '', satuan: item.unit || material?.unit || '', harga: Number(material?.latestPrice || 0), jumlah: Number(item.quantity) };
    });
    const result = await rpc('savePreparation', { nama: form.name, satuanHasil: form.unit, yield: Number(form.yield), bahan });
    if (result?._error || result?.success === false) throw new Error(result._error || result.error || 'Preparation gagal disimpan.');
    get().addToast('Preparation berhasil disimpan.');
    await get().fetchState({ silent: true });
  },

  loadRecipeDetail: async productId => {
    const rows = await rpc('getResepByProduk', productId);
    const ingredients = (rows || []).map(row => ({ id: String(row.bahanId), type: 'RAW_MATERIAL', quantity: Number(row.jumlah || 0), unit: row.satuan, price: Number(row.hargaSatuan || 0), subtotal: Number(row.subtotal || 0), name: row.namaBahan }));
    set({ recipes: get().recipes.map(recipe => recipe.id === productId ? { ...recipe, ingredients, detailLoaded: true } : recipe) });
    return ingredients;
  },

  updateMaterialPrice: async (materialId, newPrice) => {
    const material = get().materials.find(m => m.id === materialId);
    await rpc('saveBahan', { id: materialId, name: material.name, unit: material.unit, category: material.category, price: Number(newPrice), active: true });
    get().addToast('Harga bahan dan HPP terkait diperbarui.'); await get().fetchState({ silent: true });
  },

  syncAttendance: async () => {
    await rpc('syncReceivingAndAttendance');
    const live = await rpc('refreshPayrollLive', '');
    const employees = (live.payrollAdmin?.employees || []).map(e => { const full = String(e.type).toLowerCase().replace(/[-\s]/g, '') === 'fulltime'; return { id: String(e.id), name: e.name, type: full ? 'Full-time' : 'Part-time', rate: Number(e.rate), baseSalary: full ? Number(e.rate) : 0, dailyRate: full ? 0 : Number(e.rate), status: e.status, startDate: e.startDate }; });
    const attendanceData = (live.payrollAdmin?.attendance || []).map(a => ({ id: a.id, employeeId: String(a.employeeId), date: a.date, inTime: a.inTime, outTime: a.outTime, status: a.status === 'Hadir' ? 'Present' : a.status, hours: a.hours, note: a.note || '', overtimeHours: a.overtimeHours, overtimeRate: a.overtimeRate }));
    set({ employees, attendanceData }); get().addToast('Absensi dan payroll berhasil disinkronkan.');
  },

  loadPayroll: async () => {
    const live = await rpc('getPayrollAdminData');
    const payrollAdmin = live.payrollAdmin || live;
    const employees = (payrollAdmin.employees || []).map(e => { const compact = String(e.type).toLowerCase().replace(/[-\s]/g, ''); const full = compact === 'fulltime'; return { id: String(e.id), name: e.name, type: full ? 'Full-time' : 'Part-time', rate: Number(e.rate), baseSalary: full ? Number(e.rate) : 0, dailyRate: full ? 0 : Number(e.rate), status: e.status, startDate: e.startDate }; });
    const attendanceData = (payrollAdmin.attendance || []).map(a => ({ id: a.id, employeeId: String(a.employeeId), date: a.date, inTime: a.inTime, outTime: a.outTime, status: a.status === 'Hadir' ? 'Present' : a.status, hours: a.hours, note: a.note || '', overtimeHours: a.overtimeHours, overtimeRate: a.overtimeRate }));
    set({ employees, attendanceData }); return live;
  },

  saveAttendance: async form => {
    const result = await rpc('savePayrollAttendance', {
      employeeId: form.employeeId,
      date: form.date,
      status: form.status,
      inTime: form.inTime || '',
      outTime: form.outTime || '',
      hours: Number(form.hours || 0),
      overtimeHours: Number(form.overtimeHours || 0),
      overtimeRate: Number(form.overtimeRate || 0),
      note: form.note || ''
    });
    const row = { ...form, id: result.id, employeeId: String(form.employeeId), hours: Number(form.hours || 0), overtimeHours: Number(form.overtimeHours || 0), overtimeRate: Number(form.overtimeRate || 0), status: form.status === 'Hadir' ? 'Present' : form.status };
    set({ attendanceData: [row, ...get().attendanceData.filter(item => item.id !== result.id)] });
    get().addToast('Absensi manual berhasil disimpan.');
    return row;
  },

  saveEmployee: async form => {
    const type = form.type === 'Full-time' ? 'Fulltime' : 'Parttime';
    const rate = type === 'Fulltime' ? Number(form.baseSalary || form.rate) : Number(form.dailyRate || form.rate);
    await rpc('savePayrollEmployee', { id: form.id || '', name: form.name, type, rate, status: form.status || 'Aktif', startDate: form.startDate });
    get().addToast(form.id ? 'Data karyawan diperbarui.' : 'Karyawan ditambahkan.');
    await get().loadPayroll();
  },

  setEmployeeActive: async (employee, active) => {
    await rpc('savePayrollEmployee', { id: employee.id, name: employee.name, type: employee.type === 'Full-time' ? 'Fulltime' : 'Parttime', rate: employee.type === 'Full-time' ? employee.baseSalary : employee.dailyRate, status: active ? 'Aktif' : 'Nonaktif', startDate: employee.startDate });
    get().addToast(active ? 'Karyawan diaktifkan.' : 'Karyawan dinonaktifkan.');
    await get().loadPayroll();
  },

  removeEmployee: async employeeId => {
    const result = await rpc('removePayrollEmployee', employeeId);
    get().addToast(result.archived ? 'Karyawan memiliki histori dan dinonaktifkan.' : 'Karyawan berhasil dihapus.');
    await get().loadPayroll();
  },

  previewPayroll: async request => {
    const result = await rpc('previewPayroll', request);
    return { ...result, employeesData: (result.details || []).map(detail => ({
      id: String(detail[1]), name: detail[2], rate: Number(detail[3] || 0), present: Number(detail[4] || 0),
      leave: Number(detail[5] || 0), sick: Number(detail[6] || 0), absent: Number(detail[7] || 0),
      overtime: Number(detail[8] || 0), adjustment: Number(detail[9] || 0), totalPay: Number(detail[10] || 0), note: detail[11] || ''
    })) };
  },

  loadPayrollRunDetail: async runId => {
    const result = await rpc('getPayrollRunDetail', runId);
    return { ...result, employeesData: (result.details || []).map(detail => ({
      id: String(detail[1]), name: detail[2], rate: Number(detail[3] || 0), present: Number(detail[4] || 0),
      leave: Number(detail[5] || 0), sick: Number(detail[6] || 0), absent: Number(detail[7] || 0),
      overtime: Number(detail[8] || 0), adjustment: Number(detail[9] || 0), totalPay: Number(detail[10] || 0), note: detail[11] || ''
    })) };
  },

  savePayrollAdjustments: async (runId, changes) => {
    const result = await rpc('savePayrollAdjustments', { runId, changes });
    set({ payrollHistory: get().payrollHistory.map(run => run.id === runId ? { ...run, totalAmount: Number(result.total || 0) } : run) });
    get().addToast('Penyesuaian payroll berhasil disimpan.');
    return result;
  },

  savePayroll: async payrollRun => {
    const request = payrollRun.type === 'Full-time'
      ? { scheme: 'Fulltime', month: payrollRun.month }
      : { scheme: 'Parttime', start: payrollRun.start, end: payrollRun.end };
    const result = await rpc('generatePayroll', request);
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
    await rpc('postPayroll', runId, accountId);
    set({ payrollHistory: get().payrollHistory.map(run => run.id === runId ? { ...run, status: 'Paid' } : run) });
    get().addToast('Payroll berhasil diposting ke Keuangan Baru.');
    await get().fetchState({ silent: true });
  },

  addTransaction: async form => {
    const type = serverType(form.type);
    await rpc('saveTransaction', { date: form.date, type, category: form.category, description: form.description,
      accountId: form.accountId, amount: Number(form.amount), note: form.notes || '', method: 'Transfer' });
    get().addToast('Transaksi berhasil disimpan.'); await get().fetchState({ silent: true });
  },

  updateTransaction: async form => {
    const type = serverType(form.type);
    await rpc('updateTransaction', { id: form.id, date: form.date, type, category: form.category, description: form.description,
      accountId: form.accountId, amount: Number(form.amount), note: form.notes || '', method: 'Transfer' });
    get().addToast('Transaksi berhasil diperbarui.'); await get().fetchState({ silent: true });
  }
}));

export { rpc };
