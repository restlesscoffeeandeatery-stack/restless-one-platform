  var APP_TZ = 'Asia/Jakarta';
  var SHEETS = {
    TRANSACTIONS: 'Transaksi',
    CATEGORIES: 'Kategori',
    INVOICES: 'Invoice',
    BUDGETS: 'Target Budget',
    ACCOUNTS: 'Rekening',
    ALLOCATION_RULES: 'Aturan Alokasi'
  };

  function financeDoGet_() {
    return HtmlService.createTemplateFromFile('FinancePage')
      .evaluate()
      .setTitle('RESTLESS CASHFLOW')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  }

  function migrasiBuatDatabaseKeuangan() {
    var ss = platformSS_();
    var definitions = {};
    definitions[SHEETS.TRANSACTIONS] = ['ID', 'Tanggal', 'Tipe', 'Jumlah', 'Deskripsi', 'Kategori', 'Sub Kategori', 'Metode', 'Catatan', 'Rekening Asal', 'Rekening Tujuan', 'Referensi', 'Periode', 'Dibuat', 'Diubah'];
    definitions[SHEETS.CATEGORIES] = ['ID', 'Tipe', 'Nama', 'Kategori Induk', 'Rekening', 'Aktif', 'Diubah'];
    definitions[SHEETS.INVOICES] = ['ID', 'Nomor', 'Supplier', 'Kategori', 'Sub Kategori', 'Rekening Pembayaran', 'Email', 'Tanggal Invoice', 'Jatuh Tempo', 'Status', 'Item JSON', 'Subtotal', 'Pajak', 'Diskon', 'Total', 'Catatan', 'ID Transaksi', 'Dibuat', 'Diubah'];
    definitions[SHEETS.BUDGETS] = ['ID', 'Nama Target', 'Nominal Target', 'Terkumpul', 'Deadline', 'Catatan', 'Dibuat', 'Diubah'];
    definitions[SHEETS.ACCOUNTS] = ['ID', 'Nama', 'Jenis', 'Saldo Awal', 'Aktif', 'Prioritas', 'Diubah'];
    definitions[SHEETS.ALLOCATION_RULES] = ['ID', 'ID Rekening', 'Metode', 'Nilai', 'Periode', 'Hari Jatuh Tempo', 'Prioritas', 'Aktif', 'Diubah'];

    Object.keys(definitions).forEach(function(name) {
      var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, definitions[name].length).setValues([definitions[name]]);
        styleHeader_(sheet, definitions[name].length);
        sheet.setFrozenRows(1);
      }
    });

    seedCategories_();
    seedAccounts_();
    seedAllocationRules_();
    formatSheets_();
    return { ok: true, message: 'Database siap. Semua sheet sudah tersedia.' };
  }

  function migrasiTambahSubKategori() {
    ensureDatabase_();
    var ss = platformSS_();
    var transactionSheet = ss.getSheetByName(SHEETS.TRANSACTIONS);
    var categorySheet = ss.getSheetByName(SHEETS.CATEGORIES);
    var transactionHeaders = transactionSheet.getRange(1, 1, 1, transactionSheet.getLastColumn()).getValues()[0];
    var categoryHeaders = categorySheet.getRange(1, 1, 1, categorySheet.getLastColumn()).getValues()[0];
    var changes = [];

    if (transactionHeaders.indexOf('Sub Kategori') === -1) {
      transactionSheet.insertColumnAfter(6);
      transactionSheet.getRange(1, 7).setValue('Sub Kategori');
      changes.push('kolom Sub Kategori pada Transaksi');
    }
    if (categoryHeaders.indexOf('Kategori Induk') === -1) {
      categorySheet.insertColumnAfter(3);
      categorySheet.getRange(1, 4).setValue('Kategori Induk');
      changes.push('kolom Kategori Induk pada Kategori');
    }

    styleHeader_(transactionSheet, 11);
    styleHeader_(categorySheet, 6);
    formatSheets_();
    return { ok: true, message: changes.length ? 'Migrasi selesai: ' + changes.join(', ') + '.' : 'Migrasi sudah pernah dijalankan; tidak ada perubahan.' };
  }

  function migrasiInvoiceSupplierKePengeluaran() {
    ensureDatabase_();
    var sheet = platformSS_().getSheetByName(SHEETS.INVOICES);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var changes = [];

    if (headers.indexOf('Kategori') === -1) {
      sheet.insertColumnsAfter(3, 2);
      sheet.getRange(1, 4, 1, 2).setValues([['Kategori', 'Sub Kategori']]);
      if (sheet.getLastRow() > 1) sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).setValue('Bahan Baku');
      changes.push('Kategori dan Sub Kategori');
    }
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('ID Transaksi') === -1) {
      sheet.insertColumnAfter(15);
      sheet.getRange(1, 16).setValue('ID Transaksi');
      changes.push('ID Transaksi');
    }
    sheet.getRange(1, 3).setValue('Supplier');
    styleHeader_(sheet, 18);
    formatSheets_();
    return { ok: true, message: changes.length ? 'Migrasi invoice selesai: ' + changes.join(', ') + '.' : 'Migrasi invoice sudah pernah dijalankan.' };
  }

  function migrasiSistemRekeningDanAlokasi() {
    migrasiTambahSubKategori();
    migrasiInvoiceSupplierKePengeluaran();
    var ss = platformSS_();
    var transactionSheet = ss.getSheetByName(SHEETS.TRANSACTIONS);
    var categorySheet = ss.getSheetByName(SHEETS.CATEGORIES);
    var invoiceSheet = ss.getSheetByName(SHEETS.INVOICES);
    var changes = [];

    if (!ss.getSheetByName(SHEETS.ACCOUNTS)) {
      var accountSheet = ss.insertSheet(SHEETS.ACCOUNTS);
      accountSheet.getRange(1, 1, 1, 7).setValues([['ID', 'Nama', 'Jenis', 'Saldo Awal', 'Aktif', 'Prioritas', 'Diubah']]);
      accountSheet.setFrozenRows(1);
      changes.push('sheet Rekening');
    }
    if (!ss.getSheetByName(SHEETS.ALLOCATION_RULES)) {
      var ruleSheet = ss.insertSheet(SHEETS.ALLOCATION_RULES);
      ruleSheet.getRange(1, 1, 1, 9).setValues([['ID', 'ID Rekening', 'Metode', 'Nilai', 'Periode', 'Hari Jatuh Tempo', 'Prioritas', 'Aktif', 'Diubah']]);
      ruleSheet.setFrozenRows(1);
      changes.push('sheet Aturan Alokasi');
    }
    seedAccounts_();
    seedAllocationRules_();

    var transactionHeaders = transactionSheet.getRange(1, 1, 1, transactionSheet.getLastColumn()).getValues()[0];
    if (transactionHeaders.indexOf('Rekening Asal') === -1) {
      transactionSheet.insertColumnsAfter(9, 4);
      transactionSheet.getRange(1, 10, 1, 4).setValues([['Rekening Asal', 'Rekening Tujuan', 'Referensi', 'Periode']]);
      if (transactionSheet.getLastRow() > 1) {
        var types = transactionSheet.getRange(2, 3, transactionSheet.getLastRow() - 1, 1).getValues();
        var accountValues = types.map(function(row) {
          return row[0] === 'Pemasukan' ? ['', 'ACC-UTAMA', 'MIGRASI-LEGACY', ''] : ['ACC-UTAMA', '', 'MIGRASI-LEGACY', ''];
        });
        transactionSheet.getRange(2, 10, accountValues.length, 4).setValues(accountValues);
      }
      changes.push('rekening pada Transaksi');
    }

    var categoryHeaders = categorySheet.getRange(1, 1, 1, categorySheet.getLastColumn()).getValues()[0];
    if (categoryHeaders.indexOf('Rekening') === -1) {
      categorySheet.insertColumnAfter(4);
      categorySheet.getRange(1, 5).setValue('Rekening');
      if (categorySheet.getLastRow() > 1) {
        var categoryRows = categorySheet.getRange(2, 1, categorySheet.getLastRow() - 1, 7).getValues();
        categorySheet.getRange(2, 5, categoryRows.length, 1).setValues(categoryRows.map(function(row) {
          return [defaultAccountForCategory_(row[2], row[3])];
        }));
      }
      changes.push('rekening pada Kategori');
    }

    var invoiceHeaders = invoiceSheet.getRange(1, 1, 1, invoiceSheet.getLastColumn()).getValues()[0];
    if (invoiceHeaders.indexOf('Rekening Pembayaran') === -1) {
      invoiceSheet.insertColumnAfter(5);
      invoiceSheet.getRange(1, 6).setValue('Rekening Pembayaran');
      if (invoiceSheet.getLastRow() > 1) {
        var invoiceCategories = invoiceSheet.getRange(2, 4, invoiceSheet.getLastRow() - 1, 2).getValues();
        invoiceSheet.getRange(2, 6, invoiceCategories.length, 1).setValues(invoiceCategories.map(function(row) {
          return [defaultAccountForCategory_(row[1], row[0])];
        }));
      }
      changes.push('rekening pembayaran pada Invoice');
    }

    styleHeader_(transactionSheet, 15);
    styleHeader_(categorySheet, 7);
    styleHeader_(invoiceSheet, 19);
    styleHeader_(ss.getSheetByName(SHEETS.ACCOUNTS), 7);
    styleHeader_(ss.getSheetByName(SHEETS.ALLOCATION_RULES), 9);
    formatSheets_();
    return { ok: true, message: changes.length ? 'Migrasi rekening selesai: ' + changes.join(', ') + '.' : 'Migrasi rekening sudah pernah dijalankan.' };
  }

  function getAppData() {
    ensureDatabase_();
    var ss = platformSS_();
    var transactionRows = financeSheetRows_(ss.getSheetByName(SHEETS.TRANSACTIONS), 15);
    var categoryRows = financeSheetRows_(ss.getSheetByName(SHEETS.CATEGORIES), 7);
    var invoiceRows = financeSheetRows_(ss.getSheetByName(SHEETS.INVOICES), 19);
    var budgetRows = financeSheetRows_(ss.getSheetByName(SHEETS.BUDGETS), 8);
    var accountRows = financeSheetRows_(ss.getSheetByName(SHEETS.ACCOUNTS), 7);
    var ruleRows = financeSheetRows_(ss.getSheetByName(SHEETS.ALLOCATION_RULES), 9);
    var period = currentPeriod_();
    var transactions = financeTransactionsFromRows_(transactionRows);
    var categories = financeCategoriesFromRows_(categoryRows);
    var allocationRules = financeAllocationRulesFromRows_(ruleRows, transactionRows, period);
    return {
      transactions: transactions,
      categories: categories,
      invoices: financeInvoicesFromRows_(invoiceRows),
      budgets: financeBudgetsFromRows_(budgetRows),
      accounts: financeAccountsFromRows_(accountRows, allocationRules, transactionRows),
      allocationRules: allocationRules,
      allocationPeriod: period,
      today: Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd')
    };
  }

  function getAppDataJson() {
    return JSON.stringify(getAppData());
  }

  /** Snapshot satu kali per sheet untuk respons dashboard yang cepat. */
  function financeSheetRows_(sheet, width) {
    var lastRow = sheet.getLastRow();
    return lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, width).getValues();
  }

  function financeTransactionsFromRows_(rows) {
    return rows.map(function(r) {
      return { id: r[0], date: cellToDateString(r[1], 'yyyy-MM-dd'), type: r[2], amount: number_(r[3]),
        description: r[4], category: r[5], subcategory: r[6], method: r[7], note: r[8],
        sourceAccount: r[9] || '', destinationAccount: r[10] || '', reference: r[11] || '', period: r[12] || '',
        created: cellToDateString(r[13], 'dd/MM/yyyy HH:mm') };
    }).sort(function(a, b) { return b.date.localeCompare(a.date); });
  }

  function financeCategoriesFromRows_(rows) {
    return rows.map(function(r) {
      return { id: r[0], type: r[1], name: r[2], parent: r[3] || '', accountId: r[4] || 'ACC-UTAMA', active: r[5] === true || String(r[5]).toLowerCase() === 'true' };
    });
  }

  function financeInvoicesFromRows_(rows) {
    return rows.map(function(r) {
      var items = [];
      try { items = JSON.parse(r[10] || '[]'); } catch (err) { items = []; }
      return { id: r[0], number: r[1], supplier: r[2], client: r[2], category: r[3], subcategory: r[4], paymentAccount: r[5], email: r[6],
        invoiceDate: cellToDateString(r[7], 'yyyy-MM-dd'), dueDate: cellToDateString(r[8], 'yyyy-MM-dd'), status: r[9],
        items: items, subtotal: number_(r[11]), tax: number_(r[12]), discount: number_(r[13]), total: number_(r[14]),
        note: r[15], transactionId: r[16] || '' };
    }).sort(function(a, b) { return b.invoiceDate.localeCompare(a.invoiceDate); });
  }

  function financeBudgetsFromRows_(rows) {
    return rows.map(function(r) {
      return { id: r[0], name: r[1], target: number_(r[2]), saved: number_(r[3]), deadline: cellToDateString(r[4], 'yyyy-MM-dd'), note: r[5] };
    }).sort(function(a, b) { return a.deadline.localeCompare(b.deadline); });
  }

  function financeAllocationRulesFromRows_(ruleRows, transactionRows, period) {
    var allocatedByAccount = {};
    transactionRows.forEach(function(r) {
      if (r[2] === 'Transfer' && clean_(r[11]).indexOf('ALLOC-') === 0 && clean_(r[12]) === period) {
        allocatedByAccount[clean_(r[10])] = number_(allocatedByAccount[clean_(r[10])]) + number_(r[3]);
      }
    });
    return ruleRows.map(function(r) {
      return { id: r[0], accountId: r[1], method: r[2], value: number_(r[3]), frequency: r[4], dueDay: number_(r[5]),
        priority: number_(r[6]), active: r[7] === true || String(r[7]).toLowerCase() === 'true', allocated: number_(allocatedByAccount[r[1]]) };
    }).sort(function(a, b) { return a.priority - b.priority; });
  }

  function financeAccountsFromRows_(accountRows, rules, transactionRows) {
    var balances = {};
    accountRows.forEach(function(r) { balances[String(r[0])] = number_(r[3]); });
    transactionRows.forEach(function(r) {
      var type = clean_(r[2]), amount = number_(r[3]), source = clean_(r[9]), destination = clean_(r[10]);
      if (type === 'Pemasukan' && destination) balances[destination] = number_(balances[destination]) + amount;
      if (type === 'Pengeluaran' && source) balances[source] = number_(balances[source]) - amount;
      if (type === 'Transfer') {
        if (source) balances[source] = number_(balances[source]) - amount;
        if (destination) balances[destination] = number_(balances[destination]) + amount;
      }
      if (type === 'Penyesuaian' && destination) balances[destination] = number_(balances[destination]) + amount;
    });
    return accountRows.map(function(r) {
      var rule = rules.filter(function(item) { return item.accountId === r[0]; })[0] || {};
      var target = rule.method === 'Target Nominal' ? rule.value : 0;
      var allocated = number_(rule.allocated);
      return { id: r[0], name: r[1], kind: r[2], active: r[4] === true || String(r[4]).toLowerCase() === 'true', priority: number_(r[5]),
        balance: number_(balances[r[0]]), target: target, allocated: allocated, shortfall: Math.max(0, target - allocated),
        progress: target > 0 ? Math.min(100, Math.round(allocated / target * 100)) : 0, dueDay: rule.dueDay || 0, method: rule.method || '' };
    }).sort(function(a, b) { return a.priority - b.priority; });
  }

  function saveTransaction(payload) {
    ensureDatabase_();
    validateRequired_(payload, ['date', 'type', 'amount', 'description', 'category']);
    if (['Pemasukan', 'Pengeluaran'].indexOf(payload.type) === -1) throw new Error('Tipe transaksi tidak valid.');
    var amount = number_(payload.amount);
    if (amount <= 0) throw new Error('Nominal harus lebih dari 0.');
    var accountId = clean_(payload.accountId || 'ACC-UTAMA');
    assertActiveAccount_(accountId);
    if (payload.subcategory) {
      var validSubcategory = readCategories_().some(function(item) {
        return item.type === payload.type && item.parent === clean_(payload.category) &&
          item.name === clean_(payload.subcategory) && item.active;
      });
      if (!validSubcategory) throw new Error('Subkategori tidak sesuai dengan kategori yang dipilih.');
    }
    var now = new Date();
    var id = Utilities.getUuid();
    var date = parseDate_(payload.date);
    var description = clean_(payload.description);
    var category = clean_(payload.category);
    var subcategory = clean_(payload.subcategory || '');
    var method = clean_(payload.method || 'Transfer');
    var note = clean_(payload.note || '');
    var sourceAccount = payload.type === 'Pengeluaran' ? accountId : '';
    var destinationAccount = payload.type === 'Pemasukan' ? accountId : '';
    platformSS_().getSheetByName(SHEETS.TRANSACTIONS).appendRow([
      id, date, payload.type, amount,
      description, category, subcategory,
      method, note,
      sourceAccount, destinationAccount,
      '', '', now, now
    ]);
    // Jangan panggil getAppData() di jalur simpan. Membaca ulang semua sheet
    // setelah append membuat respons timeout ketika histori transaksi membesar.
    // Frontend memasukkan record ini secara optimistis lalu refresh diam-diam.
    return {
      ok: true,
      transaction: {
        id: id,
        date: Utilities.formatDate(date, APP_TZ, 'yyyy-MM-dd'),
        type: payload.type,
        amount: amount,
        description: description,
        category: category,
        subcategory: subcategory,
        method: method,
        note: note,
        sourceAccount: sourceAccount,
        destinationAccount: destinationAccount,
        reference: '',
        period: '',
        created: Utilities.formatDate(now, APP_TZ, 'dd/MM/yyyy HH:mm')
      }
    };
  }

  function updateTransaction(payload) {
    ensureDatabase_();
    validateRequired_(payload, ['id', 'date', 'type', 'amount', 'description', 'category']);
    if (['Pemasukan', 'Pengeluaran'].indexOf(payload.type) === -1) throw new Error('Tipe transaksi tidak valid.');
    var amount = number_(payload.amount);
    if (amount <= 0) throw new Error('Nominal harus lebih dari 0.');
    var sheet = platformSS_().getSheetByName(SHEETS.TRANSACTIONS);
    var row = findRowById_(sheet, clean_(payload.id));
    if (!row) throw new Error('Transaksi tidak ditemukan.');
    var previous = sheet.getRange(row, 1, 1, 15).getValues()[0];
    var reference = clean_(previous[11] || '');
    if (reference.indexOf('INVOICE:') === 0 || reference.indexOf('PAYROLL_RUN:') === 0) {
      throw new Error('Transaksi otomatis invoice/payroll harus diubah dari modul asalnya.');
    }
    var accountId = clean_(payload.accountId || 'ACC-UTAMA');
    assertActiveAccount_(accountId);
    var sourceAccount = payload.type === 'Pengeluaran' ? accountId : '';
    var destinationAccount = payload.type === 'Pemasukan' ? accountId : '';
    sheet.getRange(row, 2, 1, 14).setValues([[
      parseDate_(payload.date), payload.type, amount, clean_(payload.description), clean_(payload.category),
      clean_(payload.subcategory || ''), clean_(payload.method || previous[7] || 'Transfer'), clean_(payload.note || ''),
      sourceAccount, destinationAccount, reference, clean_(previous[12] || ''), previous[13] || new Date(), new Date()
    ]]);
    return { ok: true, refreshRequired: true, id: clean_(payload.id) };
  }

  function saveCategory(payload) {
    ensureDatabase_();
    validateRequired_(payload, ['type', 'name']);
    if (['Pemasukan', 'Pengeluaran'].indexOf(payload.type) === -1) throw new Error('Tipe kategori tidak valid.');
    var name = clean_(payload.name);
    var categories = readCategories_();
    var parent = clean_(payload.parent || '');
    var accountId = clean_(payload.accountId || defaultAccountForCategory_(name, parent));
    assertActiveAccount_(accountId);
    if (parent) {
      var validParent = categories.some(function(item) {
        return item.type === payload.type && item.name === parent && !item.parent && item.active;
      });
      if (!validParent) throw new Error('Kategori induk tidak valid atau sudah nonaktif.');
    }
    var exists = categories.some(function(item) {
      return item.type === payload.type && item.parent === parent && item.name.toLowerCase() === name.toLowerCase() && item.active;
    });
    if (exists) throw new Error('Kategori tersebut sudah ada.');
    platformSS_().getSheetByName(SHEETS.CATEGORIES)
      .appendRow([Utilities.getUuid(), payload.type, name, parent, accountId, true, new Date()]);
    return { ok: true, refreshRequired: true };
  }

  function setCategoryActive(id, active) {
    ensureDatabase_();
    var sheet = platformSS_().getSheetByName(SHEETS.CATEGORIES);
    var row = findRowById_(sheet, id);
    if (!row) throw new Error('Kategori tidak ditemukan.');
    sheet.getRange(row, 6, 1, 2).setValues([[Boolean(active), new Date()]]);
    return { ok: true, refreshRequired: true };
  }

  function saveInvoice(payload) {
    ensureDatabase_();
    validateRequired_(payload, ['supplier', 'category', 'invoiceDate', 'dueDate', 'items']);
    var categoryValid = readCategories_().some(function(item) {
      if (!item.active || item.type !== 'Pengeluaran') return false;
      if (payload.subcategory) return item.name === clean_(payload.subcategory) && item.parent === clean_(payload.category);
      return item.name === clean_(payload.category) && !item.parent;
    });
    if (!categoryValid) throw new Error('Kategori supplier tidak valid atau sudah nonaktif.');
    var items = payload.items.filter(function(item) { return clean_(item.name) && number_(item.qty) > 0; });
    if (!items.length) throw new Error('Invoice harus memiliki minimal satu item.');
    var subtotal = items.reduce(function(sum, item) { return sum + number_(item.qty) * number_(item.price); }, 0);
    var tax = number_(payload.tax);
    var discount = number_(payload.discount);
    var total = Math.max(0, subtotal + (subtotal * tax / 100) - discount);
    var sheet = platformSS_().getSheetByName(SHEETS.INVOICES);
    var now = new Date();
    var id = clean_(payload.id) || Utilities.getUuid();
    var paymentAccount = accountForCategory_(clean_(payload.category), clean_(payload.subcategory || ''));
    var values = [id, clean_(payload.number) || nextInvoiceNumber_(sheet), clean_(payload.supplier), clean_(payload.category),
      clean_(payload.subcategory || ''), paymentAccount, clean_(payload.email || ''), parseDate_(payload.invoiceDate), parseDate_(payload.dueDate),
      clean_(payload.status || 'Draft'), JSON.stringify(items), subtotal, tax, discount, total, clean_(payload.note || ''), '', now, now];
    var row = payload.id ? findRowById_(sheet, payload.id) : 0;
    if (row) {
      values[16] = sheet.getRange(row, 17).getValue() || '';
      values[17] = sheet.getRange(row, 18).getValue() || now;
      sheet.getRange(row, 1, 1, values.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }
    return { ok: true, refreshRequired: true };
  }

  function updateInvoiceStatus(id, status) {
    ensureDatabase_();
    if (['Draft', 'Terkirim', 'Dibayar', 'Terlambat'].indexOf(status) === -1) throw new Error('Status invoice tidak valid.');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
    var sheet = platformSS_().getSheetByName(SHEETS.INVOICES);
    var row = findRowById_(sheet, id);
    if (!row) throw new Error('Invoice tidak ditemukan.');
    var invoice = sheet.getRange(row, 1, 1, 19).getValues()[0];
    if (status === 'Dibayar' && !invoice[16]) {
      var transactionId = createExpenseFromInvoice_(invoice);
      sheet.getRange(row, 17).setValue(transactionId);
    }
    sheet.getRange(row, 10).setValue(status);
    sheet.getRange(row, 19).setValue(new Date());
    return { ok: true, refreshRequired: true };
    } finally {
      lock.releaseLock();
    }
  }

  function createExpenseFromInvoice_(invoice) {
    var amount = number_(invoice[14]);
    if (amount <= 0) throw new Error('Total invoice tidak valid sehingga pengeluaran belum dibuat.');
    var category = clean_(invoice[3]) || 'Bahan Baku';
    var invoiceMarker = 'Invoice ID: ' + clean_(invoice[0]);
    var existingTransactions = dataRows_(SHEETS.TRANSACTIONS, 15);
    for (var i = 0; i < existingTransactions.length; i++) {
      if (clean_(existingTransactions[i][8]).indexOf(invoiceMarker) !== -1) return existingTransactions[i][0];
    }
    var accountId = clean_(invoice[5]) || accountForCategory_(category, clean_(invoice[4] || ''));
    var balance = accountBalanceById_(accountId);
    if (balance < amount) throw new Error('Saldo rekening ' + accountNameById_(accountId) + ' kurang ' + formatRupiahServer_(amount - balance) + '. Alokasikan atau transfer dana terlebih dahulu.');
    var transactionId = Utilities.getUuid();
    var now = new Date();
    platformSS_().getSheetByName(SHEETS.TRANSACTIONS).appendRow([
      transactionId, now, 'Pengeluaran', amount,
      'Pembayaran ' + clean_(invoice[1]) + ' - ' + clean_(invoice[2]),
      category, clean_(invoice[4] || ''), 'Transfer',
      'Dibuat otomatis dari invoice supplier ' + clean_(invoice[1]) + ' · ' + invoiceMarker,
      accountId, '', 'INVOICE:' + clean_(invoice[0]), currentPeriod_(), now, now
    ]);
    return transactionId;
  }

  function saveBudget(payload) {
    ensureDatabase_();
    validateRequired_(payload, ['name', 'target', 'deadline']);
    var target = number_(payload.target);
    var saved = number_(payload.saved);
    if (target <= 0 || saved < 0) throw new Error('Nominal target atau terkumpul tidak valid.');
    var sheet = platformSS_().getSheetByName(SHEETS.BUDGETS);
    var now = new Date();
    var id = clean_(payload.id) || Utilities.getUuid();
    var values = [id, clean_(payload.name), target, saved, parseDate_(payload.deadline), clean_(payload.note || ''), now, now];
    var row = payload.id ? findRowById_(sheet, payload.id) : 0;
    if (row) {
      values[6] = sheet.getRange(row, 7).getValue() || now;
      sheet.getRange(row, 1, 1, values.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }
    return { ok: true, refreshRequired: true };
  }

  function readTransactions_() {
    var rows = dataRows_(SHEETS.TRANSACTIONS, 15);
    return rows.map(function(r) {
      return { id: r[0], date: cellToDateString(r[1], 'yyyy-MM-dd'), type: r[2], amount: number_(r[3]),
        description: r[4], category: r[5], subcategory: r[6], method: r[7], note: r[8],
        sourceAccount: r[9] || '', destinationAccount: r[10] || '', reference: r[11] || '', period: r[12] || '',
        created: cellToDateString(r[13], 'dd/MM/yyyy HH:mm') };
    }).sort(function(a, b) { return b.date.localeCompare(a.date); });
  }

  function readCategories_() {
    return dataRows_(SHEETS.CATEGORIES, 7).map(function(r) {
      return { id: r[0], type: r[1], name: r[2], parent: r[3] || '', accountId: r[4] || 'ACC-UTAMA', active: r[5] === true || String(r[5]).toLowerCase() === 'true' };
    });
  }

  function readInvoices_() {
    return dataRows_(SHEETS.INVOICES, 19).map(function(r) {
      var items = [];
      try { items = JSON.parse(r[10] || '[]'); } catch (err) { items = []; }
      return { id: r[0], number: r[1], supplier: r[2], client: r[2], category: r[3], subcategory: r[4], paymentAccount: r[5], email: r[6],
        invoiceDate: cellToDateString(r[7], 'yyyy-MM-dd'), dueDate: cellToDateString(r[8], 'yyyy-MM-dd'), status: r[9],
        items: items, subtotal: number_(r[11]), tax: number_(r[12]), discount: number_(r[13]), total: number_(r[14]),
        note: r[15], transactionId: r[16] || '' };
    }).sort(function(a, b) { return b.invoiceDate.localeCompare(a.invoiceDate); });
  }

  function readBudgets_() {
    return dataRows_(SHEETS.BUDGETS, 8).map(function(r) {
      return { id: r[0], name: r[1], target: number_(r[2]), saved: number_(r[3]),
        deadline: cellToDateString(r[4], 'yyyy-MM-dd'), note: r[5] };
    }).sort(function(a, b) { return a.deadline.localeCompare(b.deadline); });
  }

  function cellToDateString(value, pattern) {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return Utilities.formatDate(value, APP_TZ, pattern || 'dd/MM/yyyy HH:mm');
    }
    return String(value || '');
  }

  function ensureDatabase_() {
    var ss = platformSS_();
    if (!ss.getSheetByName(SHEETS.TRANSACTIONS) || !ss.getSheetByName(SHEETS.CATEGORIES) ||
        !ss.getSheetByName(SHEETS.INVOICES) || !ss.getSheetByName(SHEETS.BUDGETS) ||
        !ss.getSheetByName(SHEETS.ACCOUNTS) || !ss.getSheetByName(SHEETS.ALLOCATION_RULES)) {
      migrasiBuatDatabaseKeuangan();
    }
  }

  function dataRows_(name, width) {
    var sheet = platformSS_().getSheetByName(name);
    var lastRow = sheet.getLastRow();
    return lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, width).getValues();
  }

  function findRowById_(sheet, id) {
    if (!id || sheet.getLastRow() < 2) return 0;
    var finder = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
    return finder ? finder.getRow() : 0;
  }

  function validateRequired_(payload, fields) {
    if (!payload) throw new Error('Data tidak ditemukan.');
    fields.forEach(function(field) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') throw new Error('Mohon lengkapi semua data wajib.');
    });
  }

  function parseDate_(value) {
    var parts = String(value).split('-');
    if (parts.length !== 3) throw new Error('Format tanggal tidak valid.');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  }

  function number_(value) {
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    var parsed = Number(String(value || 0).replace(/[^0-9.-]/g, ''));
    return isFinite(parsed) ? parsed : 0;
  }

  function clean_(value) { return String(value == null ? '' : value).trim(); }

  function nextInvoiceNumber_(sheet) {
    var sequence = Math.max(1, sheet.getLastRow());
    return 'INV-' + Utilities.formatDate(new Date(), APP_TZ, 'yyyyMM') + '-' + String(sequence).padStart(3, '0');
  }

  function seedCategories_() {
    var sheet = platformSS_().getSheetByName(SHEETS.CATEGORIES);
    if (sheet.getLastRow() > 1) return;
    var now = new Date();
    var defaults = [
      ['Pemasukan', 'Penjualan'], ['Pemasukan', 'Jasa'], ['Pemasukan', 'Investasi'], ['Pemasukan', 'Lainnya'],
      ['Pengeluaran', 'Operasional'], ['Pengeluaran', 'Bahan Baku'], ['Pengeluaran', 'Gaji'], ['Pengeluaran', 'Transportasi'], ['Pengeluaran', 'Lainnya']
    ];
    sheet.getRange(2, 1, defaults.length, 7).setValues(defaults.map(function(row) {
      return [Utilities.getUuid(), row[0], row[1], '', defaultAccountForCategory_(row[1], ''), true, now];
    }));
  }

  function styleHeader_(sheet, width) {
    sheet.getRange(1, 1, 1, width).setBackground('#173F36').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  function formatSheets_() {
    var ss = platformSS_();
    ss.getSheetByName(SHEETS.TRANSACTIONS).getRange('B:B').setNumberFormat('dd/MM/yyyy');
    ss.getSheetByName(SHEETS.TRANSACTIONS).getRange('D:D').setNumberFormat('Rp #,##0');
    ss.getSheetByName(SHEETS.INVOICES).getRange('H:I').setNumberFormat('dd/MM/yyyy');
    ss.getSheetByName(SHEETS.INVOICES).getRange('L:O').setNumberFormat('Rp #,##0');
    ss.getSheetByName(SHEETS.BUDGETS).getRange('C:D').setNumberFormat('Rp #,##0');
    ss.getSheetByName(SHEETS.BUDGETS).getRange('E:E').setNumberFormat('dd/MM/yyyy');
    if (ss.getSheetByName(SHEETS.ACCOUNTS)) ss.getSheetByName(SHEETS.ACCOUNTS).getRange('D:D').setNumberFormat('Rp #,##0');
    if (ss.getSheetByName(SHEETS.ALLOCATION_RULES)) ss.getSheetByName(SHEETS.ALLOCATION_RULES).getRange('D:D').setNumberFormat('#,##0.00');
  }

  function seedAccounts_() {
    var sheet = platformSS_().getSheetByName(SHEETS.ACCOUNTS);
    if (!sheet || sheet.getLastRow() > 1) return;
    var now = new Date();
    var accounts = [
      ['ACC-UTAMA', 'Rekening Utama', 'Bank', 0, true, 0, now],
      ['ACC-BAHAN', 'Bahan Baku', 'Virtual', 0, true, 1, now],
      ['ACC-PLN', 'PLN', 'Virtual', 0, true, 2, now],
      ['ACC-PARTTIME', 'PartTime', 'Virtual', 0, true, 3, now],
      ['ACC-FULLTIME', 'Gaji Fulltime', 'Virtual', 0, true, 4, now],
      ['ACC-WIFI', 'WiFi', 'Virtual', 0, true, 5, now],
      ['ACC-CADANGAN', 'Dana Cadangan', 'Virtual', 0, true, 6, now]
    ];
    sheet.getRange(2, 1, accounts.length, 7).setValues(accounts);
  }

  function seedAllocationRules_() {
    var sheet = platformSS_().getSheetByName(SHEETS.ALLOCATION_RULES);
    if (!sheet || sheet.getLastRow() > 1) return;
    var now = new Date();
    var rules = [
      ['RULE-BAHAN', 'ACC-BAHAN', 'Target Nominal', 0, 'Bulanan', 5, 1, true, now],
      ['RULE-PLN', 'ACC-PLN', 'Target Nominal', 0, 'Bulanan', 20, 2, true, now],
      ['RULE-PARTTIME', 'ACC-PARTTIME', 'Target Nominal', 0, 'Bulanan', 28, 3, true, now],
      ['RULE-FULLTIME', 'ACC-FULLTIME', 'Target Nominal', 0, 'Bulanan', 28, 4, true, now],
      ['RULE-WIFI', 'ACC-WIFI', 'Target Nominal', 0, 'Bulanan', 10, 5, true, now],
      ['RULE-CADANGAN', 'ACC-CADANGAN', 'Sisa', 0, 'Bulanan', 31, 6, true, now]
    ];
    sheet.getRange(2, 1, rules.length, 9).setValues(rules);
  }

  function readAccounts_() {
    return dataRows_(SHEETS.ACCOUNTS, 7).map(function(r) {
      return { id: r[0], name: r[1], kind: r[2], openingBalance: number_(r[3]), active: r[4] === true || String(r[4]).toLowerCase() === 'true', priority: number_(r[5]) };
    }).sort(function(a, b) { return a.priority - b.priority; });
  }

  function computeAccountBalances_() {
    var balances = {};
    readAccounts_().forEach(function(account) { balances[account.id] = account.openingBalance; });
    dataRows_(SHEETS.TRANSACTIONS, 15).forEach(function(r) {
      var type = clean_(r[2]);
      var amount = number_(r[3]);
      var source = clean_(r[9]);
      var destination = clean_(r[10]);
      if (type === 'Pemasukan' && destination) balances[destination] = number_(balances[destination]) + amount;
      if (type === 'Pengeluaran' && source) balances[source] = number_(balances[source]) - amount;
      if (type === 'Transfer') {
        if (source) balances[source] = number_(balances[source]) - amount;
        if (destination) balances[destination] = number_(balances[destination]) + amount;
      }
      if (type === 'Penyesuaian' && destination) balances[destination] = number_(balances[destination]) + amount;
    });
    return balances;
  }

  function readAccountsWithBalances_() {
    var balances = computeAccountBalances_();
    var rules = readAllocationRules_();
    return readAccounts_().map(function(account) {
      var rule = rules.filter(function(item) { return item.accountId === account.id; })[0] || {};
      var target = rule.method === 'Target Nominal' ? rule.value : 0;
      var allocated = number_(rule.allocated);
      return { id: account.id, name: account.name, kind: account.kind, active: account.active, priority: account.priority,
        balance: number_(balances[account.id]), target: target, allocated: allocated, shortfall: Math.max(0, target - allocated),
        progress: target > 0 ? Math.min(100, Math.round(allocated / target * 100)) : 0, dueDay: rule.dueDay || 0, method: rule.method || '' };
    });
  }

  function readAllocationRules_(targetPeriod) {
    var period = clean_(targetPeriod || currentPeriod_());
    var allocatedByAccount = {};
    dataRows_(SHEETS.TRANSACTIONS, 15).forEach(function(r) {
      if (r[2] === 'Transfer' && clean_(r[11]).indexOf('ALLOC-') === 0 && clean_(r[12]) === period) {
        allocatedByAccount[clean_(r[10])] = number_(allocatedByAccount[clean_(r[10])]) + number_(r[3]);
      }
    });
    return dataRows_(SHEETS.ALLOCATION_RULES, 9).map(function(r) {
      return { id: r[0], accountId: r[1], method: r[2], value: number_(r[3]), frequency: r[4], dueDay: number_(r[5]),
        priority: number_(r[6]), active: r[7] === true || String(r[7]).toLowerCase() === 'true', allocated: number_(allocatedByAccount[r[1]]) };
    }).sort(function(a, b) { return a.priority - b.priority; });
  }

  function getAllocationPreview(amount, period) {
    ensureDatabase_();
    var mainBalance = accountBalanceById_('ACC-UTAMA');
    var pool = number_(amount || mainBalance);
    if (pool <= 0) throw new Error('Saldo Rekening Utama belum tersedia untuk dialokasikan.');
    if (pool > mainBalance) throw new Error('Nominal alokasi melebihi saldo Rekening Utama.');
    var selectedPeriod = clean_(period || currentPeriod_());
    var remaining = pool;
    var items = [];
    var rules = readAllocationRules_(selectedPeriod).filter(function(rule) { return rule.active && rule.accountId !== 'ACC-UTAMA'; });
    rules.sort(function(a, b) {
      var dueDifference = daysUntilDue_(selectedPeriod, a.dueDay) - daysUntilDue_(selectedPeriod, b.dueDay);
      return dueDifference || a.priority - b.priority;
    });
    rules.forEach(function(rule) {
      if (rule.method === 'Sisa') return;
      var desired = rule.method === 'Persentase' ? Math.round(pool * rule.value / 100) : Math.max(0, rule.value - rule.allocated);
      var allocated = Math.min(remaining, desired);
      if (allocated > 0) {
        items.push({ ruleId: rule.id, accountId: rule.accountId, accountName: accountNameById_(rule.accountId), amount: allocated, method: rule.method });
        remaining -= allocated;
      }
    });
    var reserveRule = rules.filter(function(rule) { return rule.method === 'Sisa'; })[0];
    if (remaining > 0 && reserveRule) {
      items.push({ ruleId: reserveRule.id, accountId: reserveRule.accountId, accountName: accountNameById_(reserveRule.accountId), amount: remaining, method: 'Sisa' });
      remaining = 0;
    }
    return { amount: pool, available: mainBalance, period: selectedPeriod, items: items, unallocated: remaining };
  }

  function commitAllocation(payload) {
    ensureDatabase_();
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var preview = getAllocationPreview(payload.amount, payload.period);
      if (!preview.items.length) throw new Error('Tidak ada aturan aktif yang menghasilkan alokasi. Atur target terlebih dahulu.');
      var now = new Date();
      var reference = 'ALLOC-' + Utilities.getUuid();
      var rows = preview.items.map(function(item) {
        return [Utilities.getUuid(), now, 'Transfer', item.amount, 'Alokasi ' + preview.period + ' ke ' + item.accountName,
          'Alokasi Rekening', '', 'Transfer', item.method, 'ACC-UTAMA', item.accountId, reference, preview.period, now, now];
      });
      var sheet = platformSS_().getSheetByName(SHEETS.TRANSACTIONS);
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 15).setValues(rows);
      return { ok: true, refreshRequired: true };
    } finally {
      lock.releaseLock();
    }
  }

  function createAccountTransfer(payload) {
    ensureDatabase_();
    validateRequired_(payload, ['sourceAccount', 'destinationAccount', 'amount']);
    var source = clean_(payload.sourceAccount);
    var destination = clean_(payload.destinationAccount);
    var amount = number_(payload.amount);
    if (source === destination) throw new Error('Rekening asal dan tujuan tidak boleh sama.');
    assertActiveAccount_(source);
    assertActiveAccount_(destination);
    if (amount <= 0) throw new Error('Nominal transfer harus lebih dari 0.');
    if (accountBalanceById_(source) < amount) throw new Error('Saldo rekening asal tidak mencukupi.');
    var now = new Date();
    platformSS_().getSheetByName(SHEETS.TRANSACTIONS).appendRow([
      Utilities.getUuid(), now, 'Transfer', amount, clean_(payload.description || 'Transfer antar rekening'), 'Transfer Rekening', '', 'Transfer',
      clean_(payload.note || ''), source, destination, 'TRANSFER-' + Utilities.getUuid(), currentPeriod_(), now, now
    ]);
    return { ok: true, refreshRequired: true };
  }

  function reconcileAccount(payload) {
    ensureDatabase_();
    validateRequired_(payload, ['accountId', 'actualBalance']);
    var accountId = clean_(payload.accountId);
    assertActiveAccount_(accountId);
    var current = accountBalanceById_(accountId);
    var actual = number_(payload.actualBalance);
    var difference = actual - current;
    if (difference === 0) return { ok: true, refreshRequired: false };
    var now = new Date();
    platformSS_().getSheetByName(SHEETS.TRANSACTIONS).appendRow([
      Utilities.getUuid(), now, 'Penyesuaian', difference, 'Rekonsiliasi ' + accountNameById_(accountId), 'Penyesuaian Saldo', '', 'Rekonsiliasi',
      clean_(payload.note || ''), '', accountId, 'RECON-' + Utilities.getUuid(), currentPeriod_(), now, now
    ]);
    return { ok: true, refreshRequired: true };
  }

  function saveAllocationRule(payload) {
    ensureDatabase_();
    validateRequired_(payload, ['id', 'method', 'value', 'dueDay']);
    if (['Target Nominal', 'Persentase', 'Sisa'].indexOf(payload.method) === -1) throw new Error('Metode alokasi tidak valid.');
    var sheet = platformSS_().getSheetByName(SHEETS.ALLOCATION_RULES);
    var row = findRowById_(sheet, payload.id);
    if (!row) throw new Error('Aturan alokasi tidak ditemukan.');
    var accountId = clean_(sheet.getRange(row, 2).getValue());
    if (payload.method === 'Sisa' && accountId !== 'ACC-CADANGAN') throw new Error('Metode Sisa hanya boleh digunakan untuk Dana Cadangan.');
    if (accountId === 'ACC-CADANGAN' && payload.method !== 'Sisa') throw new Error('Dana Cadangan harus tetap menggunakan metode Sisa.');
    var value = payload.method === 'Sisa' ? 0 : number_(payload.value);
    if (value < 0 || (payload.method === 'Persentase' && value > 100)) throw new Error('Nilai aturan tidak valid.');
    var dueDay = Math.max(1, Math.min(31, number_(payload.dueDay)));
    sheet.getRange(row, 3, 1, 7).setValues([[payload.method, value, 'Bulanan', dueDay, number_(payload.priority), payload.active !== false, new Date()]]);
    return { ok: true, refreshRequired: true };
  }

  function setCategoryAccount(id, accountId) {
    ensureDatabase_();
    assertActiveAccount_(accountId);
    var sheet = platformSS_().getSheetByName(SHEETS.CATEGORIES);
    var row = findRowById_(sheet, id);
    if (!row) throw new Error('Kategori tidak ditemukan.');
    sheet.getRange(row, 5).setValue(accountId);
    sheet.getRange(row, 7).setValue(new Date());
    return { ok: true, refreshRequired: true };
  }

  function accountForCategory_(category, subcategory) {
    var categories = readCategories_();
    var child = categories.filter(function(item) { return item.type === 'Pengeluaran' && item.name === subcategory && item.parent === category; })[0];
    if (child && child.accountId) return child.accountId;
    var parent = categories.filter(function(item) { return item.type === 'Pengeluaran' && item.name === category && !item.parent; })[0];
    return parent && parent.accountId ? parent.accountId : defaultAccountForCategory_(subcategory, category);
  }

  function defaultAccountForCategory_(name, parent) {
    var text = (clean_(parent) + ' ' + clean_(name)).toUpperCase();
    if (text.indexOf('PARTTIME') !== -1 || text.indexOf('PART TIME') !== -1) return 'ACC-PARTTIME';
    if (text.indexOf('FULLTIME') !== -1 || text.indexOf('FULL TIME') !== -1 || text.indexOf('GAJI BULANAN') !== -1) return 'ACC-FULLTIME';
    if (text.indexOf('PLN') !== -1) return 'ACC-PLN';
    if (text.indexOf('WIFI') !== -1) return 'ACC-WIFI';
    if (text.indexOf('BAR') !== -1 || text.indexOf('KITCHEN') !== -1 || text.indexOf('PASTRY') !== -1 || text.indexOf('BAHAN') !== -1) return 'ACC-BAHAN';
    return 'ACC-UTAMA';
  }

  function accountBalanceById_(accountId) { return number_(computeAccountBalances_()[accountId]); }

  function accountNameById_(accountId) {
    var account = readAccounts_().filter(function(item) { return item.id === accountId; })[0];
    return account ? account.name : accountId;
  }

  function assertActiveAccount_(accountId) {
    var valid = readAccounts_().some(function(item) { return item.id === accountId && item.active; });
    if (!valid) throw new Error('Rekening tidak valid atau sudah nonaktif.');
  }

  function currentPeriod_() { return Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM'); }

  function daysUntilDue_(period, dueDay) {
    var parts = String(period).split('-');
    var year = Number(parts[0]);
    var monthIndex = Number(parts[1]) - 1;
    var lastDay = new Date(year, monthIndex + 1, 0).getDate();
    var day = Math.max(1, Math.min(lastDay, number_(dueDay)));
    var due = new Date(year, monthIndex, day, 23, 59, 59);
    return Math.max(0, Math.ceil((due.getTime() - new Date().getTime()) / 86400000));
  }

  function formatRupiahServer_(value) { return 'Rp' + Math.round(number_(value)).toLocaleString('id-ID'); }

var LEGACY_IMPORT_SOURCE = 'Rekap Keuangan (1).xlsx';
var LEGACY_IMPORT_CATEGORIES = [["Pemasukan","BISNIS",""],["Pemasukan","EDC",""],["Pemasukan","GOPAY",""],["Pemasukan","LAINNYA",""],["Pemasukan","ONLINE FOOD",""],["Pemasukan","PINJAM",""],["Pemasukan","RSV",""],["Pemasukan","SETORAN TUNAI",""],["Pemasukan","QRIS","BISNIS"],["Pemasukan","CC","EDC"],["Pemasukan","DEBIT","EDC"],["Pengeluaran","BAR",""],["Pengeluaran","Belanja",""],["Pengeluaran","GAJI",""],["Pengeluaran","Hiburan",""],["Pengeluaran","ICHA PASTRY",""],["Pengeluaran","KITCHEN",""],["Pengeluaran","Kesehatan",""],["Pengeluaran","Lainnya",""],["Pengeluaran","MANAJEMEN",""],["Pengeluaran","PRIBADI",""],["Pengeluaran","TAGIHAN & UTILITAS",""],["Pengeluaran","AZKA ICE CUBE","BAR"],["Pengeluaran","BARSOL","BAR"],["Pengeluaran","CLEO","BAR"],["Pengeluaran","DENALI","BAR"],["Pengeluaran","DENALI POWDER","BAR"],["Pengeluaran","INTISARI BAR","BAR"],["Pengeluaran","KOPI MAS GONDRONG","BAR"],["Pengeluaran","LAINNYA","BAR"],["Pengeluaran","MOUNTOYA","BAR"],["Pengeluaran","SAYUR","BAR"],["Pengeluaran","SUKANDA","BAR"],["Pengeluaran","GAJI BULANAN","GAJI"],["Pengeluaran","GAJI MINGGUAN PARTTIME","GAJI"],["Pengeluaran","ALMOND","KITCHEN"],["Pengeluaran","AYAM BU SUHARTI","KITCHEN"],["Pengeluaran","DAGING KITA","KITCHEN"],["Pengeluaran","HIMEKA","KITCHEN"],["Pengeluaran","INTISARI KITCHEN","KITCHEN"],["Pengeluaran","LAINNYA","KITCHEN"],["Pengeluaran","LESTARI KITCHEN","KITCHEN"],["Pengeluaran","OMAH QUE","KITCHEN"],["Pengeluaran","SAYUR","KITCHEN"],["Pengeluaran","SIDO RAHAYU","KITCHEN"],["Pengeluaran","SUPERINDO","KITCHEN"],["Pengeluaran","WARUNG LESTARI","KITCHEN"],["Pengeluaran","JAJAN","PRIBADI"],["Pengeluaran","RUMAH","PRIBADI"],["Pengeluaran","Gaji Karyawan","TAGIHAN & UTILITAS"],["Pengeluaran","Gaji Mingguan (Parttime)","TAGIHAN & UTILITAS"],["Pengeluaran","PLN","TAGIHAN & UTILITAS"],["Pengeluaran","SAMPAH","TAGIHAN & UTILITAS"],["Pengeluaran","WIFI","TAGIHAN & UTILITAS"]];
var LEGACY_IMPORT_TRANSACTIONS = [[1,"2026-06-29T20:40:00+07:00","Pengeluaran",1705000.0,"Payroll Parttime - 2026-06-23 s/d 2026-06-28","BCA 445","GAJI","GAJI MINGGUAN PARTTIME","","2026-06-29T20:40:00+07:00"],[2,"2026-07-02T04:42:00+07:00","Pengeluaran",140000.0,"RAILINK BANDARA","BCA 445","PRIBADI","","","2026-07-02T04:42:40+07:00"],[3,"2026-07-02T04:43:00+07:00","Pemasukan",2141789.0,"QRIS","BCA 445","BISNIS","QRIS","","2026-07-02T04:43:30+07:00"],[4,"2026-07-02T11:46:00+07:00","Pengeluaran",317000.0,"INTISARI","BCA 445","KITCHEN","INTISARI KITCHEN","","2026-07-02T13:49:54+07:00"],[5,"2026-07-02T00:53:00+07:00","Pengeluaran",89000.0,"BAKMI JAWA MAS TIMBUL","BCA 445","PRIBADI","JAJAN","","2026-07-02T13:51:05+07:00"],[6,"2026-07-01T20:48:00+07:00","Pengeluaran",115570.0,"SUPERINDO","BCA 445","KITCHEN","SUPERINDO","","2026-07-02T13:51:50+07:00"],[7,"2026-07-01T19:14:00+07:00","Pengeluaran",241000.0,"SUSU DAN SYRUP","BCA 445","BAR","BARSOL","GREENFIELD 4 PACK DAN SYRUP BUTTERSCHOT","2026-07-02T13:52:53+07:00"],[8,"2026-07-01T18:58:00+07:00","Pengeluaran",200000.0,"REFUND DP","BCA 445","MANAJEMEN","","REFUND DP PAK KOKO","2026-07-02T13:53:44+07:00"],[9,"2026-07-01T18:34:00+07:00","Pengeluaran",1580000.0,"POWDER DENALI","BCA 445","BAR","DENALI POWDER","POWDER DENALI JUNI","2026-07-02T13:54:23+07:00"],[10,"2026-07-01T17:05:00+07:00","Pengeluaran",25000.0,"WAYAE","BCA 445","PRIBADI","JAJAN","NGERJAIN DATA DI WAYAE","2026-07-02T13:55:24+07:00"],[11,"2026-07-01T15:11:00+07:00","Pengeluaran",61000.0,"INDOMARET","BCA 445","PRIBADI","JAJAN","","2026-07-02T13:56:15+07:00"],[12,"2026-07-01T13:14:00+07:00","Pengeluaran",90000.0,"WARUNG LESTARI","BCA 445","KITCHEN","LESTARI KITCHEN","BERAS DAN TELUR","2026-07-02T13:57:23+07:00"],[13,"2026-07-01T12:29:00+07:00","Pengeluaran",370000.0,"LANGGANAN CLAUDE AI","BCA 445","MANAJEMEN","","LANGGANAN BULANAN CLAUDE AI","2026-07-02T13:58:23+07:00"],[14,"2026-07-01T11:44:00+07:00","Pengeluaran",79000.0,"BELI EBOOK BISNIS","BCA 445","MANAJEMEN","","BELI EBOOK BISNIS","2026-07-02T13:59:02+07:00"],[15,"2026-07-01T09:51:00+07:00","Pengeluaran",400000.0,"AYAM POTONG BU SUHARTI","BCA 445","KITCHEN","AYAM BU SUHARTI","AYAM POTONG","2026-07-02T13:59:48+07:00"],[16,"2026-07-01T09:22:00+07:00","Pengeluaran",25000.0,"CUCI MOTOR","BCA 445","PRIBADI","","CUCI MOTOR","2026-07-02T14:00:19+07:00"],[17,"2026-06-30T22:39:00+07:00","Pengeluaran",79500.0,"BELI VILIUS","BCA 445","PRIBADI","","BELI VILIUS","2026-07-02T14:01:22+07:00"],[18,"2026-06-30T22:25:00+07:00","Pengeluaran",74000.0,"TENGKLENG PONCO","BCA 445","PRIBADI","","JAJAN TENGKLENG DI BELAKANG KRANGGAN","2026-07-02T14:02:02+07:00"],[19,"2026-06-01T00:15:00+07:00","Pemasukan",2006840.0,"QRIS","BCA 445","BISNIS","QRIS","","2026-07-02T14:03:44+07:00"],[20,"2026-06-02T00:15:00+07:00","Pemasukan",2255090.0,"QRIS","BCA 445","BISNIS","QRIS","","2026-07-02T14:04:01+07:00"],[21,"2026-06-03T00:15:00+07:00","Pemasukan",2751789.0,"QRIS","BCA 445","BISNIS","QRIS","","2026-07-02T14:05:31+07:00"],[22,"2026-06-04T00:15:00+07:00","Pemasukan",2128979.0,"QRIS","BCA 445","BISNIS","QRIS","","2026-07-02T14:06:04+07:00"],[23,"2026-06-05T00:15:00+07:00","Pemasukan",2111800.0,"QRIS","BCA 445","BISNIS","QRIS","","2026-07-02T14:06:53+07:00"],[25,"2026-07-13T21:17:00+07:00","Pengeluaran",1720000.0,"Payroll Parttime - 2026-07-06 s/d 2026-07-12","BCA 445","GAJI","GAJI MINGGUAN PARTTIME","","2026-07-13T21:17:50+07:00"],[26,"2026-07-20T20:12:00+07:00","Pengeluaran",1640000.0,"Payroll Parttime - 2026-07-13 s/d 2026-07-19","BCA 445","GAJI","GAJI MINGGUAN PARTTIME","","2026-07-20T20:12:21+07:00"],[27,"2026-07-01T10:00:00+07:00","Pemasukan",62400.0,"GRABFOOD","BCA 445","ONLINE FOOD","","","2026-07-21T15:12:49+07:00"],[28,"2026-07-01T10:00:00+07:00","Pemasukan",1671404.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:13:09+07:00"],[29,"2026-07-01T10:00:00+07:00","Pemasukan",88110.0,"EDC","BCA 445","EDC","DEBIT","","2026-07-21T15:13:41+07:00"],[30,"2026-07-01T10:00:00+07:00","Pemasukan",41160.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:13:58+07:00"],[31,"2026-07-01T10:00:00+07:00","Pemasukan",200000.0,"RESERVASI","BCA 445","RSV","","","2026-07-21T15:14:23+07:00"],[32,"2026-07-01T10:00:00+07:00","Pemasukan",100000.0,"RSV","BCA 445","RSV","","","2026-07-21T15:14:40+07:00"],[33,"2026-07-01T10:00:00+07:00","Pemasukan",336000.0,"PENJUALAN JELANTAH","BCA 445","LAINNYA","","","2026-07-21T15:15:30+07:00"],[34,"2026-07-03T10:00:00+07:00","Pemasukan",1313730.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:16:06+07:00"],[35,"2026-07-03T10:00:00+07:00","Pemasukan",680120.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:16:18+07:00"],[36,"2026-07-03T10:00:00+07:00","Pemasukan",5008407.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:16:32+07:00"],[37,"2026-07-04T10:00:00+07:00","Pemasukan",2269191.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:17:00+07:00"],[38,"2026-07-04T10:00:00+07:00","Pemasukan",135630.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:17:18+07:00"],[39,"2026-07-05T10:00:00+07:00","Pemasukan",43120.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:17:37+07:00"],[40,"2026-07-05T10:00:00+07:00","Pemasukan",3457914.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:17:53+07:00"],[41,"2026-07-05T10:00:00+07:00","Pemasukan",73600.0,"GRAB FOOD","BCA 445","ONLINE FOOD","","","2026-07-21T15:18:07+07:00"],[43,"2026-07-05T10:00:00+07:00","Pemasukan",200000.0,"RSV","BCA 445","RSV","","RSV DIAN SITI KOMARIYA","2026-07-21T15:18:42+07:00"],[44,"2026-07-06T10:00:00+07:00","Pemasukan",69300.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:28:28+07:00"],[45,"2026-07-06T10:00:00+07:00","Pemasukan",2511284.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:28:46+07:00"],[46,"2026-07-07T10:00:00+07:00","Pemasukan",111200.0,"GRABFOOD","BCA 445","ONLINE FOOD","","","2026-07-21T15:29:25+07:00"],[47,"2026-07-07T10:00:00+07:00","Pemasukan",867240.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:29:44+07:00"],[48,"2026-07-07T10:00:00+07:00","Pemasukan",1455725.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:29:55+07:00"],[49,"2026-07-07T10:00:00+07:00","Pemasukan",100000.0,"RSV","BCA 445","RSV","","","2026-07-21T15:30:13+07:00"],[50,"2026-07-08T10:00:00+07:00","Pemasukan",625240.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:30:38+07:00"],[51,"2026-07-08T10:00:00+07:00","Pemasukan",1358411.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:31:19+07:00"],[52,"2026-07-09T10:00:00+07:00","Pemasukan",1295852.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:31:40+07:00"],[53,"2026-07-09T10:00:00+07:00","Pemasukan",200000.0,"RSV","BCA 445","RSV","","","2026-07-21T15:31:51+07:00"],[54,"2026-07-10T10:00:00+07:00","Pemasukan",133280.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:32:11+07:00"],[55,"2026-07-10T10:00:00+07:00","Pemasukan",842734.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:32:28+07:00"],[56,"2026-07-10T10:00:00+07:00","Pemasukan",3224258.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:32:42+07:00"],[57,"2026-07-11T10:00:00+07:00","Pemasukan",191100.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:32:55+07:00"],[58,"2026-07-11T10:00:00+07:00","Pemasukan",77883.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:33:26+07:00"],[59,"2026-07-11T10:00:00+07:00","Pemasukan",2947708.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:33:48+07:00"],[60,"2026-07-11T10:00:00+07:00","Pemasukan",400000.0,"TRF","BCA 445","GOPAY","","","2026-07-21T15:34:14+07:00"],[61,"2026-07-12T10:00:00+07:00","Pemasukan",73472.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:34:36+07:00"],[62,"2026-07-12T10:00:00+07:00","Pemasukan",300860.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:34:52+07:00"],[63,"2026-07-12T10:00:00+07:00","Pemasukan",3020572.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:35:04+07:00"],[64,"2026-07-13T10:00:00+07:00","Pemasukan",344482.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:35:45+07:00"],[65,"2026-07-13T10:00:00+07:00","Pemasukan",146020.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:36:19+07:00"],[66,"2026-07-13T10:00:00+07:00","Pemasukan",1271899.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:36:33+07:00"],[67,"2026-07-14T10:00:00+07:00","Pemasukan",282792.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:36:49+07:00"],[68,"2026-07-14T10:00:00+07:00","Pemasukan",85260.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:37:24+07:00"],[69,"2026-07-14T10:00:00+07:00","Pemasukan",951160.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:37:37+07:00"],[70,"2026-07-14T10:00:00+07:00","Pemasukan",51200.0,"GRAB FOOD","BCA 445","ONLINE FOOD","","","2026-07-21T15:37:51+07:00"],[71,"2026-07-15T10:00:00+07:00","Pemasukan",190713.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:38:09+07:00"],[72,"2026-07-15T10:00:00+07:00","Pemasukan",2641743.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:38:29+07:00"],[73,"2026-07-15T10:00:00+07:00","Pemasukan",100000.0,"RSV","BCA 445","RSV","","","2026-07-21T15:38:40+07:00"],[74,"2026-07-16T10:00:00+07:00","Pemasukan",239640.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:38:54+07:00"],[75,"2026-07-16T10:00:00+07:00","Pemasukan",1721728.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:39:33+07:00"],[76,"2026-07-17T10:00:00+07:00","Pemasukan",342020.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:39:57+07:00"],[77,"2026-07-17T10:00:00+07:00","Pemasukan",1807133.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:40:19+07:00"],[78,"2026-07-18T10:00:00+07:00","Pemasukan",3354220.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:40:48+07:00"],[79,"2026-07-19T10:00:00+07:00","Pemasukan",1122567.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:41:08+07:00"],[80,"2026-07-19T10:00:00+07:00","Pemasukan",1274000.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:41:22+07:00"],[81,"2026-07-19T10:00:00+07:00","Pemasukan",2205518.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:41:35+07:00"],[82,"2026-07-20T10:00:00+07:00","Pemasukan",177380.0,"CC","BCA 445","EDC","CC","","2026-07-21T15:41:46+07:00"],[83,"2026-07-20T10:00:00+07:00","Pemasukan",82875.0,"DEBIT","BCA 445","EDC","DEBIT","","2026-07-21T15:41:57+07:00"],[84,"2026-07-20T10:00:00+07:00","Pemasukan",783343.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:42:45+07:00"],[85,"2026-07-21T10:00:00+07:00","Pemasukan",1914370.0,"QRIS","BCA 445","GOPAY","","","2026-07-21T15:43:11+07:00"],[86,"2026-07-21T15:44:00+07:00","Pengeluaran",790000.0,"LUNAS: KENDIMART POWDER","BCA 445","BAR","DENALI","Pembayaran invoice #1 via Rekap Keuangan","2026-07-21T15:44:36+07:00"],[87,"2026-07-02T10:00:00+07:00","Pengeluaran",355500.0,"INTISARI BAR","BCA 445","BAR","INTISARI BAR","","2026-07-21T15:48:31+07:00"],[88,"2026-07-02T10:00:00+07:00","Pengeluaran",105292.0,"GULA DI ALFA","BCA 445","BAR","LAINNYA","ALFA GIFT","2026-07-21T15:49:01+07:00"],[89,"2026-07-02T10:00:00+07:00","Pengeluaran",70600.0,"ALFA","BCA 445","MANAJEMEN","","","2026-07-21T15:49:17+07:00"],[90,"2026-07-02T10:00:00+07:00","Pengeluaran",128420.0,"MINYAK GORENG","BCA 445","KITCHEN","SUPERINDO","","2026-07-21T15:49:50+07:00"],[91,"2026-07-02T10:00:00+07:00","Pengeluaran",231630.0,"MINYAK GORENG","BCA 445","KITCHEN","SUPERINDO","","2026-07-21T15:50:12+07:00"],[92,"2026-07-02T10:00:00+07:00","Pengeluaran",100000.0,"PULSA","BCA 445","MANAJEMEN","","PULSA XL","2026-07-21T15:50:39+07:00"],[93,"2026-07-03T10:00:00+07:00","Pengeluaran",90000.0,"TOKO BUNGA","BCA 445","PRIBADI","","","2026-07-21T15:51:25+07:00"],[94,"2026-07-03T10:00:00+07:00","Pengeluaran",115600.0,"ALFA","BCA 445","PRIBADI","","","2026-07-21T15:51:41+07:00"],[95,"2026-07-03T10:00:00+07:00","Pengeluaran",141700.0,"SHOPEE","BCA 445","KITCHEN","","","2026-07-21T15:52:15+07:00"],[96,"2026-07-03T10:00:00+07:00","Pengeluaran",205000.0,"GALON","BCA 445","BAR","CLEO","","2026-07-21T15:52:35+07:00"],[97,"2026-07-03T10:00:00+07:00","Pengeluaran",51400.0,"PRINT SAGAN","BCA 445","MANAJEMEN","","","2026-07-21T15:53:09+07:00"],[98,"2026-07-03T10:00:00+07:00","Pengeluaran",12500.0,"GULA","BCA 445","BAR","LAINNYA","INDOMARET","2026-07-21T15:53:32+07:00"],[99,"2026-07-04T10:00:00+07:00","Pengeluaran",203000.0,"PLN RUMAH","BCA 445","PRIBADI","RUMAH","","2026-07-21T15:54:10+07:00"],[100,"2026-07-04T10:00:00+07:00","Pengeluaran",78000.0,"MILLAC","BCA 445","ICHA PASTRY","","INTISARI","2026-07-21T15:54:52+07:00"],[101,"2026-07-04T10:00:00+07:00","Pengeluaran",3469500.0,"SAYUR JUNI","BCA 445","KITCHEN","SAYUR","","2026-07-21T15:55:31+07:00"],[102,"2026-07-04T10:00:00+07:00","Pengeluaran",503000.0,"SAYUR JUNI","BCA 445","KITCHEN","SAYUR","","2026-07-21T15:55:44+07:00"],[103,"2026-07-04T10:00:00+07:00","Pengeluaran",640000.0,"AYAM","BCA 445","KITCHEN","AYAM BU SUHARTI","","2026-07-21T15:55:57+07:00"],[104,"2026-07-05T10:00:00+07:00","Pengeluaran",2997000.0,"WIFI CAFE","BCA 445","TAGIHAN & UTILITAS","WIFI","","2026-07-21T15:56:42+07:00"],[105,"2026-07-05T10:00:00+07:00","Pengeluaran",277500.0,"WIFI RUMAH","BCA 445","PRIBADI","RUMAH","","2026-07-21T15:57:02+07:00"],[106,"2026-07-06T10:00:00+07:00","Pengeluaran",450000.0,"SAMPAH","BCA 445","TAGIHAN & UTILITAS","SAMPAH","","2026-07-21T15:58:17+07:00"],[107,"2026-07-06T10:00:00+07:00","Pengeluaran",45800.0,"ALMOND","BCA 445","KITCHEN","ALMOND","","2026-07-21T15:58:47+07:00"],[108,"2026-07-06T10:00:00+07:00","Pengeluaran",415000.0,"INTISARI","BCA 445","KITCHEN","INTISARI KITCHEN","","2026-07-21T15:59:32+07:00"],[110,"2026-07-06T10:00:00+07:00","Pengeluaran",400000.0,"PRIBADI","BCA 445","PRIBADI","JAJAN","","2026-07-21T16:01:02+07:00"],[111,"2026-07-06T10:00:00+07:00","Pengeluaran",1200000.0,"SAVING","BCA 445","MANAJEMEN","","","2026-07-21T16:01:12+07:00"],[112,"2026-07-06T10:00:00+07:00","Pengeluaran",250000.0,"PRIBADI","BCA 445","PRIBADI","JAJAN","","2026-07-21T16:01:29+07:00"],[113,"2026-07-07T10:00:00+07:00","Pengeluaran",268000.0,"ELDER","BCA 445","MANAJEMEN","","PASTRY","2026-07-21T16:03:20+07:00"],[114,"2026-07-08T10:00:00+07:00","Pengeluaran",156000.0,"INTISARI","BCA 445","BAR","INTISARI BAR","","2026-07-21T16:04:13+07:00"],[115,"2026-07-08T10:00:00+07:00","Pengeluaran",1000000.0,"PRIBADI","BCA 445","PRIBADI","JAJAN","","2026-07-21T16:04:24+07:00"],[116,"2026-07-09T10:00:00+07:00","Pengeluaran",308000.0,"INTISARI","BCA 445","KITCHEN","INTISARI KITCHEN","","2026-07-21T16:04:56+07:00"],[117,"2026-07-09T10:00:00+07:00","Pengeluaran",300000.0,"GAS INDOMARET","BCA 445","KITCHEN","SIDO RAHAYU","GAS DI INDOMARET","2026-07-21T16:05:37+07:00"],[118,"2026-07-09T10:00:00+07:00","Pengeluaran",157000.0,"OMAH QUE","BCA 445","KITCHEN","OMAH QUE","","2026-07-21T16:05:52+07:00"],[119,"2026-07-10T10:00:00+07:00","Pengeluaran",225000.0,"MOUNTOYA","BCA 445","BAR","MOUNTOYA","","2026-07-21T16:06:29+07:00"],[120,"2026-07-10T10:00:00+07:00","Pengeluaran",1000000.0,"PRIBADI","BCA 445","PRIBADI","JAJAN","","2026-07-21T16:06:41+07:00"],[121,"2026-07-10T10:00:00+07:00","Pengeluaran",235000.0,"MAINTENANCE AC","BCA 445","MANAJEMEN","","MAINTENANCE","2026-07-21T16:08:17+07:00"],[122,"2026-07-10T10:00:00+07:00","Pengeluaran",184500.0,"CLEO","BCA 445","BAR","CLEO","","2026-07-21T16:10:38+07:00"],[123,"2026-07-12T10:00:00+07:00","Pengeluaran",500000.0,"BELI GAS","BCA 445","KITCHEN","SIDO RAHAYU","","2026-07-21T16:11:17+07:00"],[124,"2026-07-13T10:00:00+07:00","Pengeluaran",201750.0,"INTISARI","BCA 445","KITCHEN","INTISARI KITCHEN","","2026-07-21T16:12:15+07:00"],[125,"2026-07-13T10:00:00+07:00","Pengeluaran",441400.0,"SUSU SUKANDA","BCA 445","BAR","SUKANDA","","2026-07-21T16:12:46+07:00"],[126,"2026-07-13T10:00:00+07:00","Pengeluaran",910000.0,"AYAM","BCA 445","KITCHEN","AYAM BU SUHARTI","","2026-07-21T16:12:56+07:00"],[127,"2026-07-13T10:00:00+07:00","Pengeluaran",166000.0,"GULA DI ALFA","BCA 445","BAR","LAINNYA","","2026-07-21T16:13:14+07:00"],[128,"2026-07-13T10:00:00+07:00","Pengeluaran",225000.0,"SABUN RESTLESS","BCA 445","MANAJEMEN","","SABUN","2026-07-21T16:13:48+07:00"],[129,"2026-07-14T10:00:00+07:00","Pengeluaran",43000.0,"ROCKET CHICKEN","BCA 445","PRIBADI","JAJAN","","2026-07-21T16:14:19+07:00"],[130,"2026-07-14T10:00:00+07:00","Pengeluaran",50000.0,"PT NIKEN","BCA 445","GAJI","GAJI MINGGUAN PARTTIME","","2026-07-21T16:14:52+07:00"],[131,"2026-07-16T10:00:00+07:00","Pengeluaran",2150000.0,"SIDO RAHAYU","BCA 445","KITCHEN","SIDO RAHAYU","","2026-07-21T16:32:16+07:00"],[132,"2026-07-16T10:00:00+07:00","Pengeluaran",228000.0,"ELDER","BCA 445","ICHA PASTRY","","ELDER","2026-07-21T16:32:33+07:00"],[133,"2026-07-16T10:00:00+07:00","Pengeluaran",259750.0,"INTISARI","BCA 445","KITCHEN","INTISARI KITCHEN","","2026-07-21T16:33:00+07:00"],[134,"2026-07-16T10:00:00+07:00","Pengeluaran",92000.0,"KRIPIK","BCA 445","KITCHEN","LAINNYA","KRIPIK","2026-07-21T16:33:24+07:00"],[135,"2026-07-16T10:00:00+07:00","Pengeluaran",225000.0,"OMAH QUE","BCA 445","KITCHEN","OMAH QUE","","2026-07-21T16:33:42+07:00"],[136,"2026-07-16T10:00:00+07:00","Pengeluaran",35000.0,"GULA","BCA 445","BAR","LAINNYA","ALFA","2026-07-21T16:33:57+07:00"],[137,"2026-07-16T10:00:00+07:00","Pengeluaran",969410.0,"BELANJA DI ICA","BCA 445","MANAJEMEN","","","2026-07-21T16:34:21+07:00"],[138,"2026-07-17T10:00:00+07:00","Pengeluaran",229400.0,"SHOPEE ICA","BCA 445","MANAJEMEN","","","2026-07-21T16:34:48+07:00"],[139,"2026-07-17T10:00:00+07:00","Pengeluaran",662100.0,"SUSU SUKANDA","BCA 445","BAR","SUKANDA","","2026-07-21T16:35:01+07:00"],[140,"2026-07-17T10:00:00+07:00","Pengeluaran",377518.0,"TISSUE","BCA 445","MANAJEMEN","","","2026-07-21T16:35:18+07:00"],[141,"2026-07-17T10:00:00+07:00","Pengeluaran",900000.0,"BPJS PRIBADI","BCA 445","PRIBADI","RUMAH","","2026-07-21T16:35:31+07:00"],[142,"2026-07-18T10:00:00+07:00","Pengeluaran",19000.0,"JAJAN","BCA 445","PRIBADI","RUMAH","MAKAN BU DESTY","2026-07-21T16:36:03+07:00"],[143,"2026-07-18T10:00:00+07:00","Pengeluaran",184500.0,"CLEO","BCA 445","BAR","CLEO","","2026-07-21T16:36:18+07:00"],[144,"2026-07-18T10:00:00+07:00","Pengeluaran",25300.0,"GULA","BCA 445","BAR","LAINNYA","INDOMARET","2026-07-21T16:36:39+07:00"],[145,"2026-07-18T10:00:00+07:00","Pengeluaran",360000.0,"AYAM","BCA 445","KITCHEN","AYAM BU SUHARTI","","2026-07-21T16:37:02+07:00"],[146,"2026-07-18T10:00:00+07:00","Pengeluaran",9700.0,"OREO CHEESECAKE","BCA 445","ICHA PASTRY","","INDOMARET","2026-07-21T16:37:36+07:00"],[147,"2026-07-20T10:00:00+07:00","Pengeluaran",925000.0,"TRADING","BCA 445","PRIBADI","JAJAN","","2026-07-21T16:38:14+07:00"],[148,"2026-07-20T10:00:00+07:00","Pengeluaran",150000.0,"POSTING JOB IG","BCA 445","MANAJEMEN","","","2026-07-21T16:38:35+07:00"],[149,"2026-07-20T10:00:00+07:00","Pengeluaran",47586.0,"JNT JOGJA","BCA 445","PRIBADI","RUMAH","","2026-07-21T16:38:53+07:00"],[150,"2026-07-20T10:00:00+07:00","Pengeluaran",50000.0,"TOP UP GOJEK","BCA 445","MANAJEMEN","","","2026-07-21T16:39:09+07:00"],[151,"2026-07-20T10:00:00+07:00","Pengeluaran",227000.0,"OMAH QUE","BCA 445","KITCHEN","OMAH QUE","","2026-07-21T16:39:26+07:00"],[152,"2026-07-20T10:00:00+07:00","Pengeluaran",16800.0,"ALMOND","BCA 445","KITCHEN","ALMOND","","2026-07-21T16:39:38+07:00"],[153,"2026-07-20T10:00:00+07:00","Pengeluaran",404750.0,"INTISARI","BCA 445","KITCHEN","INTISARI KITCHEN","","2026-07-21T16:39:55+07:00"],[154,"2026-07-21T10:00:00+07:00","Pengeluaran",441400.0,"SUSU SUKANDA","BCA 445","BAR","SUKANDA","","2026-07-21T16:40:20+07:00"],[155,"2026-07-21T10:00:00+07:00","Pengeluaran",100000.0,"TOP UP","BCA 445","MANAJEMEN","","","2026-07-21T16:40:36+07:00"],[156,"2026-07-21T10:00:00+07:00","Pengeluaran",95000.0,"ELDER","BCA 445","ICHA PASTRY","","","2026-07-21T16:40:45+07:00"],[157,"2026-07-21T10:00:00+07:00","Pengeluaran",275500.0,"ELDER","BCA 445","ICHA PASTRY","","","2026-07-21T16:40:56+07:00"],[158,"2026-07-21T10:00:00+07:00","Pengeluaran",30000.0,"TOP UP","BCA 445","MANAJEMEN","","","2026-07-21T16:41:08+07:00"],[159,"2026-07-21T10:00:00+07:00","Pengeluaran",200000.0,"TOP UP","BCA 445","MANAJEMEN","","","2026-07-21T16:41:29+07:00"],[160,"2026-07-21T10:00:00+07:00","Pengeluaran",7245945.0,"PLN CAFE","BCA 445","TAGIHAN & UTILITAS","PLN","","2026-07-21T16:41:58+07:00"],[161,"2026-07-21T10:00:00+07:00","Pengeluaran",113500.0,"GAS RUMAH","BCA 445","PRIBADI","RUMAH","","2026-07-21T16:42:27+07:00"],[162,"2026-07-11T10:00:00+07:00","Pengeluaran",20000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-21T21:40:20+07:00"],[163,"2026-07-11T10:00:00+07:00","Pengeluaran",43500.0,"INTISARI","CASH","BAR","INTISARI BAR","","2026-07-21T21:41:44+07:00"],[164,"2026-07-02T10:00:00+07:00","Pengeluaran",136000.0,"BERAS DAN TELUR","CASH","KITCHEN","WARUNG LESTARI","BERAS DAN TELUR","2026-07-21T21:45:51+07:00"],[165,"2026-07-02T10:00:00+07:00","Pengeluaran",20000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-21T22:07:31+07:00"],[166,"2026-07-02T10:00:00+07:00","Pengeluaran",80000.0,"AYAM KAMPUNG","CASH","KITCHEN","LAINNYA","AYAM KAMPUNG","2026-07-21T22:09:26+07:00"],[167,"2026-07-02T10:00:00+07:00","Pengeluaran",168000.0,"BROWNIES","CASH","ICHA PASTRY","","","2026-07-21T22:11:17+07:00"],[168,"2026-07-18T10:00:00+07:00","Pengeluaran",115000.0,"BERAS DAN TELUR","CASH","KITCHEN","WARUNG LESTARI","LESTARI","2026-07-21T22:15:23+07:00"],[169,"2026-07-18T10:00:00+07:00","Pengeluaran",40000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-21T22:17:30+07:00"],[170,"2026-07-18T10:00:00+07:00","Pengeluaran",90000.0,"TELUR DAN MINYAK","CASH","KITCHEN","WARUNG LESTARI","MINYAK 1 POUCH DAN TELUR 2KG","2026-07-21T22:19:45+07:00"],[171,"2026-07-18T10:00:00+07:00","Pengeluaran",20000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-21T22:22:26+07:00"],[172,"2026-07-18T10:00:00+07:00","Pengeluaran",37800.0,"TOKO PLASTIK 60","CASH","MANAJEMEN","","PLASTIK","2026-07-21T22:26:04+07:00"],[173,"2026-07-18T10:00:00+07:00","Pengeluaran",15000.0,"JERUK NIPIS","CASH","BAR","LAINNYA","JERUK NIPIS","2026-07-21T22:27:44+07:00"],[174,"2026-07-08T10:00:00+07:00","Pengeluaran",11000.0,"TOKO PLASTIK 60","CASH","MANAJEMEN","","OPP","2026-07-21T22:36:23+07:00"],[175,"2026-07-08T10:00:00+07:00","Pengeluaran",88000.0,"MINYAK DAN TELUR","CASH","KITCHEN","WARUNG LESTARI","","2026-07-21T22:37:48+07:00"],[176,"2026-07-08T10:00:00+07:00","Pengeluaran",30000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-21T22:40:32+07:00"],[177,"2026-07-01T10:00:00+07:00","Pengeluaran",18000.0,"ATK","CASH","MANAJEMEN","","ISI STAPLER DAN SOLATIP","2026-07-21T22:53:51+07:00"],[178,"2026-07-14T10:00:00+07:00","Pengeluaran",33500.0,"RAWIT MERAH DAN TELUR","CASH","KITCHEN","WARUNG LESTARI","","2026-07-21T23:05:17+07:00"],[179,"2026-07-14T10:00:00+07:00","Pengeluaran",26000.0,"DIKA BAKERY","CASH","KITCHEN","","","2026-07-21T23:08:34+07:00"],[180,"2026-07-14T10:00:00+07:00","Pengeluaran",100000.0,"STRAWBERRY","CASH","BAR","LAINNYA","","2026-07-21T23:09:42+07:00"],[181,"2026-07-06T10:00:00+07:00","Pengeluaran",40000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-21T23:18:07+07:00"],[182,"2026-07-06T10:00:00+07:00","Pengeluaran",46000.0,"TELUR","CASH","KITCHEN","WARUNG LESTARI","","2026-07-21T23:20:04+07:00"],[183,"2026-07-06T10:00:00+07:00","Pengeluaran",47500.0,"YAKULT","CASH","BAR","","","2026-07-21T23:21:32+07:00"],[184,"2026-07-06T10:00:00+07:00","Pengeluaran",297000.0,"INTISARI","BCA 445","BAR","INTISARI BAR","","2026-07-21T23:24:11+07:00"],[185,"2026-07-03T10:00:00+07:00","Pengeluaran",100000.0,"COD STIKER","CASH","MANAJEMEN","","","2026-07-22T00:05:44+07:00"],[186,"2026-07-03T10:00:00+07:00","Pengeluaran",6890.0,"TOMAT MERAH LESTARI","CASH","KITCHEN","WARUNG LESTARI","","2026-07-22T00:10:00+07:00"],[187,"2026-07-03T10:00:00+07:00","Pengeluaran",20000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-22T00:10:49+07:00"],[188,"2026-07-03T10:00:00+07:00","Pengeluaran",16000.0,"BAKMIE","CASH","KITCHEN","LAINNYA","NOTA BAKMIE","2026-07-22T00:12:14+07:00"],[189,"2026-07-03T10:00:00+07:00","Pengeluaran",71000.0,"TELUR DAN PLASTIK PREP","CASH","KITCHEN","LAINNYA","","2026-07-22T00:15:27+07:00"],[190,"2026-07-03T10:00:00+07:00","Pengeluaran",441400.0,"FRESH MILK 2 CTN","CASH","BAR","SUKANDA","","2026-07-22T00:19:21+07:00"],[191,"2026-07-15T10:10:00+07:00","Pengeluaran",485500.0,"INTISARI ICHA","BCA 445","ICHA PASTRY","","","2026-07-22T13:31:38+07:00"],[192,"2026-07-15T10:10:00+07:00","Pengeluaran",183910.0,"SUPERINDO ICHA","BCA 445","ICHA PASTRY","","UNTUK TAPE CAKE","2026-07-22T13:33:33+07:00"],[193,"2026-07-12T10:10:00+07:00","Pengeluaran",40500.0,"INDOMARET BAR","CASH","BAR","LAINNYA","YAKULT DAN SO KLIN","2026-07-22T13:36:57+07:00"],[194,"2026-07-12T10:10:00+07:00","Pengeluaran",174800.0,"LESTARI","CASH","KITCHEN","WARUNG LESTARI","BERAS DLL","2026-07-22T13:39:39+07:00"],[195,"2026-07-12T10:10:00+07:00","Pengeluaran",20000.0,"AZKA ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-22T13:42:35+07:00"],[196,"2026-07-10T10:00:00+07:00","Pengeluaran",20000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-22T13:50:23+07:00"],[197,"2026-07-10T10:00:00+07:00","Pengeluaran",37500.0,"SODA TAWAR","CASH","BAR","BARSOL","SODA","2026-07-22T13:51:46+07:00"],[198,"2026-07-10T10:00:00+07:00","Pengeluaran",243670.0,"ATK","CASH","MANAJEMEN","","","2026-07-22T13:56:05+07:00"],[199,"2026-07-10T10:00:00+07:00","Pengeluaran",40000.0,"NOTA KITCHEN","CASH","KITCHEN","LAINNYA","TOMAT DLL","2026-07-22T13:59:26+07:00"],[200,"2026-07-05T10:00:00+07:00","Pengeluaran",90000.0,"BERAS","CASH","KITCHEN","WARUNG LESTARI","","2026-07-22T14:05:42+07:00"],[201,"2026-07-05T10:00:00+07:00","Pengeluaran",30000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-22T14:06:43+07:00"],[202,"2026-07-05T10:00:00+07:00","Pengeluaran",16000.0,"BAKMIE","CASH","KITCHEN","LAINNYA","NOTA","2026-07-22T14:09:47+07:00"],[203,"2026-07-16T10:00:00+07:00","Pengeluaran",37000.0,"SANTAN DAN PLASTIK PREP","CASH","KITCHEN","WARUNG LESTARI","","2026-07-22T14:17:39+07:00"],[204,"2026-07-16T10:00:00+07:00","Pengeluaran",142000.0,"BERAS DAN TELUR","CASH","KITCHEN","WARUNG LESTARI","","2026-07-22T14:20:11+07:00"],[205,"2026-07-16T10:00:00+07:00","Pengeluaran",80000.0,"AYAM KAMPUNG","CASH","KITCHEN","LAINNYA","NOTA","2026-07-22T14:56:38+07:00"],[206,"2026-07-16T10:10:00+07:00","Pengeluaran",216000.0,"INTISARI","BCA 445","BAR","INTISARI BAR","","2026-07-22T15:40:58+07:00"],[207,"2026-07-20T10:00:00+07:00","Pengeluaran",53000.0,"GULA BAR","CASH","BAR","LAINNYA","INDOMARET","2026-07-22T15:47:06+07:00"],[208,"2026-07-20T10:00:00+07:00","Pengeluaran",20000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-22T15:48:31+07:00"],[209,"2026-07-20T10:00:00+07:00","Pengeluaran",47500.0,"YAKULT","CASH","BAR","LAINNYA","YAKULT","2026-07-22T15:52:26+07:00"],[210,"2026-07-20T10:00:00+07:00","Pengeluaran",307000.0,"INTISARI BAR","BCA 445","BAR","INTISARI BAR","","2026-07-22T16:08:06+07:00"],[211,"2026-07-04T10:00:00+07:00","Pengeluaran",16000.0,"GOSEND PAKET CASH","CASH","MANAJEMEN","","","2026-07-22T16:11:04+07:00"],[212,"2026-07-04T10:00:00+07:00","Pengeluaran",25000.0,"PISANG KEPOK","CASH","KITCHEN","LAINNYA","NOTA PISANG","2026-07-22T16:12:29+07:00"],[213,"2026-07-04T10:00:00+07:00","Pengeluaran",20000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-22T16:14:02+07:00"],[214,"2026-07-13T10:00:00+07:00","Pengeluaran",177000.0,"INTISARI","BCA 445","BAR","INTISARI BAR","","2026-07-22T16:32:05+07:00"],[215,"2026-07-13T10:00:00+07:00","Pengeluaran",40000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-23T15:03:18+07:00"],[216,"2026-07-13T10:00:00+07:00","Pengeluaran",47500.0,"YAKULT","CASH","BAR","LAINNYA","","2026-07-23T15:07:53+07:00"],[217,"2026-07-15T10:00:00+07:00","Pengeluaran",96000.0,"SHOPEE PONDAN","CASH","KITCHEN","LAINNYA","SHOPEE","2026-07-23T15:46:56+07:00"],[218,"2026-07-07T10:00:00+07:00","Pengeluaran",40000.0,"CASSAVA CRACKERS","CASH","KITCHEN","LAINNYA","BU WIWIK","2026-07-23T15:50:51+07:00"],[219,"2026-07-09T10:00:00+07:00","Pengeluaran",138000.0,"BERAS DAN TELUR","CASH","KITCHEN","WARUNG LESTARI","","2026-07-23T15:55:27+07:00"],[220,"2026-07-09T10:00:00+07:00","Pengeluaran",247500.0,"GAS","CASH","KITCHEN","SIDO RAHAYU","","2026-07-23T15:58:34+07:00"],[221,"2026-07-09T10:00:00+07:00","Pengeluaran",9000.0,"DOUBLE TAPE DLL","CASH","MANAJEMEN","","","2026-07-23T16:00:12+07:00"],[222,"2026-07-09T10:00:00+07:00","Pengeluaran",494500.0,"INTISARI BAR","BCA 445","BAR","INTISARI BAR","","2026-07-23T16:03:42+07:00"],[223,"2026-07-17T10:10:00+07:00","Pengeluaran",52000.0,"TELUR","CASH","KITCHEN","WARUNG LESTARI","","2026-07-23T16:42:47+07:00"],[224,"2026-07-17T10:10:00+07:00","Pengeluaran",100000.0,"IURAN RT","CASH","MANAJEMEN","","","2026-07-23T16:43:34+07:00"],[225,"2026-07-17T10:10:00+07:00","Pengeluaran",20000.0,"ICE CUBE","CASH","BAR","AZKA ICE CUBE","","2026-07-23T16:44:53+07:00"],[226,"2026-07-17T10:10:00+07:00","Pengeluaran",63000.0,"ATK","CASH","MANAJEMEN","","BUKU DAN PULPEN","2026-07-23T16:46:33+07:00"],[227,"2026-07-02T10:00:00+07:00","Pengeluaran",117130.0,"UDANG SUPERINDO","BCA 445","KITCHEN","SUPERINDO","","2026-07-23T17:19:56+07:00"],[228,"2026-07-02T10:00:00+07:00","Pengeluaran",180950.0,"MINYAK","BCA 445","KITCHEN","SUPERINDO","","2026-07-23T17:22:58+07:00"],[229,"2026-07-22T10:00:00+07:00","Pengeluaran",360000.0,"AYAM","BCA 445","KITCHEN","AYAM BU SUHARTI","","2026-07-24T13:20:16+07:00"],[230,"2026-07-27T18:29:00+07:00","Pengeluaran",1545000.0,"Payroll Parttime - 2026-07-20 s/d 2026-07-26","BCA 445","GAJI","GAJI MINGGUAN PARTTIME","","2026-07-27T18:29:07+07:00"],[231,"2026-07-28T01:51:00+07:00","Pengeluaran",24700000.0,"Payroll Fulltime - 2026-07","BCA 445","GAJI","GAJI BULANAN","","2026-07-28T01:51:15+07:00"]];

function migrasiImportRekapKeuanganLama() {
  migrasiSistemRekeningDanAlokasi();
  var ss = platformSS_();
  var categorySheet = ss.getSheetByName(SHEETS.CATEGORIES);
  var transactionSheet = ss.getSheetByName(SHEETS.TRANSACTIONS);
  var existingCategories = {};
  readCategories_().forEach(function(item) {
    existingCategories[legacyCategoryKey_(item.type, item.name, item.parent)] = true;
  });
  var categoryRows = [];
  LEGACY_IMPORT_CATEGORIES.forEach(function(item) {
    var key = legacyCategoryKey_(item[0], item[1], item[2]);
    if (!existingCategories[key]) {
      categoryRows.push([Utilities.getUuid(), item[0], item[1], item[2], defaultAccountForCategory_(item[1], item[2]), true, new Date()]);
      existingCategories[key] = true;
    }
  });
  if (categoryRows.length) {
    categorySheet.getRange(categorySheet.getLastRow() + 1, 1, categoryRows.length, 7).setValues(categoryRows);
  }

  var existingIds = {};
  if (transactionSheet.getLastRow() > 1) {
    transactionSheet.getRange(2, 1, transactionSheet.getLastRow() - 1, 1).getValues().forEach(function(row) {
      existingIds[String(row[0])] = true;
    });
  }
  var transactionRows = [];
  LEGACY_IMPORT_TRANSACTIONS.forEach(function(item) {
    var id = 'LEGACY-TX-' + item[0];
    if (existingIds[id]) return;
    var transactionDate = new Date(item[1]);
    var createdDate = new Date(item[9]);
    transactionRows.push([id, transactionDate, item[2], item[3], item[4], item[6], item[7], item[5], item[8],
      item[2] === 'Pengeluaran' ? 'ACC-UTAMA' : '', item[2] === 'Pemasukan' ? 'ACC-UTAMA' : '',
      'IMPORT-LEGACY', Utilities.formatDate(transactionDate, APP_TZ, 'yyyy-MM'), createdDate, createdDate]);
    existingIds[id] = true;
  });
  if (transactionRows.length) {
    transactionSheet.getRange(transactionSheet.getLastRow() + 1, 1, transactionRows.length, 15).setValues(transactionRows);
  }
  formatSheets_();
  return {
    ok: true,
    source: LEGACY_IMPORT_SOURCE,
    categoriesAdded: categoryRows.length,
    transactionsAdded: transactionRows.length,
    message: 'Import selesai: ' + transactionRows.length + ' transaksi dan ' + categoryRows.length + ' kategori baru.'
  };
}

function legacyCategoryKey_(type, name, parent) {
  return [clean_(type), clean_(parent), clean_(name)].join('|').toLowerCase();
}
