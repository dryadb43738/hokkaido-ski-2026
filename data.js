/* ===========================================================================
   北海道滑雪 2026 — site data
   This is the single place to edit content. Add resorts / hotspot details /
   todos / itinerary here and the page updates automatically.
   =========================================================================== */

/* Trip basics */
const TRIP = {
  departISO: "2026-12-27",      // drives the countdown
  startISO: "2026-06-13",       // countdown progress baseline (today)
  members: [
    { name: "學妹", color: "#ff0080" },
    { name: "龍哥", color: "#0070f3" },
    { name: "老頭", color: "#00b27a" },
    { name: "小乃", color: "#f9cb28" },
  ],
};

/* Overview stat band. id:"days" is filled live by the countdown. */
const STATS = [
  { id: "days", n: "—", unit: "天", label: "倒數出發" },
  { n: "7", unit: "天 6 夜", label: "行程長度" },
  { n: "5", unit: "座", label: "周邊雪場" },
  { n: "¥139k", unit: "／人", label: "粗估預算（不含機票）" },
];

/* -------- Ski resorts --------
   x / y are the hotspot position as % of the map image (1536×1024).
   `extra` rows show on hover — fill in "待補充" fields whenever you like;
   any value containing 待補充 renders in muted "to-do" styling.            */
const RESORTS = [
  {
    id: 1, name: "富良野滑雪場", en: "Furano Ski Resort", color: "#7c3aed",
    x: 46.0, y: 82.0, km: "60km", min: "60 分鐘",
    desc: "富良野盆地絕佳景觀，廣闊雪道適合各種程度的滑雪者。",
    extra: [
      { k: "標高差", v: "待補充" },
      { k: "雪道數", v: "待補充" },
      { k: "夜間滑雪", v: "待補充" },
      { k: "雪票（1 日）", v: "待補充" },
    ],
  },
  {
    id: 2, name: "聖誕禮物公園", en: "Christmas Gift Park", color: "#e0322f",
    x: 69.5, y: 59.5, km: "11km", min: "20 分鐘",
    desc: "結合歐風花園與遊樂設施的夢幻園區，適合全家同遊。",
    extra: [
      { k: "適合", v: "初學・親子" },
      { k: "雪道數", v: "待補充" },
      { k: "夜間滑雪", v: "待補充" },
      { k: "雪票（1 日）", v: "待補充" },
    ],
  },
  {
    id: 3, name: "神居滑雪場", en: "Kamui Ski Links", color: "#2f6fed",
    x: 75.0, y: 40.5, km: "18km", min: "30 分鐘",
    desc: "距離旭川市區最近的滑雪場，交通便利，適合短時間滑雪。",
    extra: [
      { k: "標高差", v: "待補充" },
      { k: "雪道數", v: "待補充" },
      { k: "夜間滑雪", v: "待補充" },
      { k: "雪票（1 日）", v: "待補充" },
    ],
  },
  {
    id: 4, name: "CANMORE 滑雪場", en: "Canmore Ski Village", color: "#1f8a5b",
    x: 34.5, y: 44.0, km: "24km", min: "35 分鐘",
    desc: "自然林間的多變雪道，提供豐富的滑行樂趣。",
    extra: [
      { k: "特色", v: "林間樹海雪道" },
      { k: "雪道數", v: "待補充" },
      { k: "夜間滑雪", v: "待補充" },
      { k: "雪票（1 日）", v: "待補充" },
    ],
  },
  {
    id: 5, name: "比布滑雪場", en: "Pippu Ski Resort", color: "#f5821f",
    x: 43.0, y: 15.5, km: "26km", min: "35 分鐘",
    desc: "擁有旭川地區最長的滑行距離，雪質優良、CP 值高。",
    extra: [
      { k: "最長滑距", v: "待補充" },
      { k: "雪道數", v: "待補充" },
      { k: "夜間滑雪", v: "待補充" },
      { k: "雪票（1 日）", v: "待補充" },
    ],
  },
];

/* -------- Itinerary -------- */
const ITINERARY = [
  { date: "12/27", w: "週日", t: "落地新千歲", p: "13:55 抵達 → JR 特急前往旭川 · 領取／採買雪具" },
  { date: "12/28", w: "週一", t: "旭川 · 滑雪 Day 1", p: "神居滑雪場暖身 · 確認租借雪具尺寸" },
  { date: "12/29", w: "週二", t: "旭川 · 滑雪 Day 2", p: "上午團體課 · 下午自由練習" },
  { date: "12/30", w: "週三", t: "整日滑雪 Day 3", pin: "富良野", p: "開車前往富良野滑雪場 · 來回約 1.5hr" },
  { date: "12/31", w: "週四", t: "旭川 · 滑雪 Day 4", p: "跨年夜 · 泡湯 + 在地居酒屋" },
  { date: "1/1", w: "週五", t: "旭川 · 滑雪 Day 5", p: "新年初滑 · 收操日" },
  { date: "1/2", w: "週六", t: "退房 → 回程", p: "10:00 出發 → 約 12:30 新千歲 · NH70 16:30" },
];

/* -------- Checklist (fallback; overridden by live Sheet data) -------- */
const TODOS = [
  { task: "收齊 4 人護照效期(≥6 個月)與英文名", owner: "", done: false },
  { task: "各自辦理 Visit Japan Web 申報", owner: "各自", done: false },
  { task: "各自購買含滑雪旅遊平安險", owner: "各自", done: false },
  { task: "對齊四人航班/首日集合地點與時間", owner: "", done: false },
  { task: "訂旭川市區住宿（整段 6 晚，同一家）", owner: "", done: false },
  { task: "預約旭川租車（雪胎+ETC+取還地點）", owner: "", done: false },
  { task: "查 JR 新千歲↔旭川當日班次/末班", owner: "", done: false },
  { task: "確認各雪場纜車券方案", owner: "", done: false },
  { task: "雪具租借者：上網預約（填身高/腳長/體重）", owner: "各自", done: false },
  { task: "雪具自備者：辦理雪具寄送（寄到飯店/雪場）", owner: "各自", done: false },
  { task: "初學者報名滑雪課程（中/英教練）", owner: "各自", done: false },
  { task: "分配裝備（雪鏡/手套/發熱衣自備）", owner: "各自", done: false },
  { task: "換日圓現金+開通海外刷卡/IC卡", owner: "各自", done: false },
  { task: "下載離線地圖/翻譯/乗換案内 App", owner: "各自", done: false },
  { task: "確認跨年餐廳是否需訂位", owner: "", done: false },
  { task: "行前一週看天氣/雪況/路況", owner: "", done: false },
];

/* -------- Flight progress (fallback; overridden by live Sheet data) -------- */
const FLIGHTS = [
  { name: "學妹", filled: true },
  { name: "龍哥", filled: false },
  { name: "老頭", filled: false },
  { name: "小乃", filled: false },
];

/* -------- Budget (per person) -------- */
const BUDGET = [
  { k: "JR 新千歲⇄旭川來回", v: "¥11,600" },
  { k: "纜車券 × 5 天（含富良野）", v: "¥24,000" },
  { k: "雪具租借 ¥5,000 × 5", v: "¥25,000" },
  { k: "住宿 6 晚（2 人 1 間均攤）", v: "¥36,000" },
  { k: "餐飲 ¥5,000 × 7 天", v: "¥35,000" },
  { k: "保險 + 泡湯／伴手禮雜支", v: "¥7,500" },
  { k: "租車＋油＋過路＋停車（均攤）", v: "待估", todo: true },
];

/* -------- Reminders -------- */
const REMINDERS = [
  { ic: "🏨", t: "住宿趁早訂", p: "跨年那幾晚會漲，6 月正是訂免費取消方案的窗口。" },
  { ic: "🚗", t: "誰開車要先辦國際駕照", p: "台灣監理站辦理需時間，記得帶台灣駕照正本。" },
  { ic: "🎟️", t: "年末年始連假", p: "12/29–1/3 雪場、纜車券、雪具、課程都偏滿，早查早訂。" },
  { ic: "🎿", t: "雪具：自備 or 租借", p: "自備者要先辦雪具寄送（寄到飯店／雪場），列入待辦。" },
  { ic: "⏱️", t: "回程時間從容", p: "1/2 退房後約 10:00 出發 → 約 12:30 到新千歲，距 NH70 16:30 buffer 充足。" },
];
