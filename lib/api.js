const API_URL = process.env.NEXT_PUBLIC_MEMO_API_URL || '';

export async function fetchMemo() {
  if (!API_URL || !API_URL.includes('/s/')) {
    return { error: '請先設定 NEXT_PUBLIC_MEMO_API_URL' };
  }
  
  try {
    const res = await fetch(`${API_URL}?action=getMemo`, { 
      cache: 'no-store',
      redirect: 'follow'
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Fetch memo error:', err);
    return { error: err.message };
  }
}

export async function saveMemo(content) {
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
        action: 'saveMemo',
        content: content 
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Save memo error:', err);
    return { success: false, error: err.message };
  }
}
