# unfollow-anything

A Chrome extension to bulk unfollow LinkedIn pages, with a whitelist to protect pages you want to keep.

## Features

- Automatically unfollows all pages on your LinkedIn following feed
- Whitelist pages by name — they get skipped during the unfollow run
- Partial name matching — "Apple" protects "Apple Inc", "Apple Developer", etc.
- Adjustable delay between unfollows to avoid rate limiting
- Persists your whitelist across sessions

## Install

1. Download or clone this repo
2. Go to `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `linkedin-unfollower` folder

## Usage

1. Go to [linkedin.com/feed/following](https://www.linkedin.com/feed/following)
2. Use LinkedIn's filter dropdown to show **Pages** only
3. Click the extension icon in your toolbar
4. Optionally add pages to the **Keep** tab that you don't want unfollowed
5. Hit **Start Unfollowing**

## Whitelist

Open the **Keep** tab in the extension popup. Type a page name and hit Add (or Enter). You can add multiple at once by separating with commas: `Apple, Google, Doctolib`.

Matching is case-insensitive and partial — you don't need the exact full name.

## Notes

- Works on the `/feed/following` page only
- Higher delay = safer, less likely to get flagged by LinkedIn
- LinkedIn occasionally changes their DOM — if the extension stops working, open an issue

## License

MIT
