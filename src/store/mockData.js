export const accountsData = [
  { id: 'acc_1', name: 'BCA Operational', type: 'Bank', balance: 82500000 },
  { id: 'acc_2', name: 'Mandiri', type: 'Bank', balance: 61000000 },
  { id: 'acc_3', name: 'BRI', type: 'Bank', balance: 27500000 },
  { id: 'acc_4', name: 'Petty Cash', type: 'Cash', balance: 13500000 }
];

export const suppliersData = [
  { id: 'sup_1', name: 'PT Sukses Kopi Indonesia', contact: 'Budi Santoso', phone: '081234567890', totalPurchases: 45000000, outstanding: 12500000 },
  { id: 'sup_2', name: 'Susu Segar Nusantara', contact: 'Siti Aminah', phone: '082345678901', totalPurchases: 28000000, outstanding: 4500000 },
  { id: 'sup_3', name: 'CV Makmur Plastik', contact: 'Agus Wijaya', phone: '083456789012', totalPurchases: 15000000, outstanding: 0 },
  { id: 'sup_4', name: 'Toko Gula Sentosa', contact: 'Rina Herawati', phone: '084567890123', totalPurchases: 8500000, outstanding: 2000000 },
  { id: 'sup_5', name: 'Matcha Importir JKT', contact: 'Kevin', phone: '085678901234', totalPurchases: 12000000, outstanding: 5450000 },
  { id: 'sup_6', name: 'Coklat Prima', contact: 'Dewi', phone: '086789012345', totalPurchases: 9000000, outstanding: 1500000 },
  { id: 'sup_7', name: 'Oat Milk Supplier', contact: 'Joko', phone: '087890123456', totalPurchases: 18000000, outstanding: 2500000 },
  { id: 'sup_8', name: 'Aneka Sirup', contact: 'Maya', phone: '088901234567', totalPurchases: 6000000, outstanding: 0 }
];

export const materialsData = [
  { id: 'mat_1', name: 'Arabica Beans', category: 'Coffee', stock: 15, unit: 'kg', latestPrice: 185000, status: 'In Stock' },
  { id: 'mat_2', name: 'Robusta Beans', category: 'Coffee', stock: 20, unit: 'kg', latestPrice: 120000, status: 'In Stock' },
  { id: 'mat_3', name: 'Fresh Milk', category: 'Dairy', stock: 45, unit: 'liter', latestPrice: 22000, status: 'In Stock' },
  { id: 'mat_4', name: 'Oat Milk', category: 'Dairy', stock: 12, unit: 'liter', latestPrice: 45000, status: 'Low Stock' },
  { id: 'mat_5', name: 'Sugar', category: 'Groceries', stock: 25, unit: 'kg', latestPrice: 16000, status: 'In Stock' },
  { id: 'mat_6', name: 'Chocolate Powder', category: 'Powder', stock: 8, unit: 'kg', latestPrice: 110000, status: 'Low Stock' },
  { id: 'mat_7', name: 'Matcha Powder', category: 'Powder', stock: 3, unit: 'kg', latestPrice: 350000, status: 'Low Stock' },
  { id: 'mat_8', name: 'Cup 12oz', category: 'Packaging', stock: 1500, unit: 'pcs', latestPrice: 800, status: 'In Stock' },
  { id: 'mat_9', name: 'Cup 16oz', category: 'Packaging', stock: 1200, unit: 'pcs', latestPrice: 950, status: 'In Stock' },
  { id: 'mat_10', name: 'Straw', category: 'Packaging', stock: 5000, unit: 'pcs', latestPrice: 150, status: 'In Stock' },
  { id: 'mat_11', name: 'Lid 12/16oz', category: 'Packaging', stock: 3000, unit: 'pcs', latestPrice: 250, status: 'In Stock' },
  { id: 'mat_12', name: 'Vanilla Syrup', category: 'Syrup', stock: 6, unit: 'bottle', latestPrice: 120000, status: 'In Stock' },
  { id: 'mat_13', name: 'Caramel Syrup', category: 'Syrup', stock: 0, unit: 'bottle', latestPrice: 120000, status: 'Out of Stock' },
  { id: 'mat_14', name: 'Mineral Water', category: 'Beverage', stock: 48, unit: 'bottle', latestPrice: 4000, status: 'In Stock' },
  { id: 'mat_15', name: 'Ice Cubes', category: 'Groceries', stock: 100, unit: 'kg', latestPrice: 1500, status: 'In Stock' }
];

export const preparationsData = [
  {
    id: 'prep_1', name: 'Simple Syrup', unit: 'ml', yield: 1000,
    ingredients: [
      { id: 'mat_5', type: 'RAW_MATERIAL', quantity: 1, unit: 'kg' }, // Sugar
      { id: 'mat_14', type: 'RAW_MATERIAL', quantity: 0.5, unit: 'liter' } // Water
    ]
  },
  {
    id: 'prep_2', name: 'Cold Brew Concentrate', unit: 'ml', yield: 2000,
    ingredients: [
      { id: 'mat_1', type: 'RAW_MATERIAL', quantity: 0.5, unit: 'kg' },
      { id: 'mat_14', type: 'RAW_MATERIAL', quantity: 2, unit: 'liter' }
    ]
  },
  {
    id: 'prep_3', name: 'Chocolate Sauce', unit: 'ml', yield: 500,
    ingredients: [
      { id: 'mat_6', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg' },
      { id: 'mat_5', type: 'RAW_MATERIAL', quantity: 0.1, unit: 'kg' },
      { id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'liter' }
    ]
  },
  {
    id: 'prep_4', name: 'Matcha Base', unit: 'ml', yield: 500,
    ingredients: [
      { id: 'mat_7', type: 'RAW_MATERIAL', quantity: 0.1, unit: 'kg' },
      { id: 'prep_1', type: 'PREPARATION', quantity: 100, unit: 'ml' },
      { id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.3, unit: 'liter' }
    ]
  },
  {
    id: 'prep_5', name: 'Espresso Shot (Double)', unit: 'shot', yield: 1,
    ingredients: [
      { id: 'mat_1', type: 'RAW_MATERIAL', quantity: 0.018, unit: 'kg' } // 18g
    ]
  }
];

export const recipesData = [
  {
    id: 'rec_1', name: 'Iced Cafe Latte', category: 'Coffee', sellingPrice: 28000,
    ingredients: [
      { id: 'prep_5', type: 'PREPARATION', quantity: 1, unit: 'shot' },
      { id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.15, unit: 'liter' },
      { id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg' },
      { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_10', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    id: 'rec_2', name: 'Hot Cafe Latte', category: 'Coffee', sellingPrice: 28000,
    ingredients: [
      { id: 'prep_5', type: 'PREPARATION', quantity: 1, unit: 'shot' },
      { id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.18, unit: 'liter' },
      { id: 'mat_8', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    id: 'rec_3', name: 'Es Kopi Susu', category: 'Signature', sellingPrice: 22000,
    ingredients: [
      { id: 'mat_2', type: 'RAW_MATERIAL', quantity: 0.018, unit: 'kg' },
      { id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.1, unit: 'liter' },
      { id: 'prep_1', type: 'PREPARATION', quantity: 30, unit: 'ml' },
      { id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg' },
      { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_10', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    id: 'rec_4', name: 'Cold Brew', category: 'Coffee', sellingPrice: 25000,
    ingredients: [
      { id: 'prep_2', type: 'PREPARATION', quantity: 150, unit: 'ml' },
      { id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg' },
      { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    id: 'rec_5', name: 'Matcha Latte', category: 'Non-Coffee', sellingPrice: 32000,
    ingredients: [
      { id: 'prep_4', type: 'PREPARATION', quantity: 50, unit: 'ml' },
      { id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.15, unit: 'liter' },
      { id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg' },
      { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_10', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    id: 'rec_6', name: 'Chocolate Latte', category: 'Non-Coffee', sellingPrice: 30000,
    ingredients: [
      { id: 'prep_3', type: 'PREPARATION', quantity: 40, unit: 'ml' },
      { id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.15, unit: 'liter' },
      { id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg' },
      { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' },
      { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }
    ]
  },
  // Add 6 more to hit the 12 requirement
  { id: 'rec_7', name: 'Americano (Iced)', category: 'Coffee', sellingPrice: 20000, ingredients: [{id: 'prep_5', type: 'PREPARATION', quantity: 1, unit: 'shot'}, {id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg'}, {id: 'mat_14', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'liter'}, { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }, { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }] },
  { id: 'rec_8', name: 'Americano (Hot)', category: 'Coffee', sellingPrice: 20000, ingredients: [{id: 'prep_5', type: 'PREPARATION', quantity: 1, unit: 'shot'}, {id: 'mat_14', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'liter'}, { id: 'mat_8', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }, { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }] },
  { id: 'rec_9', name: 'Vanilla Latte', category: 'Coffee', sellingPrice: 32000, ingredients: [{id: 'prep_5', type: 'PREPARATION', quantity: 1, unit: 'shot'}, {id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.15, unit: 'liter'}, {id: 'mat_12', type: 'RAW_MATERIAL', quantity: 0.02, unit: 'bottle'}, {id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg'}, { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }, { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }] },
  { id: 'rec_10', name: 'Caramel Macchiato', category: 'Coffee', sellingPrice: 35000, ingredients: [{id: 'prep_5', type: 'PREPARATION', quantity: 1, unit: 'shot'}, {id: 'mat_3', type: 'RAW_MATERIAL', quantity: 0.15, unit: 'liter'}, {id: 'mat_13', type: 'RAW_MATERIAL', quantity: 0.02, unit: 'bottle'}, {id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg'}, { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }, { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }] },
  { id: 'rec_11', name: 'Oat Milk Latte', category: 'Coffee', sellingPrice: 38000, ingredients: [{id: 'prep_5', type: 'PREPARATION', quantity: 1, unit: 'shot'}, {id: 'mat_4', type: 'RAW_MATERIAL', quantity: 0.15, unit: 'liter'}, {id: 'mat_15', type: 'RAW_MATERIAL', quantity: 0.2, unit: 'kg'}, { id: 'mat_9', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }, { id: 'mat_11', type: 'RAW_MATERIAL', quantity: 1, unit: 'pcs' }] },
  { id: 'rec_12', name: 'Mineral Water', category: 'Beverage', sellingPrice: 10000, ingredients: [{id: 'mat_14', type: 'RAW_MATERIAL', quantity: 1, unit: 'bottle'}] },
];

export const invoicesData = [
  { id: 'inv_1', supplierId: 'sup_1', invoiceNo: 'INV-2608-001', date: '2026-08-01', dueDate: '2026-08-15', total: 12500000, paid: 0, status: 'Unpaid' },
  { id: 'inv_2', supplierId: 'sup_2', invoiceNo: 'SSN-08-12', date: '2026-08-05', dueDate: '2026-08-19', total: 4500000, paid: 2000000, status: 'Partial' },
  { id: 'inv_3', supplierId: 'sup_4', invoiceNo: 'TGS-0192', date: '2026-07-28', dueDate: '2026-08-11', total: 2000000, paid: 0, status: 'Overdue' },
  { id: 'inv_4', supplierId: 'sup_5', invoiceNo: 'MIJ-88', date: '2026-08-10', dueDate: '2026-08-24', total: 5450000, paid: 0, status: 'Unpaid' },
  { id: 'inv_5', supplierId: 'sup_6', invoiceNo: 'CP-08', date: '2026-08-02', dueDate: '2026-08-16', total: 1500000, paid: 0, status: 'Unpaid' },
  { id: 'inv_6', supplierId: 'sup_7', invoiceNo: 'OAT-112', date: '2026-08-12', dueDate: '2026-08-26', total: 2500000, paid: 0, status: 'Unpaid' }
];

export const employeesData = [
  // Full-time
  { id: 'emp_1', name: 'Rizky Pratama', type: 'Full-time', role: 'Store Manager', baseSalary: 7500000 },
  { id: 'emp_2', name: 'Andi Saputra', type: 'Full-time', role: 'Head Barista', baseSalary: 5500000 },
  { id: 'emp_3', name: 'Nisa Rahma', type: 'Full-time', role: 'Barista', baseSalary: 4500000 },
  { id: 'emp_4', name: 'Tari Indah', type: 'Full-time', role: 'Cashier', baseSalary: 4000000 },
  { id: 'emp_5', name: 'Dodi', type: 'Full-time', role: 'Kitchen', baseSalary: 4000000 },
  { id: 'emp_6', name: 'Rahmat', type: 'Full-time', role: 'Cleaner', baseSalary: 3500000 },
  // Part-time
  { id: 'emp_7', name: 'Fikri', type: 'Part-time', role: 'Barista', dailyRate: 150000 },
  { id: 'emp_8', name: 'Sinta', type: 'Part-time', role: 'Waitress', dailyRate: 120000 },
  { id: 'emp_9', name: 'Reza', type: 'Part-time', role: 'Barista', dailyRate: 150000 },
  { id: 'emp_10', name: 'Lia', type: 'Part-time', role: 'Waitress', dailyRate: 120000 },
];
