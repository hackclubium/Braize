---
layout: ../../layouts/GuideLayout.astro
title: "Browser Engine Part 2: Layout + Paint"
description: Beginner-friendly layout and painting guide inspired by Vertex.
---

# Part 2: Layout + Paint :tw_fire:

Now you have DOM + CSS. Time for pixels.

The beginner trick: **make another tree**.

DOM is page meaning. Layout is boxes on screen.

## 1. Layout Boxes Are Not DOM Nodes

Vertex makes this explicit in `src/layout/box.h`:

```cpp
struct LayoutBox {
    const Node* node;
    ComputedStyle style;
    float x, y;
    float contentW, contentH;
    float marginTop, marginRight, marginBottom, marginLeft;
    float padTop, padRight, padBottom, padLeft;
    std::vector<std::unique_ptr<LayoutBox>> kids;
};
```

Beginner version:

```txt
LayoutBox
  source node
  style
  x, y
  width, height
  children
```

Do not draw while walking the DOM. First compute boxes. Then paint boxes. This saves pain. :thonk:

## 2. Start With Block Layout

Only support block elements first:

- `body`
- `div`
- `p`
- `h1`

Rule:

> each block goes below the previous block

That is it.

Pseudo-code:

```txt
layout_block(node, x, y, available_width):
  box.x = x + margin_left
  box.y = y + margin_top
  box.width = style.width or available_width - margins - padding

  cursor_y = box.y + padding_top

  for child in node.children:
    child_box = layout_block(child, box.x + padding_left, cursor_y, box.width)
    cursor_y += child_box.height + child margins

  box.height = padding_top + children height + padding_bottom
  return box
```

For text, fake it at first:

```txt
text width = characters * font_size * 0.5
text height = font_size * 1.2
```

Vertex does the same kind of thing in `tools/dump_layout.cpp` with `StubMeasure` for offline testing:

```cpp
float MeasureText(const std::wstring& s, const FontKey& f) override {
    return (float)s.size() * f.size * 0.5f;
}
```

That is perfect beginner energy. Fake measurement until real fonts matter. :adorpheus:

## 3. Print The Layout Tree

Vertex has `tools/dump_layout.cpp`, which parses a page, runs layout, and prints boxes. This is huge because you can debug layout without a window.

Make your own dump:

```txt
body x=8 y=8 w=784 h=92
  h1 x=8 y=8 w=784 h=38
    text "Hello Braize" x=8 y=8 w=192 h=38
  div.card x=8 y=46 w=300 h=36
    text "DOM and CSS work" x=20 y=58 w=144 h=19
```

If numbers look reasonable, painting will be easy.

## 4. Build A Paint List

Vertex has `src/paint/display_list.h`:

```cpp
struct DisplayItem {
    std::string kind;
    std::string text;
    float x = 0;
    float y = 0;
    float width = 0;
    float height = 0;
};
```

Beginner version:

```txt
PaintCommand
  kind: rect/text
  x, y, width, height
  color
  text
```

When walking layout boxes:

```txt
if box has background:
  add rect command
if box is text:
  add text command
for child:
  paint child
```

## 5. Draw It

Use any drawing layer:

- HTML Canvas
- SDL
- raylib
- SFML
- Win32/GDI
- PNG output

PNG output totally counts. Window can come later.

Paint order for beginner engine:

```txt
background rect
text
children in order
```

Vertex has a render probe fixture at `tests/fixtures/render_probe/stacking.in.html` that checks paint order for positioned elements. You do not need stacking contexts yet, but tests like that are a good idea later.

## 6. What Your Demo Should Show

Make one screenshot with:

- heading
- paragraph
- colored card
- margin/padding visible
- different text color
- README command to run it

Example README section:

````md
## Run

```bash
npm run render examples/hello.html
```

## Works

- HTML tags: body, h1, p, div
- CSS selectors: tag, class, id
- CSS properties: color, background, width, margin, padding, font-size
- Block layout
- Text and rectangle painting

## Does not work yet

- JavaScript
- images
- networking
- flexbox/grid
- forms
````

## Tiny Stretch Goals

After this works:

- text wrapping
- borders
- images
- links
- local file navigation
- simple `position: absolute`

Do one at a time. Browsers are swamp monsters. :this-is-fine:

Back: [Browser Engine Guide](/Braize/guides/browser-engine/)
