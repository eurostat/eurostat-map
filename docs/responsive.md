# Responsive maps

How `eurostat-map` adapts to the room it has, and the rules the library follows so that it does.

## Rules

1. **The container decides, not the device.** A map in a 600 px iframe on a desktop is as cramped as one on a phone,
   and a map in a wide column on a narrow window is not. The layout follows the width of the map's own container
   (`src/core/layout-profile.js`). `window.innerWidth` is only the fallback, when the container cannot be measured.
2. **Reflow, don't shrink.** A map is laid out for the width it really has. Scaling an 800 px drawing down to 390 px
   makes the text 6 px tall. The default width is `min(795, container width)`, and the height follows the shape of
   the map, not the height of the screen.
3. **Two layout profiles, one decision.** `'desktop'` and `'compact'`; every feature asks the same question
   (`isCompact(map)`) instead of keeping its own breakpoint. The compact profile starts at a container width of
   768 px.
4. **The author's intent wins.** An explicit `width()`, `height()`, `insetsButton()`, `legendButton()` or
   `layout('desktop')` is never overridden by the automatic profile.
5. **React to the container, not only to the window.** In `'auto'` layout the map watches its container and
   rebuilds when it crosses the breakpoint (or, without an explicit `width()`, when its width changes).
6. **Touch is a first-class input.** In the compact profile buttons are 40 px, a single finger scrolls the page
   (`touch-action: pan-y`), a horizontal drag pans and two fingers pinch. A map must never trap the scroll of a page.
7. **Chrome stays off the data.** In the compact profile the legends sit under the map, not on it.

## API

| Setting | Default | Meaning |
| ------- | ------- | ------- |
| `layout()` | `'auto'` | `'auto'`, `'desktop'` or `'compact'`. |
| `legendCompactPosition()` | `'below'` | `'below'` the map in the compact profile, or `'keep'` where `legend()` puts them. |
| `insetsVisibilityBreakpoint()` | `480` | Container width at or below which insets start behind their button. |
| `legendVisibilityBreakpoint()` | `480` | Container width at or below which the legend starts behind its button (when `legendButton` is on). |
| `width()` / `height()` | container / auto | Explicit values are kept in every profile. |

The compact profile marks the map's `<svg>` with the class `em--compact`, so CSS can follow it
(`src/css/responsive.css`). Tooltips are page elements and still follow the window with a media query.

## Not done yet

- Horizontal legends in the compact profile (a tall vertical legend takes a lot of height).
- Compact placements for the scale bar, logo and ribbon.
- Rebuilding keeps the data it already has only where a layer caches it; the map is otherwise drawn again.
