// popup.js

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusBox = document.getElementById('status-box');
const countDisplay = document.getElementById('count-display');
const doneMsg = document.getElementById('done-msg');
const delaySlider = document.getElementById('delay-slider');
const delayDisplay = document.getElementById('delay-display');
const mainUI = document.getElementById('main-ui');
const notLinkedin = document.getElementById('not-linkedin');

const wlInput = document.getElementById('wl-input');
const wlAddBtn = document.getElementById('wl-add');
const wlList = document.getElementById('wl-list');
const wlEmpty = document.getElementById('wl-empty');
const wlBadge = document.getElementById('wl-badge');

let isRunning = false;
let whitelist = [];

// ── TABS ────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ── DELAY SLIDER ────────────────────────────────────
delaySlider.addEventListener('input', () => {
  delayDisplay.textContent = (parseInt(delaySlider.value) / 1000).toFixed(1) + 's';
});

// ── LINKEDIN CHECK ───────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || '';
  if (!url.includes('linkedin.com')) {
    mainUI.style.display = 'none';
    notLinkedin.style.display = 'block';
  }
});

// ── WHITELIST STORAGE ────────────────────────────────
function saveWhitelist() {
  chrome.storage.sync.set({ whitelist });
}

function loadWhitelist(cb) {
  chrome.storage.sync.get('whitelist', (data) => {
    whitelist = data.whitelist || [];
    cb();
  });
}

function renderWhitelist() {
  wlList.innerHTML = '';
  if (whitelist.length === 0) {
    wlEmpty.style.display = 'block';
    wlList.style.display = 'none';
    wlBadge.style.display = 'none';
  } else {
    wlEmpty.style.display = 'none';
    wlList.style.display = 'flex';
    wlBadge.style.display = 'inline-flex';
    wlBadge.textContent = whitelist.length;

    whitelist.forEach((name, i) => {
      const item = document.createElement('div');
      item.className = 'wl-item';
      item.innerHTML = `
        <span class="wl-item-name" title="${name}">${name}</span>
        <button class="wl-item-remove" data-index="${i}" title="Remove">✕</button>
      `;
      wlList.appendChild(item);
    });
  }
}

function addToWhitelist(raw) {
  // Split by comma so "Apple, Google, Doctolib" adds 3 separate entries
  const names = raw.split(",").map(s => s.trim()).filter(Boolean);
  let changed = false;
  for (const name of names) {
    if (!whitelist.some(e => e.toLowerCase() === name.toLowerCase())) {
      whitelist.push(name);
      changed = true;
    }
  }
  if (changed) {
    saveWhitelist();
    renderWhitelist();
  }
}

function removeFromWhitelist(index) {
  whitelist.splice(index, 1);
  saveWhitelist();
  renderWhitelist();
}

wlAddBtn.addEventListener('click', () => {
  addToWhitelist(wlInput.value);
  wlInput.value = '';
  wlInput.focus();
});

wlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addToWhitelist(wlInput.value);
    wlInput.value = '';
  }
});

wlList.addEventListener('click', (e) => {
  const btn = e.target.closest('.wl-item-remove');
  if (btn) removeFromWhitelist(parseInt(btn.dataset.index));
});

// ── MESSAGES FROM CONTENT SCRIPT ────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PROGRESS') {
    countDisplay.textContent = message.count;
  } else if (message.type === 'DONE') {
    setRunning(false);
    doneMsg.textContent = `✓ Done — ${message.count} page${message.count !== 1 ? 's' : ''} unfollowed`;
    doneMsg.classList.add('visible');
  }
});

// ── RUN STATE ────────────────────────────────────────
function setRunning(running) {
  isRunning = running;
  if (running) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    statusBox.classList.add('visible');
    doneMsg.classList.remove('visible');
  } else {
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    statusBox.classList.remove('visible');
  }
}

startBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (e) {}

  const delay = parseInt(delaySlider.value);
  countDisplay.textContent = '0';
  setRunning(true);

  chrome.tabs.sendMessage(tab.id, { type: 'START', delay, whitelist }, (response) => {
    if (chrome.runtime.lastError) {
      setRunning(false);
      doneMsg.textContent = '⚠ Could not connect. Refresh the page and try again.';
      doneMsg.style.color = 'var(--danger)';
      doneMsg.classList.add('visible');
    }
  });
});

stopBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'STOP' });
  setRunning(false);
  doneMsg.textContent = `⏹ Stopped at ${countDisplay.textContent} unfollowed`;
  doneMsg.classList.add('visible');
});

// ── INIT ─────────────────────────────────────────────
loadWhitelist(renderWhitelist);
