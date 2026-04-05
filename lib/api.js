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
