// ============================================================
// Matt's 助理 - 小蝦 🦐  LINE Bot  (Google Apps Script)
// 部署說明：貼入新的 GAS 專案 → 部署為 Web App → 設為「任何人」可存取
// 首次設定：手動執行 setupTriggers() 一次
// ============================================================

const CFG = {
  LINE_CHANNEL_SECRET : '9cb2cb6f5407e7a4c64338dd528614c9',
  LINE_ACCESS_TOKEN   : 'x/AH16aEGLLZbWLkz0CFpTWrwU3RwxTFB1w7Go3dHrQb/uURPbpXhe1lBTO7DvWlcIEKl27cRIZbJPCpOBvNxvXbrlNMusr3ZNdkKWezDVpCqeT4dePfxuJ2s4Kp/0/knZgWJhdZIlbJFWvB7QojigdB04t89/1O/w1cDnyilFU=',
  BOT_NAME            : "Matt's 助理-小蝦",
  CITY_NAME           : '新竹竹北',
  WEATHER_LAT         : 24.8398,
  WEATHER_LON         : 121.0047,
  GEMINI_API_KEY      : '',   // 🔑 選填：填入後回覆更自然有溫度
  CALENDAR_ID         : 'primary',
  MORNING_HOUR        : 8,
  REMINDER_MINUTES    : 30,
};

// ============================================================
// 🔌  LINE Webhook 入口
// ============================================================

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const events = data.events || [];
    events.forEach(ev => {
      if (ev.type === 'follow') {
        saveUserId(ev.source.userId);
        replyText(ev.replyToken, welcomeMsg());
      } else if (ev.type === 'message' && ev.message.type === 'text') {
        saveUserId(ev.source.userId);
        handleMessage(ev.replyToken, ev.message.text.trim());
      }
    });
  } catch (err) {
    console.error('doPost error:', err);
  }
  return ContentService.createTextOutput('OK');
}

function welcomeMsg() {
  return `嗨嗨！我是小蝦 🦐 Matt 的貼身助理上線囉！\n\n我可以：\n📅 查行程（今日 / 本週 / 本月）\n➕ 新增：明天下午3點 開會\n🗑 刪除：開會\n🌤 天氣\n📰 新聞\n\n有事盡管找我，我很熱情的！😆`;
}

// ============================================================
// 💬  訊息路由
// ============================================================

function handleMessage(replyToken, t) {
  if (/今[天日]|今日/.test(t))                         return replyText(replyToken, getTodayEvents());
  if (/本週|這週|這禮拜|這星期/.test(t))                return replyText(replyToken, getWeekEvents());
  if (/本月|這個月/.test(t))                            return replyText(replyToken, getMonthEvents());
  if (/最近|接下來|即將|近期/.test(t))                   return replyText(replyToken, getUpcomingEvents(7));

  const addM  = t.match(/^新增[：:]\s*(.+)/);
  if (addM)                                             return replyText(replyToken, addCalendarEvent(addM[1]));

  const delM  = t.match(/^(?:刪除|移除)[：:]\s*(.+)/);
  if (delM)                                             return replyText(replyToken, deleteCalendarEvent(delM[1]));

  if (/天氣|氣象|溫度|下雨|晴|幾度/.test(t))            return replyText(replyToken, getWeather());
  if (/新聞|頭條|快訊|時事/.test(t))                    return replyText(replyToken, getNews());
  if (/功能|幫助|help|說明|怎麼用/.test(t))             return replyText(replyToken, getHelp());

  // Fallback
  const reply = CFG.GEMINI_API_KEY ? askGemini(t) : defaultReply(t);
  replyText(replyToken, reply);
}

// ============================================================
// 📅  行事曆功能
// ============================================================

function getTodayEvents() {
  const s = dayStart(new Date()), e = dayEnd(new Date());
  return buildEventList(s, e, '今天');
}

function getWeekEvents() {
  const now = new Date(), d = now.getDay();
  const mon = dayStart(new Date(now)); mon.setDate(now.getDate() - (d === 0 ? 6 : d - 1));
  const sun = dayEnd(new Date(mon));   sun.setDate(mon.getDate() + 6);
  return buildEventList(mon, sun, '本週');
}

function getMonthEvents() {
  const now = new Date();
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return buildEventList(s, e, `${now.getMonth() + 1}月`);
}

function getUpcomingEvents(days) {
  const s = new Date(), e = new Date(); e.setDate(e.getDate() + days);
  return buildEventList(s, e, `未來 ${days} 天`);
}

function buildEventList(start, end, label) {
  try {
    const cal    = CalendarApp.getCalendarById(CFG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
    const events = cal.getEvents(start, end);
    if (!events.length) return `${label}沒有行程 ✨\n趁機好好休息吧 😊`;

    const lines = [`📅 ${label}行程（共 ${events.length} 筆）：\n`];
    events.forEach((ev, i) => {
      const s      = ev.getStartTime();
      const time   = ev.isAllDayEvent() ? '全天' : `${pad(s.getHours())}:${pad(s.getMinutes())}`;
      const date   = `${s.getMonth()+1}/${s.getDate()}`;
      lines.push(`${i+1}. ${date} ${time} ${ev.getTitle()}`);
    });
    return lines.join('\n');
  } catch (err) { return '讀取行程失敗：' + err.message; }
}

function addCalendarEvent(text) {
  try {
    const p = parseEventText(text);
    if (!p) return `格式變化嗎？試試：\n新增：明天下午3點 跑步`;

    const cal    = CalendarApp.getCalendarById(CFG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
    const endDt  = new Date(p.start.getTime() + 3600000);
    cal.createEvent(p.title, p.start, endDt);

    const ds = `${p.start.getMonth()+1}/${p.start.getDate()} ${pad(p.start.getHours())}:${pad(p.start.getMinutes())}`;
    return `✅ 搞定！\n「${p.title}」已加入行事曆\n📅 ${ds}\n\n你真的很充實唷 Matt！💪`;
  } catch (err) { return '新增失敗：' + err.message; }
}

function parseEventText(text) {
  const now = new Date(); let dt = new Date(now);
  if (/明天|明日/.test(text))       dt.setDate(now.getDate() + 1);
  else if (/後天/.test(text))       dt.setDate(now.getDate() + 2);
  else {
    const m = text.match(/(\d{1,2})[\/月](\d{1,2})[日號]?/);
    if (m) { dt.setMonth(parseInt(m[1])-1); dt.setDate(parseInt(m[2])); }
  }

  let hour = 9, min = 0;
  const pm = text.match(/下午\s*(\d{1,2})(?:[點:：](\d{0,2}))?/);
  const am = text.match(/上午\s*(\d{1,2})(?:[點:：](\d{0,2}))?/);
  const hm = text.match(/(\d{1,2})[：:](\d{2})/);
  if (pm)      { hour = parseInt(pm[1]); if (hour < 12) hour += 12; min = parseInt(pm[2] || 0); }
  else if (am) { hour = parseInt(am[1]); min = parseInt(am[2] || 0); }
  else if (hm) { hour = parseInt(hm[1]); min = parseInt(hm[2]); }
  dt.setHours(hour, min, 0, 0);

  const title = text
    .replace(/(?:明天|明日|後天|今天|今日)/, '')
    .replace(/(?:下午|上午)\s*\d{1,2}(?:[點:：]\d{0,2})?/, '')
    .replace(/\d{1,2}[\/月]\d{1,2}[日號]?/, '')
    .replace(/\d{1,2}[：:]\d{2}/, '')
    .trim() || '新行程';

  return { start: dt, title };
}

function deleteCalendarEvent(keyword) {
  try {
    const start = new Date(), end = new Date(); end.setDate(end.getDate() + 60);
    const cal    = CalendarApp.getCalendarById(CFG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
    const found  = cal.getEvents(start, end).filter(ev => ev.getTitle().includes(keyword));

    if (!found.length) return `找不到含「${keyword}」的行程 🤔`;

    const title = found[0].getTitle();
    found[0].deleteEvent();
    return `🗑 已刪除：「${title}」\n希望不是誤刪啦 😂`;
  } catch (err) { return '刪除失敗：' + err.message; }
}

// ============================================================
// 🌤  天氣（Open-Meteo，完全免費，無需 API Key）
// ============================================================

const WMO = {
  0:'☀️ 晴天',1:'🌤 大致晴朗',2:'⛅ 多雲',3:'☁️ 陰天',
  45:'🌫 有霧',48:'🌫 凍霧',51:'🌦 輕毛毛雨',53:'🌦 毛毛雨',55:'🌧 大毛毛雨',
  61:'🌧 小雨',63:'🌧 中雨',65:'🌧 大雨',71:'❄️ 小雪',73:'❄️ 中雪',75:'❄️ 大雪',
  80:'🌦 陣雨',81:'⛈ 大陣雨',82:'⛈ 暴雨',95:'⛈ 雷雨',96:'⛈ 雷雨冰雹',99:'⛈ 強雷雨'
};

function getWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CFG.WEATHER_LAT}&longitude=${CFG.WEATHER_LON}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&current_weather=true&timezone=Asia%2FTaipei&forecast_days=3`;

    const data = JSON.parse(UrlFetchApp.fetch(url, {muteHttpExceptions:true}).getContentText());
    const cur  = data.current_weather, d = data.daily;
    const days = ['今天','明天','後天'];

    let msg = `🌡 ${CFG.CITY_NAME} 天氣（現在 ${Math.round(cur.temperature)}°C）\n\n`;
    for (let i = 0; i < 3; i++) {
      msg += `${days[i]}：${WMO[d.weathercode[i]] || '未知'}\n`;
      msg += `  🌡 ${Math.round(d.temperature_2m_min[i])}～${Math.round(d.temperature_2m_max[i])}°C  `;
      msg += `☔ 降雨 ${d.precipitation_probability_max[i]}%\n\n`;
    }
    if (cur.temperature < 16)      msg += '有點涼唷，記得帶件外套！🧥';
    else if (cur.temperature > 30) msg += '好熱！多喝水注意防曬☀️';
    else                           msg += '天氣還不錯，出門記得備傘 😊';
    return msg;
  } catch (err) { return '天氣資料抓取失敗：' + err.message; }
}

// ============================================================
// 📰  新聞（Google News 台灣 RSS，免費免金鑰）
// ============================================================

function getNews() {
  try {
    const sources = [
      'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
      'https://tw.news.yahoo.com/rss/',
    ];

    for (const url of sources) {
      try {
        const xml  = UrlFetchApp.fetch(url, {muteHttpExceptions:true, followRedirects:true}).getContentText();
        const root = XmlService.parse(xml).getRootElement();
        const ns   = root.getName() === 'feed' ? root.getNamespace() : null;
        let items  = [];

        if (ns) {
          // Atom format (Google News)
          items = root.getChildren('entry', ns).slice(0, 5).map(en => ({
            title : en.getChildText('title', ns),
            link  : (en.getChild('link', ns) || {}).getAttribute ? en.getChild('link', ns).getAttributeValue('href') : ''
          }));
        } else {
          // RSS format
          const ch = root.getChild('channel');
          items = (ch || root).getChildren('item').slice(0, 5).map(it => ({
            title : it.getChildText('title'),
            link  : it.getChildText('link') || it.getChildText('guid')
          }));
        }

        if (items.length) {
          let msg = '📰 今日 5 則新聞：\n\n';
          items.forEach((item, i) => { msg += `${i+1}. ${item.title}\n\n`; });
          return msg.trim();
        }
      } catch(e) { continue; }
    }
    return '新聞抓取失敗，請稍後再試 😢';
  } catch (err) { return '新聞讀取失敗：' + err.message; }
}

// ============================================================
// 🤖  Gemini AI 對話（若有填 API Key）
// ============================================================

function askGemini(text) {
  try {
    const prompt = `你是「小蝦」，Matt 的私人助理，個性熱情開朗、幽默風趣，用繁體中文說話，語氣像好朋友，回覆不超過80字。\nMatt說：${text}`;
    const res    = UrlFetchApp.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CFG.GEMINI_API_KEY}`,
      { method:'post', contentType:'application/json', muteHttpExceptions:true,
        payload: JSON.stringify({contents:[{parts:[{text:prompt}]}]}) }
    );
    return JSON.parse(res.getContentText())?.candidates?.[0]?.content?.parts?.[0]?.text || defaultReply(text);
  } catch(e) { return defaultReply(text); }
}

function defaultReply(text) {
  if (/你好|嗨|嘿|哈囉/.test(text)) {
    const rs = ['嗨嗨 Matt！有什麼我可以幫你的？😊','我在我在！說吧 🦐','嗨！今天氣色不錯耶 💪'];
    return rs[Math.floor(Math.random() * rs.length)];
  }
  return '嗯嗯聽到了！但小蝦不太懂你的意思 🦐\n說「功能」看看我能做什麼吧！';
}

function getHelp() {
  return `🦐 小蝦功能清單\n\n📅 行事曆\n今日行程 / 本週行程 / 本月行程 / 最近行程\n新增：明天下午3點 開會\n刪除：開會\n\n🌤 天氣（直接說「天氣」）\n\n📰 新聞（直接說「新聞」）\n\n⏰ 每日早上8點自動推早報！`;
}

// ============================================================
// ⏰  主動推播 Triggers
// ============================================================

function dailyMorningReport() {
  const userId = PropertiesService.getScriptProperties().getProperty('USER_LINE_ID');
  if (!userId) return;
  const msg = `☀️ 早安 Matt！小蝦來報到 🦐\n\n${getWeather()}\n\n${getTodayEvents()}\n\n今天也要加油喔！💪`;
  pushMessage(userId, msg);
}

function weeklyReport() {
  const userId = PropertiesService.getScriptProperties().getProperty('USER_LINE_ID');
  if (!userId) return;
  pushMessage(userId, `📅 週一早安！新的一週開始囉！\n\n${getWeekEvents()}\n\n本週加油！小蝦幫你打氣 🎉`);
}

function eventReminder() {
  const userId = PropertiesService.getScriptProperties().getProperty('USER_LINE_ID');
  if (!userId) return;
  const now = new Date(), soon = new Date(now.getTime() + CFG.REMINDER_MINUTES * 60000);
  const cal = CalendarApp.getCalendarById(CFG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
  cal.getEvents(now, soon).forEach(ev => {
    const left = Math.round((ev.getStartTime() - now) / 60000);
    if (left > 0) pushMessage(userId, `⏰ 提醒！「${ev.getTitle()}」還有 ${left} 分鐘開始！\n快準備一下 🦐💨`);
  });
}

// 手動執行一次以設定所有 Triggers
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyMorningReport').timeBased().everyDays(1).atHour(CFG.MORNING_HOUR).create();
  ScriptApp.newTrigger('weeklyReport').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(CFG.MORNING_HOUR).create();
  ScriptApp.newTrigger('eventReminder').timeBased().everyMinutes(15).create();
  console.log('✅ Triggers 設定完成！');
}

// ============================================================
// 🛠  工具函式
// ============================================================

function replyText(replyToken, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: `Bearer ${CFG.LINE_ACCESS_TOKEN}` },
    payload: JSON.stringify({ replyToken, messages: [{ type:'text', text: String(text).substring(0,5000) }] })
  });
}

function pushMessage(userId, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: `Bearer ${CFG.LINE_ACCESS_TOKEN}` },
    payload: JSON.stringify({ to: userId, messages: [{ type:'text', text: String(text).substring(0,5000) }] })
  });
}

function saveUserId(userId) {
  if (userId) PropertiesService.getScriptProperties().setProperty('USER_LINE_ID', userId);
}

function pad(n) { return String(n).padStart(2, '0'); }
function dayStart(d) { d.setHours(0,0,0,0); return d; }
function dayEnd(d)   { d.setHours(23,59,59,999); return d; }
