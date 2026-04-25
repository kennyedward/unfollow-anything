// content.js - Runs on LinkedIn pages

let isRunning = false;
let unfollowedCount = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getPageNameForButton(btn) {
  // aria-label format: "Click to stop following Apple"
  const ariaLabel = btn.getAttribute('aria-label') || '';
  const match = ariaLabel.match(/stop following\s+(.+)$/i);
  if (match) return match[1].trim();
  return null;
}

function isWhitelisted(btn, whitelist) {
  if (!whitelist || whitelist.length === 0) return false;
  const name = getPageNameForButton(btn);
  if (!name) return false;
  const nameLower = name.toLowerCase();
  return whitelist.some(entry => nameLower.includes(entry.toLowerCase().trim()));
}

function getFollowingButtons() {
  return [...document.querySelectorAll('button[aria-label*="stop following"]')];
}

async function unfollowAll(delayMs = 1500, whitelist = []) {
  isRunning = true;
  unfollowedCount = 0;

  while (isRunning) {
    const allButtons = getFollowingButtons();
    const buttons = allButtons.filter(btn => !isWhitelisted(btn, whitelist));

    if (buttons.length === 0) {
      const prevHeight = document.body.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(2000);
      const newHeight = document.body.scrollHeight;

      if (newHeight === prevHeight) {
        isRunning = false;
        chrome.runtime.sendMessage({ type: 'DONE', count: unfollowedCount });
        return;
      }
      continue;
    }

    for (const btn of buttons) {
      if (!isRunning) break;

      try {
        btn.click();
        await sleep(500);

        const confirmBtn = document.querySelector(
          'button[data-control-name="unfollow_member_confirm"], ' +
          '.artdeco-modal button.artdeco-button--primary'
        );
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(300);
        }

        unfollowedCount++;
        chrome.runtime.sendMessage({ type: 'PROGRESS', count: unfollowedCount });
        await sleep(delayMs);
      } catch (e) {
        continue;
      }
    }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2000);
  }

  chrome.runtime.sendMessage({ type: 'DONE', count: unfollowedCount });
}

function stopUnfollowing() {
  isRunning = false;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START') {
    unfollowAll(message.delay || 1500, message.whitelist || []);
    sendResponse({ status: 'started' });
  } else if (message.type === 'STOP') {
    stopUnfollowing();
    sendResponse({ status: 'stopped' });
  } else if (message.type === 'STATUS') {
    sendResponse({ isRunning, unfollowedCount });
  }
  return true;
});
