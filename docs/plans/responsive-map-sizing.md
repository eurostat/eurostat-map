# Responsive map sizing plan

> **Status: implemented.** The behaviour this plan led to is described in [responsive.md](../responsive.md) and checked by
> `test/e2e/responsive-map.test.mjs`. Kept for the reasoning behind it.

## Goal

Make the on-screen map adapt when its available space changes, including when a
DevTools sidebar opens or closes, without changing IMAGE's exported SVG layout
or dimensions.

## Approach

1. Reproduce the issue in a standalone eurostat-map and in IMAGE. Check whether
   the constraint comes from the map SVG or its containing layout, and test
   both growing and shrinking.
2. Prefer display-only scaling that preserves the SVG's internal coordinates,
   aspect ratio and existing map layout. Avoid rebuilding the map or
   recalculating the projection, legends and insets on resize.
3. If the issue is specific to IMAGE's preview container, fix it there rather
   than changing the library. Keep preview sizing separate from the exported
   SVG; if necessary, remove preview-only styles from export clones.
4. Preserve IMAGE's fixed viewBox, export dimensions and layout. Check that
   responsive styles do not leak into exported SVGs through style inlining.

## Verification

- Exercise browser and container resizing in both directions, including
  opening and closing DevTools.
- Check map interactions, tooltips, legends and insets after resizing.
- Compare IMAGE SVG and PNG exports before and after resizing, including square
  and portrait layouts, for unchanged dimensions and content.
- Run focused automated browser and export regression tests for the affected
  implementation.

## Findings

- In a standalone Chromium reproduction, a map created at a 600px viewport
  retained its 600px SVG width after the viewport grew to 1100px. The SVG had
  no viewBox, so its existing dimensions do not scale its contents.
- The default library width is chosen from the viewport at construction time;
  layout later writes fixed SVG width and height attributes. The HTML wrapper
  is currently inline-block and does not provide responsive sizing.
- IMAGE nests its map within a separate template SVG with a fixed viewBox.
  Its static SVG export clones that template and inlines selected computed
  styles, while PNG export derives its output size from the template viewBox.
  Any library behavior must avoid changing nested IMAGE map coordinates or
  leaking preview-only sizing into the exported document.
- Implemented `responsive: true` / `.responsive(true)` by default for
  standalone root SVG maps. Set it to false to opt out. The wrapper supplies
  display-only sizing; maps shrink to fit their container but are not enlarged
  beyond their configured width. Logical dimensions remain fixed, and a
  generated viewBox tracks the final header/footer layout. Existing viewBoxes
  are preserved. Nested SVG/group maps, including IMAGE's, are not changed and
  do not need an explicit opt-out.
- The immigration example explicitly enables responsive mode and exposed that
  filling every wide parent made its 795px map grow after a redraw. The
  responsive wrapper now uses its intrinsic map width up to the available
  container width, so it only shrinks when needed and remains at its configured
  size on wider screens.
- On the published example viewer at a 1600px viewport, changing the
  destination from Germany to the Netherlands kept the 795px SVG at 795px
  before and after navigation with the updated wrapper sizing.
- A Chromium regression test covers the original viewport-growth scenario,
  container growth and shrinkage, legend interaction, toggle behavior, a
  header, inset scaling, and unchanged SVG/PNG downloads at different
  container widths. It also checks an IMAGE-style nested map and preservation
  of an existing viewBox. The choropleth inset regression suite matched all 79
  snapshots across 22 scenarios.
- IMAGE's export style inliner resolves a detached clone in a scratch container
  and does not inline width or height. Its template's SVG width and viewBox
  are therefore significant independently of the library's preview wrapper.
- An isolated IMAGE checkout was tested with both the updated production
  bundle and IMAGE's existing package. For square and portrait Europe maps
  at 1500px and 1100px viewport widths, the updated and existing SVG exports
  matched after normalizing random inset IDs, and PNG exports matched byte
  for byte. The SVG exports differed between viewport widths with both
  versions: IMAGE's style inliner captured an inherited font size of 14px at
  1500px and 12.25px at 1100px. This viewport-dependent export styling
  predates the responsive map change.
