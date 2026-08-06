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

    // svgId: id of the OUTERMOST svg element for this map (the one to apply the viewBox/CSS
    // scaling to - #container where present, otherwise #map directly).
    // mapSvgId: id of the #map svg itself (always 'map' in practice). Its height ATTRIBUTE is
    // read directly rather than trusting a caller-supplied constant - callers used to pass a
    // guessed nativeHeight (e.g. MAPHEIGHT + 120), which clipped the footnote/credits whenever
    // the real footnote wrapped to more lines than the guess assumed (its actual wrapped line
    // count depends on text length and only the library knows it, at build time - see
    // AGENTS.md/comments.md). #map's height attribute is already grown correctly by the library
    // (recalculateLayout in src/core/layout.js) and by our own manual footer/credit appends, so
    // reading it back is always accurate, never a guess.
    function makeResponsive(svgId, mapSvgId, maxWidth) {
        const svg = document.getElementById(svgId)
        const mapSvg = document.getElementById(mapSvgId)
        if (!svg || !mapSvg) return
        const cap = maxWidth || DEFAULT_MAX_WIDTH

        const nativeWidth = parseFloat(mapSvg.getAttribute('width')) || svg.getBoundingClientRect().width
        const nativeHeight = parseFloat(mapSvg.getAttribute('height')) || svg.getBoundingClientRect().height

        svg.setAttribute('viewBox', `0 0 ${nativeWidth} ${nativeHeight}`)
        svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')
        svg.style.display = 'block'
        svg.style.width = '100%'
        svg.style.maxWidth = cap + 'px'
        svg.style.height = 'auto'
    }

    window.RYBResponsiveMap = { makeResponsive }
})()
