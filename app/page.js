'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  StickyNote, 
  ShieldCheck, 
  Settings,
  Clock,
  Save,
  Loader2,
  Trash2
} from 'lucide-react';
import { fetchMemos, addMemo, deleteMemo } from '@/lib/api';

export default function Dashboard() {
  const [time, setTime] = useState('');
  
  // 備忘錄狀態
  const [memos, setMemos] = useState([]);
  const [newMemoText, setNewMemoText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // 取得現在時間
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleString('zh-TW', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 載入多筆備忘錄
  useEffect(() => {
    const loadMemos = async () => {
      setLoading(true);
      const res = await fetchMemos();
      if (Array.isArray(res)) {
        setMemos(res);
        if (res.length > 0) {
          setStatusMsg('已載入歷年清單');
        }
      } else {
        setStatusMsg('連線錯誤或尚未設定 API');
      }
      setLoading(false);
      setTimeout(() => setStatusMsg(''), 3000);
    };
    loadMemos();
  }, []);

  // 新增備忘錄
  const handleSaveMemo = async () => {
    if (!newMemoText.trim()) return;
    
    setSaving(true);
    setStatusMsg('儲存中...');
    const contentToSave = newMemoText.trim();
    const res = await addMemo(contentToSave);
    
    if (res && res.success && res.item) {
      // 將新紀錄加到陣列最前面
      setMemos([res.item, ...memos]);
      setNewMemoText(''); // 清空輸入框
      setStatusMsg('✓ 新增成功');
    } else {
      setStatusMsg('❌ 儲存失敗');
    }
    setSaving(false);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  // 刪除備忘錄
  const handleDeleteMemo = async (id) => {
    if (!confirm('確定要刪除這筆備忘錄嗎？')) return;
    
    setStatusMsg('刪除中...');
    const res = await deleteMemo(id);
    if (res && res.success) {
      setMemos(memos.filter(m => m.id !== id));
      setStatusMsg('✓ 已刪除');
    } else {
      setStatusMsg('❌ 刪除失敗');
    }
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <LayoutDashboard size={24} />
          Matt&apos;s Tools
        </div>
        
        <nav className="sidebar-nav">
          <button className="nav-item active">
            <LayoutDashboard size={20} />
            首頁總覽
          </button>
          <button className="nav-item">
            <CalendarIcon size={20} />
            我的日曆
          </button>
          <button className="nav-item">
            <StickyNote size={20} />
            雲端備忘錄
          </button>
          <button className="nav-item">
            <ShieldCheck size={20} />
            密碼管理 Vault
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <button className="nav-item" style={{justifyContent: 'center', backgroundColor: '#f1f5f9'}}>
            <Settings size={18} /> 設定
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-wrapper">
        <header className="header">
          <div className="header-title">個人儀表板</div>
          <div className="header-widgets">
            <Clock size={16} /> {time}
          </div>
        </header>

        <section className="content-area">
          <div className="dashboard-grid animate-fade">
            
            {/* 左側欄位：備忘錄 + 日曆 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
              
              {/* 日曆模組 */}
              <div className="module-card" style={{ height: '350px', flexShrink: 0 }}>
                <div className="module-header">
                  <CalendarIcon size={18} color="var(--accent-color)" />
                  Google 日曆
                </div>
                <div className="module-body" style={{ padding: 0 }}>
                  <iframe 
                    src="https://calendar.google.com/calendar/embed?src=mic1491%40gmail.com&height=300&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FTaipei&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&color=%230B8043" 
                    className="iframe-wrapper"
                    title="Google Calendar"
                  />
                </div>
              </div>

              {/* 多筆備忘清單模組 */}
              <div className="module-card" style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                <div className="module-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <StickyNote size={18} color="var(--accent-color)" />
                    備忘清單紀錄
                  </div>
                  {statusMsg && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{statusMsg}</span>}
                </div>
                
                {/* 備忘錄輸入區 */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc' }}>
                  <textarea 
                    className="memo-textarea" 
                    placeholder="輸入新的待辦事項或筆記，點擊儲存加入清單..."
                    value={newMemoText}
                    onChange={(e) => setNewMemoText(e.target.value)}
                    style={{ height: '80px', marginBottom: '0.75rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="save-btn" onClick={handleSaveMemo} disabled={saving || !newMemoText.trim()} style={{ margin: 0 }}>
                      {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                      {saving ? '儲存中...' : '加入清單'}
                    </button>
                  </div>
                </div>

                {/* 歷史紀錄列表區 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: '#ffffff' }}>
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                      <Loader2 className="animate-spin" style={{ marginRight: '8px' }} /> 讀取清單中...
                    </div>
                  ) : memos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                      目前沒有任何備忘紀錄，來新增第一筆吧！
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {memos.map(memo => (
                        <div key={memo.id} style={{ 
                          background: '#f8fafc', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px', 
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🗓 {memo.createdAt}</span>
                            <button 
                              onClick={() => handleDeleteMemo(memo.id)}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--text-secondary)', 
                                padding: '4px',
                                width: 'auto',
                                cursor: 'pointer' 
                              }}
                              title="刪除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {memo.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 右側欄位：密碼本 iframe */}
            <div className="module-card">
              <div className="module-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <ShieldCheck size={18} color="var(--accent-color)" />
                  My Vault 密碼庫
                </div>
                <a href="https://mic1491.github.io/my-vault/" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  另開視窗 ↗
                </a>
              </div>
              <div className="module-body" style={{ padding: 0, overflow: 'hidden' }}>
                <iframe 
                  src="https://mic1491.github.io/my-vault/" 
                  className="iframe-wrapper"
                  title="Password Vault"
                />
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
