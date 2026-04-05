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
  CheckCircle2,
  Upload,
  ExternalLink,
  Bookmark,
  Image as ImageIcon,
  Play,
  Pause,
  Plus
} from 'lucide-react';
import { fetchMemos, addMemo, deleteMemo, uploadFileToDrive, fetchBookmarks, addBookmark, deleteBookmark } from '@/lib/api';

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

// 子元件：日曆模組 (移至外層防止 re-render 閃爍)
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

// 子元件：當月重要任務模組 (移至外層防止 re-render 閃爍)
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

// 子元件：密碼本模組 (移至外層防止 re-render 閃爍)
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

// 子元件：Google Drive 模組 (移至外層防止 re-render 閃爍，加入上傳功能)
const DriveModule = ({ style, driveEmbedUrl }) => {
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  const FOLDER_ID = '1F2HBCbPynAFYlqvn20L1q8cOdxWH0xxP';
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      if (confirm(`這份檔案超過 20MB (${(file.size / 1024 / 1024).toFixed(1)}MB)，透過腳本上傳可能會中斷。\n是否要為您開啟 Google 雲端硬碟原廠網頁來傳輸？`)) {
        window.open(`https://drive.google.com/drive/folders/${FOLDER_ID}`, '_blank');
      }
      e.target.value = ''; // reset
      return;
    }

    setUploading(true);
    setStatusMsg(`上傳中: ${file.name}...`);
    
    const res = await uploadFileToDrive(file, FOLDER_ID);
    
    if (res && res.success) {
      setStatusMsg('✓ 上傳成功！因快取可能需幾分鐘才會在下方顯示');
    } else {
      setStatusMsg('❌ 上傳失敗: ' + (res.error || '未知錯誤'));
    }
    
    setUploading(false);
    e.target.value = ''; // reset
    setTimeout(() => setStatusMsg(''), 5000);
  };

  return (
    <div className="module-card" style={style}>
      <div className="module-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Cloud size={18} color="var(--accent-color)" />
          個人雲端硬碟區
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {statusMsg && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{statusMsg}</span>}
          
          <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--accent-color)', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, opacity: uploading ? 0.7 : 1 }}>
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? '處理中' : '上傳小檔案'}
            <input type="file" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
          </label>
          
          <a href={`https://drive.google.com/drive/folders/${FOLDER_ID}`} target="_blank" rel="noreferrer" title="開啟原廠雲端硬碟" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '4px' }}>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
      <div className="module-body" style={{ padding: 0, overflow: 'hidden' }}>
        <iframe src={driveEmbedUrl} className="iframe-wrapper" title="Google Drive" />
      </div>
    </div>
  );
};

// 子元件：照片輪播模組 (移至外層)
const ImageCarouselModule = ({ style }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // 輕巧的照片輪播 (使用 Unsplash 作為範例，支援外部連結抓取不用上傳)
  const images = [
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=600'
  ];

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 3500); // 3.5秒輪播
    }
    return () => clearInterval(timer);
  }, [isPlaying, images.length]);

  return (
    <div className="module-card" style={{ ...style, position: 'relative', overflow: 'hidden', padding: 0 }}>
      {images.map((img, index) => (
        <img 
          key={img}
          src={img} 
          alt={`carousel-${index}`} 
          style={{ 
            width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0,
            opacity: currentIndex === index ? 1 : 0, transition: 'opacity 0.8s ease-in-out' 
          }} 
        />
      ))}
      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', borderRadius: '20px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
    </div>
  );
};


export default function Dashboard() {
  const [time, setTime] = useState('');
  
  // Tabs: 'dashboard', 'calendar', 'memo', 'vault', 'drive', 'bookmark'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 備忘錄狀態
  const [memos, setMemos] = useState([]);
  const [newMemoText, setNewMemoText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // 書籤狀態
  const [bookmarks, setBookmarks] = useState([]);
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [bLoading, setBLoading] = useState(false);
  const [bSaving, setBSaving] = useState(false);
  const [bStatusMsg, setBStatusMsg] = useState('');

  // Google Drive URL 修改為您的 ID
  const driveEmbedUrl = 'https://drive.google.com/embeddedfolderview?id=1F2HBCbPynAFYlqvn20L1q8cOdxWH0xxP#grid';

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

  // 載入多筆備忘錄與書籤
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setBLoading(true);
      const [mRes, bRes] = await Promise.all([fetchMemos(), fetchBookmarks()]);
      if (Array.isArray(mRes)) setMemos(mRes);
      if (Array.isArray(bRes)) setBookmarks(bRes);
      setLoading(false);
      setBLoading(false);
    };
    loadData();
  }, []);

  const handleSaveBookmark = async () => {
    if (!newBookmarkUrl.trim()) return;
    setBSaving(true);
    setBStatusMsg('抓取網頁資訊...');
    const urlToSave = newBookmarkUrl.trim();
    // 呼叫 API，由 GAS 背後負責爬取標題
    const res = await addBookmark(urlToSave, newBookmarkTitle.trim());
    
    if (res && res.success && res.item) {
      setBookmarks([res.item, ...bookmarks]);
      setNewBookmarkUrl('');
      setNewBookmarkTitle('');
      setBStatusMsg('✓ 加到書籤了！');
    } else {
      setBStatusMsg('❌ 加入失敗');
    }
    setBSaving(false);
    setTimeout(() => setBStatusMsg(''), 3000);
  };

  const handleDeleteBookmark = async (id) => {
    if (!confirm('確定要刪除這筆書籤嗎？')) return;
    setBStatusMsg('刪除中...');
    const res = await deleteBookmark(id);
    if (res && res.success) {
      setBookmarks(bookmarks.filter(b => b.id !== id));
      setBStatusMsg('✓ 已移除書籤');
    } else {
      setBStatusMsg('❌ 移除失敗');
    }
    setTimeout(() => setBStatusMsg(''), 3000);
  };

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

  // 子部份元件已移至外層以防止不必要的 re-render (閃爍)

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

  // 子元件：書籤選單模組
  const BookmarkModule = ({ style }) => (
    <div className="module-card" style={style}>
      <div className="module-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Bookmark size={18} color="var(--accent-color)" />
          常用網站書籤
        </div>
        {bStatusMsg && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{bStatusMsg}</span>}
      </div>
      
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.85)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input 
            type="text" 
            placeholder="貼上網址 URL (例：https://google.com)..."
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            value={newBookmarkUrl}
            onChange={(e) => setNewBookmarkUrl(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="(選填) 自訂標題，若留空將自動透過 Google 背景抓取"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              value={newBookmarkTitle}
              onChange={(e) => setNewBookmarkTitle(e.target.value)}
            />
            <button className="save-btn" onClick={handleSaveBookmark} disabled={bSaving || !newBookmarkUrl.trim()} style={{ margin: 0, minWidth: '100px' }}>
              {bSaving ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
              {bSaving ? '處理中' : '加入書籤'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.4)' }}>
        {bLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" style={{ marginRight: '8px' }} /> 讀取中...
          </div>
        ) : bookmarks.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
            還沒有加入書籤喔，從上面貼上 URL 試試看！
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {bookmarks.map(bm => (
              <div key={bm.id} style={{ 
                background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border-color)', borderRadius: '10px', 
                padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'transform 0.2s, box-shadow 0.2s'
              }} className="bookmark-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <a href={bm.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)', textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {bm.title || bm.url}
                  </a>
                  <button onClick={() => handleDeleteBookmark(bm.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '4px', cursor: 'pointer', flexShrink: 0 }} title="刪除">
                    <Trash2 size={14} />
                  </button>
                </div>
                <a href={bm.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textDecoration: 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {bm.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="dashboard-container" style={{
      backgroundImage: `url(${basePath}/bg.png)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* 讓寫實的背景圖上面墊一層玻璃遮罩，確保介面清晰度 */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(235, 240, 245, 0.4)', backdropFilter: 'blur(8px)', zIndex: 0 }}></div>
      
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
          <button className={`nav-item ${activeTab === 'bookmark' ? 'active' : ''}`} onClick={() => setActiveTab('bookmark')}>
            <Bookmark size={20} />
            常用網站書籤
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
                
                {/* 第一欄：輪播、日曆與待辦 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
                  <ImageCarouselModule style={{ flexShrink: 0, height: '160px' }} />
                  <TodoListModule style={{ flexShrink: 0 }} />
                  <CalendarModule style={{ flex: 1, minHeight: '320px' }} />
                </div>

                
                {/* 第二欄：雲端硬碟與備忘錄 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
                  <DriveModule driveEmbedUrl={driveEmbedUrl} style={{ height: '350px', flexShrink: 0 }} />
                  <MemoModule style={{ flex: 1, minHeight: '350px', display: 'flex', flexDirection: 'column' }} />
                </div>
                
                {/* 第三欄：密碼庫 */}
                <VaultModule style={{ height: '100%' }} />
              </div>
            )}

            {/* 單一 Focus 分頁 */}
            {activeTab === 'calendar' && <CalendarModule style={{ height: '100%' }} />}
            {activeTab === 'memo' && <MemoModule style={{ height: '100%' }} />}
            {activeTab === 'bookmark' && <BookmarkModule style={{ height: '100%' }} />}
            {activeTab === 'vault' && <VaultModule style={{ height: '100%' }} />}
            {activeTab === 'drive' && <DriveModule driveEmbedUrl={driveEmbedUrl} style={{ height: '100%' }} />}

          </div>
        </section>
      </main>
    </div>
  );
}
