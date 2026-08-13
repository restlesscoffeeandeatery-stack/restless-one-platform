/** RESTLESS ONE PLATFORM — Google Apps Script backend */
var PLATFORM_TZ = 'Asia/Jakarta';
var PLATFORM = {
  BAHAN: 'Master_Bahan', PRODUK: 'HPP_Produk', RESEP: 'HPP_Resep',
  STOCK: 'Stock_Balance', MOVEMENT: 'Stock_Movement',
  FIN_TX: 'FIN_Transaksi', FIN_CAT: 'FIN_Kategori', FIN_INV: 'FIN_Invoice', FIN_ACC: 'FIN_Rekening',
  PAY_EMP: 'Payroll_Karyawan', PAY_ATT: 'Payroll_Absensi', PAY_RUN: 'Payroll_Run', PAY_DETAIL: 'Payroll_Detail',
  RCV_ORDER: 'SYNC_Receiving_Order', RCV_DETAIL: 'SYNC_Receiving_Penerimaan',
  ATT_LOG: 'SYNC_Absensi_Log', SYNC: 'Sync_Log', AUDIT: 'Audit_Log'
};

var PLATFORM_SCHEMA = {};
PLATFORM_SCHEMA[PLATFORM.BAHAN] = ['ID','Nama','Satuan','Kategori','Aktif','Sumber','Diubah'];
PLATFORM_SCHEMA[PLATFORM.PRODUK] = ['ID','Nama','Kategori','Harga Jual','Overhead %','HPP Bahan','HPP Total','Margin %','Aktif','Diubah'];
PLATFORM_SCHEMA[PLATFORM.RESEP] = ['ID','Produk ID','Bahan ID','Jumlah','Satuan','Harga','Subtotal'];
PLATFORM_SCHEMA[PLATFORM.STOCK] = ['Bahan ID','Stok Akhir','Harga Rata-Rata','Diubah'];
PLATFORM_SCHEMA[PLATFORM.MOVEMENT] = ['ID','Timestamp','Tanggal','Bahan ID','Tipe','Jumlah','Harga','Nilai','Kategori','Catatan','Pengguna'];
PLATFORM_SCHEMA[PLATFORM.FIN_TX] = ['ID','Tanggal','Tipe','Jumlah','Deskripsi','Kategori','Sub Kategori','Metode','Catatan','Rekening Asal','Rekening Tujuan','Referensi','Periode','Dibuat','Diubah'];
PLATFORM_SCHEMA[PLATFORM.FIN_CAT] = ['ID','Tipe','Nama','Kategori Induk','Rekening','Aktif','Diubah'];
PLATFORM_SCHEMA[PLATFORM.FIN_INV] = ['ID','Nomor','Supplier','Kategori','Sub Kategori','Rekening Pembayaran','Email','Tanggal Invoice','Jatuh Tempo','Status','Item JSON','Subtotal','Pajak','Diskon','Total','Catatan','ID Transaksi','Dibuat','Diubah'];
PLATFORM_SCHEMA[PLATFORM.FIN_ACC] = ['ID','Nama','Jenis','Saldo Awal','Aktif','Prioritas','Diubah'];
PLATFORM_SCHEMA[PLATFORM.PAY_EMP] = ['ID','Nama','Tipe','Rate','Status','Absensi Nama','Diubah'];
PLATFORM_SCHEMA[PLATFORM.PAY_ATT] = ['Source ID','Karyawan ID','Tanggal','Jam Masuk','Jam Keluar','Total Jam','Status','Keterangan','Jam Lembur','Tarif Lembur','Diubah'];
PLATFORM_SCHEMA[PLATFORM.PAY_RUN] = ['Run ID','Skema','Mulai','Selesai','Status','Total','Rekening','Transaksi ID','Dibuat','Diposting'];
PLATFORM_SCHEMA[PLATFORM.PAY_DETAIL] = ['Run ID','Karyawan ID','Nama','Rate','Hadir','Izin','Sakit','Alpha','Lembur','Penyesuaian','Gaji Bersih','Catatan'];
PLATFORM_SCHEMA[PLATFORM.RCV_ORDER] = ['Source Key','Data JSON','Synced At'];
PLATFORM_SCHEMA[PLATFORM.RCV_DETAIL] = ['Source Key','Data JSON','Synced At'];
PLATFORM_SCHEMA[PLATFORM.ATT_LOG] = ['Source Key','Tanggal','Nama','Divisi','Shift','Jam Masuk','Jam Pulang','Status Masuk','Status Pulang','Durasi','Data JSON','Synced At'];
PLATFORM_SCHEMA[PLATFORM.SYNC] = ['Timestamp','Sumber','Status','Baris','Pesan'];
PLATFORM_SCHEMA[PLATFORM.AUDIT] = ['Timestamp','Pengguna','Modul','Aksi','Target ID','Ringkasan'];

function doGet(e) {
  e=e||{parameter:{}};var p=e.parameter||{},module=String(p.module||'');
  if(p.key)return hppDoGet_(e);
  if(p.action)return stockDoGet_(e);
  if(module)platformAuth_(p.adminKey);
  if(module==='finance')return platformServeModule_('FinancePage','Keuangan Baru',p.adminKey);
  if(module==='hpp')return platformServeModule_('HppPage','HPP Manager',p.adminKey);
  if(module==='stock')return platformServeModule_('StockPage','Bahan & Stock',p.adminKey);
  var template=HtmlService.createTemplateFromFile('Index');
  template.cloudflareWorkerUrl=String(PropertiesService.getScriptProperties().getProperty('CLOUDFLARE_WORKER_URL')||'');
  return template.evaluate().setTitle('Restless One Platform')
    .addMetaTag('viewport','width=device-width,initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e){var body=null;try{body=e&&e.postData&&e.postData.contents?JSON.parse(e.postData.contents):null;}catch(ignore){}if(body&&body.platformRpc===true)return platformRpcDoPost_(body);return stockDoPost_(e);}

/** Endpoint privat untuk Cloudflare Worker. Secret hanya dikirim Worker -> GAS. */
function platformRpcDoPost_(payload){
  var expected=String(PropertiesService.getScriptProperties().getProperty('CLOUDFLARE_PROXY_SECRET')||'');
  if(!expected||String(payload.proxySecret||'')!==expected)return platformRpcResponse_({ok:false,error:'Proxy tidak diizinkan'});
  try{platformAuth_(payload.adminKey);}catch(authError){return platformRpcResponse_({ok:false,error:String(authError.message||authError)});}
  var handlers={
    verifyAdminLogin:verifyAdminLogin,getPlatformData:getPlatformData,getInventoryWorkspace:getInventoryWorkspace,getInvoices:getInvoices,
    saveSupplierInvoiceWithStock:saveSupplierInvoiceWithStock,updateStockMovement:updateStockMovement,
    setInvoiceStatus:setInvoiceStatus,generatePayroll:generatePayroll,savePayrollAdjustments:savePayrollAdjustments,
    previewPayroll:previewPayroll,getPayrollRunDetail:getPayrollRunDetail,postPayroll:postPayroll,syncReceivingAndAttendance:syncReceivingAndAttendance,refreshPayrollLive:refreshPayrollLive,
    saveBahan:saveBahan,deleteBahan:deleteBahan,platformSaveProduk:platformSaveProduk,
    platformDeleteProduk:platformDeleteProduk,saveRecipe:saveRecipe,deleteRecipe:deleteRecipe,
    postStockMovement:postStockMovement,getPayrollAdminData:getPayrollAdminData,savePayrollEmployee:savePayrollEmployee,
    deletePayrollEmployee:deletePayrollEmployee,removePayrollEmployee:removePayrollEmployee,savePayrollAttendance:savePayrollAttendance,
    deletePayrollAttendance:deletePayrollAttendance,
    getAppData:getAppData,getAppDataJson:getAppDataJson,saveTransaction:saveTransaction,updateTransaction:updateTransaction,saveCategory:saveCategory,
    setCategoryActive:setCategoryActive,saveInvoice:saveInvoice,updateInvoiceStatus:updateInvoiceStatus,
    saveBudget:saveBudget,getAllocationPreview:getAllocationPreview,commitAllocation:commitAllocation,
    createAccountTransfer:createAccountTransfer,reconcileAccount:reconcileAccount,
    saveAllocationRule:saveAllocationRule,setCategoryAccount:setCategoryAccount,
    getDashboard:getDashboard,getBahanBaku:getBahanBaku,saveBahanBaku:saveBahanBaku,
    deleteBahanBaku:deleteBahanBaku,getProduk:getProduk,getResepByProduk:getResepByProduk,
    saveProduk:saveProduk,deleteProduk:deleteProduk,getPreparations:getPreparations,
    getPrepDetail:getPrepDetail,savePreparation:savePreparation,deletePreparation:deletePreparation,
    stockModuleRequest:stockModuleRequest
  };
  var name=String(payload.fn||''),fn=handlers[name];
  if(!fn)return platformRpcResponse_({ok:false,error:'Fungsi tidak diizinkan: '+name});
  try{
    var args=Array.isArray(payload.args)?payload.args:[],cache=CacheService.getScriptCache(),cacheable=['getPlatformData','getInventoryWorkspace','getAppData','getAppDataJson','getDashboard','getBahanBaku','getProduk','getPreparations'],cacheKey='AIO_RPC_'+name;
    if(cacheable.indexOf(name)!==-1&&args.length===0){var cached=cache.get(cacheKey);if(cached!==null){try{return platformRpcResponse_({ok:true,data:JSON.parse(cached),cached:true});}catch(ignoreCache){cache.remove(cacheKey);}}}
    var keyed=['verifyAdminLogin','getPlatformData','getInventoryWorkspace','getInvoices','setInvoiceStatus','saveSupplierInvoiceWithStock','generatePayroll','savePayrollAdjustments','previewPayroll','getPayrollRunDetail','postPayroll','syncReceivingAndAttendance','refreshPayrollLive','saveBahan','deleteBahan','platformSaveProduk','platformDeleteProduk','saveRecipe','deleteRecipe','postStockMovement','updateStockMovement','getPayrollAdminData','savePayrollEmployee','deletePayrollEmployee','removePayrollEmployee','savePayrollAttendance','deletePayrollAttendance'];
    if(keyed.indexOf(name)!==-1&&String(args[0]||'')!==String(payload.adminKey||''))args.unshift(String(payload.adminKey||''));
    var data=fn.apply(null,args);
    if(cacheable.indexOf(name)!==-1&&args.length===0)platformCachePutSafe_(cache,cacheKey,data,10);
    if(platformRpcIsMutation_(name))cache.removeAll(cacheable.map(function(item){return'AIO_RPC_'+item;}));
    return platformRpcResponse_({ok:true,data:data,cached:false});
  }
  catch(e){return platformRpcResponse_({ok:false,error:String(e&&e.message||e)});}
}

function platformRpcResponse_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function platformRpcIsMutation_(name){return['setInvoiceStatus','saveSupplierInvoiceWithStock','generatePayroll','savePayrollAdjustments','postPayroll','syncReceivingAndAttendance','saveBahan','deleteBahan','platformSaveProduk','platformDeleteProduk','saveRecipe','deleteRecipe','postStockMovement','updateStockMovement','savePayrollEmployee','deletePayrollEmployee','removePayrollEmployee','savePayrollAttendance','deletePayrollAttendance','saveTransaction','updateTransaction','saveCategory','setCategoryActive','saveInvoice','updateInvoiceStatus','saveBudget','commitAllocation','createAccountTransfer','reconcileAccount','saveAllocationRule','setCategoryAccount','saveBahanBaku','deleteBahanBaku','saveProduk','deleteProduk','savePreparation','deletePreparation'].indexOf(name)!==-1;}
function platformCachePutSafe_(cache,key,value,seconds){try{var json=JSON.stringify(value);if(json.length<90000)cache.put(key,json,seconds);}catch(e){Logger.log('Cache dilewati '+key+': '+e.message);}}
function stockModuleRequest(request){request=request||{};var user=cekKodeAkses_(request.kodeAkses);if(!user)return{sukses:false,pesan:'Kode akses tidak valid'};var action=String(request.action||''),cache=CacheService.getScriptCache(),cacheKey='AIO_STOCK_'+action+'_'+String(request.bahanId||'')+'_'+String(request.bulan||'')+'_'+String(request.tahun||''),reads=['getBahan','getHistoryMasuk','getHistoryKeluar','getLaporanBulanan'];if(reads.indexOf(action)!==-1){var cached=cache.get(cacheKey);if(cached!==null){try{return JSON.parse(cached);}catch(ignoreCache){cache.remove(cacheKey);}}var readResult=action==='getBahan'?actionGetBahan_():action==='getHistoryMasuk'?actionGetHistoryMasuk_(request.bahanId):action==='getHistoryKeluar'?actionGetHistoryKeluar_(request.bahanId):actionGetLaporanBulanan_(Number(request.bulan),Number(request.tahun));platformCachePutSafe_(cache,cacheKey,readResult,10);return readResult;}var result;if(action==='inputStokMasuk')result=actionInputStokMasuk_(request,user.nama);else if(action==='inputStokKeluar')result=actionInputStokKeluar_(request,user.nama);else if(action==='syncFromHPP')result=actionSyncFromHPP_(user.nama);else return{sukses:false,pesan:'Action tidak dikenal: '+action};cache.removeAll(['AIO_STOCK_getBahan___','AIO_STOCK_getHistoryMasuk_'+String(request.bahanId)+'__','AIO_STOCK_getHistoryKeluar_'+String(request.bahanId)+'__']);return result;}

function platformServeModule_(file,title,adminKey){var template=HtmlService.createTemplateFromFile(file);template.cloudflareWorkerUrl=String(PropertiesService.getScriptProperties().getProperty('CLOUDFLARE_WORKER_URL')||'');template.platformAdminKey=String(adminKey||'');var output=template.evaluate(),html=output.getContent(),url=ScriptApp.getService().getUrl(),back='<a href="'+url+'" target="_top" style="position:fixed;right:16px;bottom:16px;z-index:99999;background:#183b35;color:white;text-decoration:none;padding:11px 15px;border-radius:999px;font:700 13px system-ui;box-shadow:0 8px 24px #0003">← Semua Program</a>';html=html.replace(/<\/body>/i,back+'</body>');return HtmlService.createHtmlOutput(html).setTitle(title+' · Restless').addMetaTag('viewport','width=device-width,initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}

function migrasiSetupRestlessPlatform() {
  var ss = platformSS_();
  Object.keys(PLATFORM_SCHEMA).forEach(function(name){ platformEnsureSheet_(ss,name,PLATFORM_SCHEMA[name]); });
  return 'Platform siap: ' + ss.getUrl();
}

function migrasiTambahPayrollAbsensiDanProgramLama() {
  var ss = platformSS_();
  var existed = Boolean(ss.getSheetByName(PLATFORM.PAY_ATT));
  platformEnsureSheet_(ss, PLATFORM.PAY_ATT, PLATFORM_SCHEMA[PLATFORM.PAY_ATT]);
  return {ok:true, changed:!existed, message:existed?'Migrasi sudah pernah dijalankan.':'Sheet Payroll_Absensi berhasil ditambahkan.'};
}

/**
 * Menyalin sheet asli setiap program ke spreadsheet master tanpa mengubah sumber.
 * Idempotent: sheet tujuan yang sudah ada tidak ditimpa.
 */
function migrasiSemuaToolsKePlatform(){platformRequireOwner_();var master=platformSS_(),jobs=[
  ['HPP_SOURCE_ID',['BAHAN_BAKU','PRODUK','RESEP','PREPARATION','PREP_DETAIL']],
  ['STOCK_SOURCE_ID',['Bahan','StokMasuk','StokKeluar','SyncLog','Users']],
  ['FINANCE_SOURCE_ID',['Transaksi','Kategori','Invoice','Target Budget','Rekening','Aturan Alokasi']],
  ['PAYROLL_SOURCE_ID',['Karyawan','Absensi']],
  ['RECEIVING_SOURCE_ID',['Order','Penerimaan']],
  ['ATTENDANCE_SOURCE_ID',['Absensi_Log']]
],result=[];jobs.forEach(function(job){var sourceId=PropertiesService.getScriptProperties().getProperty(job[0]);if(!sourceId){result.push({source:job[0],ok:false,message:'Property belum diisi'});return;}var source=SpreadsheetApp.openById(sourceId);job[1].forEach(function(name){var src=source.getSheetByName(name),dst=master.getSheetByName(name);if(dst){result.push({source:job[0],sheet:name,ok:true,skipped:true,message:'Sudah ada, tidak ditimpa'});return;}if(!src){result.push({source:job[0],sheet:name,ok:false,message:'Sheet sumber tidak ditemukan'});return;}var copied=src.copyTo(master);copied.setName(name);result.push({source:job[0],sheet:name,ok:true,rows:src.getLastRow(),message:'Berhasil disalin'});});});Logger.log(JSON.stringify(result,null,2));return result;}

function previewMigrasiDariProgramLama() {
  return {
    hpp: platformSourceInfo_('HPP_SOURCE_ID'), stock: platformSourceInfo_('STOCK_SOURCE_ID'),
    finance: platformSourceInfo_('FINANCE_SOURCE_ID'), receiving: platformSourceInfo_('RECEIVING_SOURCE_ID'),
    attendance: platformSourceInfo_('ATTENDANCE_SOURCE_ID')
  };
}

function migrasiDariProgramLama() {
  migrasiSetupRestlessPlatform();
  var result = [];
  result.push(platformImportHpp_());
  result.push(platformImportStock_());
  result.push(platformImportFinance_());
  result.push(syncReceivingAndAttendance(PropertiesService.getScriptProperties().getProperty('PLATFORM_ADMIN_KEY')));
  return result;
}

function getPlatformData(key) {
  platformAuth_(key);
  var ss=platformSS_();
  return platformSafe_({
    summary:platformDashboardSummaryFast_(ss), bahan:[], produk:[], recipes:[], stock:[], invoices:[],
    accounts:platformGetAccounts_(ss), payrollRuns:platformGetPayrollRuns_(ss), payrollAdmin:{employees:[],attendance:[]}, sync:platformRecentSync_(ss), legacyApps:platformLegacyApps_()
  });
}

/** Satu snapshot konsisten untuk Inventory/HPP. Semua stok berasal dari Stock_Balance. */
function getInventoryWorkspace(key) {
  platformAuth_(key);
  var ss=platformSS_(),prepResult=getPreparations();
  return platformSafe_({
    materials:platformGetStock_(ss,false),
    products:platformGetProduk_(ss,false),
    preparations:prepResult&&prepResult.items?prepResult.items:[],
    stockHistory:platformGetStockHistory_(ss)
  });
}

/** Verifikasi ringan tanpa membuka spreadsheet, agar respons login terasa instan. */
function verifyAdminLogin(key){platformAuth_(key);return{ok:true,verifiedAt:platformDateTime_(new Date())};}

// ---------- HPP ----------
function saveBahan(key,data){platformAuth_(key);data=data||{};var ss=platformSS_(),sh=ss.getSheetByName(PLATFORM.BAHAN);var lock=LockService.getScriptLock();lock.waitLock(20000);try{var id=String(data.id||''),row=id?platformFindRow_(sh,id):0,name=String(data.name||'').trim(),unit=String(data.unit||''),category=String(data.category||''),price=platformNum_(data.price);if(!name)throw new Error('Nama bahan wajib diisi');if(!id)id='BHN-'+Utilities.getUuid();var values=[id,name,unit,category,data.active!==false,'Platform',new Date()];if(row)sh.getRange(row,1,1,7).setValues([values]);else sh.appendRow(values);platformEnsureStockRow_(ss,id);var stockSheet=ss.getSheetByName(PLATFORM.STOCK),stockRow=platformFindRow_(stockSheet,id);if(price>0)stockSheet.getRange(stockRow,3,1,2).setValues([[price,new Date()]]);var legacy=ss.getSheetByName('BAHAN_BAKU');if(legacy){var legacyRow=platformFindRow_(legacy,id),legacyValues=[id,name,unit,price,category,new Date()];if(legacyRow)legacy.getRange(legacyRow,1,1,6).setValues([legacyValues]);else legacy.appendRow(legacyValues);}platformAudit_(ss,'HPP',row?'EDIT_BAHAN':'TAMBAH_BAHAN',id,name);return{ok:true,id:id};}finally{lock.releaseLock();}}
function deleteBahan(key,id){platformAuth_(key);var ss=platformSS_(),used=platformRows_(ss.getSheetByName(PLATFORM.RESEP),7).some(function(r){return String(r[2])===String(id)}),moved=platformRows_(ss.getSheetByName(PLATFORM.MOVEMENT),11).some(function(r){return String(r[3])===String(id)}),sh=ss.getSheetByName(PLATFORM.BAHAN),row=platformFindRow_(sh,id);if(!row)throw new Error('Bahan tidak ditemukan');if(used||moved){sh.getRange(row,5).setValue(false);platformAudit_(ss,'HPP','ARSIP_BAHAN',id,'Memiliki relasi/histori');return{ok:true,archived:true};}sh.deleteRow(row);var sr=platformFindRow_(ss.getSheetByName(PLATFORM.STOCK),id);if(sr)ss.getSheetByName(PLATFORM.STOCK).deleteRow(sr);platformAudit_(ss,'HPP','HAPUS_BAHAN',id,'Tanpa histori');return{ok:true,archived:false};}
function platformSaveProduk(key,data){platformAuth_(key);data=data||{};var ss=platformSS_(),sh=ss.getSheetByName(PLATFORM.PRODUK),id=String(data.id||'')||'PRD-'+Utilities.getUuid(),row=platformFindRow_(sh,id),name=String(data.name||'').trim();if(!name)throw new Error('Nama produk wajib diisi');var price=platformNum_(data.price),overhead=platformNum_(data.overhead),hpp=platformRecipeCost_(ss,id),total=hpp*(1+overhead/100),margin=price>0?(price-total)/price*100:0,values=[id,name,String(data.category||''),price,overhead,hpp,total,Math.round(margin*10)/10,data.active!==false,new Date()];if(row)sh.getRange(row,1,1,10).setValues([values]);else sh.appendRow(values);platformAudit_(ss,'HPP',row?'EDIT_PRODUK':'TAMBAH_PRODUK',id,name);return{ok:true,id:id};}
function platformDeleteProduk(key,id){platformAuth_(key);var ss=platformSS_(),sh=ss.getSheetByName(PLATFORM.PRODUK),row=platformFindRow_(sh,id);if(!row)throw new Error('Produk tidak ditemukan');sh.getRange(row,9).setValue(false);platformAudit_(ss,'HPP','ARSIP_PRODUK',id,'');return{ok:true};}
function saveRecipe(key,data){platformAuth_(key);data=data||{};var ss=platformSS_(),sh=ss.getSheetByName(PLATFORM.RESEP),id=String(data.id||'')||'RSP-'+Utilities.getUuid(),row=platformFindRow_(sh,id),productId=String(data.productId||''),materialId=String(data.materialId||''),qty=platformNum_(data.qty);if(!productId||!materialId||qty<=0)throw new Error('Produk, bahan, dan jumlah wajib diisi');var stockRow=platformFindRow_(ss.getSheetByName(PLATFORM.STOCK),materialId),price=stockRow?platformNum_(ss.getSheetByName(PLATFORM.STOCK).getRange(stockRow,3).getValue()):0,materialRow=platformFindRow_(ss.getSheetByName(PLATFORM.BAHAN),materialId),unit=materialRow?String(ss.getSheetByName(PLATFORM.BAHAN).getRange(materialRow,3).getValue()):'',values=[id,productId,materialId,qty,unit,price,qty*price];if(row)sh.getRange(row,1,1,7).setValues([values]);else sh.appendRow(values);platformRecalculateProduct_(ss,productId);platformAudit_(ss,'HPP',row?'EDIT_RESEP':'TAMBAH_RESEP',id,productId);return{ok:true,id:id};}
function deleteRecipe(key,id){platformAuth_(key);var ss=platformSS_(),sh=ss.getSheetByName(PLATFORM.RESEP),row=platformFindRow_(sh,id);if(!row)throw new Error('Resep tidak ditemukan');var productId=String(sh.getRange(row,2).getValue());sh.deleteRow(row);platformRecalculateProduct_(ss,productId);platformAudit_(ss,'HPP','HAPUS_RESEP',id,productId);return{ok:true};}

// ---------- STOCK ----------
function postStockMovement(key,data){
  platformAuth_(key);data=data||{};
  var ss=platformSS_(),id=String(data.materialId||''),type=String(data.type||''),qty=platformNum_(data.qty),price=platformNum_(data.price);
  if(!id||['MASUK','KELUAR','ADJUSTMENT'].indexOf(type)<0||qty<=0)throw new Error('Data pergerakan stok tidak valid');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    platformEnsureStockRow_(ss,id);
    var sh=ss.getSheetByName(PLATFORM.STOCK),row=platformFindRow_(sh,id),r=sh.getRange(row,1,1,4).getValues()[0],oldQty=platformNum_(r[1]),oldAvg=platformNum_(r[2]),newQty=oldQty,newAvg=oldAvg;
    var requestedMovementId=String(data.movementId||'');
    if(requestedMovementId&&platformFindRow_(ss.getSheetByName(PLATFORM.MOVEMENT),requestedMovementId))return{ok:true,id:requestedMovementId,stock:oldQty,average:oldAvg,already:true};
    if(type==='MASUK'){
      if(price<=0)throw new Error('Harga stok masuk harus lebih dari 0');
      newQty=oldQty+qty;newAvg=newQty?((oldQty*oldAvg)+(qty*price))/newQty:price;
    }else if(type==='KELUAR'){
      if(qty>oldQty)throw new Error('Stok tidak cukup');newQty=oldQty-qty;price=oldAvg;
    }else{newQty=qty;price=oldAvg;}
    sh.getRange(row,2,1,3).setValues([[newQty,newAvg,new Date()]]);
    var movementId=requestedMovementId||'STK-'+Utilities.getUuid();
    ss.getSheetByName(PLATFORM.MOVEMENT).appendRow([movementId,new Date(),platformParseIsoDate_(platformDate_(data.date)||platformDate_(new Date())),id,type,qty,price,qty*price,String(data.category||''),String(data.note||''),'Admin']);
    if(type==='MASUK'&&Math.abs(newAvg-oldAvg)>0.000001)platformRefreshMaterialCost_(ss,id,newAvg);
    platformAudit_(ss,'STOCK',type,id,'Qty '+qty);
    return{ok:true,id:movementId,stock:newQty,average:newAvg};
  }finally{lock.releaseLock();}
}

/** Edit hanya movement modern. Bahan dan tipe dikunci agar histori antarsheet tidak terputus. */
function updateStockMovement(key,data){
  platformAuth_(key);data=data||{};
  var ss=platformSS_(),movement=ss.getSheetByName(PLATFORM.MOVEMENT),movementId=String(data.id||''),row=platformFindRow_(movement,movementId);
  if(!row||movementId.indexOf('LEGACY-')===0)throw new Error('Movement lama tidak dapat diedit dari platform');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var old=movement.getRange(row,1,1,11).getValues()[0],materialId=String(old[3]),type=String(old[4]),oldQty=platformNum_(old[5]),oldPrice=platformNum_(old[6]);
    var qty=platformNum_(data.qty),price=type==='MASUK'?platformNum_(data.price):oldPrice;
    if(qty<=0||(type==='MASUK'&&price<=0))throw new Error('Jumlah dan harga movement harus valid');
    platformEnsureStockRow_(ss,materialId);
    var balance=ss.getSheetByName(PLATFORM.STOCK),balanceRow=platformFindRow_(balance,materialId),current=balance.getRange(balanceRow,1,1,4).getValues()[0],currentQty=platformNum_(current[1]),currentAvg=platformNum_(current[2]),newQty=currentQty,newAvg=currentAvg;
    if(type==='MASUK'){
      newQty=currentQty-oldQty+qty;
      if(newQty<0)throw new Error('Movement tidak dapat diedit karena stok sudah lebih kecil dari jumlah lama');
      var newValue=(currentQty*currentAvg)-(oldQty*oldPrice)+(qty*price);
      newAvg=newQty>0?Math.max(0,newValue/newQty):0;
    }else if(type==='KELUAR'){
      newQty=currentQty+oldQty-qty;
      if(newQty<0)throw new Error('Jumlah stok keluar melebihi stok tersedia');
      price=oldPrice;
    }else throw new Error('Movement adjustment tidak dapat diedit');
    balance.getRange(balanceRow,2,1,3).setValues([[newQty,newAvg,new Date()]]);
    movement.getRange(row,3,1,7).setValues([[platformParseIsoDate_(platformDate_(data.date)||platformDate_(old[2])),materialId,type,qty,price,qty*price,String(data.category||old[8]||'')]]);
    movement.getRange(row,10).setValue(String(data.note||''));
    if(type==='MASUK'&&Math.abs(newAvg-currentAvg)>0.000001)platformRefreshMaterialCost_(ss,materialId,newAvg);
    platformAudit_(ss,'STOCK','EDIT_MOVEMENT',movementId,'Qty '+oldQty+' menjadi '+qty);
    return{ok:true,id:movementId,stock:newQty,average:newAvg};
  }finally{lock.releaseLock();}
}

/** Sinkronkan harga rata-rata ke master bahan, resep, dan total HPP produk. */
function platformRefreshMaterialCost_(ss,materialId,price){
  var bahan=ss.getSheetByName('BAHAN_BAKU'),bahanRow=platformFindRow_(bahan,materialId);
  if(bahanRow)bahan.getRange(bahanRow,4,1,3).setValues([[price,bahan.getRange(bahanRow,5).getValue(),new Date()]]);
  var affected={};
  var modern=ss.getSheetByName(PLATFORM.RESEP);
  platformRows_(modern,7).forEach(function(r,index){if(String(r[2])!==String(materialId))return;modern.getRange(index+2,6,1,2).setValues([[price,platformNum_(r[3])*price]]);affected[String(r[1])]=true;});
  Object.keys(affected).forEach(function(productId){platformRecalculateProduct_(ss,productId);});
  var exact=ss.getSheetByName('RESEP'),exactAffected={};
  platformRows_(exact,9).forEach(function(r,index){if(String(r[3])!==String(materialId))return;exact.getRange(index+2,8,1,2).setValues([[price,platformNum_(r[6])*price]]);exactAffected[String(r[1])]=true;});
  var products=ss.getSheetByName('PRODUK');
  Object.keys(exactAffected).forEach(function(productId){
    var productRow=platformFindRow_(products,productId);if(!productRow)return;
    var rowValues=products.getRange(productRow,1,1,11).getValues()[0],base=platformRows_(exact,9).filter(function(r){return String(r[1])===productId;}).reduce(function(sum,r){return sum+platformNum_(r[8]);},0),selling=platformNum_(rowValues[3]),overheadPct=platformNum_(rowValues[5]),overhead=base*overheadPct/100,total=base+overhead,marginNominal=selling-total,marginPct=selling>0?marginNominal/selling*100:0;
    products.getRange(productRow,5,1,6).setValues([[base,overheadPct,overhead,total,Math.round(marginPct*10)/10,marginNominal]]);
  });
}

/** Simpan invoice dan stoknya dengan marker idempotent agar retry tidak menggandakan stok. */
function saveSupplierInvoiceWithStock(key,payload){
  platformAuth_(key);payload=payload||{};
  var ss=platformSS_(),invoiceId=String(payload.id||'')||'INV-'+Utilities.getUuid(),items=Array.isArray(payload.items)?payload.items:[];
  if(!items.length)throw new Error('Invoice harus memiliki minimal satu item');
  items.forEach(function(item){if(!item.materialId||platformNum_(item.qty)<=0||platformNum_(item.price)<=0)throw new Error('Material, jumlah, dan harga invoice wajib valid');if(!platformFindRow_(ss.getSheetByName(PLATFORM.BAHAN),item.materialId))throw new Error('Material invoice tidak ditemukan: '+item.materialId);});
  payload.id=invoiceId;
  var invoiceSheet=ss.getSheetByName('Invoice'),invoiceRow=platformFindRow_(invoiceSheet,invoiceId);
  if(!invoiceRow)saveInvoice(payload);
  var movement=ss.getSheetByName(PLATFORM.MOVEMENT),existing={};
  platformRows_(movement,11).forEach(function(r){existing[String(r[9]||'')]=true;});
  var results=[];
  items.forEach(function(item,index){
    var marker='INVOICE_STOCK:'+invoiceId+':'+index;
    if(existing[marker]){results.push({skipped:true,marker:marker});return;}
    results.push(postStockMovement(key,{movementId:'STK-INV-'+invoiceId+'-'+index,materialId:String(item.materialId),type:'MASUK',qty:platformNum_(item.qty),price:platformNum_(item.price),date:payload.invoiceDate,category:'Pembelian Supplier',note:marker}));
    existing[marker]=true;
  });
  platformAudit_(ss,'FINANCE','INVOICE_DAN_STOK',invoiceId,'Item '+items.length);
  return{ok:true,id:invoiceId,stockMovements:results};
}
function deleteStockItem(key,id){return deleteBahan(key,id);}

// ---------- FINANCE / INVOICE ----------
function getInvoices(key,filters){platformAuth_(key);return platformSafe_(platformGetInvoices_(platformSS_(),filters||{}));}
function setInvoiceStatus(key,id,status){platformAuth_(key);if(['Draft','Terkirim','Dibayar','Terlambat'].indexOf(status)<0)throw new Error('Status tidak valid');var ss=platformSS_(),sh=ss.getSheetByName(PLATFORM.FIN_INV),row=platformFindRow_(sh,id);if(!row)throw new Error('Invoice tidak ditemukan');var lock=LockService.getScriptLock();lock.waitLock(20000);try{var r=sh.getRange(row,1,1,19).getValues()[0];if(status==='Dibayar'&&!r[16]){var acc=String(r[5]||''),txId='TX-'+Utilities.getUuid();ss.getSheetByName(PLATFORM.FIN_TX).appendRow([txId,new Date(),'Pengeluaran',platformNum_(r[14]),'Pembayaran '+r[1]+' - '+r[2],r[3],r[4],'Transfer','INVOICE:'+id,acc,'','INVOICE:'+id,Utilities.formatDate(new Date(),PLATFORM_TZ,'yyyy-MM'),new Date(),new Date()]);sh.getRange(row,17).setValue(txId);}sh.getRange(row,10).setValue(status);sh.getRange(row,19).setValue(new Date());platformAudit_(ss,'FINANCE','STATUS_INVOICE',id,status);return{ok:true};}finally{lock.releaseLock();}}

// ---------- PAYROLL -> KEUANGAN BARU ----------
function getPayrollAdminData(key){platformAuth_(key);return platformSafe_(platformGetPayrollAdmin_(platformSS_()));}
function savePayrollEmployee(key,data){platformAuth_(key);data=data||{};var ss=platformSS_(),sh=ss.getSheetByName('Karyawan'),id=String(data.id||'')||'EMP-'+Utilities.getUuid(),row=platformFindRow_(sh,id),name=String(data.name||'').trim(),type=String(data.type||'Fulltime'),rate=platformNum_(data.rate);if(!name||['Fulltime','Parttime'].indexOf(type)<0||rate<=0)throw new Error('Nama, tipe, dan rate karyawan wajib valid');var values=[id,name,type,rate,String(data.status||'Aktif'),platformParseIsoDate_(platformDate_(data.startDate)||platformDate_(new Date()))];if(row)sh.getRange(row,1,1,6).setValues([values]);else sh.appendRow(values);platformAudit_(ss,'PAYROLL',row?'EDIT_KARYAWAN':'TAMBAH_KARYAWAN',id,name);return{ok:true,id:id};}
function deletePayrollEmployee(key,id){platformAuth_(key);var ss=platformSS_(),sh=ss.getSheetByName('Karyawan'),row=platformFindRow_(sh,id);if(!row)throw new Error('Karyawan tidak ditemukan');sh.getRange(row,5).setValue('Nonaktif');platformAudit_(ss,'PAYROLL','NONAKTIF_KARYAWAN',id,'');return{ok:true};}
function removePayrollEmployee(key,id){platformAuth_(key);var ss=platformSS_(),sh=ss.getSheetByName('Karyawan'),row=platformFindRow_(sh,id);if(!row)throw new Error('Karyawan tidak ditemukan');var hasAttendance=platformRows_(ss.getSheetByName('Absensi'),11).some(function(r){return String(r[1])===String(id)}),hasPayroll=platformRows_(ss.getSheetByName(PLATFORM.PAY_DETAIL),12).some(function(r){return String(r[1])===String(id)});if(hasAttendance||hasPayroll){sh.getRange(row,5).setValue('Nonaktif');platformAudit_(ss,'PAYROLL','ARSIP_KARYAWAN',id,'Memiliki absensi/payroll');return{ok:true,archived:true};}sh.deleteRow(row);platformAudit_(ss,'PAYROLL','HAPUS_KARYAWAN',id,'Tanpa histori');return{ok:true,archived:false};}
function savePayrollAttendance(key,data){platformAuth_(key);data=data||{};var ss=platformSS_(),sh=ss.getSheetByName('Absensi'),id=String(data.id||'')||'ATT-'+Utilities.getUuid(),row=platformFindRow_(sh,id),employeeId=String(data.employeeId||''),date=platformDate_(data.date),status=String(data.status||'Hadir');if(!employeeId||!date||['Hadir','Izin','Sakit','Alpha'].indexOf(status)<0)throw new Error('Karyawan, tanggal, dan status absensi wajib valid');var values=[id,employeeId,platformParseIsoDate_(date),String(data.inTime||''),String(data.outTime||''),platformNum_(data.hours),status,String(data.note||''),new Date(),platformNum_(data.overtimeHours),platformNum_(data.overtimeRate)];if(row)sh.getRange(row,1,1,11).setValues([values]);else sh.appendRow(values);platformAudit_(ss,'PAYROLL',row?'EDIT_ABSENSI':'TAMBAH_ABSENSI',id,status);return{ok:true,id:id};}
function deletePayrollAttendance(key,id){platformAuth_(key);var ss=platformSS_(),sh=ss.getSheetByName('Absensi'),row=platformFindRow_(sh,id);if(!row)throw new Error('Absensi tidak ditemukan');sh.deleteRow(row);platformAudit_(ss,'PAYROLL','HAPUS_ABSENSI',id,'');return{ok:true};}
function generatePayroll(key,req){platformAuth_(key);req=req||{};var ss=platformSS_(),scheme=String(req.scheme||'Fulltime'),period=platformPayrollPeriod_(scheme,req),runId='PAY-'+Utilities.getUuid(),calculated=platformCalculatePayroll_(ss,scheme,period,runId,{});ss.getSheetByName(PLATFORM.PAY_RUN).appendRow([runId,scheme,period.start,period.end,'DRAFT',calculated.total,'','',new Date(),'']);if(calculated.details.length)ss.getSheetByName(PLATFORM.PAY_DETAIL).getRange(ss.getSheetByName(PLATFORM.PAY_DETAIL).getLastRow()+1,1,calculated.details.length,12).setValues(calculated.details);return platformSafe_({runId:runId,scheme:scheme,start:period.start,end:period.end,status:'DRAFT',total:calculated.total,details:calculated.details});}
function previewPayroll(key,req){platformAuth_(key);req=req||{};var scheme=String(req.scheme||'Fulltime'),period=platformPayrollPeriod_(scheme,req),calculated=platformCalculatePayroll_(platformSS_(),scheme,period,'PREVIEW',{});return platformSafe_({scheme:scheme,start:period.start,end:period.end,total:calculated.total,details:calculated.details});}
function getPayrollRunDetail(key,runId){platformAuth_(key);var ss=platformSS_(),runSheet=ss.getSheetByName(PLATFORM.PAY_RUN),row=platformFindRow_(runSheet,runId);if(!row)throw new Error('Payroll tidak ditemukan');var r=runSheet.getRange(row,1,1,10).getValues()[0],details=platformRows_(ss.getSheetByName(PLATFORM.PAY_DETAIL),12).filter(function(d){return String(d[0])===String(runId)});return platformSafe_({runId:String(r[0]),scheme:String(r[1]),start:platformDate_(r[2]),end:platformDate_(r[3]),status:String(r[4]),total:platformNum_(r[5]),accountId:String(r[6]||''),transactionId:String(r[7]||''),details:details});}
function savePayrollAdjustments(key,payload){platformAuth_(key);payload=payload||{};var ss=platformSS_(),runId=String(payload.runId||''),runSheet=ss.getSheetByName(PLATFORM.PAY_RUN),runRow=platformFindRow_(runSheet,runId);if(!runRow)throw new Error('Payroll run tidak ditemukan');if(String(runSheet.getRange(runRow,5).getValue())==='POSTED')throw new Error('Payroll sudah diposting dan dikunci');var detailSheet=ss.getSheetByName(PLATFORM.PAY_DETAIL),rows=platformRows_(detailSheet,12),changes=payload.changes||[];changes.forEach(function(c){for(var i=0;i<rows.length;i++){if(String(rows[i][0])===runId&&String(rows[i][1])===String(c.employeeId)){var oldAdjustment=platformNum_(rows[i][9]),oldNet=platformNum_(rows[i][10]),newAdjustment=platformNum_(c.adjustment),newNet=Math.max(0,oldNet-oldAdjustment+newAdjustment);detailSheet.getRange(i+2,10,1,3).setValues([[newAdjustment,newNet,String(c.note||rows[i][11]||'')]]);rows[i][9]=newAdjustment;rows[i][10]=newNet;break;}}});var total=rows.filter(function(r){return String(r[0])===runId}).reduce(function(s,r){return s+platformNum_(r[10])},0);runSheet.getRange(runRow,6).setValue(total);return{ok:true,total:total};}
function postPayroll(key,runId,accountId){platformAuth_(key);var ss=platformSS_(),sh=ss.getSheetByName(PLATFORM.PAY_RUN),row=platformFindRow_(sh,runId);if(!row)throw new Error('Payroll tidak ditemukan');var r=sh.getRange(row,1,1,10).getValues()[0];if(r[4]==='POSTED')return{ok:true,already:true,transactionId:String(r[7]||'')};if(!accountId)throw new Error('Pilih rekening pembayaran');var finance=platformFinanceSS_(),financeTx=finance.getSheetByName('Transaksi');platformAssertFinanceSchema_(financeTx);var marker='PAYROLL_RUN:'+runId,existing=platformFindTransactionByReference_(financeTx,marker),txId=existing||'TX-'+Utilities.getUuid(),now=new Date(),values=[txId,platformParseIsoDate_(String(r[3])),'Pengeluaran',platformNum_(r[5]),'Payroll '+r[1]+' '+r[2]+' s/d '+r[3],'GAJI',r[1]==='Fulltime'?'GAJI BULANAN':'GAJI MINGGUAN PARTTIME','Transfer',marker,String(accountId),'',marker,String(r[3]).slice(0,7),now,now];var lock=LockService.getScriptLock();lock.waitLock(20000);try{if(!existing)financeTx.appendRow(values);if(!platformFindTransactionByReference_(ss.getSheetByName(PLATFORM.FIN_TX),marker))ss.getSheetByName(PLATFORM.FIN_TX).appendRow(values);sh.getRange(row,5,1,6).setValues([['POSTED',r[5],accountId,txId,r[8],now]]);platformAudit_(ss,'PAYROLL','POST_KEUANGAN_BARU',runId,txId);return{ok:true,transactionId:txId,writtenTo:finance.getName()};}finally{lock.releaseLock();}}

// ---------- SYNC GITHUB-BACKED APPS ----------
function syncReceivingAndAttendance(key){platformAuth_(key);var ss=platformSS_(),props=PropertiesService.getScriptProperties(),receivingId=String(props.getProperty('RECEIVING_SOURCE_ID')||''),receiving=receivingId?SpreadsheetApp.openById(receivingId):null,out=[];out.push(platformSyncJsonSheet_('RECEIVING_SOURCE_ID','Order',PLATFORM.RCV_ORDER,ss,receiving));out.push(platformSyncJsonSheet_('RECEIVING_SOURCE_ID','Penerimaan',PLATFORM.RCV_DETAIL,ss,receiving));out.push(platformSyncAttendance_(ss));out.push(platformSyncPayrollRealtime_(ss,true));return out;}

/** Polling payroll: sinkronkan sumber lalu hitung ulang draft yang sedang dibuka. */
function refreshPayrollLive(key,runId){platformAuth_(key);var ss=platformSS_(),run=runId?platformRefreshPayrollRun_(ss,String(runId)):null;return platformSafe_({sync:{source:'Karyawan / Absensi',direct:true,changed:false},payrollAdmin:platformGetPayrollAdmin_(ss),run:run,checkedAt:platformDateTime_(new Date())});}

/** Jalankan fungsi berakhiran underscore ini hanya dari editor Apps Script. */
function sinkronkanSemuaDataManual_(){var key=PropertiesService.getScriptProperties().getProperty('PLATFORM_ADMIN_KEY');if(!key)throw new Error('PLATFORM_ADMIN_KEY belum diisi di Script Properties');return syncReceivingAndAttendance(key);}

/** Fungsi ini muncul di daftar Run dan hanya boleh dijalankan oleh PLATFORM_OWNER_EMAIL. */
function sinkronkanSemuaDataManual(){platformRequireOwner_();return sinkronkanSemuaDataManual_();}

/** Memeriksa seluruh Script Properties, akses spreadsheet, dan sheet wajib tanpa mengubah data. */
function cekKonfigurasiRestlessPlatform(){platformRequireOwner_();var props=PropertiesService.getScriptProperties(),checks=[];checks.push(platformCheckSecret_(props,'PLATFORM_ADMIN_KEY',24));checks.push(platformCheckSpreadsheet_(props,'MASTER_SPREADSHEET_ID',[]));checks.push(platformCheckSpreadsheet_(props,'HPP_SOURCE_ID',['BAHAN_BAKU','PRODUK','RESEP']));checks.push(platformCheckSpreadsheet_(props,'STOCK_SOURCE_ID',['Bahan']));checks.push(platformCheckSpreadsheet_(props,'FINANCE_SOURCE_ID',['Transaksi','Kategori','Invoice','Rekening']));checks.push(platformCheckSpreadsheet_(props,'RECEIVING_SOURCE_ID',['Order','Penerimaan']));checks.push(platformCheckSpreadsheet_(props,'ATTENDANCE_SOURCE_ID',['Absensi_Log']));checks.push(platformCheckSpreadsheet_(props,'PAYROLL_SOURCE_ID',['Karyawan','Absensi']));['RECEIVING_APP_URL','ATTENDANCE_APP_URL'].forEach(function(name){checks.push(platformCheckUrl_(props,name));});var ok=checks.every(function(c){return c.ok});var result={ok:ok,checkedAt:platformDateTime_(new Date()),checks:checks,message:ok?'Semua konfigurasi valid.':'Ada konfigurasi yang perlu diperbaiki.'};Logger.log(JSON.stringify(result,null,2));return result;}

// ---------- HELPERS ----------
function platformSS_(){var id=PropertiesService.getScriptProperties().getProperty('MASTER_SPREADSHEET_ID');if(!id)throw new Error('MASTER_SPREADSHEET_ID belum diisi');return SpreadsheetApp.openById(id);}
function platformFinanceSS_(){return platformSS_();}
function platformAuth_(key){
  var props=PropertiesService.getScriptProperties();
  var adminKey=String(props.getProperty('PLATFORM_ADMIN_KEY')||'');
  var adminPin=String(props.getProperty('PLATFORM_ADMIN_PIN')||'');
  var credential=String(key||'');
  if(adminKey&&platformSecureEqual_(credential,adminKey))return true;
  if(/^\d{4}$/.test(adminPin)&&platformSecureEqual_(credential,adminPin))return true;
  throw new Error(adminPin?'Akses ditolak':'PIN admin belum diatur di Script Properties');
}
function platformSecureEqual_(a,b){a=String(a);b=String(b);if(a.length!==b.length)return false;var mismatch=0;for(var i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
function platformRequireOwner_(){var expected=String(PropertiesService.getScriptProperties().getProperty('PLATFORM_OWNER_EMAIL')||'').trim().toLowerCase(),actual=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();if(!expected)throw new Error('PLATFORM_OWNER_EMAIL belum diisi di Script Properties');if(!actual||actual!==expected)throw new Error('Fungsi manual hanya boleh dijalankan oleh '+expected);}
function platformCheckSecret_(props,name,minLength){var value=String(props.getProperty(name)||'');return{name:name,ok:value.length>=minLength,message:value.length>=minLength?'Terisi dan panjangnya aman':'Wajib diisi minimal '+minLength+' karakter'};}
function platformCheckSpreadsheet_(props,name,requiredSheets){var id=String(props.getProperty(name)||'').trim();if(!id)return{name:name,ok:false,message:'Belum diisi'};try{var ss=SpreadsheetApp.openById(id),available=ss.getSheets().map(function(sh){return sh.getName()}),missing=requiredSheets.filter(function(sheetName){return available.indexOf(sheetName)===-1});return{name:name,ok:missing.length===0,message:missing.length?'Sheet tidak ditemukan: '+missing.join(', '):'OK · '+ss.getName()};}catch(e){return{name:name,ok:false,message:'Tidak dapat dibuka: '+e.message};}}
function platformCheckUrl_(props,name){var value=String(props.getProperty(name)||'').trim(),ok=value.toLowerCase().indexOf('https:' + String.fromCharCode(47,47))===0;return{name:name,ok:ok,message:ok?'OK':'Belum diisi atau bukan URL https'};}
function platformEnsureSheet_(ss,name,headers){var sh=ss.getSheetByName(name)||ss.insertSheet(name);if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);sh.getRange(1,1,1,headers.length).setBackground('#183B35').setFontColor('#fff').setFontWeight('bold');}return sh;}
function platformRows_(sh,cols){if(!sh||sh.getLastRow()<2)return[];return sh.getRange(2,1,sh.getLastRow()-1,cols||sh.getLastColumn()).getValues();}
function platformFindRow_(sh,id){if(!sh||sh.getLastRow()<2)return 0;var v=sh.getRange(2,1,sh.getLastRow()-1,1).getValues();for(var i=0;i<v.length;i++)if(String(v[i][0])===String(id))return i+2;return 0;}
function platformGetBahan_(ss,includeInactive){var master=ss.getSheetByName(PLATFORM.BAHAN);if(master&&master.getLastRow()>1)return platformRows_(master,7).filter(function(r){return includeInactive||r[4]!==false}).map(function(r){return{id:String(r[0]),name:String(r[1]),unit:String(r[2]),category:String(r[3]),active:r[4]!==false};});var exact=ss.getSheetByName('BAHAN_BAKU');return platformRows_(exact,6).map(function(r){return{id:String(r[0]),name:String(r[1]),unit:String(r[2]),category:String(r[4]),active:true};});}
function platformGetProduk_(ss,includeInactive){var exact=ss.getSheetByName('PRODUK');if(exact)return platformRows_(exact,11).map(function(r){return{id:String(r[0]),name:String(r[1]),category:String(r[2]),price:platformNum_(r[3]),overhead:platformNum_(r[5]),hpp:platformNum_(r[7]),margin:platformNum_(r[8]),active:true};});return platformRows_(ss.getSheetByName(PLATFORM.PRODUK),10).filter(function(r){return includeInactive||r[8]!==false}).map(function(r){return{id:String(r[0]),name:String(r[1]),category:String(r[2]),price:platformNum_(r[3]),overhead:platformNum_(r[4]),hpp:platformNum_(r[6]),margin:platformNum_(r[7]),active:r[8]!==false};});}
function platformGetRecipes_(ss){var exact=ss.getSheetByName('RESEP');if(exact)return platformRows_(exact,9).map(function(r){return{id:String(r[0]),productId:String(r[1]),materialId:String(r[3]),qty:platformNum_(r[6]),unit:String(r[5]),price:platformNum_(r[7]),subtotal:platformNum_(r[8])};});return platformRows_(ss.getSheetByName(PLATFORM.RESEP),7).map(function(r){return{id:String(r[0]),productId:String(r[1]),materialId:String(r[2]),qty:platformNum_(r[3]),unit:String(r[4]),price:platformNum_(r[5]),subtotal:platformNum_(r[6])};});}
function platformGetStock_(ss,includeInactive){var materials=platformGetBahan_(ss,includeInactive),balance={},legacy={},prices={};platformRows_(ss.getSheetByName(PLATFORM.STOCK),4).forEach(function(r){balance[String(r[0])]=r});platformRows_(ss.getSheetByName('Bahan'),7).forEach(function(r){legacy[String(r[0])]=r});platformRows_(ss.getSheetByName('BAHAN_BAKU'),6).forEach(function(r){prices[String(r[0])]=platformNum_(r[3])});return materials.map(function(b){var current=balance[b.id]||[],old=legacy[b.id]||[],stock=current.length?platformNum_(current[1]):platformNum_(old[4]),average=current.length?platformNum_(current[2]):platformNum_(old[5]);if(!average)average=prices[b.id]||0;return{id:b.id,name:b.name,unit:b.unit,category:b.category,active:b.active,stock:stock,average:average,updated:platformDateTime_(current[3]||old[6]||'')};});}
function platformGetStockHistory_(ss){var rows=platformRows_(ss.getSheetByName(PLATFORM.MOVEMENT),11).map(function(r){return{id:String(r[0]),timestamp:platformDateTime_(r[1]),date:platformDate_(r[2]),materialId:String(r[3]),type:String(r[4])==='MASUK'?'IN':'OUT',quantity:platformNum_(r[5]),price:platformNum_(r[6]),value:platformNum_(r[7]),category:String(r[8]||''),reference:String(r[9]||''),user:String(r[10]||'')};}),modernKeys={};rows.forEach(function(r){modernKeys[r.type+'|'+r.materialId+'|'+r.date+'|'+r.quantity+'|'+r.price]=true});platformRows_(ss.getSheetByName('StokMasuk'),9).forEach(function(r){var item={id:'LEGACY-IN-'+platformRowHash_([r[0],r[1],r[3],r[4],r[5]]),timestamp:platformDateTime_(r[0]),date:platformDate_(r[3]),materialId:String(r[1]),type:'IN',quantity:platformNum_(r[4]),price:platformNum_(r[5]),value:platformNum_(r[6]),category:'Stock In',reference:'Histori stok lama',user:String(r[8]||'')},key=item.type+'|'+item.materialId+'|'+item.date+'|'+item.quantity+'|'+item.price;if(!modernKeys[key])rows.push(item)});platformRows_(ss.getSheetByName('StokKeluar'),9).forEach(function(r){var item={id:'LEGACY-OUT-'+platformRowHash_([r[0],r[1],r[3],r[4],r[6]]),timestamp:platformDateTime_(r[0]),date:platformDate_(r[3]),materialId:String(r[1]),type:'OUT',quantity:platformNum_(r[4]),price:platformNum_(r[6]),value:platformNum_(r[7]),category:String(r[5]||'Stock Out'),reference:'Histori stok lama',user:String(r[8]||'')},key=item.type+'|'+item.materialId+'|'+item.date+'|'+item.quantity+'|'+item.price;if(!modernKeys[key])rows.push(item)});return rows.sort(function(a,b){return String(b.date+' '+b.timestamp).localeCompare(String(a.date+' '+a.timestamp))}).slice(0,1000);}
function platformGetInvoices_(ss,f){f=f||{};var q=String(f.q||'').toLowerCase(),from=String(f.from||''),to=String(f.to||''),showPaid=!!f.showPaid,sh=ss.getSheetByName('Invoice')||ss.getSheetByName(PLATFORM.FIN_INV);return platformRows_(sh,19).map(function(r){return{id:String(r[0]),number:String(r[1]),supplier:String(r[2]),category:String(r[3]),account:String(r[5]),invoiceDate:platformDate_(r[7]),dueDate:platformDate_(r[8]),status:String(r[9]),total:platformNum_(r[14]),transactionId:String(r[16]||'')};}).filter(function(i){if(!showPaid&&i.status==='Dibayar')return false;if(q&&(i.supplier+' '+i.number).toLowerCase().indexOf(q)<0)return false;if(from&&i.invoiceDate<from)return false;if(to&&i.invoiceDate>to)return false;return true;}).sort(function(a,b){var ao=a.status==='Terlambat'?0:1,bo=b.status==='Terlambat'?0:1;return ao-bo||b.invoiceDate.localeCompare(a.invoiceDate);});}
function platformGetAccounts_(ss){var sh=ss.getSheetByName('Rekening')||ss.getSheetByName(PLATFORM.FIN_ACC);return platformRows_(sh,7).filter(function(r){return r[4]!==false}).map(function(r){return{id:String(r[0]),name:String(r[1])};});}
function platformGetPayrollRuns_(ss){return platformRows_(ss.getSheetByName(PLATFORM.PAY_RUN),10).map(function(r){return{runId:String(r[0]),scheme:String(r[1]),start:platformDate_(r[2]),end:platformDate_(r[3]),status:String(r[4]),total:platformNum_(r[5])};}).reverse().slice(0,10);}
function platformGetPayrollAdmin_(ss){var employees=platformRows_(ss.getSheetByName('Karyawan'),6).map(function(r){return{id:String(r[0]),name:String(r[1]),type:String(r[2]),rate:platformNum_(r[3]),status:String(r[4]),startDate:platformDate_(r[5])};}),attendance=platformRows_(ss.getSheetByName('Absensi'),11).slice(-400).reverse().map(function(r){return{id:String(r[0]),employeeId:String(r[1]),date:platformDate_(r[2]),inTime:platformCellTime_(r[3]),outTime:platformCellTime_(r[4]),hours:platformNum_(r[5]),status:String(r[6]),note:String(r[7]||''),overtimeHours:platformNum_(r[9]),overtimeRate:platformNum_(r[10])};});return{employees:employees,attendance:attendance};}
function platformDashboardSummaryFast_(ss){var bahan=ss.getSheetByName(PLATFORM.BAHAN)||ss.getSheetByName('BAHAN_BAKU'),produk=ss.getSheetByName(PLATFORM.PRODUK)||ss.getSheetByName('PRODUK'),invoice=ss.getSheetByName('Invoice')||ss.getSheetByName(PLATFORM.FIN_INV),materials=platformActiveCount_(bahan,bahan&&bahan.getName()===PLATFORM.BAHAN?5:0),products=platformActiveCount_(produk,produk&&produk.getName()===PLATFORM.PRODUK?9:0),stockValue=platformGetStock_(ss,false).reduce(function(sum,r){return sum+r.stock*r.average},0),activeInvoices=0;if(invoice&&invoice.getLastRow()>1)activeInvoices=invoice.getRange(2,10,invoice.getLastRow()-1,1).getValues().reduce(function(n,r){return n+(String(r[0])==='Dibayar'?0:1);},0);return{materials:materials,products:products,stockValue:stockValue,activeInvoices:activeInvoices};}
function platformActiveCount_(sheet,activeColumn){if(!sheet||sheet.getLastRow()<2)return 0;if(!activeColumn)return sheet.getLastRow()-1;return sheet.getRange(2,activeColumn,sheet.getLastRow()-1,1).getValues().reduce(function(n,r){return n+(r[0]===false?0:1);},0);}
function platformSummary_(ss){return{materials:platformGetBahan_(ss,false).length,products:platformGetProduk_(ss,false).length,stockValue:platformGetStock_(ss,false).reduce(function(s,r){return s+r.stock*r.average},0),activeInvoices:platformGetInvoices_(ss,{showPaid:false}).length};}
function platformRecentSync_(ss){return platformRows_(ss.getSheetByName(PLATFORM.SYNC),5).slice(-8).reverse().map(function(r){return{time:platformDateTime_(r[0]),source:String(r[1]),status:String(r[2]),rows:Number(r[3])||0,message:String(r[4]||'')};});}
function platformEnsureStockRow_(ss,id){var sh=ss.getSheetByName(PLATFORM.STOCK);if(!platformFindRow_(sh,id))sh.appendRow([id,0,0,new Date()]);}
function platformRecipeCost_(ss,productId){return platformRows_(ss.getSheetByName(PLATFORM.RESEP),7).filter(function(r){return String(r[1])===String(productId)}).reduce(function(s,r){return s+platformNum_(r[6])},0);}
function platformRecalculateProduct_(ss,productId){var sh=ss.getSheetByName(PLATFORM.PRODUK),row=platformFindRow_(sh,productId);if(!row)return;var price=platformNum_(sh.getRange(row,4).getValue()),overhead=platformNum_(sh.getRange(row,5).getValue()),base=platformRecipeCost_(ss,productId),total=base*(1+overhead/100),margin=price>0?(price-total)/price*100:0;sh.getRange(row,6,1,3).setValues([[base,total,Math.round(margin*10)/10]]);}
function platformAudit_(ss,module,action,id,summary){ss.getSheetByName(PLATFORM.AUDIT).appendRow([new Date(),'Admin',module,action,id,summary]);}
function platformDate_(v){if(Object.prototype.toString.call(v)==='[object Date]')return Utilities.formatDate(v,PLATFORM_TZ,'yyyy-MM-dd');var s=String(v||'');if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){var p=s.split('/');return p[2]+'-'+p[1]+'-'+p[0];}return s.slice(0,10);}
function platformDateTime_(v){if(Object.prototype.toString.call(v)==='[object Date]')return Utilities.formatDate(v,PLATFORM_TZ,'dd/MM/yyyy HH:mm');return String(v||'');}
function platformNum_(v){var n=Number(v);return isFinite(n)?n:0;}
function platformSafe_(v){return JSON.parse(JSON.stringify(v));}
function platformSourceInfo_(prop){var id=PropertiesService.getScriptProperties().getProperty(prop);if(!id)return{configured:false};var ss=SpreadsheetApp.openById(id);return{configured:true,name:ss.getName(),sheets:ss.getSheets().map(function(s){return{name:s.getName(),rows:s.getLastRow()};})};}
function platformAuditSync_(source,status,rows,msg,ss){(ss||platformSS_()).getSheetByName(PLATFORM.SYNC).appendRow([new Date(),source,status,rows,msg||'']);}
function platformSyncJsonSheet_(prop,sourceName,targetName,master,sourceSS){var id=PropertiesService.getScriptProperties().getProperty(prop);if(!id)return{source:sourceName,skipped:true};var src=(sourceSS||SpreadsheetApp.openById(id)).getSheetByName(sourceName);if(!src)return{source:sourceName,skipped:true};master=master||platformSS_();var data=src.getDataRange().getValues(),target=master.getSheetByName(targetName),existing={};platformRows_(target,3).forEach(function(r){existing[String(r[0])]=true});var rows=[];for(var i=1;i<data.length;i++){var safe=data[i].map(platformCellSafe_),key=sourceName+'|'+platformRowHash_(safe);if(!existing[key])rows.push([key,JSON.stringify(safe),new Date()]);}if(rows.length)target.getRange(target.getLastRow()+1,1,rows.length,3).setValues(rows);platformAuditSync_(sourceName,'OK',rows.length,'',master);return{source:sourceName,added:rows.length};}
function platformRowHash_(row){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(row),Utilities.Charset.UTF_8);return bytes.map(function(b){var n=b<0?b+256:b;return('0'+n.toString(16)).slice(-2);}).join('').slice(0,24);}
function platformSyncAttendance_(master){var id=PropertiesService.getScriptProperties().getProperty('ATTENDANCE_SOURCE_ID');if(!id)return{source:'Absensi_Log',skipped:true};var src=SpreadsheetApp.openById(id).getSheetByName('Absensi_Log');if(!src)return{source:'Absensi_Log',skipped:true};master=master||platformSS_();var data=src.getDataRange().getValues(),target=master.getSheetByName(PLATFORM.ATT_LOG),existing={};platformRows_(target,12).forEach(function(r){existing[String(r[0])]=true});var rows=[];for(var i=1;i<data.length;i++){var date=platformDate_(data[i][0]),name=String(data[i][2]||''),key=date+'|'+name+'|'+String(data[i][5]||'');if(existing[key])continue;rows.push([key,date,name,String(data[i][3]||''),String(data[i][4]||''),platformCellTime_(data[i][5]),platformCellTime_(data[i][11]),String(data[i][6]||''),String(data[i][12]||''),platformNum_(data[i][17]),JSON.stringify(data[i].map(platformCellSafe_)),new Date()]);}if(rows.length)target.getRange(target.getLastRow()+1,1,rows.length,12).setValues(rows);platformAuditSync_('Absensi_Log','OK',rows.length,'',master);return{source:'Absensi_Log',added:rows.length};}
function platformSyncPayroll_(){var id=PropertiesService.getScriptProperties().getProperty('PAYROLL_SOURCE_ID');if(!id)return{source:'Payroll',skipped:true,message:'PAYROLL_SOURCE_ID belum diisi'};var source=SpreadsheetApp.openById(id),empSrc=source.getSheetByName('Karyawan'),attSrc=source.getSheetByName('Absensi');if(!empSrc||!attSrc)throw new Error('PAYROLL_SOURCE_ID harus memiliki sheet Karyawan dan Absensi');var ss=platformSS_(),empDst=ss.getSheetByName(PLATFORM.PAY_EMP),attDst=ss.getSheetByName(PLATFORM.PAY_ATT),empRows=platformRows_(empSrc,Math.max(6,empSrc.getLastColumn())),employeeCount=0;empRows.forEach(function(r){var id=String(r[0]),values=[id,String(r[1]),String(r[2]),platformNum_(r[3]),String(r[4]||'Aktif'),String(r[1]),new Date()],row=platformFindRow_(empDst,id);if(row)empDst.getRange(row,1,1,7).setValues([values]);else empDst.appendRow(values);employeeCount++;});var existing={};platformRows_(attDst,11).forEach(function(r){existing[String(r[0])]=true});var rows=[];platformRows_(attSrc,Math.max(11,attSrc.getLastColumn())).forEach(function(r){var sourceId=String(r[0]||platformRowHash_(r.map(platformCellSafe_)));if(existing[sourceId])return;rows.push([sourceId,String(r[1]),platformDate_(r[2]),platformCellTime_(r[3]),platformCellTime_(r[4]),platformNum_(r[5]),String(r[6]||'Hadir'),String(r[7]||''),platformNum_(r[9]),platformNum_(r[10]),new Date()]);});if(rows.length)attDst.getRange(attDst.getLastRow()+1,1,rows.length,11).setValues(rows);platformAuditSync_('Payroll Karyawan/Absensi','OK',rows.length,'Karyawan '+employeeCount);return{source:'Payroll',employees:employeeCount,added:rows.length};}

/** Upsert langsung ke sheet payroll master. Data yang hanya ada di master tidak dihapus. */
function platformSyncPayrollRealtime_(masterSS,forceAttendanceLog){
  var master=masterSS||platformSS_(),logResult;
  var sourceId=String(PropertiesService.getScriptProperties().getProperty('PAYROLL_SOURCE_ID')||'');
  if(!sourceId){logResult=platformSyncAttendanceLogToPayroll_(master,!!forceAttendanceLog);return{source:'Payroll realtime',skipped:true,message:'PAYROLL_SOURCE_ID belum diisi; histori Absensi_Log tetap direkonsiliasi',changed:logResult.changed,added:logResult.added,attendanceAdded:logResult.added,attendanceUpdated:logResult.updated,attendanceLog:logResult};}
  var source=SpreadsheetApp.openById(sourceId),empSrc=source.getSheetByName('Karyawan'),attSrc=source.getSheetByName('Absensi'),empDst=master.getSheetByName('Karyawan'),attDst=master.getSheetByName('Absensi');
  if(!empSrc||!attSrc)throw new Error('PAYROLL_SOURCE_ID harus memiliki sheet Karyawan dan Absensi');
  if(!empDst||!attDst)throw new Error('Sheet Karyawan/Absensi belum ada di platform. Jalankan migrasiSemuaToolsKePlatform sekali dari editor Apps Script.');
  if(source.getId()===master.getId()){logResult=platformSyncAttendanceLogToPayroll_(master,!!forceAttendanceLog);return{source:'Payroll realtime',employeesAdded:0,employeesUpdated:0,attendanceAdded:logResult.added,attendanceUpdated:logResult.updated,added:logResult.added,changed:logResult.changed,message:'Sumber payroll sudah memakai spreadsheet master; Absensi_Log direkonsiliasi',attendanceLog:logResult};}
  var result={source:'Payroll realtime',employeesAdded:0,employeesUpdated:0,attendanceAdded:0,attendanceUpdated:0,added:0,changed:false};
  var lock=LockService.getScriptLock();lock.waitLock(5000);
  try{
    var empCurrent=platformRows_(empDst,6),empMap={};
    empCurrent.forEach(function(r,i){empMap[String(r[0])]={row:i+2,value:r};});
    var empAppend=[];
    platformRows_(empSrc,Math.max(6,empSrc.getLastColumn())).forEach(function(r){
      var id=String(r[0]||'');if(!id)return;
      var value=[id,String(r[1]||''),String(r[2]||''),platformNum_(r[3]),String(r[4]||'Aktif'),platformDate_(r[5])];
      if(!empMap[id]){empAppend.push(value);result.employeesAdded++;}
      else if(!platformPayrollRowsEqual_(empMap[id].value,value,6)){empDst.getRange(empMap[id].row,1,1,6).setValues([value]);result.employeesUpdated++;}
    });
    if(empAppend.length)empDst.getRange(empDst.getLastRow()+1,1,empAppend.length,6).setValues(empAppend);

    var cache=CacheService.getScriptCache(),cacheKey='payroll_attendance_'+sourceId.slice(-18),sourceLast=attSrc.getLastRow(),lastValue=sourceLast>1?attSrc.getRange(sourceLast,1,1,Math.max(11,attSrc.getLastColumn())).getValues()[0].map(platformCellSafe_):[],signature=sourceLast+'|'+platformRowHash_(lastValue),cached=cache.get(cacheKey),scanAttendance=cached!==signature;
    if(scanAttendance){
      var attCurrent=platformRows_(attDst,11),attMap={};
      attCurrent.forEach(function(r,i){attMap[String(r[0])]={row:i+2,value:r};});
      var attAppend=[];
      platformRows_(attSrc,Math.max(11,attSrc.getLastColumn())).forEach(function(r){
        var id=String(r[0]||platformRowHash_(r.map(platformCellSafe_))),created=r[8]||(attMap[id]?attMap[id].value[8]:new Date()),value=[id,String(r[1]||''),platformDate_(r[2]),platformCellTime_(r[3]),platformCellTime_(r[4]),platformNum_(r[5]),String(r[6]||'Hadir'),String(r[7]||''),created,platformNum_(r[9]),platformNum_(r[10])];
        if(!attMap[id]){attAppend.push(value);result.attendanceAdded++;}
        else if(!platformPayrollRowsEqual_(attMap[id].value,value,11)){attDst.getRange(attMap[id].row,1,1,11).setValues([value]);result.attendanceUpdated++;}
      });
      if(attAppend.length)attDst.getRange(attDst.getLastRow()+1,1,attAppend.length,11).setValues(attAppend);
      cache.put(cacheKey,signature,21600);
    }
  }finally{lock.releaseLock();}
  logResult=platformSyncAttendanceLogToPayroll_(master,!!forceAttendanceLog);
  result.added=result.employeesAdded+result.attendanceAdded;
  result.changed=result.added+result.employeesUpdated+result.attendanceUpdated>0;
  result.attendanceAdded+=logResult.added;
  result.attendanceUpdated+=logResult.updated;
  result.added+=logResult.added;
  result.changed=result.changed||logResult.changed;
  result.attendanceLog=logResult;
  if(result.changed)platformAuditSync_('Payroll realtime','OK',result.added,'Update '+(result.employeesUpdated+result.attendanceUpdated),master);
  return result;
}

/**
 * Rekonsiliasi histori detail Absensi_Log menjadi baris ringkasan Absensi
 * yang dibaca Payroll. Aman dijalankan berulang: kunci data adalah
 * Karyawan ID payroll + tanggal, sehingga histori tidak diduplikasi.
 */
function platformSyncAttendanceLogToPayroll_(master,force){
  var employeeSheet=master.getSheetByName('Karyawan'),attendanceSheet=master.getSheetByName('Absensi');
  if(!employeeSheet||!attendanceSheet)return{source:'Absensi_Log ke Payroll',skipped:true,message:'Sheet Karyawan/Absensi belum ada',added:0,updated:0,unmapped:0,changed:false};

  var sources=[],masterLog=master.getSheetByName('Absensi_Log');
  if(masterLog&&masterLog.getLastRow()>1)sources.push(masterLog);
  var attendanceSourceId=String(PropertiesService.getScriptProperties().getProperty('ATTENDANCE_SOURCE_ID')||'');
  if(attendanceSourceId&&attendanceSourceId!==master.getId()){
    var externalLog=SpreadsheetApp.openById(attendanceSourceId).getSheetByName('Absensi_Log');
    if(externalLog&&externalLog.getLastRow()>1)sources.push(externalLog);
  }
  if(!sources.length)return{source:'Absensi_Log ke Payroll',skipped:true,message:'Tidak ada histori Absensi_Log',added:0,updated:0,unmapped:0,changed:false};

  var signatureParts=sources.map(function(sheet){
    var lastRow=sheet.getLastRow(),lastDisplay=sheet.getRange(lastRow,1,1,Math.min(20,sheet.getLastColumn())).getDisplayValues()[0];
    return sheet.getParent().getId()+'|'+lastRow+'|'+platformRowHash_(lastDisplay);
  });
  var cache=CacheService.getScriptCache(),cacheKey='attendance_log_payroll_v3_'+master.getId().slice(-16),signature=signatureParts.join('||');
  if(!force&&cache.get(cacheKey)===signature)return{source:'Absensi_Log ke Payroll',cached:true,added:0,updated:0,unmapped:0,changed:false};

  var employeeByName={};
  platformRows_(employeeSheet,6).forEach(function(row){
    var nameKey=platformAttendanceNameKey_(row[1]);
    if(nameKey)employeeByName[nameKey]=String(row[0]||'');
  });

  var current=platformRows_(attendanceSheet,11),byEmployeeDate={};
  current.forEach(function(row,index){
    var key=String(row[1]||'')+'|'+platformDate_(row[2]);
    if(row[1]&&platformDate_(row[2]))byEmployeeDate[key]={row:index+2,value:row};
  });

  var appendRows=[],updates=[],unmappedNames={},added=0,updated=0;
  sources.forEach(function(sourceSheet){
    var lastRow=sourceSheet.getLastRow(),width=Math.min(20,sourceSheet.getLastColumn());
    if(lastRow<2||width<12)return;
    var range=sourceSheet.getRange(2,1,lastRow-1,width),raw=range.getValues(),display=range.getDisplayValues();
    raw.forEach(function(sourceRow,index){
      var shown=display[index],date=platformDate_(shown[0]||sourceRow[0]),employeeName=String(sourceRow[2]||shown[2]||'').trim(),employeeId=employeeByName[platformAttendanceNameKey_(employeeName)];
      if(!date||!employeeName)return;
      if(!employeeId){unmappedNames[employeeName]=true;return;}
      var inTime=platformAttendanceTime_(shown[5]),outTime=platformAttendanceTime_(shown[11]);
      if(!inTime)return;
      // Hitung dari jam tampilan agar tidak terkena konversi Date epoch 1899
      // atau nilai durasi/formula lama yang pernah menghasilkan 0 / #NUM!.
      var hours=outTime?platformAttendanceHours_(inTime,outTime):'';
      var noteParts=[];
      if(sourceRow[4])noteParts.push('Shift: '+String(sourceRow[4]));
      if(sourceRow[6])noteParts.push('Masuk: '+String(sourceRow[6]));
      if(sourceRow[7])noteParts.push(String(sourceRow[7]));
      if(sourceRow[12])noteParts.push('Pulang: '+String(sourceRow[12]));
      if(sourceRow[13])noteParts.push(String(sourceRow[13]));
      var key=employeeId+'|'+date,found=byEmployeeDate[key];
      if(!found){
        var newId='ATTLOG-'+platformRowHash_([employeeId,date]),newRow=[newId,employeeId,date,inTime,outTime,hours,'Hadir',noteParts.join(' | '),sourceRow[18]||new Date(),0,0];
        appendRows.push(newRow);byEmployeeDate[key]={row:0,value:newRow,appendIndex:appendRows.length-1};added++;return;
      }
      if(!found.row){
        var staged=found.value;
        if(!staged[4]&&outTime)staged[4]=outTime;
        if((!platformNum_(staged[5])||String(staged[5])==='#NUM!')&&hours!=='')staged[5]=hours;
        if(!staged[7]&&noteParts.length)staged[7]=noteParts.join(' | ');
        appendRows[found.appendIndex]=staged;
        return;
      }
      var old=found.value.slice(0,11),next=old.slice(),changed=false;
      if(!platformCellTime_(old[3])&&inTime){next[3]=inTime;changed=true;}
      if(!platformCellTime_(old[4])&&outTime){next[4]=outTime;changed=true;}
      if((!platformNum_(old[5])||String(old[5])==='#NUM!')&&hours!==''){next[5]=hours;changed=true;}
      if(!String(old[6]||'').trim()){next[6]='Hadir';changed=true;}
      if(!String(old[7]||'').trim()&&noteParts.length){next[7]=noteParts.join(' | ');changed=true;}
      if(changed){updates.push({row:found.row,value:next});found.value=next;updated++;}
    });
  });

  updates.forEach(function(item){attendanceSheet.getRange(item.row,1,1,11).setValues([item.value]);});
  if(appendRows.length)attendanceSheet.getRange(attendanceSheet.getLastRow()+1,1,appendRows.length,11).setValues(appendRows);
  if(updates.length||appendRows.length)attendanceSheet.getRange(2,6,attendanceSheet.getLastRow()-1,1).setNumberFormat('0.00');
  cache.put(cacheKey,signature,21600);
  var result={source:'Absensi_Log ke Payroll',added:added,updated:updated,unmapped:Object.keys(unmappedNames).length,unmappedNames:Object.keys(unmappedNames).slice(0,20),changed:added+updated>0};
  if(result.changed)platformAuditSync_(result.source,'OK',added,'Update '+updated+'; nama tidak cocok '+result.unmapped,master);
  return result;
}

function platformAttendanceNameKey_(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ');}
function platformAttendanceTime_(displayValue){var match=String(displayValue||'').trim().match(/^(\d{1,2}):(\d{2})/);return match?('0'+Number(match[1])).slice(-2)+':'+match[2]:'';}
function platformAttendanceHours_(inTime,outTime){var a=String(inTime).split(':'),b=String(outTime).split(':'),start=Number(a[0])*60+Number(a[1]),end=Number(b[0])*60+Number(b[1]);if(end<start)end+=1440;return Math.round((end-start)/60*100)/100;}

/** Jalankan sekali dari editor untuk mengisi histori tanggal lama. Aman diulang. */
function migrasiIsiAbsensiPayrollDariLog(){var result=platformSyncAttendanceLogToPayroll_(platformSS_(),true);Logger.log('migrasiIsiAbsensiPayrollDariLog: '+JSON.stringify(result));return result;}

function platformPayrollRowsEqual_(a,b,cols){var left=[],right=[];for(var i=0;i<cols;i++){var av=a[i],bv=b[i];if((cols===6&&i===5)||(cols===11&&i===2)){av=platformDate_(av);bv=platformDate_(bv);}else if(cols===11&&(i===3||i===4)){av=platformCellTime_(av);bv=platformCellTime_(bv);}else{av=platformCellSafe_(av);bv=platformCellSafe_(bv);}left.push(av);right.push(bv);}return JSON.stringify(left)===JSON.stringify(right);}

function platformCalculatePayroll_(ss,scheme,period,runId,manualDeltas){
  var empSheet=ss.getSheetByName('Karyawan'),attSheet=ss.getSheetByName('Absensi');
  if(!empSheet||!attSheet)throw new Error('Sheet Karyawan/Absensi tidak ditemukan di spreadsheet master');
  var employees=platformRows_(empSheet,6).filter(function(r){return String(r[2])===scheme&&String(r[4]).toLowerCase()==='aktif';}),byEmployee={};
  platformRows_(attSheet,11).forEach(function(r){var date=platformDate_(r[2]);if(date<period.start||date>period.end)return;var id=String(r[1]);if(!byEmployee[id])byEmployee[id]=[];byEmployee[id].push(r);});
  var details=employees.map(function(e){
    var rows=byEmployee[String(e[0])]||[],hadir=0,izin=0,sakit=0,alpha=0;
    rows.forEach(function(a){var status=String(a[6]).toLowerCase();if(status==='hadir')hadir++;else if(status==='izin')izin++;else if(status==='sakit')sakit++;else if(status==='alpha')alpha++;});
    var rate=platformNum_(e[3]),overtime=rows.reduce(function(sum,a){return sum+Math.round(platformNum_(a[9])*platformNum_(a[10]));},0),automatic=scheme==='Fulltime'?-Math.round(rate/26)*alpha+overtime:0,adjustment=automatic+platformNum_(manualDeltas[String(e[0])]),net=scheme==='Fulltime'?Math.max(0,Math.round(rate/26)*hadir+adjustment):Math.max(0,Math.round(rate*hadir)+adjustment);
    return[runId,e[0],e[1],rate,hadir,izin,sakit,alpha,overtime,adjustment,net,rows.length?'':'Tidak ada data absensi'];
  });
  return{details:details,total:details.reduce(function(sum,r){return sum+platformNum_(r[10]);},0)};
}

function platformRefreshPayrollRun_(ss,runId){
  var runSheet=ss.getSheetByName(PLATFORM.PAY_RUN),runRow=platformFindRow_(runSheet,runId);if(!runRow)return null;
  var run=runSheet.getRange(runRow,1,1,10).getValues()[0],status=String(run[4]);if(status!=='DRAFT')return null;
  var scheme=String(run[1]),period={start:platformDate_(run[2]),end:platformDate_(run[3])},detailSheet=ss.getSheetByName(PLATFORM.PAY_DETAIL),allDetails=platformRows_(detailSheet,12),manualDeltas={};
  allDetails.forEach(function(r){if(String(r[0])!==runId)return;var base=scheme==='Fulltime'?-Math.round(platformNum_(r[3])/26)*platformNum_(r[7])+platformNum_(r[8]):0;manualDeltas[String(r[1])]=platformNum_(r[9])-base;});
  var calculated=platformCalculatePayroll_(ss,scheme,period,runId,manualDeltas),lock=LockService.getScriptLock();lock.waitLock(5000);
  try{
    for(var i=allDetails.length-1;i>=0;i--)if(String(allDetails[i][0])===runId)detailSheet.deleteRow(i+2);
    if(calculated.details.length)detailSheet.getRange(detailSheet.getLastRow()+1,1,calculated.details.length,12).setValues(calculated.details);
    runSheet.getRange(runRow,6).setValue(calculated.total);
  }finally{lock.releaseLock();}
  return{runId:runId,scheme:scheme,start:period.start,end:period.end,status:'DRAFT',total:calculated.total,details:calculated.details};
}

function platformReadPayrollRun_(ss,runId){var runSheet=ss.getSheetByName(PLATFORM.PAY_RUN),row=platformFindRow_(runSheet,runId);if(!row)return null;var r=runSheet.getRange(row,1,1,10).getValues()[0];if(String(r[4])!=='DRAFT')return null;return{runId:runId,scheme:String(r[1]),start:platformDate_(r[2]),end:platformDate_(r[3]),status:'DRAFT',total:platformNum_(r[5]),details:platformRows_(ss.getSheetByName(PLATFORM.PAY_DETAIL),12).filter(function(d){return String(d[0])===runId;})};}
function platformCellSafe_(v){if(Object.prototype.toString.call(v)==='[object Date]')return Utilities.formatDate(v,PLATFORM_TZ,'yyyy-MM-dd HH:mm:ss');return v;}
function platformCellTime_(v){if(Object.prototype.toString.call(v)==='[object Date]')return Utilities.formatDate(v,PLATFORM_TZ,'HH:mm');return String(v||'');}
function platformPayrollPeriod_(scheme,r){if(scheme==='Fulltime'){if(!/^\d{4}-\d{2}$/.test(String(r.month||'')))throw new Error('Pilih bulan');var p=r.month.split('-'),y=Number(p[0]),m=Number(p[1]),pm=m===1?12:m-1,py=m===1?y-1:y;return{start:py+'-'+String(pm).padStart(2,'0')+'-20',end:y+'-'+String(m).padStart(2,'0')+'-19'};}if(!r.start||!r.end||r.start>r.end)throw new Error('Rentang tidak valid');return{start:r.start,end:r.end};}
function platformParseIsoDate_(iso){var p=String(iso).split('-');return new Date(Number(p[0]),Number(p[1])-1,Number(p[2]),12,0,0);}
function platformFindTransactionByReference_(sh,reference){if(!sh||sh.getLastRow()<2)return'';var rows=sh.getRange(2,1,sh.getLastRow()-1,Math.min(15,sh.getLastColumn())).getValues();for(var i=0;i<rows.length;i++)if(String(rows[i][11]||'')===String(reference)||String(rows[i][8]||'').indexOf(String(reference))!==-1)return String(rows[i][0]);return'';}
function platformAssertFinanceSchema_(sh){if(!sh)throw new Error('Sheet Transaksi tidak ditemukan di Keuangan Baru');var expected=PLATFORM_SCHEMA[PLATFORM.FIN_TX],actual=sh.getRange(1,1,1,expected.length).getValues()[0];for(var i=0;i<expected.length;i++)if(String(actual[i]).trim()!==expected[i])throw new Error('Skema Transaksi Keuangan Baru tidak sesuai pada kolom '+(i+1)+': seharusnya '+expected[i]);}
function platformLegacyApps_(){var props=PropertiesService.getScriptProperties(),base=ScriptApp.getService().getUrl(),apps=[{name:'HPP',url:base+'?module=hpp',configured:true},{name:'Stock',url:base+'?module=stock',configured:true},{name:'Keuangan Baru',url:base+'?module=finance',configured:true}],external=[['Receiving','RECEIVING_APP_URL'],['Absensi','ATTENDANCE_APP_URL']];external.forEach(function(d){var url=String(props.getProperty(d[1])||'');apps.push({name:d[0],url:url,configured:Boolean(url)});});return apps;}
function platformImportHpp_(){return platformImportMapped_('HPP_SOURCE_ID',[['BAHAN_BAKU',PLATFORM.BAHAN,function(r){return[r[0],r[1],r[2],r[4],true,'HPP',new Date()];}],['PRODUK',PLATFORM.PRODUK,function(r){return[r[0],r[1],r[2],r[3],r[5],r[4],r[7],r[8],true,new Date()];}],['RESEP',PLATFORM.RESEP,function(r){return[r[0],r[1],r[3],r[6],r[5],r[7],r[8]];}]]);}
function platformImportStock_(){return platformImportMapped_('STOCK_SOURCE_ID',[['Bahan',PLATFORM.STOCK,function(r){return[r[0],r[4],r[5],new Date()];}]]);}
function platformImportFinance_(){return platformImportMapped_('FINANCE_SOURCE_ID',[['Transaksi',PLATFORM.FIN_TX,null],['Kategori',PLATFORM.FIN_CAT,null],['Invoice',PLATFORM.FIN_INV,null],['Rekening',PLATFORM.FIN_ACC,null]]);}
function platformImportMapped_(prop,maps){var id=PropertiesService.getScriptProperties().getProperty(prop);if(!id)return{property:prop,skipped:true};var source=SpreadsheetApp.openById(id),master=platformSS_(),out=[];maps.forEach(function(m){var src=source.getSheetByName(m[0]),dst=master.getSheetByName(m[1]);if(!src||dst.getLastRow()>1){out.push({sheet:m[0],skipped:true});return;}var rows=src.getLastRow()>1?src.getRange(2,1,src.getLastRow()-1,src.getLastColumn()).getValues():[];if(m[2])rows=rows.map(m[2]);if(rows.length)dst.getRange(2,1,rows.length,PLATFORM_SCHEMA[m[1]].length).setValues(rows.map(function(r){while(r.length<PLATFORM_SCHEMA[m[1]].length)r.push('');return r.slice(0,PLATFORM_SCHEMA[m[1]].length);}));out.push({sheet:m[0],rows:rows.length});});return{property:prop,result:out};}
