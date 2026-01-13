const STORAGE_KEY = "timework_store_v1";

navigator.serviceWorker.register("./sw.js")

function pad2(n){ return String(n).padStart(2,"0"); }
function toISO(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function formatHM(min){ return `${Math.floor(min/60)}時間${min%60}分`; }
function hhmmToMins(t){ const [h,m]=t.split(":").map(Number); return (h*60+m)%1440; }

function loadStore(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}"); }catch{ return {}; } }
function saveStore(obj){ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

/* ===== DOM ===== */
const elStart=document.getElementById("startTime");
const elEnd=document.getElementById("endTime");
const elCross=document.getElementById("crossMidnight");

const elResultText=document.getElementById("resultText");
const elResultMins=document.getElementById("resultMinutes");
const elBreakMeta=document.getElementById("breakMeta");
const elRawMeta=document.getElementById("rawMeta");

const elSelectedDateText=document.getElementById("selectedDateText");
const elDayRecordText=document.getElementById("dayRecordText");
const elMemo=document.getElementById("memoInput");
const elGrandTotal=document.getElementById("grandTotalText");

const elMonthTitle=document.getElementById("monthTitle");
const elCalGrid=document.getElementById("calGrid");

const btnSave=document.getElementById("saveBtn");
const btnSaveBottom=document.getElementById("saveBtnBottom");
const btnClear=document.getElementById("clearBtn");

const btnPrev=document.getElementById("prevMonth");
const btnNext=document.getElementById("nextMonth");
const btnToday=document.getElementById("todayBtn");

/* ===== 休憩 ===== */
const breakList=document.getElementById("breakList");
const breakSumEl=document.getElementById("breakSum");
document.getElementById("add45").addEventListener("click", ()=>addBreakRow(45));
document.getElementById("add60").addEventListener("click", ()=>addBreakRow(60));
document.getElementById("addCustom").addEventListener("click", ()=>addBreakRow(0));

let breaks = [];

function calcBreakSum(){ return breaks.reduce((a,b)=>a + (Number.isFinite(b)?b:0), 0); }

function syncBreakUI(){
  breakList.innerHTML = "";
  breaks.forEach((v, idx) => {
    const row = document.createElement("div");
    row.className = "breakRow";

    const inp = document.createElement("input");
    inp.type="number"; inp.min="0"; inp.step="1"; inp.inputMode="numeric";
    inp.value = String(v ?? 0);
    inp.addEventListener("input", () => {
      const n = Math.max(0, Math.floor(Number(inp.value) || 0));
      breaks[idx] = n;
      updateBreakMetaAndCompute();
    });

    const del = document.createElement("button");
    del.type="button"; del.className="miniBtn danger"; del.textContent="削除";
    del.addEventListener("click", () => {
      breaks.splice(idx,1);
      syncBreakUI();
      updateBreakMetaAndCompute();
    });

    row.appendChild(inp);
    row.appendChild(del);
    breakList.appendChild(row);
  });
}

function addBreakRow(mins){
  breaks.push(Math.max(0, Math.floor(mins||0)));
  syncBreakUI();
  updateBreakMetaAndCompute();
}

function updateBreakMetaAndCompute(){
  const sum = calcBreakSum();
  breakSumEl.textContent = String(sum);
  elBreakMeta.textContent = String(sum);
  compute();
}

/* ===== 計算 ===== */
function compute(){
  const s = hhmmToMins(elStart.value);
  const e = hhmmToMins(elEnd.value);

  // 終了が開始より早いなら日またぎON
  if (e < s) elCross.checked = true;

  let diff = e - s;
  if (elCross.checked && diff < 0) diff += 1440;
  if (!elCross.checked && diff < 0) diff = 0;

  const raw = diff;
  const breakSum = calcBreakSum();
  const net = Math.max(0, raw - breakSum);

  elResultText.textContent = formatHM(net);
  elResultMins.textContent = String(net);
  elRawMeta.textContent = String(raw);
}
elStart.addEventListener("input", compute);
elEnd.addEventListener("input", compute);
elCross.addEventListener("change", compute);

/* ===== カレンダー ===== */
let selectedDate=new Date();
let viewYear=selectedDate.getFullYear();
let viewMonth=selectedDate.getMonth();

function renderCalendar(){
  const store = loadStore();
  elMonthTitle.textContent = `${viewYear}年${viewMonth+1}月`;
  elCalGrid.innerHTML = "";

  const first = new Date(viewYear, viewMonth, 1);
  const startDow = first.getDay();

  for(let i=0;i<42;i++){
    const dayNum = i - startDow + 1;
    const date = new Date(viewYear, viewMonth, dayNum);
    const inMonth = date.getMonth() === viewMonth;

    const cell = document.createElement("div");
    cell.className = "day";
    if(!inMonth) cell.classList.add("muted");

    const iso = toISO(date);
    if(store[iso] && typeof store[iso].mins === "number") cell.classList.add("saved");
    if(iso === toISO(selectedDate)) cell.classList.add("selected");

    const dow = date.getDay();
    if(dow===0) cell.classList.add("sun");
    if(dow===6) cell.classList.add("sat");
    if(window.getHolidayName && window.getHolidayName(date)) cell.classList.add("holiday");

    cell.textContent = String(date.getDate());

    cell.addEventListener("click", ()=>{
      selectedDate = date;
      elSelectedDateText.textContent = toISO(selectedDate);
      viewYear = selectedDate.getFullYear();
      viewMonth = selectedDate.getMonth();
      renderAll(true);
    });

    elCalGrid.appendChild(cell);
  }
}

function showSelected(){
  const store = loadStore();
  const iso = toISO(selectedDate);
  const rec = store[iso];
  const holidayName = (window.getHolidayName ? window.getHolidayName(selectedDate) : "");

  if(rec && typeof rec.mins === "number"){
    elDayRecordText.textContent = formatHM(rec.mins);

    const savedMemo = (typeof rec.memo === "string") ? rec.memo : "";
    if(savedMemo.trim()==="" && holidayName) elMemo.value = holidayName;
    else elMemo.value = savedMemo;

    if (Array.isArray(rec.breaks)) breaks = rec.breaks.map(x => Math.max(0, Math.floor(Number(x)||0)));
    else breaks = [];
  } else {
    elDayRecordText.textContent = "未記録";
    elMemo.value = holidayName ? holidayName : "";
    breaks = [];
  }

  syncBreakUI();
  updateBreakMetaAndCompute();
}

function updateGrandTotal(){
  const store = loadStore();
  let sum = 0;
  for(const k in store){
    if(store[k] && typeof store[k].mins === "number") sum += store[k].mins;
  }
  elGrandTotal.textContent = formatHM(sum);
}

/* ===== 保存/削除 ===== */
function doSave(){
  const store = loadStore();
  const iso = toISO(selectedDate);
  store[iso] = {
    mins: Number(elResultMins.textContent)||0,
    memo: elMemo.value||"",
    breaks: breaks.slice()
  };
  saveStore(store);
  renderAll(true);
}
btnSave.addEventListener("click", doSave);
btnSaveBottom.addEventListener("click", doSave);

btnClear.addEventListener("click", ()=>{
  const store = loadStore();
  const iso = toISO(selectedDate);
  if(store[iso]) delete store[iso];
  saveStore(store);
  renderAll(true);
});

/* ===== 月移動 ===== */
btnPrev.addEventListener("click", ()=>{
  const d = new Date(viewYear, viewMonth, 1);
  d.setMonth(d.getMonth()-1);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  renderAll(false);
});
btnNext.addEventListener("click", ()=>{
  const d = new Date(viewYear, viewMonth, 1);
  d.setMonth(d.getMonth()+1);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  renderAll(false);
});
btnToday.addEventListener("click", ()=>{
  const t = new Date();
  selectedDate = t;
  viewYear = t.getFullYear();
  viewMonth = t.getMonth();
  elSelectedDateText.textContent = toISO(selectedDate);
  renderAll(true);
});

/* ===== 初期化 ===== */
function renderAll(updateSelected=true){
  compute();
  renderCalendar();
  if(updateSelected) showSelected();
  updateGrandTotal();
}

elSelectedDateText.textContent = toISO(selectedDate);
renderAll(true);
