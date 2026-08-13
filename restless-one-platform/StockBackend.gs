/**
 * RESTLESS BAHAN & STOK — Code.gs
 * Sistem pencatatan harga bahan baku (fluktuasi + rata-rata tertimbang)
 * dan stok masuk/keluar/akhir, sinkron dari HPP Manager.
 *
 * Project GAS TERPISAH dari HPP Manager / Rekap Keuangan (aturan: 1 project = 1 doGet).
 * Spreadsheet: TERPISAH juga, dibuat khusus untuk sistem ini.
 *
 * SHEETS:
 *  - Bahan       : ID | Nama Bahan | Satuan | Kategori | Stok Akhir | Harga Rata-Rata | Update Terakhir
 *  - StokMasuk   : Timestamp | BahanID | Nama Bahan | Tanggal(ISO) | Jumlah Masuk | Harga Beli | Total Nilai | Harga Rata-Rata Baru | Diinput Oleh
 *  - StokKeluar  : Timestamp | BahanID | Nama Bahan | Tanggal(ISO) | Jumlah Keluar | Kategori | Harga Rata-Rata Saat Itu | Nilai Keluar | Diinput Oleh
 *  - SyncLog     : Timestamp | Jumlah Dicek | Bahan Baru Ditambahkan | Dijalankan Oleh
 *  - Users       : Nama | Kode Akses | Role
 *
 * SCRIPT PROPERTIES (Project Settings > Script Properties) — WAJIB DIISI:
 *  - SPREADSHEET_ID        : ID spreadsheet BARU khusus sistem ini
 *  - HPP_SPREADSHEET_ID    : 1wKN0F3_SvMJoL6QnzJm53lmE5QsJRtHv-MoIt0PT41s
 *  - HPP_SHEET_NAME        : nama tab sheet di HPP Manager yang berisi 220 bahan (cek dulu, WAJIB DIUBAH kalau bukan "Bahan")
 *  - KODE_AKSES_1 / NAMA_1 : kode akses & nama orang pertama
 *  - KODE_AKSES_2 / NAMA_2 : kode akses & nama orang kedua
 *  - TELEGRAM_BOT_TOKEN    : token bot Restless Command Bot
 *  - TELEGRAM_CHAT_ID      : 5251090737
 *  - AMBANG_FLUKTUASI      : default 10 (persen) kalau kosong
 */

// ==================== SETUP / MIGRASI (idempotent) ====================

function setupSpreadsheet() {
  var ss = getSpreadsheet_();

  ensureSheet_(ss, 'Bahan', ['ID', 'Nama Bahan', 'Satuan', 'Kategori', 'Stok Akhir', 'Harga Rata-Rata', 'Update Terakhir']);
  ensureSheet_(ss, 'StokMasuk', ['Timestamp', 'BahanID', 'Nama Bahan', 'Tanggal', 'Jumlah Masuk', 'Harga Beli', 'Total Nilai', 'Harga Rata-Rata Baru', 'Diinput Oleh']);
  ensureSheet_(ss, 'StokKeluar', ['Timestamp', 'BahanID', 'Nama Bahan', 'Tanggal', 'Jumlah Keluar', 'Kategori', 'Harga Rata-Rata Saat Itu', 'Nilai Keluar', 'Diinput Oleh']);
  ensureSheet_(ss, 'SyncLog', ['Timestamp', 'Jumlah Dicek', 'Bahan Baru Ditambahkan', 'Dijalankan Oleh']);

  var usersSheet = ensureSheet_(ss, 'Users', ['Nama', 'Kode Akses', 'Role']);
  if (usersSheet.getLastRow() < 2) {
    var nama1 = getScriptProp_('NAMA_1') || 'User 1';
    var nama2 = getScriptProp_('NAMA_2') || 'User 2';
    var kode1 = getScriptProp_('KODE_AKSES_1') || 'GANTI_KODE_1';
    var kode2 = getScriptProp_('KODE_AKSES_2') || 'GANTI_KODE_2';
    usersSheet.appendRow([nama1, kode1, 'Admin']);
    usersSheet.appendRow([nama2, kode2, 'Admin']);
  }

  return 'Setup selesai. Sheets: ' + ss.getSheets().map(function (s) { return s.getName(); }).join(', ');
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ==================== ENTRY POINTS ====================

function stockDoGet_(e) {
  try {
    var action = e.parameter.action;
    var kodeAkses = e.parameter.kodeAkses;
    var user = cekKodeAkses_(kodeAkses);
    if (!user) return jsonResponse_({ sukses: false, pesan: 'Kode akses tidak valid' });

    if (action === 'getBahan') {
      return jsonResponse_(actionGetBahan_());
    } else if (action === 'getHistoryMasuk') {
      return jsonResponse_(actionGetHistoryMasuk_(e.parameter.bahanId));
    } else if (action === 'getHistoryKeluar') {
      return jsonResponse_(actionGetHistoryKeluar_(e.parameter.bahanId));
    } else if (action === 'getLaporanBulanan') {
      return jsonResponse_(actionGetLaporanBulanan_(Number(e.parameter.bulan), Number(e.parameter.tahun)));
    }
    return jsonResponse_({ sukses: false, pesan: 'Action tidak dikenal: ' + action });
  } catch (err) {
    return jsonResponse_({ sukses: false, pesan: 'Error: ' + err.message });
  }
}

function stockDoPost_(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var user = cekKodeAkses_(body.kodeAkses);
    if (!user) return jsonResponse_({ sukses: false, pesan: 'Kode akses tidak valid' });

    var action = body.action;
    if (action === 'inputStokMasuk') {
      return jsonResponse_(actionInputStokMasuk_(body, user.nama));
    } else if (action === 'inputStokKeluar') {
      return jsonResponse_(actionInputStokKeluar_(body, user.nama));
    } else if (action === 'syncFromHPP') {
      return jsonResponse_(actionSyncFromHPP_(user.nama));
    }
    return jsonResponse_({ sukses: false, pesan: 'Action tidak dikenal: ' + action });
  } catch (err) {
    return jsonResponse_({ sukses: false, pesan: 'Error: ' + err.message });
  }
}

// ==================== ACTIONS ====================

function actionGetBahan_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Bahan');
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    out.push({
      id: data[i][0],
      nama: data[i][1],
      satuan: data[i][2],
      kategori: data[i][3],
      stokAkhir: Number(data[i][4]) || 0,
      hargaRataRata: Number(data[i][5]) || 0,
      updateTerakhir: data[i][6]
    });
  }
  return { sukses: true, data: out };
}

function actionGetHistoryMasuk_(bahanId) {
  if (!bahanId) return { sukses: false, pesan: 'bahanId wajib diisi' };
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('StokMasuk');
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === bahanId) {
      out.push({
        tanggal: data[i][3],
        jumlah: Number(data[i][4]) || 0,
        harga: Number(data[i][5]) || 0,
        totalNilai: Number(data[i][6]) || 0,
        hargaRataRataBaru: Number(data[i][7]) || 0,
        diinputOleh: data[i][8]
      });
    }
  }
  out.sort(function (a, b) { return new Date(b.tanggal) - new Date(a.tanggal); });
  return { sukses: true, data: out };
}

function actionGetHistoryKeluar_(bahanId) {
  if (!bahanId) return { sukses: false, pesan: 'bahanId wajib diisi' };
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('StokKeluar');
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === bahanId) {
      out.push({
        tanggal: data[i][3],
        jumlah: Number(data[i][4]) || 0,
        kategori: data[i][5],
        hargaRataRataSaatItu: Number(data[i][6]) || 0,
        nilaiKeluar: Number(data[i][7]) || 0,
        diinputOleh: data[i][8]
      });
    }
  }
  out.sort(function (a, b) { return new Date(b.tanggal) - new Date(a.tanggal); });
  return { sukses: true, data: out };
}

function actionInputStokMasuk_(body, diinputOleh) {
  var bahanId = body.bahanId;
  var tanggal = body.tanggal;
  var jumlahMasuk = Number(body.jumlah);
  var hargaBeli = Number(body.hargaBeli);

  if (!bahanId || !tanggal || !jumlahMasuk || jumlahMasuk <= 0 || isNaN(hargaBeli) || hargaBeli < 0) {
    return { sukses: false, pesan: 'Data tidak lengkap atau tidak valid' };
  }

  var ss = getSpreadsheet_();
  var sheetBahan = ss.getSheetByName('Bahan');
  var data = sheetBahan.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === bahanId) { rowIndex = i; break; }
  }
  if (rowIndex === -1) return { sukses: false, pesan: 'Bahan tidak ditemukan: ' + bahanId };

  var namaBahan = data[rowIndex][1];
  var stokLama = Number(data[rowIndex][4]) || 0;
  var hargaRataLama = Number(data[rowIndex][5]) || 0;

  var stokBaru = stokLama + jumlahMasuk;
  var hargaRataBaru = stokBaru > 0
    ? ((stokLama * hargaRataLama) + (jumlahMasuk * hargaBeli)) / stokBaru
    : hargaBeli;
  var totalNilai = jumlahMasuk * hargaBeli;

  var rowNum = rowIndex + 1;
  sheetBahan.getRange(rowNum, 5).setValue(stokBaru);
  sheetBahan.getRange(rowNum, 6).setValue(hargaRataBaru);
  sheetBahan.getRange(rowNum, 7).setValue(new Date());

  var sheetLog = ss.getSheetByName('StokMasuk');
  sheetLog.appendRow([new Date(), bahanId, namaBahan, tanggal, jumlahMasuk, hargaBeli, totalNilai, hargaRataBaru, diinputOleh]);

  if (hargaRataLama > 0) {
    var persenPerubahan = ((hargaRataBaru - hargaRataLama) / hargaRataLama) * 100;
    var ambang = Number(getScriptProp_('AMBANG_FLUKTUASI') || 10);
    if (Math.abs(persenPerubahan) >= ambang) {
      kirimNotifikasiTelegram_(namaBahan, hargaRataLama, hargaRataBaru, persenPerubahan);
    }
  }

  return { sukses: true, stokAkhir: stokBaru, hargaRataRata: hargaRataBaru };
}

function actionInputStokKeluar_(body, diinputOleh) {
  var bahanId = body.bahanId;
  var tanggal = body.tanggal;
  var jumlahKeluar = Number(body.jumlah);
  var kategori = body.kategori; // 'Produksi' | 'Waste' | 'Retur'

  if (!bahanId || !tanggal || !jumlahKeluar || jumlahKeluar <= 0 || !kategori) {
    return { sukses: false, pesan: 'Data tidak lengkap atau tidak valid' };
  }

  var ss = getSpreadsheet_();
  var sheetBahan = ss.getSheetByName('Bahan');
  var data = sheetBahan.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === bahanId) { rowIndex = i; break; }
  }
  if (rowIndex === -1) return { sukses: false, pesan: 'Bahan tidak ditemukan: ' + bahanId };

  var namaBahan = data[rowIndex][1];
  var stokLama = Number(data[rowIndex][4]) || 0;
  var hargaRataRata = Number(data[rowIndex][5]) || 0;

  if (jumlahKeluar > stokLama) {
    return { sukses: false, pesan: 'Stok tidak cukup. Stok saat ini: ' + stokLama + ', diminta keluar: ' + jumlahKeluar };
  }

  var stokBaru = stokLama - jumlahKeluar;
  var nilaiKeluar = jumlahKeluar * hargaRataRata;

  var rowNum = rowIndex + 1;
  sheetBahan.getRange(rowNum, 5).setValue(stokBaru);
  sheetBahan.getRange(rowNum, 7).setValue(new Date());

  var sheetLog = ss.getSheetByName('StokKeluar');
  sheetLog.appendRow([new Date(), bahanId, namaBahan, tanggal, jumlahKeluar, kategori, hargaRataRata, nilaiKeluar, diinputOleh]);

  return { sukses: true, stokAkhir: stokBaru };
}

function actionSyncFromHPP_(diinputOleh) {
  var hppSheetName = 'BAHAN_BAKU';
  var hppSheet = platformSS_().getSheetByName(hppSheetName);
  if (!hppSheet) return { sukses: false, pesan: 'Sheet BAHAN_BAKU belum dimigrasikan ke platform' };

  var hppData = hppSheet.getDataRange().getValues();
  // Kolom HPP Manager: ID(0) | Nama Bahan(1) | Satuan(2) | Harga/Satuan(3) | Kategori(4) | Terakhir Update(5)

  var ss = getSpreadsheet_();
  var sheetBahan = ss.getSheetByName('Bahan');
  var localData = sheetBahan.getDataRange().getValues();
  var existingIds = {};
  for (var i = 1; i < localData.length; i++) {
    existingIds[localData[i][0]] = true;
  }

  var jumlahDicek = 0;
  var jumlahBaru = 0;
  for (var j = 1; j < hppData.length; j++) {
    var id = hppData[j][0];
    if (!id) continue;
    jumlahDicek++;
    if (!existingIds[id]) {
      var nama = hppData[j][1];
      var satuan = hppData[j][2];
      var harga = Number(hppData[j][3]) || 0;
      var kategori = hppData[j][4];
      sheetBahan.appendRow([id, nama, satuan, kategori, 0, harga, new Date()]);
      jumlahBaru++;
    }
  }

  var sheetSync = ss.getSheetByName('SyncLog');
  sheetSync.appendRow([new Date(), jumlahDicek, jumlahBaru, diinputOleh]);

  return { sukses: true, jumlahDicek: jumlahDicek, bahanBaruDitambahkan: jumlahBaru };
}

function actionGetLaporanBulanan_(bulan, tahun) {
  if (!bulan || !tahun) return { sukses: false, pesan: 'bulan dan tahun wajib diisi' };

  var ss = getSpreadsheet_();
  var sheetBahan = ss.getSheetByName('Bahan');
  var bahanData = sheetBahan.getDataRange().getValues();
  var bahanMap = {}; // id -> {nama, satuan, kategori, stokAkhirSaatIni, hargaRataRataSaatIni}
  for (var i = 1; i < bahanData.length; i++) {
    if (!bahanData[i][0]) continue;
    bahanMap[bahanData[i][0]] = {
      id: bahanData[i][0],
      nama: bahanData[i][1],
      satuan: bahanData[i][2],
      kategori: bahanData[i][3],
      stokAkhirSaatIni: Number(bahanData[i][4]) || 0,
      hargaRataRataSaatIni: Number(bahanData[i][5]) || 0,
      totalJumlahMasuk: 0,
      totalNilaiMasuk: 0,
      totalJumlahKeluarProduksi: 0,
      totalNilaiKeluarProduksi: 0,
      totalJumlahKeluarWaste: 0,
      totalNilaiKeluarWaste: 0,
      totalJumlahKeluarRetur: 0,
      totalNilaiKeluarRetur: 0,
      hargaTertinggiBulanIni: null,
      hargaTerendahBulanIni: null
    };
  }

  var sheetMasuk = ss.getSheetByName('StokMasuk');
  var masukData = sheetMasuk.getDataRange().getValues();
  for (var m = 1; m < masukData.length; m++) {
    var tglMasuk = new Date(masukData[m][3]);
    if (tglMasuk.getMonth() + 1 !== bulan || tglMasuk.getFullYear() !== tahun) continue;
    var id1 = masukData[m][1];
    if (!bahanMap[id1]) continue;
    var jml = Number(masukData[m][4]) || 0;
    var hrg = Number(masukData[m][5]) || 0;
    bahanMap[id1].totalJumlahMasuk += jml;
    bahanMap[id1].totalNilaiMasuk += Number(masukData[m][6]) || 0;
    if (bahanMap[id1].hargaTertinggiBulanIni === null || hrg > bahanMap[id1].hargaTertinggiBulanIni) bahanMap[id1].hargaTertinggiBulanIni = hrg;
    if (bahanMap[id1].hargaTerendahBulanIni === null || hrg < bahanMap[id1].hargaTerendahBulanIni) bahanMap[id1].hargaTerendahBulanIni = hrg;
  }

  var sheetKeluar = ss.getSheetByName('StokKeluar');
  var keluarData = sheetKeluar.getDataRange().getValues();
  for (var k = 1; k < keluarData.length; k++) {
    var tglKeluar = new Date(keluarData[k][3]);
    if (tglKeluar.getMonth() + 1 !== bulan || tglKeluar.getFullYear() !== tahun) continue;
    var id2 = keluarData[k][1];
    if (!bahanMap[id2]) continue;
    var jmlK = Number(keluarData[k][4]) || 0;
    var kat = keluarData[k][5];
    var nilaiK = Number(keluarData[k][7]) || 0;
    if (kat === 'Waste') {
      bahanMap[id2].totalJumlahKeluarWaste += jmlK;
      bahanMap[id2].totalNilaiKeluarWaste += nilaiK;
    } else if (kat === 'Retur') {
      bahanMap[id2].totalJumlahKeluarRetur += jmlK;
      bahanMap[id2].totalNilaiKeluarRetur += nilaiK;
    } else {
      bahanMap[id2].totalJumlahKeluarProduksi += jmlK;
      bahanMap[id2].totalNilaiKeluarProduksi += nilaiK;
    }
  }

  var hasil = [];
  var totalPembelian = 0;
  var totalWaste = 0;
  for (var key in bahanMap) {
    var b = bahanMap[key];
    if (b.totalJumlahMasuk === 0 && b.totalJumlahKeluarProduksi === 0 && b.totalJumlahKeluarWaste === 0 && b.totalJumlahKeluarRetur === 0) continue;
    totalPembelian += b.totalNilaiMasuk;
    totalWaste += b.totalNilaiKeluarWaste;
    hasil.push(b);
  }
  hasil.sort(function (a, b) { return b.totalNilaiMasuk - a.totalNilaiMasuk; });

  return {
    sukses: true,
    bulan: bulan,
    tahun: tahun,
    ringkasan: {
      totalNilaiPembelian: totalPembelian,
      totalNilaiWaste: totalWaste,
      jumlahBahanBergerak: hasil.length
    },
    data: hasil
  };
}

// ==================== HELPER ====================

function getSpreadsheet_() {
  return platformSS_();
}

function getScriptProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function cekKodeAkses_(kodeAkses) {
  if (!kodeAkses) return null;
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(kodeAkses)) {
      return { nama: data[i][0], role: data[i][2] };
    }
  }
  return null;
}

function kirimNotifikasiTelegram_(namaBahan, hargaLama, hargaBaru, persenPerubahan) {
  var token = getScriptProp_('TELEGRAM_BOT_TOKEN');
  var chatId = getScriptProp_('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;

  var arah = persenPerubahan > 0 ? 'NAIK' : 'TURUN';
  var pesan = '⚠️ Fluktuasi Harga Bahan\n\n'
    + 'Bahan: ' + namaBahan + '\n'
    + 'Harga lama (rata-rata): Rp ' + Math.round(hargaLama) + '\n'
    + 'Harga baru (rata-rata): Rp ' + Math.round(hargaBaru) + '\n'
    + 'Perubahan: ' + arah + ' ' + Math.abs(persenPerubahan).toFixed(1) + '%';

  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: pesan }),
      muteHttpExceptions: true
    });
  } catch (err) {
    // Jangan hentikan proses input hanya karena notifikasi gagal
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
