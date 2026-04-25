// content.js — Unfollow Anything
// Supports: LinkedIn, X (Twitter), Reddit

let isRunning = false;
let unfollowedCount = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── PLATFORM DETECTION ────────────────────────────────────────────────────────

function getPlatform() {
  const host = window.location.hostname;
  if (host.includes('linkedin.com')) return 'linkedin';
  if (host.includes('x.com') || host.includes('twitter.com')) return 'twitter';
  if (host.includes('reddit.com')) return 'reddit';
  return null;
}

// ── PER-PLATFORM: GET BUTTONS ─────────────────────────────────────────────────

function getFollowingButtons(platform) {
  switch (platform) {
    case 'linkedin':
      return [...document.querySelectorAll('button[aria-label*="stop following"]')];

    case 'twitter':
      // "Following" buttons — aria-label="Following @username" or role=button with Following text
      return [...document.querySelectorAll('[data-testid$="-unfollow"], [data-testid="UserCell"] [role="button"]')]
        .filter(btn => {
          const label = (btn.getAttribute('aria-label') || btn.innerText || '').toLowerCase();
          return label.includes('following');
        });

    case 'reddit':
      // Reddit "Joined" buttons on subreddit listing pages
      return [...document.querySelectorAll('button')].filter(btn => {
        const text = (btn.innerText || '').trim().toLowerCase();
        return text === 'joined' || text === 'leave';
      });

    default:
      return [];
  }
}

// ── PER-PLATFORM: GET NAME FROM BUTTON ───────────────────────────────────────

function getPageName(btn, platform) {
  switch (platform) {
    case 'linkedin': {
      // aria-label: "Click to stop following Nielsen Norman Group"
      const match = (btn.getAttribute('aria-label') || '').match(/stop following\s+(.+)$/i);
      return match ? match[1].trim() : null;
    }

    case 'twitter': {
      // aria-label: "Following @Nielsen" or find the username/display name in the cell
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const ariaMatch = ariaLabel.match(/^Following\s+(.+)$/i);
      if (ariaMatch) return ariaMatch[1].trim();

      // Fallback: grab display name from the UserCell container
      const cell = btn.closest('[data-testid="UserCell"]');
      if (cell) {
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        if (nameEl) return nameEl.innerText.trim();
      }
      return null;
    }

    case 'reddit': {
      // Subreddit name is in the card or row heading near the button
      const card = btn.closest('[data-testid="subreddit-sidebar-entity"], .SubredditRow, li, article');
      if (card) {
        const nameEl = card.querySelector('a[href*="/r/"], h3, h2, [id*="subreddit"]');
        if (nameEl) return nameEl.innerText.trim();
      }
      return null;
    }

    default:
      return null;
  }
}

// ── WHITELIST CHECK ───────────────────────────────────────────────────────────

function isWhitelisted(btn, platform, whitelist) {
  if (!whitelist || whitelist.length === 0) return false;
  const name = getPageName(btn, platform);
  if (!name) return false;
  const nameLower = name.toLowerCase();
  return whitelist.some(entry => nameLower.includes(entry.toLowerCase().trim()));
}

// ── MAIN LOOP ─────────────────────────────────────────────────────────────────

async function unfollowAll(delayMs = 1500, whitelist = []) {
  const platform = getPlatform();
  if (!platform) {
    chrome.runtime.sendMessage({ type: 'UNSUPPORTED' });
    return;
  }

  isRunning = true;
  unfollowedCount = 0;

  while (isRunning) {
    const allButtons = getFollowingButtons(platform);
    const buttons = allButtons.filter(btn => !isWhitelisted(btn, platform, whitelist));

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

        // LinkedIn confirm dialog
        if (platform === 'linkedin') {
          const confirmBtn = document.querySelector(
            'button[data-control-name="unfollow_member_confirm"], ' +
            '.artdeco-modal button.artdeco-button--primary'
          );
          if (confirmBtn) {
            confirmBtn.click();
            await sleep(300);
          }
        }

        // Twitter confirm dialog — "Unfollow" button in the modal
        if (platform === 'twitter') {
          await sleep(400);
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
            await sleep(300);
          }
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
    sendResponse({ isRunning, unfollowedCount, platform: getPlatform() });
  }
  return true;
});
