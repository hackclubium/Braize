---
layout: ../../layouts/GuideLayout.astro
title: "Browser Engine Part 1: DOM + CSS"
description: Beginner-friendly DOM and CSS parsing guide inspired by Vertex.
---

# Part 1: DOM + CSS :ultrafastparrot:

First mission: turn a string of HTML into a tree, then attach styles to that tree.

Do **not** draw pixels yet. Get the data shape right first. :yesyes:

## 1. Make a DOM Node

Vertex keeps the DOM node idea very simple in `src/html/dom.h`:

```cpp
enum class NodeType { Document, Element, Text };

struct Node {
    NodeType type;
    std::string tagName;
    std::string text;
    std::map<std::string, std::string> attrs;
    std::vector<std::shared_ptr<Node>> children;
    Node* parent;
};
```

Beginner translation:

```txt
Node = either document, element, or text
Element node has tag name + attributes + children
Text node has text
```

That is enough. :yay:

Your DOM for this:

```html
<h1 class="hero">Hello</h1>
```

should look like:

```txt
document
  h1.hero
    text "Hello"
```

## 2. Parse Tiny HTML

Support this first:

- opening tags: `<div>`
- closing tags: `</div>`
- text between tags
- attributes: `class="card"`, `id="main"`
- self-closing can wait
- comments can wait

Simple parser idea:

```txt
current = document

while not end:
  if next thing is opening tag:
    make element
    append to current
    current = new element
  else if next thing is closing tag:
    current = current.parent
  else:
    make text node
    append to current
```

This is not full HTML5 parsing. Good. You are building first pixels, not surviving every broken webpage ever. :tbh_excited:

## 3. Pull CSS Out Of `<style>`

Vertex has a helper pattern in `tools/dump_layout.cpp`: walk DOM, find `<style>`, collect text, parse it.

Tiny version:

```txt
walk every node
  if node tag is style
    css += all child text
```

Example:

```html
<style>
  h1 { color: purple; }
  .card { background: yellow; }
</style>
```

becomes CSS text:

```css
h1 { color: purple; }
.card { background: yellow; }
```

## 4. Parse Tiny CSS Rules

Start with:

```css
selector { property: value; property: value; }
```

Support selectors:

- tag: `h1`
- class: `.card`
- id: `#main`

Support properties:

- `color`
- `background`
- `width`
- `height`
- `margin`
- `padding`
- `font-size`

Vertex has bigger rule structures in `src/css/stylesheet.h`, but tiny version can be:

```txt
Rule
  selector_kind: tag/class/id
  selector_value: h1/card/main
  declarations: map of property -> value
```

## 5. Match CSS To Nodes

For each element:

```txt
start with default style
for each CSS rule:
  if rule matches this element:
    apply declarations
```

Match rules:

```txt
tag rule matches if node.tagName == selector
class rule matches if class attr contains selector
id rule matches if id attr equals selector
```

Do not overbuild specificity yet. Later rules can override earlier rules.

## 6. Debug Output

Before layout, print your styled tree:

```txt
h1 class=hero color=purple font-size=32
  text "Hello"
div class=card background=yellow width=300 padding=12
  text "browser pixels"
```

This is your first win. If this prints correctly, layout becomes way easier! :happy-pep:

## Tiny Test File

Use this as `examples/hello.html`:

```html
<!doctype html>
<style>
  body { margin: 8px; }
  h1 { color: purple; font-size: 32px; }
  .card { background: yellow; width: 300px; padding: 12px; }
</style>

<h1>Hello Braize</h1>
<div class="card">DOM and CSS work :fire:</div>
```

Next: [Part 2: Layout + Paint](/Braize/guides/browser-engine-layout-paint/)
