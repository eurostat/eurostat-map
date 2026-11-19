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
