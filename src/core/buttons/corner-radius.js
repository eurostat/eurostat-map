// Corner radius (px) shared by the zoom buttons and the rounded background boxes (legend, ranked bar
// chart, 'image' insets box), so they all look like one family. Kept dependency-free so unit tests can import it.
// Applied as rx/ry attributes (not CSS) so it also survives SVG/PNG/HTML export, which don't always carry the stylesheet.
export const BOX_CORNER_RADIUS = 5
