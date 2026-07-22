---
layout: ../../layouts/GuideLayout.astro
title: Browser Extension Guide
description: Beginner-friendly guide for building a focused browser extension with a manifest, popup, content script, and permissions.
---

# Browser Extension Guide :chrome-unstable:

Extensions sound huge because real ones have sync, billing, dashboards, and support tickets. First extension needs one job.

Tiny goal:

```txt
manifest
  -> popup
  -> content script
  -> storage
  -> one useful browser action
```

This also matches the Chrome Extension License shop item. Build something small enough to actually ship.

## The Tiny Goal

Build this first:

```txt
click extension icon
popup opens
button reads current tab
content script highlights headings or saves page info
setting persists after refresh
```

That is enough for a Braize extension project.

## Recommended Files

```txt
extension/
  manifest.json
  popup.html
  popup.js
  content.js
  styles.css
  icons/
README.md
```

No build step unless needed. Plain files are easier to load, inspect, and submit.

## 1. Write `manifest.json`

Start with Manifest V3:

```json
{
  "manifest_version": 3,
  "name": "Braize Browser Helper",
  "version": "0.1.0",
  "description": "A tiny browser helper extension.",
  "action": {
    "default_popup": "popup.html"
  },
  "permissions": ["activeTab", "storage"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

Ask for fewer permissions, not more. Reviewers trust small permission lists.

## 2. Make Popup Work

`popup.html`:

```html
<button id="save">Save current page</button>
<pre id="out"></pre>
<script src="popup.js"></script>
```

`popup.js`:

```js
document.querySelector('#save').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const page = { title: tab.title, url: tab.url, savedAt: new Date().toISOString() };
  await chrome.storage.local.set({ lastSavedPage: page });
  document.querySelector('#out').textContent = JSON.stringify(page, null, 2);
});
```

If this works, extension is alive.

## 3. Add Content Script

`content.js` can touch the page:

```js
document.documentElement.dataset.braizeExtension = 'on';
```

Better demo:

```js
for (const heading of document.querySelectorAll('h1, h2')) {
  heading.style.outline = '3px solid #ffcc00';
}
```

Tiny visual proof helps screenshots.

## 4. Test Locally

Chrome path:

```txt
chrome://extensions
enable Developer mode
Load unpacked
pick extension/ folder
```

Then test:

- popup opens
- button works on a normal page
- storage survives popup close
- content script changes page visibly
- console has no obvious errors

## 5. Prepare Store-Ready Notes

README should include:

- what extension does
- exact permissions and why
- how to load unpacked
- screenshots or video
- known limitations

Great README sentence:

> This extension saves current tab metadata locally and highlights page headings. It uses `activeTab` to read the current tab and `storage` to persist saved data.

## What To Skip At First

Skip until local demo works:

- account login
- paid subscriptions
- remote sync
- background schedulers
- broad host permissions
- minified build pipelines

Small extension, clean permissions, visible demo. Ship that.
