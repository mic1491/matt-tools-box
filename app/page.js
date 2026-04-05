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
  Loader2
} from 'lucide-react';
import { fetchMemo, saveMemo } from '@/lib/api';

export default function Dashboard() {
  const [time, setTime] = useState('');
  const [memoText, setMemoText] = useState('');
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

  // 載入備忘錄
  useEffect(() => {
    const loadMemo = async () => {
      setLoading(true);
      const res = await fetchMemo();
      if (res && res.content !== undefined) {
        setMemoText(res.content);
        setStatusMsg('已載入最高版本');
      } else if (res && res.error) {
        setStatusMsg('連線錯誤或未設定 API');
      }
      setLoading(false);
      setTimeout(() => setStatusMsg(''), 3000);
    };
    loadMemo();
  }, []);

  const handleSaveMemo = async () => {
    setSaving(true);
    setStatusMsg('儲存中...');
    const res = await saveMemo(memoText);
    if (res && res.success) {
      setStatusMsg('✓ 儲存成功');
    } else {
      setStatusMsg('❌ 儲存失敗');
    }
    setSaving(false);
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
          <div className="header-title">儀表板</div>
          <div className="header-widgets">
            <Clock size={16} /> {time}
          </div>
        </header>

        <section className="content-area">
          <div className="dashboard-grid animate-fade">
            
            {/* 左側欄位：備忘錄 + 日曆 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* 備忘錄模組 */}
              <div className="module-card" style={{ flex: 1 }}>
                <div className="module-header">
                  <StickyNote size={18} className="text-accent-color" color="var(--accent-color)" />
                  同步備忘錄
                </div>
                <div className="module-body">
                  {loading ? (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-secondary)' }}>
                      <Loader2 className="animate-spin" style={{marginRight: '8px'}} /> 載入中...
                    </div>
                  ) : (
                    <>
                      <textarea 
                        className="memo-textarea" 
                        placeholder="在這裡輸入您的隨機筆記或代辦事項，會自動同步到雲端試算表..."
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                      />
                      <button className="save-btn" onClick={handleSaveMemo} disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                        {saving ? '處理中' : '儲存'}
                      </button>
                      {statusMsg && <div className="status-text">{statusMsg}</div>}
                    </>
                  )}
                </div>
              </div>

              {/* 日曆模組 */}
              <div className="module-card" style={{ height: '350px' }}>
                <div className="module-header">
                  <CalendarIcon size={18} color="var(--accent-color)" />
                  Google 日曆
                </div>
                <div className="module-body" style={{ padding: 0 }}>
                  <iframe 
                    src="https://calendar.google.com/calendar/embed?height=300&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FTaipei&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&src=ZW4udGFpd2FuI2hvbGlkYXlAZ3JvdXAudi5jYWxlbmRhci5nb29nbGUuY29t&color=%230B8043" 
                    className="iframe-wrapper"
                    title="Google Calendar"
                  />
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
