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
  Trash2,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { fetchMemos, addMemo, deleteMemo } from '@/lib/api';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// 將帶有網址的文字轉成 JSX a tag (Apple 風格藥丸標籤)
const renderMemoContent = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer" style={{
          color: 'var(--accent-color)', 
          textDecoration: 'none',
          backgroundColor: 'rgba(0, 113, 227, 0.1)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 600,
          display: 'inline-block',
          margin: '2px 4px',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(0, 113, 227, 0.2)'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(0, 113, 227, 0.1)'}
        >
          {part} ↗
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export default function Dashboard() {
  const [time, setTime] = useState('');
  
  // Tabs: 'dashboard', 'calendar', 'memo', 'vault', 'drive'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 備忘錄狀態
  const [memos, setMemos] = useState([]);
  const [newMemoText, setNewMemoText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Google Drive 寫死的嵌入 URL (待使用者提供替換)
  const driveEmbedUrl = 'https://drive.google.com/embeddedfolderview?id=請換成您的資料夾ID#grid';

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
      }
      setLoading(false);
    };
    loadMemos();
  }, []);

  const handleSaveMemo = async () => {
    if (!newMemoText.trim()) return;
    setSaving(true);
    setStatusMsg('儲存中...');
    const contentToSave = newMemoText.trim();
    const res = await addMemo(contentToSave);
    
    if (res && res.success && res.item) {
      setMemos([res.item, ...memos]);
      setNewMemoText('');
      setStatusMsg('✓ 新增成功');
    } else {
      setStatusMsg('❌ 儲存失敗');
    }
    setSaving(false);
    setTimeout(() => setStatusMsg(''), 3000);
  };

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

  // 子元件：日曆模組
  const CalendarModule = ({ style }) => (
    <div className="module-card" style={style}>
      <div className="module-header">
        <CalendarIcon size={18} color="var(--accent-color)" />
        Google 日曆
      </div>
      <div className="module-body" style={{ padding: 0 }}>
        <iframe 
          src="https://calendar.google.com/calendar/embed?src=mic1491%40gmail.com&height=600&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FTaipei&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&color=%230B8043" 
          className="iframe-wrapper"
          title="Google Calendar"
        />
      </div>
    </div>
  );

  // 子元件：當月重要任務模組 (To-Do List)
  const TodoListModule = ({ style }) => (
    <div className="module-card" style={style}>
      <div className="module-header">
        <CheckCircle2 size={18} color="var(--accent-color)" />
        當月重要任務清單
      </div>
      <div className="module-body" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { id: 1, text: '繳納本期燃料費及牌照稅', date: '04/10' },
            { id: 2, text: '結算上月工作室信用卡帳單', date: '04/15' },
            { id: 3, text: '回覆系統開發專案客戶信件', date: '04/18' },
            { id: 4, text: '進行每週專案同步例會', date: '04/22' }
          ].map((item) => (
            <div key={item.id} style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem', background: 'rgba(255,255,255,0.7)',
              borderRadius: '8px', border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.text}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                {item.date}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', textAlign: 'center' }}>
          <button style={{
            background: 'transparent', border: '1px dashed var(--accent-color)', color: 'var(--accent-color)',
            padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', width: '100%'
          }}>+ 新增任務項目</button>
        </div>
      </div>
    </div>
  );

  // 子元件：備忘錄模組
  const MemoModule = ({ style }) => (
    <div className="module-card" style={style}>
      <div className="module-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StickyNote size={18} color="var(--accent-color)" />
          備忘清單紀錄
        </div>
        {statusMsg && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{statusMsg}</span>}
      </div>
      
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.7)' }}>
        <textarea 
          className="memo-textarea" 
          placeholder="輸入新的待辦事項或包含網址的筆記，含有 http 的連結將會自動轉換..."
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.4)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" style={{ marginRight: '8px' }} /> 讀取中...
          </div>
        ) : memos.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
            目前沒有任何備忘紀錄，來新增第一筆吧！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {memos.map(memo => (
              <div key={memo.id} style={{ 
                background: 'rgba(255,255,255,0.9)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🗓 {memo.createdAt}</span>
                  <button 
                    onClick={() => handleDeleteMemo(memo.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '4px', cursor: 'pointer' }}
                    title="刪除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: '1.5', wordBreak: 'break-all' }}>
                  {renderMemoContent(memo.content)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 子元件：密碼本模組
  const VaultModule = ({ style }) => (
    <div className="module-card" style={style}>
      <div className="module-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ShieldCheck size={18} color="var(--accent-color)" />
          My Vault 密碼庫
        </div>
        <a href="https://mic1491.github.io/my-vault/" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>另開視窗 ↗</a>
      </div>
      <div className="module-body" style={{ padding: 0, overflow: 'hidden' }}>
        <iframe src="https://mic1491.github.io/my-vault/" className="iframe-wrapper" title="Password Vault" />
      </div>
    </div>
  );

  // 子元件：Google Drive 模組
  const DriveModule = ({ style }) => (
    <div className="module-card" style={style}>
      <div className="module-header">
        <Cloud size={18} color="var(--accent-color)" />
        個人雲端硬碟區
      </div>
      <div className="module-body" style={{ padding: 0, overflow: 'hidden' }}>
        <iframe src={driveEmbedUrl} className="iframe-wrapper" title="Google Drive" />
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      
      {/* Sidebar */}
      <aside className="sidebar" style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)' }}>
        <div className="sidebar-brand">
          <LayoutDashboard size={24} />
          Matt&apos;s Tools
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} />
            首頁總覽
          </button>
          <button className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
            <CalendarIcon size={20} />
            我的日曆
          </button>
          <button className={`nav-item ${activeTab === 'memo' ? 'active' : ''}`} onClick={() => setActiveTab('memo')}>
            <StickyNote size={20} />
            雲端備忘錄
          </button>
          <button className={`nav-item ${activeTab === 'vault' ? 'active' : ''}`} onClick={() => setActiveTab('vault')}>
            <ShieldCheck size={20} />
            密碼管理 Vault
          </button>
          <button className={`nav-item ${activeTab === 'drive' ? 'active' : ''}`} onClick={() => setActiveTab('drive')}>
            <Cloud size={20} />
            Google 雲端碟
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <button className="nav-item" style={{justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.03)'}}>
            <Settings size={18} /> 設定
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-wrapper" style={{ zIndex: 1 }}>
        <header className="header">
          <div className="header-title">個人儀表板</div>
          <div className="header-widgets">
            <Clock size={16} /> {time}
          </div>
        </header>

        <section className="content-area">
          <div className="animate-fade" style={{ height: '100%' }}>
            
            {/* 首頁總覽 */}
            {activeTab === 'dashboard' && (
              <div className="dashboard-grid">
                
                {/* 第一欄：日曆與待辦 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
                  <TodoListModule style={{ flexShrink: 0 }} />
                  <CalendarModule style={{ flex: 1, minHeight: '350px' }} />
                </div>
                
                {/* 第二欄：雲端硬碟與備忘錄 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
                  <DriveModule style={{ height: '350px', flexShrink: 0 }} />
                  <MemoModule style={{ flex: 1, minHeight: '350px', display: 'flex', flexDirection: 'column' }} />
                </div>
                
                {/* 第三欄：密碼庫 */}
                <VaultModule style={{ height: '100%' }} />
              </div>
            )}

            {/* 單一 Focus 分頁 */}
            {activeTab === 'calendar' && <CalendarModule style={{ height: '100%' }} />}
            {activeTab === 'memo' && <MemoModule style={{ height: '100%' }} />}
            {activeTab === 'vault' && <VaultModule style={{ height: '100%' }} />}
            {activeTab === 'drive' && <DriveModule style={{ height: '100%' }} />}

          </div>
        </section>
      </main>
    </div>
  );
}
