# Responsive map sizing plan

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
   recalculating the projection, legends and insets on resize. If existing
   library consumers could be affected, make the behavior opt-in.
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
- Implemented opt-in `responsive: true` / `.responsive(true)` for standalone
  root SVG maps. The wrapper supplies display-only sizing; logical dimensions
  remain fixed, and a generated viewBox tracks the final header/footer layout.
  Existing viewBoxes are preserved. Nested SVG/group maps are not changed.
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
