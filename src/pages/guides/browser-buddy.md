---
layout: ../../layouts/GuideLayout.astro
title: Browser Buddy Guide
description: Beginner-friendly guide for building a small browser companion app for research, notes, and tab context.
---

# Browser Buddy Guide :meow_code:

Browser buddy means a tiny helper app that makes browsing easier. Not a full browser. Not an AI operating system. One useful companion.

Tiny goal:

```txt
current page or pasted URL
  -> saved note
  -> tags
  -> quick search
  -> exportable proof trail
```

This pairs well with the browser engine guides: engine projects teach how pages become pixels; buddy projects teach how users work with pages.

## The Tiny Goal

Build this first:

```txt
user saves a page title + URL
adds one note
adds tags
searches notes
opens saved page later
exports JSON or Markdown
```

If that works, project is real. Summary bots, sync, accounts, and fancy graphs can wait.

## Recommended Files

Start boring:

```txt
src/
  main.*
  storage.*
  notes.*
  search.*
  export.*
examples/
  sample-notes.json
README.md
```

No plugin marketplace. No agent framework. One local tool that helps browsing.

## 1. Pick Input

Simplest version uses a normal form:

```txt
title
url
note
tags
```

Browser integration can come later through bookmarklets, share targets, or an extension.

## 2. Store Notes Locally

Use JSON first:

```json
{
  "id": "note_1",
  "title": "Vertex browser engine",
  "url": "https://github.com/hackclubium/Vertex",
  "note": "Useful DOM/layout structure reference.",
  "tags": ["browser", "engine"],
  "createdAt": "2026-07-22T12:00:00Z"
}
```

SQLite, IndexedDB, or cloud sync can wait until JSON becomes annoying.

## 3. Add Search

Search title, URL, note, and tags:

```txt
query = lowercase input
for each note:
  haystack = title + url + note + tags
  if query in lowercase haystack:
    show note
```

Good enough. Real search ranking later.

## 4. Add One Browser-Specific Feature

Pick one:

- bookmarklet that sends current page title and URL
- extension button that saves current tab
- local HTML page with drag/drop URL capture
- command palette shortcut for saved pages

Do not build all four. One polished path beats four broken demos.

## 5. Export Proof

Reviewers need to see what it does. Add export:

```md
# Browser Buddy Notes

## Vertex browser engine

URL: https://github.com/hackclubium/Vertex
Tags: browser, engine

Useful DOM/layout structure reference.
```

## Best Submission Shape

Submit with:

- repo/source
- one command to run it
- screenshot or video saving a page
- sample exported notes
- README with features + missing features
- proof trail: commits, notes, screenshots

Great README sentence:

> This browser buddy saves page notes locally, searches title/URL/note/tags, and exports Markdown. It does not sync across devices yet.
