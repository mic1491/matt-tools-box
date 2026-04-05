// ============================================================
// Matt's Tools Box - 多筆備忘錄專用 Google Apps Script
// 
// 使用方式：
// 1. 回到「我的工具箱」試算表
// 2. 貼入本最新程式碼，覆蓋掉舊的
// 3. 右上角點選「執行」 -> initializeSheet (會建立一個新的分頁叫「備忘清單」)
// 4. 注意：改版後請點選右上角「部署」 -> 「管理部署作業」 -> 「編輯(鉛筆)」 -> 「新版本」再次發布
// ============================================================

const SHEET_NAME = '備忘清單';

function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // 建立這張表專用的資料欄位
    sheet.appendRow(["ID", "Date", "Content"]);
    sheet.getRange("A1:C1").setFontWeight('bold').setBackground('#3b82f6').setFontColor('#ffffff');
    sheet.setColumnWidth(3, 400);
  }
  SpreadsheetApp.getUi().alert('多筆備忘清單架構初始化完成！');
}

// 供初次加入雲端硬碟權限時使用
function setupPermissions() {
  // 當遇到權限不足的錯誤時，請在編輯器選擇這個函數並點擊「執行」
  // 藉此強制呼叫 Google API 以觸發「審查權限」的流程對話框。
  DriveApp.getRootFolder();
  SpreadsheetApp.getActiveSpreadsheet();
  console.log("權限審查已成功完成！");
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'getMemos') {
    return jsonResponse(getMemos());
  }
  return jsonResponse({ error: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    
    if (action === 'addMemo') {
      const result = addMemo(body.content);
      return jsonResponse(result);
    } else if (action === 'deleteMemo') {
      const result = deleteMemo(body.id);
      return jsonResponse(result);
    } else if (action === 'uploadFile') {
      const result = uploadFile(body.filename, body.mimeType, body.base64Data, body.folderId);
      return jsonResponse(result);
    }
    
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// === 資料庫操作 ===

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["ID", "Date", "Content"]);
  }
  return sheet;
}

function getMemos() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // 只有標題列
  
  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const memos = data.map(row => ({
    id: row[0],
    createdAt: row[1],
    content: String(row[2])
  }));
  
  // 反轉陣列，讓最新的一筆在最前面
  return memos.reverse();
}

function addMemo(content) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = getSheet();
    const id = Utilities.getUuid();
    
    // 格式化目前時間
    const now = new Date();
    const dateStr = Utilities.formatDate(now, "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
    
    sheet.appendRow([id, dateStr, content]);
    SpreadsheetApp.flush();
    return { success: true, item: { id: id, createdAt: dateStr, content: content } };
  } catch (err) {
    return { success: false, error: '存取失敗，請稍後再試。' };
  } finally {
    lock.releaseLock();
  }
}

function deleteMemo(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, error: '無資料' };
    
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    
    // 找出符合 ID 的那一排
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === id) {
        // 加 2 是因為陣列從 0 開始，且第一列是標題列
        sheet.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return { success: true };
      }
    }
    
    return { success: false, error: '找不到該筆紀錄' };
  } catch (err) {
    return { success: false, error: '刪除失敗' };
  } finally {
    lock.releaseLock();
  }
}

// === 雲端硬碟操作 ===

function uploadFile(filename, mimeType, base64Data, folderId) {
  try {
    // 若沒有傳入 folderId，請確認呼叫端是否有提供。以下假設 folderId 必定存在。
    const folder = DriveApp.getFolderById(folderId);
    // 移除 base64 字串前面的 data:MIME_TYPE;base64, 前綴（如果有的話在前端處理，這裡預設收純 base64 字串）
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
    const file = folder.createFile(blob);
    return { success: true, url: file.getUrl(), id: file.getId() };
  } catch (err) {
    return { success: false, error: '無法上傳檔案：' + err.message };
  }
}
