// Shared responsive-sizing helper for the RYB 2026 interactive maps (see 2026/comments.md's
// "consistent map container sizing" item). Used by every interactive map page (not the /static
// versions, which stay fixed-size print layouts).
//
// All these maps are built at a fixed native pixel size internally (annotation positions, symbol
// sizes, inset placement etc. are all tuned in absolute pixels against that native size - see the
// comments in CH11M04.html/CH11M05.html). Re-deriving that layout at arbitrary container widths
// isn't practical here, so instead the built SVG is made responsive the standard SVG way: give it
// a `viewBox` matching its native pixel size, then let CSS scale the whole element fluidly
// (`width: 100%; max-width: <cap>px; height: auto`). The internal layout never changes - only the
// final rendered box does.
;(function () {
    // Every RYB 2026 interactive map maxes out at 700px wide once embedded (see comments.md).
    const DEFAULT_MAX_WIDTH = 700

    // svgId: id of the OUTERMOST svg element for this map (the one with the real pixel
    // width/height attributes - #container where present, otherwise #map directly).
    // nativeWidth/nativeHeight: the full rendered content size in CSS pixels, including any
    // manually-appended footer/credits lines below the library's own height attribute (pass the
    // same total used for PNG export, e.g. MAPWIDTH/MAPHEIGHT + footer budget).
    function makeResponsive(svgId, nativeWidth, nativeHeight, maxWidth) {
        const svg = document.getElementById(svgId)
        if (!svg) return
        const cap = maxWidth || DEFAULT_MAX_WIDTH

        svg.setAttribute('viewBox', `0 0 ${nativeWidth} ${nativeHeight}`)
        svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')
        svg.style.display = 'block'
        svg.style.width = '100%'
        svg.style.maxWidth = cap + 'px'
        svg.style.height = 'auto'
    }

    window.RYBResponsiveMap = { makeResponsive }
})()
