// ============================================================
// Matt's Tools Box - 備忘錄專用 Google Apps Script
// 
// 使用方式：
// 1. 開啟 Google Sheets，建立新試算表，命名為「我的工具箱」
// 2. 點選「擴充功能」 → 「Apps Script」
// 3. 貼入本程式碼，存檔。
// 4. 右上角「部署」 → 「新增部署作業」 → 類型選「網頁應用程式」
// 5. 權限設定：執行者選「我」，存取權限選「所有人」
// 6. 產生第一筆網址後複製到系統中。
// ============================================================

const SHEET_NAME = '備忘錄';

function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // 建立這張表專用的資料欄：A1為標題，A2為內容
  sheet.getRange("A1").setValue("Memo Content");
  sheet.getRange("A1").setFontWeight('bold').setBackground('#10b981').setFontColor('#ffffff');
  
  // 預設為空
  if (!sheet.getRange("A2").getValue()) {
    sheet.getRange("A2").setValue("");
  }
  
  SpreadsheetApp.getUi().alert('備忘錄基礎架構初始化完成！');
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'getMemo') {
    return jsonResponse(getMemo());
  }
  return jsonResponse({ error: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    
    if (action === 'saveMemo') {
      const result = saveMemo(body.content);
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
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function getMemo() {
  const sheet = getSheet();
  const content = sheet.getRange("A2").getValue();
  return { success: true, content: String(content) };
}

function saveMemo(content) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = getSheet();
    sheet.getRange("A2").setValue(content);
    SpreadsheetApp.flush();
    return { success: true };
  } catch (err) {
    return { success: false, error: '存取失敗，請稍後再試。' };
  } finally {
    lock.releaseLock();
  }
}
