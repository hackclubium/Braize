---
layout: ../../layouts/GuideLayout.astro
title: Browser Engine Guide
description: A casual beginner-friendly browser engine guide with examples inspired by Vertex.
---

# Browser Engine Guide :meow_code:

Want to build a browser engine? :eyes_wtf: Sick. Also: do **not** try to build Chrome first week. 

Browser engines are scary because real ones are huge. But the tiny version is pretty understandable:

```txt
HTML text
  -> DOM tree
  -> CSS rules
  -> styled nodes
  -> layout boxes
  -> paint commands
  -> pixels
```

That is the whole game. Everything else is extra chaos.

This guide pulls ideas from [Vertex](https://github.com/hackclubium/Vertex) :vertex-icon-light:, a from-scratch C++ browser engine. Vertex is way bigger than what you need, but its structure is useful to copy in tiny form.

## The Tiny Goal

Your first engine should render this:

```html
<!doctype html>
<style>
  body { margin: 8px; background: white; color: black; }
  h1 { color: purple; }
  .card { background: yellow; width: 300px; padding: 12px; }
</style>

<h1>Hello Braize</h1>
<p>This page was rendered by my engine.</p>
<div class="card">browser pixels :fire:</div>
```

If you can parse it, style it, lay it out, and draw boxes/text, you have a real browser-engine project. :yay:

## Vertex Map

Here is how Vertex names the pieces:

| Engine piece | Vertex example | What it teaches |
|---|---|---|
| DOM tree | `src/html/dom.h` | Keep nodes simple: type, tag, text, attrs, children |
| HTML parser | `src/html/parser.h` | One function can turn HTML into a DOM |
| CSS rules | `src/css/stylesheet.h` | Rules match nodes, then produce computed style |
| Layout boxes | `src/layout/box.h` | DOM and layout are separate trees |
| Paint list | `src/paint/display_list.h` | Paint can be a list of drawing commands |
| Debug tool | `tools/dump_layout.cpp` | You can test layout without a GUI |
| Fixture | `tests/fixtures/render_probe/stacking.in.html` | Tiny HTML files make great tests |

You do not need all Vertex features. Copy the shape, not the size.

## Recommended Files

Start boring:

```txt
src/
  main.*
  dom.*
  html_parser.*
  css_parser.*
  style.*
  layout.*
  paint.*
examples/
  hello.html
README.md
```

No plugin system. No engine abstraction. No “browser core manager factory”. Tiny pile of files. Good. :checked-t:

## Guide Parts

Read these in order:

1. [Part 1: DOM + CSS](/Braize/guides/browser-engine-dom-css/)
2. [Part 2: Layout + Paint](/Braize/guides/browser-engine-layout-paint/)

## What To Skip At First

Skip these until pixels work:

- JavaScript
- networking
- cookies
- tabs
- forms
- flexbox/grid
- full HTML5 parser weirdness
- security sandboxing
- videos/audio

That stuff matters in real browsers. For your first Braize engine, it is how you drown. :noooovanish:

## Best Submission Shape

Submit with:

- repo/source
- `examples/hello.html`
- one command to run it
- screenshot or video
- README with features + missing features
- proof trail: commits, notes, screenshots

Great README sentence:

> This engine supports basic HTML elements, class/tag/id CSS selectors, block layout, colors, backgrounds, padding, and text painting. It does not support JS, networking, forms, or flexbox yet.

That is honest and reviewable. :happi:

Now go and make your own browser engine!
