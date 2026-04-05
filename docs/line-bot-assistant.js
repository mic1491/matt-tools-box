// ============================================================
// Matt's 助理 - 小蝦  LINE Bot  (Google Apps Script)
//
// 🔐 安全設定：所有金鑰存在 GAS 指令碼屬性，不寫在程式碼裡
// 設定路徑：GAS 編輯器 → 左側⚙️專案設定 → 指令碼屬性 → 新增：
//   LINE_CHANNEL_SECRET  → 你的 Channel Secret
//   LINE_ACCESS_TOKEN    → 你的 Channel Access Token
//   GEMINI_API_KEY       → 你的 Gemini API Key（選填）
//
// 部署說明：部署為 Web App → 以你的帳號執行 → 任何人可存取
// 首次設定：手動執行 setupTriggers() 一次
// ============================================================

// 從 GAS Script Properties 讀取機密（不暴露在程式碼）
const _PROPS = PropertiesService.getScriptProperties();

const CFG = {
  // 🔐 機密：從 Script Properties 讀取
  LINE_CHANNEL_SECRET : _PROPS.getProperty('LINE_CHANNEL_SECRET') || '',
  LINE_ACCESS_TOKEN   : _PROPS.getProperty('LINE_ACCESS_TOKEN')   || '',
  GEMINI_API_KEY      : _PROPS.getProperty('GEMINI_API_KEY')      || '',

  // ✏️ 可公開的設定，直接改這裡
  BOT_NAME          : "Matt's 助理-小蝦",
  OWNER_NAME        : 'Matt',       // 小蝦叫你的名字
  CITY_NAME         : '新竹竹北',
  WEATHER_LAT       : 24.8398,
  WEATHER_LON       : 121.0047,
  CALENDAR_ID       : 'primary',
  MORNING_HOUR      : 8,            // 早報推播時間
  REMINDER_MINUTES  : 30,           // 活動提前幾分鐘提醒
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
  const n = CFG.OWNER_NAME;
  return `嗨嗨！我是小蝦 🦐 ${n} 的貼身助理上線囉！\n\n` +
    `我可以：\n📅 查行程（今日 / 本週 / 本月）\n` +
    `➕ 新增：明天下午3點 開會\n🗑 刪除：開會\n` +
    `🌤 天氣\n📰 新聞\n💬 陪你聊天\n\n` +
    `${n}！有事盡管找我，我很熱情的！😆`;
}

// ============================================================
// 💬  訊息路由
// ============================================================

function handleMessage(replyToken, t) {
  if (/今[天日]|今日/.test(t))           return replyText(replyToken, getTodayEvents());
  if (/本週|這週|這禮拜|這星期/.test(t)) return replyText(replyToken, getWeekEvents());
  if (/本月|這個月/.test(t))             return replyText(replyToken, getMonthEvents());
  if (/最近|接下來|即將|近期/.test(t))   return replyText(replyToken, getUpcomingEvents(7));

  const addM = t.match(/^新增[：:]\s*(.+)/);
  if (addM) return replyText(replyToken, addCalendarEvent(addM[1]));

  const delM = t.match(/^(?:刪除|移除)[：:]\s*(.+)/);
  if (delM) return replyText(replyToken, deleteCalendarEvent(delM[1]));

  if (/天氣|氣象|溫度|下雨|晴|幾度/.test(t)) return replyText(replyToken, getWeather());
  if (/新聞|頭條|快訊|時事/.test(t))         return replyText(replyToken, getNews());
  if (/功能|幫助|help|說明|怎麼用/.test(t))  return replyText(replyToken, getHelp());

  // 所有非指令文字 → 走 Gemini AI 聊天
  replyText(replyToken, chat(t));
}

// ============================================================
// 📅  行事曆
// ============================================================

function getTodayEvents() {
  return buildEventList(dayStart(new Date()), dayEnd(new Date()), '今天');
}
function getWeekEvents() {
  const now = new Date(), d = now.getDay();
  const mon = dayStart(new Date(now)); mon.setDate(now.getDate() - (d === 0 ? 6 : d - 1));
  const sun = dayEnd(new Date(mon));   sun.setDate(mon.getDate() + 6);
  return buildEventList(mon, sun, '本週');
}
function getMonthEvents() {
  const now = new Date();
  return buildEventList(
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    `${now.getMonth() + 1}月`
  );
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
      const s    = ev.getStartTime();
      const time = ev.isAllDayEvent() ? '全天' : `${pad(s.getHours())}:${pad(s.getMinutes())}`;
      lines.push(`${i+1}. ${s.getMonth()+1}/${s.getDate()} ${time} ${ev.getTitle()}`);
    });
    return lines.join('\n');
  } catch (err) { return '讀取行程失敗：' + err.message; }
}

function addCalendarEvent(text) {
  try {
    const p = parseEventText(text);
    if (!p) return '格式不對耶 😅\n試試：新增：明天下午3點 跑步';
    const cal  = CalendarApp.getCalendarById(CFG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
    cal.createEvent(p.title, p.start, new Date(p.start.getTime() + 3600000));
    const ds = `${p.start.getMonth()+1}/${p.start.getDate()} ${pad(p.start.getHours())}:${pad(p.start.getMinutes())}`;
    return `✅ 搞定！\n「${p.title}」已加入行事曆\n📅 ${ds}\n\n${CFG.OWNER_NAME} 你真的很充實！💪`;
  } catch (err) { return '新增失敗：' + err.message; }
}

function parseEventText(text) {
  const now = new Date(); const dt = new Date(now);
  if (/明天|明日/.test(text)) dt.setDate(now.getDate() + 1);
  else if (/後天/.test(text)) dt.setDate(now.getDate() + 2);
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
    const end = new Date(); end.setDate(end.getDate() + 60);
    const cal   = CalendarApp.getCalendarById(CFG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
    const found = cal.getEvents(new Date(), end).filter(ev => ev.getTitle().includes(keyword));
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

function fetchWeatherData() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${CFG.WEATHER_LAT}&longitude=${CFG.WEATHER_LON}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
    `&current_weather=true&timezone=Asia%2FTaipei&forecast_days=3`;
  return JSON.parse(UrlFetchApp.fetch(url, {muteHttpExceptions:true}).getContentText());
}

function smartWeatherTip(cur, daily) {
  const n    = CFG.OWNER_NAME;
  const temp = Math.round(cur.temperature);
  const rain = daily.precipitation_probability_max[0];
  const code = daily.weathercode[0];
  const hi   = Math.round(daily.temperature_2m_max[0]);
  const lo   = Math.round(daily.temperature_2m_min[0]);

  if (rain >= 70)        return `${n}！今天降雨機率高達 ${rain}%，快下雨了！🌧 出門前一定要帶傘！`;
  if (rain >= 40)        return `${n}，今天有 ${rain}% 機率會下雨，建議備個傘以防萬一 ☂️`;
  if (temp <= 14)        return `${n} 今天超冷的！🥶 ${temp}°C！多加一件外套，小心感冒！`;
  if (hi >= 33)          return `今天最高 ${hi}°C！🔥 熱翻天！${n} 記得多喝水、防曬，室外少待！`;
  if ((hi - lo) >= 10)  return `${n}，今天早晚溫差大（${lo}～${hi}°C），出門帶件薄外套保平安 🧥`;
  if ([0,1].includes(code)) return `今天天氣超棒！☀️ ${n} 要不要趁機出去走走放鬆一下？`;
  return `天氣還不錯，${n} 出門備傘就萬全囉 😊`;
}

function getWeather() {
  try {
    const data = fetchWeatherData();
    const cur  = data.current_weather, d = data.daily;
    const days = ['今天','明天','後天'];
    let msg = `🌡 ${CFG.CITY_NAME} 天氣（現在 ${Math.round(cur.temperature)}°C）\n\n`;
    for (let i = 0; i < 3; i++) {
      msg += `${days[i]}：${WMO[d.weathercode[i]] || '未知'}\n`;
      msg += `  🌡 ${Math.round(d.temperature_2m_min[i])}～${Math.round(d.temperature_2m_max[i])}°C  `;
      msg += `☔ 降雨 ${d.precipitation_probability_max[i]}%\n\n`;
    }
    msg += '---\n' + smartWeatherTip(cur, d);
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
          items = root.getChildren('entry', ns).slice(0, 5).map(en => ({ title: en.getChildText('title', ns) }));
        } else {
          const ch = root.getChild('channel');
          items = (ch || root).getChildren('item').slice(0, 5).map(it => ({ title: it.getChildText('title') }));
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
// 🤖  Gemini AI 聊天（有填 API Key 才啟用）
// ============================================================

// 對話歷史記憶（存在 Script Properties，最多保留 6 輪）
const HISTORY_KEY  = 'CHAT_HISTORY';
const MAX_HISTORY  = 6;  // 保留最近幾輪對話

function getHistory() {
  try {
    const raw = _PROPS.getProperty(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function saveHistory(history) {
  // 只保留最近 MAX_HISTORY 輪
  const trimmed = history.slice(-MAX_HISTORY * 2);
  _PROPS.setProperty(HISTORY_KEY, JSON.stringify(trimmed));
}

function clearHistory() {
  _PROPS.deleteProperty(HISTORY_KEY);
}

function chat(userText) {
  const n = CFG.OWNER_NAME;

  // 沒有 Gemini Key → 走備用回覆
  if (!CFG.GEMINI_API_KEY) {
    if (/你好|嗨|嘿|哈囉/.test(userText)) {
      const rs = [
        `嗨嗨 ${n}！有什麼我可以幫你的？😊`,
        `我在我在！${n} 說吧 🦐`,
        `嗨！${n} 今天氣色不錯耶 💪`,
      ];
      return rs[Math.floor(Math.random() * rs.length)];
    }
    return `嗯嗯聽到了！但小蝦不太懂你的意思 🦐\n${n}，說「功能」看看我能做什麼吧！`;
  }

  // 有 Key → 呼叫 Gemini，帶上對話歷史
  try {
    const history = getHistory();

    // System prompt：小蝦的人格設定
    const systemPrompt = `你是「小蝦」，${n} 的私人助理兼好朋友。
個性：熱情開朗、幽默風趣、有點可愛。
語言：繁體中文，語氣像親密好友，偶爾用台灣慣用語。
回覆：簡潔有力，不超過 120 字，不說廢話。
重要：你記得和 ${n} 說過的話，會自然延續對話脈絡。`;

    // 組合 Gemini messages 格式
    const messages = [
      { role: 'user',  parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `好的！我是小蝦 🦐，${n} 有什麼需要？` }] },
      ...history,
      { role: 'user',  parts: [{ text: userText }] },
    ];

    const res = UrlFetchApp.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CFG.GEMINI_API_KEY}`,
      {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ contents: messages })
      }
    );

    const reply = JSON.parse(res.getContentText())?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return `小蝦突然當機了 😅 稍後再試試看！`;

    // 儲存這輪對話到歷史
    history.push({ role: 'user',  parts: [{ text: userText }] });
    history.push({ role: 'model', parts: [{ text: reply }] });
    saveHistory(history);

    return reply;
  } catch(e) {
    console.error('Gemini error:', e);
    return `小蝦腦筋卡住了！稍後再聊 😂`;
  }
}

function getHelp() {
  const n = CFG.OWNER_NAME;
  const hasAI = CFG.GEMINI_API_KEY ? '✅ 已啟用（可以陪聊天！）' : '❌ 未設定（填入 Gemini Key 後啟用）';
  return `🦐 小蝦功能清單\n\n` +
    `📅 行事曆\n今日行程 / 本週行程 / 本月行程 / 最近行程\n` +
    `新增：明天下午3點 開會\n刪除：開會\n\n` +
    `🌤 天氣（直接說「天氣」）\n` +
    `📰 新聞（直接說「新聞」）\n` +
    `💬 AI 聊天：${hasAI}\n\n` +
    `⏰ 自動推播：\n每日 ${CFG.MORNING_HOUR}:00 天氣早報 + 今日行程\n` +
    `每週一 本週行程摘要\n活動前 ${CFG.REMINDER_MINUTES} 分鐘提醒\n\n` +
    `${n}，有事盡管找我！`;
}

// ============================================================
// ⏰  主動推播 Triggers
// ============================================================

function dailyMorningReport() {
  const userId = _PROPS.getProperty('USER_LINE_ID');
  if (!userId) return;
  const n = CFG.OWNER_NAME;

  let weatherBlock = '', tip = '';
  try {
    const data = fetchWeatherData();
    const cur  = data.current_weather, d = data.daily;
    const days = ['今天','明天','後天'];
    weatherBlock = `🌡 ${CFG.CITY_NAME} 天氣\n`;
    for (let i = 0; i < 3; i++) {
      weatherBlock += `${days[i]}：${WMO[d.weathercode[i]] || '未知'}  `;
      weatherBlock += `${Math.round(d.temperature_2m_min[i])}～${Math.round(d.temperature_2m_max[i])}°C  `;
      weatherBlock += `☔${d.precipitation_probability_max[i]}%\n`;
    }
    tip = smartWeatherTip(cur, d);
  } catch(e) {
    weatherBlock = '（天氣資訊暫時取不到）';
    tip = `出門保重 ${n} 😊`;
  }

  const greetings = [
    `☀️ 早安 ${n}！小蝦準時來報到 🦐`,
    `🌞 嗨嗨 ${n}！新的一天開始囉！`,
    `☀️ 早安啊 ${n}！今天也要加油哦 💪`,
  ];
  const g = greetings[new Date().getDate() % greetings.length];

  const msg = `${g}\n\n${weatherBlock}\n💡 ${tip}\n\n${getTodayEvents()}\n\n今天也要元氣滿滿！`;
  pushMessage(userId, msg);
}

function weeklyReport() {
  const userId = _PROPS.getProperty('USER_LINE_ID');
  if (!userId) return;
  const n = CFG.OWNER_NAME;
  pushMessage(userId, `📅 週一早安 ${n}！新的一週開始囉！\n\n${getWeekEvents()}\n\n本週加油！小蝦幫你打氣 🎉`);
}

function eventReminder() {
  const userId = _PROPS.getProperty('USER_LINE_ID');
  if (!userId) return;
  const n   = CFG.OWNER_NAME;
  const now  = new Date(), soon = new Date(now.getTime() + CFG.REMINDER_MINUTES * 60000);
  const cal  = CalendarApp.getCalendarById(CFG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
  cal.getEvents(now, soon).forEach(ev => {
    const left = Math.round((ev.getStartTime() - now) / 60000);
    if (left > 0) {
      pushMessage(userId, `⏰ ${n}！「${ev.getTitle()}」還有 ${left} 分鐘開始囉！\n快準備一下！小蝦幫你加油 🦐💨`);
    }
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
  if (userId) _PROPS.setProperty('USER_LINE_ID', userId);
}

function pad(n)      { return String(n).padStart(2, '0'); }
function dayStart(d) { d.setHours(0,0,0,0);      return d; }
function dayEnd(d)   { d.setHours(23,59,59,999);  return d; }
