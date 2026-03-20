console.log("[Bulls&Cows] game.js loaded ✅");

const DIGITS = 4;
const REQUIRE_UNIQUE = true;
const ALLOW_LEADING_ZERO = true;
const DEV_PASSWORD = "0000";

const inputs     = Array.from(document.querySelectorAll(".digit"));
const submitBtn  = document.getElementById("submitBtn");
const clearBtn   = document.getElementById("clearBtn");
const resetBtn   = document.getElementById("resetBtn");
const historyEl  = document.getElementById("history");
const msgEl      = document.getElementById("msg");

const devDetails   = document.getElementById("devDetails");
const devPw        = document.getElementById("devPw");
const unlockBtn    = document.getElementById("unlockBtn");
const lockBtn      = document.getElementById("lockBtn");
const devResult    = document.getElementById("devResult");
const devAnswerBox = document.getElementById("devAnswerBox");
const secretView   = document.getElementById("secretView");

let secret = "";
let turn = 0;
let devUnlocked = false;
let guessMap = new Map();

// ✅ 同步標記狀態：0 none, 1 blue, 2 green, 3 gray
let globalMarkState = new Map();

function setMsg(text, isError = true){
  if(!msgEl) return;
  msgEl.style.color = isError ? "#d93025" : "#1b7f2a";
  msgEl.textContent = text || "";
}

function focusAt(i){
  const idx = Math.max(0, Math.min(i, inputs.length - 1));
  const t = inputs[idx];
  if(!t) return;
  t.focus();
  requestAnimationFrame(() => t.select());
}

function clearHistory(){
  if(historyEl) historyEl.innerHTML = "";
}

function clearDupGuessMark(){
  inputs.forEach(i => i.classList.remove("dupGuess"));
}
function markDupGuess(){
  inputs.forEach(i => i.classList.add("dupGuess"));
}

function clearGuessBoxes(focusIndex = 0){
  inputs.forEach(i => {
    i.value = "";
    i.classList.remove("dup");
    i.classList.remove("dupGuess");
  });
  setMsg("");
  focusAt(focusIndex);
}

function generateSecret(){
  let pool = [...Array(10).keys()].map(String);
  let result = [];
  while(result.length < DIGITS){
    const idx = Math.floor(Math.random() * pool.length);
    const d = pool[idx];
    if(!ALLOW_LEADING_ZERO && result.length === 0 && d === "0") continue;
    if(REQUIRE_UNIQUE) pool.splice(idx, 1);
    result.push(d);
  }
  return result.join("");
}

function getGuessFromBoxes(){
  return inputs.map(i => i.value.trim()).join("");
}

function isValidGuess(guess){
  if(guess.length !== DIGITS) return { ok:false, reason:`請填滿 ${DIGITS} 格` };
  if(!/^\d{4}$/.test(guess)) return { ok:false, reason:"只能輸入 0-9" };
  if(!ALLOW_LEADING_ZERO && guess[0] === "0") return { ok:false, reason:"第一位不可為 0" };
  if(REQUIRE_UNIQUE && new Set(guess).size !== DIGITS) return { ok:false, reason:"數字不可重複" };
  return { ok:true };
}

function calculateAandB(secret, guess){
  let A = 0, B = 0;
  for(let i=0;i<DIGITS;i++){
    if(guess[i] === secret[i]) A++;
    else if(secret.includes(guess[i])) B++;
  }
  return { A, B };
}

function markDuplicates(){
  inputs.forEach(i => i.classList.remove("dup"));
  const vals = inputs.map(i => i.value).filter(v => v !== "");
  const counts = vals.reduce((acc, v) => (acc[v] = (acc[v] || 0) + 1, acc), {});
  inputs.forEach(i => {
    if(i.value && counts[i.value] > 1) i.classList.add("dup");
  });
}

/* ---- Sync mark helpers ---- */
function stateForDigit(d){ return Number(globalMarkState.get(d) || 0); }

function applyDigitStateClass(el, state){
  el.classList.remove("mBlue", "mGreen", "mGray");
  if(state === 1) el.classList.add("mBlue");
  if(state === 2) el.classList.add("mGreen");
  if(state === 3) el.classList.add("mGray");
}

function applyStateToAllOccurrences(digitChar, state){
  if(!historyEl) return;
  historyEl.querySelectorAll(`.histDigit[data-digit="${digitChar}"]`)
    .forEach(el => applyDigitStateClass(el, state));
}

function cycleGlobalDigit(digitChar){
  const cur = stateForDigit(digitChar);
  const next = (cur + 1) % 4; // none->blue->green->gray->none
  globalMarkState.set(digitChar, next);
  applyStateToAllOccurrences(digitChar, next);
}

/* ---- History rendering ---- */
function createGuessDigits(guess){
  const wrap = document.createElement("span");
  wrap.className = "guess";

  for(let i=0;i<guess.length;i++){
    const digitChar = guess[i];

    const d = document.createElement("span");
    d.className = "histDigit";
    d.textContent = digitChar;
    d.dataset.digit = digitChar;
    applyDigitStateClass(d, stateForDigit(digitChar));

    d.setAttribute("role", "button");
    d.setAttribute("tabindex", "0");
    d.setAttribute("aria-label", `數字 ${digitChar}（同步標記）`);

    wrap.appendChild(d);

    if(i < guess.length - 1){
      const space = document.createElement("span");
      space.className = "histSpace";
      space.textContent = " ";
      wrap.appendChild(space);
    }
  }
  return wrap;
}

function appendHistory(turnNo, guess, A, B){
  if(!historyEl) return;

  const li = document.createElement("li");

  const turnSpan = document.createElement("span");
  turnSpan.className = "turnNo";
  turnSpan.textContent = `${turnNo}.`;

  const card = document.createElement("div");
  card.className = "hist-card";

  const guessWrap = createGuessDigits(guess);

  const tags = document.createElement("div");
  tags.className = "tags";

  const tagA = document.createElement("span");
  tagA.className = "tag tagA";
  tagA.textContent = `${A}A`;

  const tagB = document.createElement("span");
  tagB.className = "tag tagB";
  tagB.textContent = `${B}B`;

  tags.append(tagA, tagB);
  card.append(guessWrap, tags);

  li.append(turnSpan, card);
  historyEl.appendChild(li);
}

/* ---- History sync marking events ---- */
historyEl?.addEventListener("click", (e) => {
  const digitEl = e.target?.closest?.(".histDigit");
  if(!digitEl) return;
  const digitChar = digitEl.dataset.digit;
  if(digitChar) cycleGlobalDigit(digitChar);
});
historyEl?.addEventListener("keydown", (e) => {
  const target = e.target;
  if(!target?.classList?.contains("histDigit")) return;
  if(e.key === "Enter" || e.key === " "){
    e.preventDefault();
    const digitChar = target.dataset.digit;
    if(digitChar) cycleGlobalDigit(digitChar);
  }
});

/* ---- Dev unlock ---- */
function clearDevPassword(){ if(devPw) devPw.value = ""; }

function refreshDevUI(){
  if(!devResult || !devAnswerBox || !secretView) return;
  if(devUnlocked){
    devResult.textContent = "已解鎖";
    devResult.style.color = "#1b7f2a";
    devAnswerBox.hidden = false;
    secretView.textContent = secret;
  }else{
    devResult.textContent = "尚未解鎖";
    devResult.style.color = "#d93025";
    devAnswerBox.hidden = true;
    secretView.textContent = "";
  }
}

function unlockDev(){
  const pw = (devPw?.value || "").trim();
  if(pw === DEV_PASSWORD){
    devUnlocked = true;
    refreshDevUI();
    setMsg("已解鎖答案（開發用）", false);
  }else{
    devUnlocked = false;
    refreshDevUI();
    setMsg("密碼錯誤，無法解鎖", true);
  }
}

function lockDev(){
  devUnlocked = false;
  clearDevPassword();
  refreshDevUI();
  setMsg("已鎖上答案", false);
}

devDetails?.addEventListener("toggle", () => {
  if(devDetails.open) clearDevPassword();
});

/* ---- Input behaviors ---- */
inputs.forEach((input, idx) => {
  input.addEventListener("input", () => {
    clearDupGuessMark();
    const v = (input.value || "").replace(/[^\d]/g, "").slice(-1);
    input.value = v;

    markDuplicates();
    if(v && idx < DIGITS - 1) focusAt(idx + 1);
  });

  input.addEventListener("focus", () => requestAnimationFrame(() => input.select()));
  input.addEventListener("click",  () => requestAnimationFrame(() => input.select()));

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    clearDupGuessMark();
    const raw = (e.clipboardData || window.clipboardData).getData("text") || "";
    const digits = raw.replace(/\D/g, "").split("");
    if(digits.length === 0) return;

    for(let i=0;i<DIGITS;i++) inputs[i].value = digits[i] || "";
    markDuplicates();
    focusAt(Math.min(Math.max(digits.length - 1, 0), DIGITS - 1));
  });
});

/* ✅ Arrow/Home/End stable navigation (capture) */
document.addEventListener("keydown", (e) => {
  const active = document.activeElement;
  if(!active?.classList?.contains("digit")) return;

  const idx = inputs.indexOf(active);
  if(idx < 0) return;

  const key = e.key;
  const code = e.code;

  const isLeft  = key === "ArrowLeft"  || key === "Left"  || code === "ArrowLeft";
  const isRight = key === "ArrowRight" || key === "Right" || code === "ArrowRight";
  const isHome  = key === "Home" || code === "Home";
  const isEnd   = key === "End"  || code === "End";

  if(isLeft){ e.preventDefault(); focusAt(idx - 1); return; }
  if(isRight){ e.preventDefault(); focusAt(idx + 1); return; }
  if(isHome){ e.preventDefault(); focusAt(0); return; }
  if(isEnd){ e.preventDefault(); focusAt(DIGITS - 1); return; }

  if(key === "Backspace"){
    if(!active.value && idx > 0){
      e.preventDefault();
      focusAt(idx - 1);
    }
    return;
  }

  if(key === "Enter"){
    e.preventDefault();
    submitGuess();
  }
}, true);

/* ---- Actions ---- */
function submitGuess(){
  setMsg("");
  clearDupGuessMark();

  if(submitBtn?.disabled) return;

  const guess = getGuessFromBoxes();
  const valid = isValidGuess(guess);
  if(!valid.ok){ setMsg(valid.reason, true); return; }

  if(guessMap.has(guess)){
    const firstTurn = guessMap.get(guess);
    markDupGuess();
    setMsg(`⚠️ 已在第 ${firstTurn} 回合猜過 ${guess}，請換一組（不會送出）`, true);
    return;
  }

  turn += 1;
  guessMap.set(guess, turn);

  const {A,B} = calculateAandB(secret, guess);
  appendHistory(turn, guess, A, B);

  if(A === DIGITS){
    setMsg(`✨​ 太強啦！答案是 ${secret}（共 ${turn} 回合）`, false);
    inputs.forEach(i => i.disabled = true);
    if(submitBtn) submitBtn.disabled = true;
  }else{
    clearGuessBoxes(0);
  }
}

function resetGame(){
  secret = generateSecret();
  clearHistory();

  inputs.forEach(i => {
    i.disabled = false;
    i.value = "";
    i.classList.remove("dup");
    i.classList.remove("dupGuess");
  });

  if(submitBtn) submitBtn.disabled = false;

  turn = 0;
  guessMap = new Map();
  globalMarkState = new Map();

  devUnlocked = false;
  clearDevPassword();
  refreshDevUI();

  setMsg("已開始新遊戲（首位允許 0）", false);
  focusAt(0);
}

submitBtn?.addEventListener("click", submitGuess);
clearBtn?.addEventListener("click", () => clearGuessBoxes(0));

resetBtn?.addEventListener("click", () => {
  const ok = window.confirm("確定要開始新遊戲？目前回合與歷史紀錄會清除。");
  if(ok) resetGame();
});

unlockBtn?.addEventListener("click", unlockDev);
lockBtn?.addEventListener("click", lockDev);
devPw?.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){ e.preventDefault(); unlockDev(); }
});

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape"){
    clearGuessBoxes(0);
  }
});

refreshDevUI();
resetGame();
``