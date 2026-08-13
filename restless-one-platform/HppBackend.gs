// ============================================================
// HPP MANAGER — RESTLESS COFFEE & EATERY
// Google Apps Script — Code.gs
// ============================================================

const SHEET_BAHAN       = 'BAHAN_BAKU';
const SHEET_PRODUK      = 'PRODUK';
const SHEET_RESEP       = 'RESEP';
const SHEET_PREP        = 'PREPARATION';
const SHEET_PREP_DETAIL = 'PREP_DETAIL';
const APP_TITLE         = 'HPP Manager — Restless';

// ─── SERVE WEB APP ───────────────────────────────────────────

// ============================================================
// TAMBAHAN: API ENDPOINT UNTUK TELEGRAM BOT
// Tempel di bagian bawah Code.gs, JANGAN hapus doGet() yang lama.
// Lalu GANTI nama fungsi doGet() lama jadi doGet_(e) dan pakai
// yang baru ini sebagai doGet() satu-satunya. Lihat catatan di bawah.
// ============================================================

// Set API key sekali via menu Apps Script:
// Project Settings > Script Properties > tambah key "BOT_API_KEY"
// dengan value bebas (string acak), lalu pakai value yang sama di Worker.

function hppDoGet_(e) {
  // Mode API: dipanggil dengan ?key=XXX&produk=nama
  if (e && e.parameter && e.parameter.key) {
    return _handleApiRequest(e);
  }
  // Mode default: render halaman web app seperti biasa
  return HtmlService.createHtmlOutputFromFile('HppPage')
    .setTitle(APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function _handleApiRequest(e) {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('BOT_API_KEY');

  if (!apiKey || e.parameter.key !== apiKey) {
    return _jsonOutput({ ok: false, error: 'unauthorized' });
  }

  const action = e.parameter.action || 'search';

  if (action === 'search') {
    const q = String(e.parameter.produk || e.parameter.q || '').toLowerCase().trim();
    if (!q) return _jsonOutput({ ok: false, error: 'parameter produk kosong' });

    const result = getProduk();
    if (result._error) return _jsonOutput({ ok: false, error: result._error });

    const matches = result.items.filter(p =>
      p.nama.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      return _jsonOutput({ ok: true, found: false, query: q });
    }

    return _jsonOutput({
      ok: true,
      found: true,
      query: q,
      items: matches.map(p => ({
        nama:          p.nama,
        kategori:      p.kategori,
        hargaJual:     p.hargaJual,
        hppBahan:      p.hppBahan,
        hppTotal:      p.hppTotal,
        marginPct:     p.marginPct,
        marginNominal: p.marginNominal
      }))
    });
  }

  if (action === 'dashboard') {
    const result = getDashboard();
    if (result._error) return _jsonOutput({ ok: false, error: result._error });
    return _jsonOutput({ ok: true, data: result });
  }

  return _jsonOutput({ ok: false, error: 'action tidak dikenal' });
}

function _jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── SPREADSHEET — CACHED PER EXECUTION ──────────────────────
// GAS runs fresh per call, tapi dalam satu eksekusi server
// kita cache objek SS agar tidak buka ulang berkali-kali.

let _ss = null;

function getSpreadsheet() {
  if (_ss) return _ss;
  _ss = platformSS_();
  return _ss;
}

function _createSpreadsheet() {
  const ss = SpreadsheetApp.create(APP_TITLE);
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  const s1 = ss.getSheets()[0];
  s1.setName(SHEET_BAHAN);
  _setupSheet(s1,
    ['ID','Nama Bahan','Satuan','Harga/Satuan (Rp)','Kategori','Terakhir Update'],
    [80,220,80,160,130,140]);
  const s2 = ss.insertSheet(SHEET_PRODUK);
  _setupSheet(s2,
    ['ID','Nama Produk','Kategori Menu','Harga Jual (Rp)',
     'HPP Bahan (Rp)','Overhead %','Overhead (Rp)','HPP Total (Rp)',
     'Margin %','Margin Nominal (Rp)','Tanggal Input'],
    [80,220,130,150,130,100,130,130,90,160,130]);
  const s3 = ss.insertSheet(SHEET_RESEP);
  _setupSheet(s3,
    ['ID','Produk ID','Nama Produk','Bahan ID','Nama Bahan',
     'Satuan','Jumlah','Harga/Satuan (Rp)','Subtotal HPP (Rp)'],
    [80,80,200,80,200,80,80,160,160]);
  const s4 = ss.insertSheet(SHEET_PREP);
  _setupSheet(s4,
    ['ID','Nama Preparation','Satuan Hasil','Yield/Jumlah Hasil',
     'HPP Total (Rp)','HPP/Satuan Hasil (Rp)','Bahan Baku ID','Tanggal'],
    [80,220,110,140,130,170,100,110]);
  const s5 = ss.insertSheet(SHEET_PREP_DETAIL);
  _setupSheet(s5,
    ['ID','Prep ID','Nama Prep','Bahan ID','Nama Bahan',
     'Satuan','Jumlah','Harga/Satuan (Rp)','Subtotal (Rp)'],
    [80,80,200,80,200,80,80,160,130]);
  return ss;
}

function _setupSheet(sheet, headers, widths) {
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  const r = sheet.getRange(1, 1, 1, headers.length);
  r.setBackground('#2C1A0E');
  r.setFontColor('#D4A040');
  r.setFontWeight('bold');
  r.setFontSize(11);
  r.setHorizontalAlignment('center');
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
}

// ─── UTILITIES ────────────────────────────────────────────────

function uid(prefix) {
  return prefix + '_' + new Date().getTime() + '_' +
         Math.random().toString(36).substr(2, 5);
}

function today() {
  return Utilities.formatDate(
    new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/** Format aman untuk nilai tanggal yang dibaca dari Google Sheets. */
function hppCellToDateString(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm');
  }
  return String(v == null ? '' : v);
}

/**
 * Baca semua data dari sheet dalam 1 API call.
 * Jauh lebih cepat dari getLastRow() + getLastColumn() + getRange().
 */
function _readSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];                   // hanya header
  return data.slice(1).filter(r => r[0] !== '' && r[0] !== null);
}

function _getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

// ─── DASHBOARD ────────────────────────────────────────────────

function getDashboard() {
  return _safe(() => {
    const ss        = getSpreadsheet();
    const prodRows  = _readSheet(ss.getSheetByName(SHEET_PRODUK));
    const bahnRows  = _readSheet(ss.getSheetByName(SHEET_BAHAN));

    const prods = prodRows.map(r => ({
      nama:         String(r[1] || ''),
      marginPct:    Number(r[8])  || 0,
      marginNominal:Number(r[9])  || 0
    }));

    const avgMargin = prods.length
      ? Math.round(prods.reduce((s,p) => s + p.marginPct, 0) / prods.length * 10) / 10
      : 0;

    return {
      totalProduk:  prods.length,
      totalBahan:   bahnRows.length,
      avgMargin,
      lowMargin:    prods.filter(p => p.marginPct < 50 && p.marginPct > 0)
                         .map(p => ({ nama: p.nama, margin: p.marginPct })),
      topProfit:    [...prods].sort((a,b) => b.marginNominal - a.marginNominal)
                              .slice(0,5)
                              .map(p => ({ nama: p.nama, margin: p.marginPct,
                                           marginNominal: p.marginNominal })),
      ssUrl: ss.getUrl()
    };
  });
}

// ─── SAFE WRAPPER ─────────────────────────────────────────────
// GAS kadang tidak memanggil withFailureHandler kalau server crash.
// Semua fungsi publik dibungkus try-catch dan return { ok, error }
// agar client selalu menerima objek yang valid, bukan null.

function _safe(fn) {
  try { return fn(); }
  catch(e) {
    Logger.log('ERROR: ' + e.message + '\n' + e.stack);
    return { _error: e.message };
  }
}

/** Konversi nilai dari getValues() ke tipe yang aman untuk JSON */
function _safe_val(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  if (v === null || v === undefined) return '';
  return v;
}

// ─── BAHAN BAKU ───────────────────────────────────────────────

function getBahanBaku() {
  return _safe(() => {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_BAHAN);
    const rows  = _readSheet(sheet);
    return {
      items: rows.map(r => ({
        id:       String(r[0] || ''),
        nama:     String(r[1] || ''),
        satuan:   String(r[2] || ''),
        harga:    Number(r[3]) || 0,
        kategori: String(r[4] || ''),
        updated:  _safe_val(r[5])
      })),
      ssUrl: ss.getUrl()
    };
  });
}

function saveBahanBaku(data) {
  return _safe(() => {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_BAHAN);
    const now   = today();
    const allRows = sheet.getDataRange().getValues();
    const dataRows = allRows.slice(1).filter(r => r[0]);

    if (data.id) {
      for (let i = 1; i < allRows.length; i++) {
        if (allRows[i][0] === data.id) {
          sheet.getRange(i + 1, 1, 1, 6).setValues([[
            data.id, data.nama, data.satuan, data.harga, data.kategori, now
          ]]);
          SpreadsheetApp.flush();
          _propagateHargaBahan(data.id, data.harga, data.satuan, ss);
          SpreadsheetApp.flush();
          return { success: true, id: data.id };
        }
      }
    }

    const nameLower = data.nama.toLowerCase().trim();
    if (dataRows.some(r => r[1].toString().toLowerCase().trim() === nameLower))
      return { success: false, error: 'Bahan dengan nama ini sudah ada di database.' };

    const newId = uid('BHN');
    sheet.appendRow([newId, data.nama, data.satuan, data.harga, data.kategori, now]);
    SpreadsheetApp.flush();
    return { success: true, id: newId };
  });
}

function deleteBahanBaku(id) {
  return _safe(() => {
    const ss        = getSpreadsheet();
    const resepData = sheet_getDataRows(ss, SHEET_RESEP);
    if (resepData.some(r => r[3] === id))
      return { success: false,
               error: 'Bahan masih digunakan dalam resep. Hapus produk terkait terlebih dahulu.' };

    const sheet   = ss.getSheetByName(SHEET_BAHAN);
    const allRows = sheet.getDataRange().getValues();
    for (let i = 1; i < allRows.length; i++) {
      if (allRows[i][0] === id) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return { success: true };
      }
    }
    return { success: false, error: 'Bahan tidak ditemukan.' };
  });
}

/** Helper: baca raw data rows dari sheet (sudah exclude header) */
function sheet_getDataRows(ss, sheetName) {
  const allRows = ss.getSheetByName(sheetName).getDataRange().getValues();
  return allRows.slice(1).filter(r => r[0]);
}

/**
 * Propagasi perubahan harga bahan ke seluruh sistem secara cascade:
 *   1. Update semua baris RESEP yang pakai bahan ini → recalc HPP Produk
 *   2. Update semua baris PREP_DETAIL yang pakai bahan ini → recalc HPP Preparation
 *      → Update harga bahan baku preparation → cascade lagi (langkah 1&2)
 *
 * _visited — Set bahanId yang sudah diproses, mencegah infinite loop
 */
function _propagateHargaBahan(bahanId, newHarga, newSatuan, ss, _visited) {
  _visited = _visited || new Set();
  if (_visited.has(bahanId)) return;  // sudah diproses, hentikan
  _visited.add(bahanId);

  // ── LANGKAH 1: Update RESEP (resep produk) ──────────────────
  const resepSheet = ss.getSheetByName(SHEET_RESEP);
  const resepRows  = resepSheet.getDataRange().getValues();
  const affProds   = new Set();

  for (let i = 1; i < resepRows.length; i++) {
    if (resepRows[i][3] !== bahanId) continue;
    const sub = (Number(resepRows[i][6]) || 0) * newHarga;
    // Batch: cols 6(satuan), 7(jumlah tetap), 8(harga), 9(subtotal)
    resepSheet.getRange(i + 1, 6, 1, 4)
              .setValues([[newSatuan, resepRows[i][6], newHarga, sub]]);
    affProds.add(String(resepRows[i][1]));
  }
  // Recalculate HPP semua produk yang terpengaruh
  const resepFresh = _readSheet(resepSheet);
  affProds.forEach(pId => _recalcProdukHPP(pId, ss, resepFresh));

  // ── LANGKAH 2: Update PREP_DETAIL (resep preparation) ───────
  const detailSheet = ss.getSheetByName(SHEET_PREP_DETAIL);
  if (!detailSheet) return;

  const detailRows = detailSheet.getDataRange().getValues();
  const affPreps   = new Set();

  for (let i = 1; i < detailRows.length; i++) {
    if (detailRows[i][3] !== bahanId) continue;
    const sub = (Number(detailRows[i][6]) || 0) * newHarga;
    // Batch: cols 6(satuan), 7(jumlah tetap), 8(harga), 9(subtotal)
    detailSheet.getRange(i + 1, 6, 1, 4)
               .setValues([[newSatuan, detailRows[i][6], newHarga, sub]]);
    affPreps.add(String(detailRows[i][1]));
  }

  if (affPreps.size === 0) return;

  // ── LANGKAH 3: Recalculate HPP preparation yang terpengaruh ─
  const prepSheet  = ss.getSheetByName(SHEET_PREP);
  const bahanSheet = ss.getSheetByName(SHEET_BAHAN);
  if (!prepSheet) return;

  const detailFresh  = _readSheet(detailSheet);
  const prepAllRows  = prepSheet.getDataRange().getValues();
  const now          = today();

  // Baca bahanSheet SEKALI di sini — bukan di dalam loop
  // Sebelumnya dibaca N kali (1 per preparation terpengaruh) → O(n) API calls
  const bahanAllRows = bahanSheet.getDataRange().getValues();

  affPreps.forEach(prepId => {
    const hppTotal = detailFresh
      .filter(r => String(r[1]) === prepId)
      .reduce((sum, r) => sum + (Number(r[8]) || 0), 0);

    for (let i = 1; i < prepAllRows.length; i++) {
      if (String(prepAllRows[i][0]) !== prepId) continue;

      const yieldQ       = Math.max(Number(prepAllRows[i][3]) || 1, 0.001);
      const hppPerSatuan = hppTotal / yieldQ;
      const satuanHasil  = String(prepAllRows[i][2] || '');
      const bahanBakuId  = String(prepAllRows[i][6] || '');

      // Update PREPARATION: cols 5(HPP Total) & 6(HPP/Satuan)
      prepSheet.getRange(i + 1, 5, 1, 2)
               .setValues([[hppTotal, hppPerSatuan]]);

      // ── LANGKAH 4: Update entri BAHAN_BAKU preparation ──────
      if (bahanBakuId) {
        // Gunakan bahanAllRows yang sudah dibaca di luar loop
        for (let j = 1; j < bahanAllRows.length; j++) {
          if (String(bahanAllRows[j][0]) !== bahanBakuId) continue;
          bahanSheet.getRange(j + 1, 4, 1, 1).setValue(hppPerSatuan);
          bahanSheet.getRange(j + 1, 6, 1, 1).setValue(now);
          break;
        }
        // ── LANGKAH 5: CASCADE ────────────────────────────────
        _propagateHargaBahan(bahanBakuId, hppPerSatuan, satuanHasil, ss, _visited);
      }
      break;
    }
  });
}

/**
 * Hitung ulang HPP produk dan tulis dalam 1 setValues() call.
 * resepData opsional — kalau tidak dikirim, dibaca ulang dari sheet.
 */
function _recalcProdukHPP(produkId, ss, resepData) {
  if (!resepData) resepData = _readSheet(ss.getSheetByName(SHEET_RESEP));

  const hppBahan = resepData
    .filter(r => r[1] === produkId)
    .reduce((sum, r) => sum + (Number(r[8]) || 0), 0);

  const produkSheet = ss.getSheetByName(SHEET_PRODUK);
  const allRows     = produkSheet.getDataRange().getValues();
  for (let i = 1; i < allRows.length; i++) {
    if (allRows[i][0] !== produkId) continue;
    const hargaJual     = Number(allRows[i][3]) || 0;
    const overheadPct   = Number(allRows[i][5]) || 0;
    const overheadNom   = hppBahan * overheadPct / 100;
    const hppTotal      = hppBahan + overheadNom;
    const margin        = hargaJual > 0
      ? (hargaJual - hppTotal) / hargaJual * 100 : 0;
    const marginNominal = hargaJual - hppTotal;

    // 1 setValues() untuk 6 kolom: HPPBahan, Overhead%, OverheadNom, HPPTotal, Margin%, MarginNom
    produkSheet.getRange(i + 1, 5, 1, 6).setValues([[
      hppBahan, overheadPct, overheadNom, hppTotal,
      Math.round(margin * 10) / 10, marginNominal
    ]]);
    break;
  }
}

// ─── PRODUK ───────────────────────────────────────────────────

function getProduk() {
  return _safe(() => {
    const ss   = getSpreadsheet();
    const rows = _readSheet(ss.getSheetByName(SHEET_PRODUK));
    return {
      items: rows.map(r => ({
        id:            String(r[0] || ''),
        nama:          String(r[1] || ''),
        kategori:      String(r[2] || ''),
        hargaJual:     Number(r[3])  || 0,
        hppBahan:      Number(r[4])  || 0,
        overheadPct:   Number(r[5])  || 0,
        overheadNom:   Number(r[6])  || 0,
        hppTotal:      Number(r[7])  || 0,
        marginPct:     Number(r[8])  || 0,
        marginNominal: Number(r[9])  || 0,
        tanggal:       _safe_val(r[10])
      })),
      ssUrl: ss.getUrl()
    };
  });
}

function getResepByProduk(produkId) {
  return _safe(() => {
    const ss   = getSpreadsheet();
    const rows = _readSheet(ss.getSheetByName(SHEET_RESEP));
    return rows
      .filter(r => r[1] === produkId)
      .map(r => ({
        id:          String(r[0] || ''),
        produkId:    String(r[1] || ''),
        namaProduk:  String(r[2] || ''),
        bahanId:     String(r[3] || ''),
        namaBahan:   String(r[4] || ''),
        satuan:      String(r[5] || ''),
        jumlah:      Number(r[6]) || 0,
        hargaSatuan: Number(r[7]) || 0,
        subtotal:    Number(r[8]) || 0
      }));
  });
}

function saveProduk(data) {
  return _safe(() => {
    const ss          = getSpreadsheet();
    const bahanSheet  = ss.getSheetByName(SHEET_BAHAN);
  const produkSheet = ss.getSheetByName(SHEET_PRODUK);
  const resepSheet  = ss.getSheetByName(SHEET_RESEP);
  const now         = today();

  // Baca semua data bahan sekali
  const allBahan    = bahanSheet.getDataRange().getValues();
  const bahanRows   = allBahan.slice(1).filter(r => r[0]);

  // ── Proses bahan baku — jaga master list (no duplikat) ──
  const processedBahan = [];
  for (const b of data.bahan) {
    let bahanId = b.bahanId || null;

    if (!bahanId) {
      const nameLower = b.namaBahan.toLowerCase().trim();
      const found = bahanRows.find(
        r => r[1].toString().toLowerCase().trim() === nameLower);

      if (found) {
        bahanId = found[0];
        // Update harga kalau berubah
        if (Number(found[3]) !== Number(b.harga)) {
          const rowIdx = allBahan.findIndex(r => r[0] === bahanId);
          if (rowIdx > 0) {
            bahanSheet.getRange(rowIdx + 1, 4, 1, 2)
                      .setValues([[b.harga, now]]);
          }
        }
      } else {
        bahanId = uid('BHN');
        bahanSheet.appendRow(
          [bahanId, b.namaBahan, b.satuan, b.harga, b.kategori || 'Umum', now]);
        // Tambah ke cache lokal agar bahan berikutnya bisa match
        bahanRows.push([bahanId, b.namaBahan, b.satuan, b.harga, b.kategori || 'Umum', now]);
      }
    }

    processedBahan.push({
      bahanId,
      namaBahan: b.namaBahan,
      satuan:    b.satuan,
      harga:     Number(b.harga)  || 0,
      jumlah:    Number(b.jumlah) || 0,
      subtotal:  (Number(b.jumlah) || 0) * (Number(b.harga) || 0)
    });
  }

  // ── Kalkulasi HPP ──
  const hppBahan      = processedBahan.reduce((s,b) => s + b.subtotal, 0);
  const overheadPct   = Number(data.overheadPct) || 0;
  const overheadNom   = hppBahan * overheadPct / 100;
  const hppTotal      = hppBahan + overheadNom;
  const hargaJual     = Number(data.hargaJual) || 0;
  const margin        = hargaJual > 0 ? (hargaJual - hppTotal) / hargaJual * 100 : 0;
  const marginNominal = hargaJual - hppTotal;
  const marginRounded = Math.round(margin * 10) / 10;

  // ── Simpan / Update produk ──
  let produkId = data.id || null;
  if (produkId) {
    const allProduk = produkSheet.getDataRange().getValues();
    for (let i = 1; i < allProduk.length; i++) {
      if (allProduk[i][0] === produkId) {
        produkSheet.getRange(i + 1, 1, 1, 11).setValues([[
          produkId, data.nama, data.kategori, hargaJual,
          hppBahan, overheadPct, overheadNom, hppTotal,
          marginRounded, marginNominal, allProduk[i][10]
        ]]);
        break;
      }
    }
  } else {
    produkId = uid('PRD');
    produkSheet.appendRow([
      produkId, data.nama, data.kategori, hargaJual,
      hppBahan, overheadPct, overheadNom, hppTotal,
      marginRounded, marginNominal, now
    ]);
  }

  // ── Simpan resep — WRITE FIRST, clear excess after (aman dari data loss) ──
  // Urutan: tulis dulu → baru hapus sisa. Kalau write gagal, data lama tetap aman.
  const newResepRows = processedBahan.map(b => [
    uid('RSP'), produkId, data.nama,
    b.bahanId, b.namaBahan, b.satuan,
    b.jumlah, b.harga, b.subtotal
  ]);

  const allResepData = resepSheet.getDataRange().getValues();
  const resepHeader  = allResepData[0];
  const numCols      = resepHeader.length;
  const keepResep    = allResepData.slice(1)
    .filter(r => r[0] && String(r[1]) !== String(produkId));
  const finalResep   = [...keepResep, ...newResepRows];

  // 1. TULIS semua data (header + rows) sekaligus — data baru sudah aman
  const writeData = [resepHeader, ...finalResep];
  resepSheet.getRange(1, 1, writeData.length, numCols).setValues(writeData);

  // 2. Hapus sisa baris lama (jika data baru lebih sedikit) — operasi cleanup
  //    Kalau ini gagal, tidak ada data loss — hanya ada trailing rows kosong
  const oldDataRows = allResepData.length - 1;
  const newDataRows = finalResep.length;
  if (oldDataRows > newDataRows) {
    resepSheet.getRange(newDataRows + 2, 1, oldDataRows - newDataRows, numCols).clearContent();
  }

  SpreadsheetApp.flush();
  return { success: true, id: produkId,
           hppBahan, overheadPct, overheadNom, hppTotal,
           margin: marginRounded };
  }); // end _safe
}

function deleteProduk(id) {
  return _safe(() => {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PRODUK);
    const rows  = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.deleteRow(i + 1);
        _deleteResepByProduk(id, ss);
        SpreadsheetApp.flush();
        return { success: true };
      }
    }
    return { success: false, error: 'Produk tidak ditemukan.' };
  });
}

function _deleteResepByProduk(produkId, ss) {
  const sheet = ss.getSheetByName(SHEET_RESEP);
  const rows  = sheet.getDataRange().getValues();
  // Hapus dari bawah ke atas agar index tidak bergeser
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === produkId) sheet.deleteRow(i + 1);
  }
}

// ─── PREPARATION ──────────────────────────────────────────────

function getPreparations() {
  return _safe(() => {
    const ss   = getSpreadsheet();
    if (!ss.getSheetByName(SHEET_PREP)) ensurePrepSheets();
    const rows = _readSheet(ss.getSheetByName(SHEET_PREP));
    return {
      items: rows.map(r => ({
        id:           String(r[0] || ''),
        nama:         String(r[1] || ''),
        satuanHasil:  String(r[2] || ''),
        yield:        Number(r[3]) || 0,
        hppTotal:     Number(r[4]) || 0,
        hppPerSatuan: Number(r[5]) || 0,
        bahanBakuId:  String(r[6] || ''),
        tanggal:      _safe_val(r[7])
      })),
      ssUrl: ss.getUrl()
    };
  });
}

function getPrepDetail(prepId) {
  return _safe(() => {
    const ss   = getSpreadsheet();
    if (!ss.getSheetByName(SHEET_PREP_DETAIL)) ensurePrepSheets();
    const rows = _readSheet(ss.getSheetByName(SHEET_PREP_DETAIL));
    return rows
      .filter(r => r[1] === prepId)
      .map(r => ({
        id:          String(r[0] || ''),
        prepId:      String(r[1] || ''),
        bahanId:     String(r[3] || ''),
        namaBahan:   String(r[4] || ''),
        satuan:      String(r[5] || ''),
        jumlah:      Number(r[6]) || 0,
        hargaSatuan: Number(r[7]) || 0,
        subtotal:    Number(r[8]) || 0
      }));
  });
}

function savePreparation(data) {
  return _safe(() => {
    const ss          = getSpreadsheet();
    if (!ss.getSheetByName(SHEET_PREP)) ensurePrepSheets();
    const prepSheet   = ss.getSheetByName(SHEET_PREP);
    const detailSheet = ss.getSheetByName(SHEET_PREP_DETAIL);
    const bahanSheet  = ss.getSheetByName(SHEET_BAHAN);
    const now         = today();

    const processed = (data.bahan || []).map(b => ({
      bahanId:   String(b.bahanId   || ''),
      namaBahan: String(b.namaBahan || ''),
      satuan:    String(b.satuan    || ''),
      harga:     Number(b.harga)  || 0,
      jumlah:    Number(b.jumlah) || 0,
      subtotal:  (Number(b.jumlah) || 0) * (Number(b.harga) || 0)
    }));

    const hppTotal     = processed.reduce((s, b) => s + b.subtotal, 0);
    const yieldQty     = Math.max(Number(data.yield) || 1, 0.001);
    const hppPerSatuan = hppTotal / yieldQty;

    let prepId      = data.id          || null;
    let bahanBakuId = data.bahanBakuId || null;

    if (prepId) {
      const allPrep = prepSheet.getDataRange().getValues();
      for (let i = 1; i < allPrep.length; i++) {
        if (allPrep[i][0] === prepId) {
          if (!bahanBakuId) bahanBakuId = String(allPrep[i][6] || '');
          prepSheet.getRange(i + 1, 1, 1, 8).setValues([[
            prepId, data.nama, data.satuanHasil, yieldQty,
            hppTotal, hppPerSatuan, bahanBakuId, allPrep[i][7]
          ]]);
          break;
        }
      }
      if (bahanBakuId) {
        const allBahan = bahanSheet.getDataRange().getValues();
        for (let i = 1; i < allBahan.length; i++) {
          if (allBahan[i][0] === bahanBakuId) {
            bahanSheet.getRange(i + 1, 1, 1, 6).setValues([[
              bahanBakuId, data.nama, data.satuanHasil,
              hppPerSatuan, 'Preparation', now
            ]]);
            break;
          }
        }
      }
    } else {
      bahanBakuId = uid('BHN');
      bahanSheet.appendRow([
        bahanBakuId, data.nama, data.satuanHasil,
        hppPerSatuan, 'Preparation', now
      ]);
      prepId = uid('PRP');
      prepSheet.appendRow([
        prepId, data.nama, data.satuanHasil, yieldQty,
        hppTotal, hppPerSatuan, bahanBakuId, now
      ]);
    }

    // ── Simpan detail bahan preparation — WRITE FIRST, clear excess after ──
    const newDetailRows = processed.map(b => [
      uid('PRD'), prepId, data.nama,
      b.bahanId, b.namaBahan, b.satuan,
      b.jumlah, b.harga, b.subtotal
    ]);

    const allDetailData = detailSheet.getDataRange().getValues();
    const detailHeader  = allDetailData[0];
    const numDetailCols = detailHeader.length;
    const keepDetail    = allDetailData.slice(1)
      .filter(r => r[0] && String(r[1]) !== String(prepId));
    const finalDetail   = [...keepDetail, ...newDetailRows];

    // 1. Tulis header + semua data sekaligus (data baru aman lebih dulu)
    const writeDetail = [detailHeader, ...finalDetail];
    detailSheet.getRange(1, 1, writeDetail.length, numDetailCols).setValues(writeDetail);

    // 2. Hapus sisa baris lama jika data baru lebih sedikit
    const oldDetailRows = allDetailData.length - 1;
    const newDetailRowsCount = finalDetail.length;
    if (oldDetailRows > newDetailRowsCount) {
      detailSheet.getRange(newDetailRowsCount + 2, 1,
        oldDetailRows - newDetailRowsCount, numDetailCols).clearContent();
    }

    SpreadsheetApp.flush();

    // Cascade: kalau preparation ini dipakai sebagai bahan di produk/preparation lain,
    // propagasi harga barunya ke seluruh sistem
    if (bahanBakuId) {
      _propagateHargaBahan(
        bahanBakuId, hppPerSatuan, data.satuanHasil, ss,
        new Set([bahanBakuId]) // seed visited agar tidak loop balik ke dirinya sendiri
      );
      SpreadsheetApp.flush();
    }

    return { success: true, id: prepId, bahanBakuId, hppTotal, hppPerSatuan };
  });
}

function deletePreparation(id) {
  return _safe(() => {
    const ss        = getSpreadsheet();
    if (!ss.getSheetByName(SHEET_PREP)) ensurePrepSheets();
    const prepSheet = ss.getSheetByName(SHEET_PREP);
    const allPrep   = prepSheet.getDataRange().getValues();
    let bahanBakuId = null;

    for (let i = 1; i < allPrep.length; i++) {
      if (allPrep[i][0] === id) {
        bahanBakuId = String(allPrep[i][6] || '');
        prepSheet.deleteRow(i + 1);
        break;
      }
    }
    _deletePrepDetail(id, ss);

    if (bahanBakuId) {
      const resepRows  = _readSheet(ss.getSheetByName(SHEET_RESEP));
      const detailRows = _readSheet(ss.getSheetByName(SHEET_PREP_DETAIL));
      const inUse = resepRows.some(r => r[3] === bahanBakuId)
                 || detailRows.some(r => r[3] === bahanBakuId);
      if (!inUse) {
        const bahanSheet = ss.getSheetByName(SHEET_BAHAN);
        const allBahan   = bahanSheet.getDataRange().getValues();
        for (let i = allBahan.length - 1; i >= 1; i--) {
          if (allBahan[i][0] === bahanBakuId) {
            bahanSheet.deleteRow(i + 1); break;
          }
        }
      }
    }
    SpreadsheetApp.flush();
    return { success: true };
  });
}

function _deletePrepDetail(prepId, ss) {
  const sheet = ss.getSheetByName(SHEET_PREP_DETAIL);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === prepId) sheet.deleteRow(i + 1);
  }
}

function ensurePrepSheets() {
  const ss = getSpreadsheet();
  if (!ss.getSheetByName(SHEET_PREP)) {
    const s = ss.insertSheet(SHEET_PREP);
    _setupSheet(s,
      ['ID','Nama Preparation','Satuan Hasil','Yield/Jumlah Hasil',
       'HPP Total (Rp)','HPP/Satuan Hasil (Rp)','Bahan Baku ID','Tanggal'],
      [80,220,110,140,130,170,100,110]);
  }
  if (!ss.getSheetByName(SHEET_PREP_DETAIL)) {
    const s = ss.insertSheet(SHEET_PREP_DETAIL);
    _setupSheet(s,
      ['ID','Prep ID','Nama Prep','Bahan ID','Nama Bahan',
       'Satuan','Jumlah','Harga/Satuan (Rp)','Subtotal (Rp)'],
      [80,80,200,80,200,80,80,160,130]);
  }
  return { success: true };
}

// ─── BULK IMPORT ──────────────────────────────────────────────

/**
 * Import banyak bahan baku sekaligus.
 * rows: [{nama, satuan, harga, kategori}]
 * Skip duplikat nama otomatis.
 */
function importBahanBulk(rows) {
  return _safe(() => {
    const ss      = getSpreadsheet();
    const sheet   = ss.getSheetByName(SHEET_BAHAN);
    const existing= sheet.getDataRange().getValues();
    const names   = new Set(existing.slice(1).map(r => String(r[1]).toLowerCase().trim()));
    const now     = today();
    const added   = [];
    const skipped = [];

    for (const r of rows) {
      const key = String(r.nama || '').toLowerCase().trim();
      if (!key) continue;
      if (names.has(key)) { skipped.push(r.nama); continue; }
      const id = uid('BHN');
      sheet.appendRow([id, r.nama, r.satuan || '', Number(r.harga)||0, r.kategori||'Lainnya', now]);
      names.add(key);
      added.push(r.nama);
    }

    SpreadsheetApp.flush();
    return { success: true, added: added.length, skipped: skipped.length,
             addedList: added, skippedList: skipped };
  });
}

/**
 * Import banyak produk sekaligus — tanpa detail resep (quick mode).
 * rows: [{nama, kategori, hargaJual, hppBahan, overheadPct}]
 * hppBahan boleh 0 (bisa dilengkapi resep nanti satu per satu).
 */
function importProdukBulk(rows) {
  return _safe(() => {
    const ss          = getSpreadsheet();
    const produkSheet = ss.getSheetByName(SHEET_PRODUK);
    const existing    = produkSheet.getDataRange().getValues();
    const existNames  = new Set(existing.slice(1).map(r => String(r[1]).toLowerCase().trim()));
    const now         = today();
    const added       = [];
    const skipped     = [];

    for (const r of rows) {
      const key = String(r.nama || '').toLowerCase().trim();
      if (!key) continue;
      if (existNames.has(key)) { skipped.push(r.nama); continue; }

      const hargaJual    = Number(r.hargaJual)   || 0;
      const hppBahan     = Number(r.hppBahan)    || 0;
      const overheadPct  = Number(r.overheadPct) || 40;
      const overheadNom  = hppBahan * overheadPct / 100;
      const hppTotal     = hppBahan + overheadNom;
      const margin       = hargaJual > 0 ? (hargaJual - hppTotal) / hargaJual * 100 : 0;
      const marginNominal= hargaJual - hppTotal;
      const produkId     = uid('PRD');

      produkSheet.appendRow([
        produkId, r.nama, r.kategori || '', hargaJual,
        hppBahan, overheadPct, overheadNom, hppTotal,
        Math.round(margin * 10) / 10, marginNominal, now
      ]);
      existNames.add(key);
      added.push({ id: produkId, nama: r.nama });
    }

    SpreadsheetApp.flush();
    return { success: true, added: added.length, skipped: skipped.length,
             addedList: added, skippedList: skipped };
  });
}
