const API_URL = process.env.NEXT_PUBLIC_MEMO_API_URL || '';

// 取得多筆備忘錄
export async function fetchMemos() {
  if (!API_URL || !API_URL.includes('/s/')) {
    return [];
  }
  
  try {
    const res = await fetch(`${API_URL}?action=getMemos`, { 
      cache: 'no-store',
      redirect: 'follow'
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Fetch memo error:', err);
    return [];
  }
}

// 新增單筆備忘錄
export async function addMemo(content) {
  if (!API_URL || !API_URL.includes('/s/')) {
    return { success: false, error: '請先設定 NEXT_PUBLIC_MEMO_API_URL' };
  }
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify({
        action: 'addMemo',
        content: content 
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Add memo error:', err);
    return { success: false, error: err.message };
  }
}

// 刪除單筆備忘錄
export async function deleteMemo(id) {
  if (!API_URL || !API_URL.includes('/s/')) {
    return { success: false, error: 'API 未設定' };
  }
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify({
        action: 'deleteMemo',
        id: id 
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Delete memo error:', err);
    return { success: false, error: err.message };
  }
}

// 檔案上傳至 Google Drive (透過 GAS)
export async function uploadFileToDrive(file, folderId) {
  if (!API_URL || !API_URL.includes('/s/')) {
    return { success: false, error: 'API 未設定' };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1]; // 移除 data:MIME_TYPE;base64, 前綴
        
        const res = await fetch(API_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'uploadFile',
            filename: file.name,
            mimeType: file.type,
            base64Data: base64Data,
            folderId: folderId
          }),
        });
        
        const data = await res.json();
        resolve(data);
      } catch (err) {
        console.error('Upload error:', err);
        resolve({ success: false, error: err.message });
      }
    };
    
    reader.onerror = (error) => {
      resolve({ success: false, error: '讀取檔案失敗' });
    };
    
    reader.readAsDataURL(file);
  });
}

// 取得多筆書籤
export async function fetchBookmarks() {
  if (!API_URL || !API_URL.includes('/s/')) {
    return [];
  }
  
  try {
    const res = await fetch(`${API_URL}?action=getBookmarks`, { 
      cache: 'no-store',
      redirect: 'follow'
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Fetch bookmarks error:', err);
    return [];
  }
}

// 新增單筆書籤
export async function addBookmark(url, title = "") {
  if (!API_URL || !API_URL.includes('/s/')) {
    return { success: false, error: '請先設定 NEXT_PUBLIC_MEMO_API_URL' };
  }
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify({
        action: 'addBookmark',
        url: url,
        title: title
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Add bookmark error:', err);
    return { success: false, error: err.message };
  }
}

// 刪除單筆書籤
export async function deleteBookmark(id) {
  if (!API_URL || !API_URL.includes('/s/')) {
    return { success: false, error: 'API 未設定' };
  }
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify({
        action: 'deleteBookmark',
        id: id 
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Delete bookmark error:', err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 待辦事項 (To-Do) API
// ==========================================

export async function fetchTodos() {
  if (!API_URL || !API_URL.includes('/s/')) return [];
  try {
    const res = await fetch(`${API_URL}?action=getTodos`, { cache: 'no-store', redirect: 'follow' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) { return []; }
}

export async function addTodo(text) {
  if (!API_URL || !API_URL.includes('/s/')) return { success: false, error: 'API 未設定' };
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'addTodo', text: text }),
    });
    return await res.json();
  } catch (err) { return { success: false, error: err.message }; }
}

export async function toggleTodo(id, isDone) {
  if (!API_URL || !API_URL.includes('/s/')) return { success: false, error: 'API 未設定' };
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'toggleTodo', id: id, isDone: isDone }),
    });
    return await res.json();
  } catch (err) { return { success: false, error: err.message }; }
}

export async function deleteTodo(id) {
  if (!API_URL || !API_URL.includes('/s/')) return { success: false, error: 'API 未設定' };
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deleteTodo', id: id }),
    });
    return await res.json();
  } catch (err) { return { success: false, error: err.message }; }
}

// ==========================================
// 輪播相簿 (Photos) API
// ==========================================

export async function fetchPhotos() {
  if (!API_URL || !API_URL.includes('/s/')) return [];
  try {
    const res = await fetch(`${API_URL}?action=getPhotos`, { cache: 'no-store', redirect: 'follow' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) { return []; }
}

export async function uploadCarouselPhotoToDrive(file, folderId) {
  if (!API_URL || !API_URL.includes('/s/')) return { success: false, error: 'API 未設定' };
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        const res = await fetch(API_URL, {
          method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'uploadPhoto',
            filename: file.name,
            mimeType: file.type,
            base64Data: base64Data,
            folderId: folderId
          }),
        });
        const data = await res.json();
        resolve(data);
      } catch (err) { resolve({ success: false, error: err.message }); }
    };
    reader.onerror = () => resolve({ success: false, error: '讀取失敗' });
    reader.readAsDataURL(file);
  });
}

export async function deletePhoto(id, fileId) {
  if (!API_URL || !API_URL.includes('/s/')) return { success: false, error: 'API 未設定' };
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deletePhoto', id: id, fileId: fileId }),
    });
    return await res.json();
  } catch (err) { return { success: false, error: err.message }; }
}
