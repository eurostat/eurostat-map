// Shared builder for the RYB 2026 dropdown choropleth maps (see 2026/dropdown-maps.md).
// Used by CH02M02.html, CH04M03.html, CH08M03.html, CH08M04.html, CH13M02.html.
//
// The dropdown itself follows the exact same pattern as
// examples/statistics-explained/business/human-services/choropleth (ewc-singleselect.js +
// dropdown.js): the <ewc-singleselect> element and its `options` are declared statically in the
// page's HTML (NOT created/populated from JS - ewc-singleselect reads its `options` attribute,
// not the `options` property, the first time it renders, so setting the property alone leaves it
// empty). This module only wires the 'option-selected' listener and (re)builds the map.
//
// Requires (loaded before this script): eurostatmap.js, d3@7, ewc-singleselect.js,
// 2026/common/insets/overseas.js (createOutermostInsetsConfig/createInsetDOMElements), and
// 2026/common/responsive-map.js (RYBResponsiveMap.makeResponsive).
;(function () {
    function buildFootnote(footnote, source) {
        const parts = []
        if (footnote) parts.push(footnote)
        if (source) parts.push('<tspan style="font-style: italic;">Source</tspan>: ' + source.replace(/^Source:\s*/i, ''))
        return parts.join('<br/>')
    }

    // Boilerplate cartography credit lines used across RYB/2026 maps (see CH02M03.html, CH03M02.html,
    // CH10M02.html). Those pages position each line at a hand-tuned "mapWidth - N" left edge, tuned
    // against their own fixed MAPWIDTH. Right-align instead (text-anchor: end at a fixed right
    // margin) so it fits regardless of exact rendered text width, without needing per-page tuning.
    //
    // Y position matches the FIRST line of the left-hand footnote (#em-footnote's own y, i.e. its
    // first tspan's baseline - see addFootnote in src/core/decoration/texts.js, which sets the
    // <text> element's y to the footnote position and gives the first tspan dy=0), not the bottom
    // of the whole (possibly multi-line) footnote block - the two credit lines run alongside the
    // footnote, not below it.
    function addCartographyCredits(svgId, mapWidth) {
        const svg = d3.select('#' + svgId)
        svg.selectAll('#em-footnote-2, #em-footnote-3').remove()

        let creditsY = 20
        let footerBottom = 0
        const footerGroup = svg.select('#em-footer-' + svgId)
        if (!footerGroup.empty()) {
            const transformMatch = (footerGroup.attr('transform') || '').match(/translate\(\s*[-\d.]+(?:[,\s]+([-\d.]+))?\s*\)/)
            const groupY = transformMatch ? Number(transformMatch[1]) || 0 : 0
            const footnoteText = footerGroup.select('#em-footnote')
            const footnoteY = footnoteText.empty() ? null : Number(footnoteText.attr('y'))
            if (footnoteY != null && !Number.isNaN(footnoteY)) creditsY = groupY + footnoteY

            // The footnote (note + source) can wrap to more lines than the fixed 2-line credits
            // block, e.g. CH04M03's long "low reliability" note - in that case the credits' own
            // bottom (below) is NOT the tallest content in the footer, so sizing the SVG/frame off
            // it alone leaves the footnote's later lines clipped. Track the footer group's own
            // rendered bottom edge so the height-growing logic below can take whichever is taller.
            const node = footerGroup.node()
            const bbox = node && node.getBBox ? node.getBBox() : null
            if (bbox) footerBottom = groupY + bbox.y + bbox.height
        }

        const rightEdge = mapWidth - 10
        const creditsOwnBottom = creditsY + 13 + 4 // second line's y (creditsY + 13, set below) + its own line height
        const creditsBottom = Math.max(creditsOwnBottom, footerBottom + 4)

        // The library sizes #map's own height ATTRIBUTE to just fit its own header/drawing/footer
        // content (see recalculateLayout in src/core/layout.js). A nested <svg> clips its content
        // to that attribute-defined viewport by default, independent of any CSS box or outer HTML
        // container size - so appending content past it (as these two extra lines do) gets clipped
        // by the SVG itself, no matter how much room the outer page has. Grow it to fit.
        const svgNode = svg.node()
        const currentHeight = svgNode ? parseFloat(svgNode.getAttribute('height')) || 0 : 0
        if (svgNode && creditsBottom > currentHeight) {
            svg.attr('height', creditsBottom)
        }

        // #map-frame (the outer wrapper #map sits in - see the comment on it above in init()) must
        // grow to match, or ITS OWN svg viewport clips the credits even though #map itself now
        // fits them: a nested <svg> clips independently of its parent's size, so growing #map
        // alone isn't enough. #map-container has no fixed height any more (see
        // dropdown-choropleth.css), so growing #map-frame here simply makes the whole page taller
        // to fit - nothing is clipped, regardless of how many lines the footnote wraps to.
        const mapFrameEl = document.getElementById('map-frame')
        if (mapFrameEl) {
            const frameHeight = parseFloat(mapFrameEl.getAttribute('height')) || 0
            const finalHeight = Math.max(frameHeight, creditsBottom)
            if (finalHeight > frameHeight) mapFrameEl.setAttribute('height', finalHeight)
        }

        svg.append('text')
            .attr('x', rightEdge)
            .attr('y', creditsY)
            .attr('text-anchor', 'end')
            .attr('class', 'em-footnote')
            .attr('id', 'em-footnote-2')
            .html('Administrative boundaries: ©EuroGeographics ©OSM')
        svg.append('text')
            .attr('x', rightEdge)
            .attr('y', creditsY + 13)
            .attr('text-anchor', 'end')
            .attr('class', 'em-footnote')
            .attr('id', 'em-footnote-3')
            .html('Cartography: Eurostat – GISCO, 06/2026')
    }

    async function init(config) {
        const { dataUrl, svgId = 'map', dropdownSelectId = 'optionSelect', position, insetBoxPosition, zoomExtent } = config

        const res = await fetch(dataUrl)
        const json = await res.json()

        // Fixed native pixel size the map is built at - matching every other RYB 2026 interactive
        // map (see responsive-map.js) instead of measuring the embedding container's width and
        // rebuilding to match it. The rendered box is then scaled fluidly via CSS/viewBox
        // (RYBResponsiveMap.makeResponsive, called after each build below), which reacts to the
        // container's actual rendered size on every layout pass - unlike a JS 'resize' listener,
        // which only fires for the window's own size changing and can miss an embedding iframe
        // being resized purely via CSS (e.g. a responsive layout on the page that embeds it).
        const mapWidth = 700
        const mapHeight = Math.round(mapWidth * 0.82)

        // #map-frame wraps #map only so the static insets group (<g id="newInsets">) has a valid
        // SVG rendering context (see the comment on #map in dropdown-choropleth.css). Percentage
        // width/height on a NESTED <svg> (one inside another <svg>, as opposed to inside a plain
        // HTML element) resolves unreliably in Chromium - #map-frame's own rendered box can end up
        // many times too large. Giving it explicit pixel dimensions here sidesteps that entirely;
        // RYBResponsiveMap.makeResponsive() (called after each build) then takes over #map-frame's
        // actual rendered size via CSS, so this only needs to be set once, up front.
        const mapFrameEl = document.getElementById('map-frame')
        if (mapFrameEl) {
            mapFrameEl.setAttribute('width', mapWidth)
            mapFrameEl.setAttribute('height', mapHeight)
        }

        // Default continental-Europe framing; overseas regions are shown separately via the static insets.
        const resolvedPosition = position || { x: 4900000, y: 3400000, z: 7000 }
        const resolvedInsetBoxPosition = insetBoxPosition || [mapWidth - 250, 8]

        const labelFormatter = d3.format('.' + json.decimals + 'f')

        function getOption(code) {
            return json.options.find((o) => o.code === code) || json.options[0]
        }

        // #newInsets is a PERMANENT sibling of #map (see test/IMAGE/insets.html) - only its
        // contents are cleared/rebuilt on each change. It must never be moved inside #map: doing
        // so would make the next resetMapDom() (which clears #map) delete it outright, leaving
        // nothing for createInsetDOMElements() to populate on the next dropdown change.
        function resetMapDom() {
            d3.select('#' + svgId)
                .selectAll('*')
                .remove()
        }

        // Title/subtitle are rendered as external HTML (see .map-title/.map-subtitle in the
        // skeleton), NOT via the library's internal .header()/.title()/.subtitle() - an internal
        // SVG header adds its own height on top of .height(mapHeight), which would push the
        // drawing area (and the zoom buttons anchored to its bottom edge, see
        // positionZoomButtons()) further down than expected. Keeping title/subtitle outside the
        // SVG (matching examples/statistics-explained/.../human-services) avoids that entirely.
        // Must be kept in sync manually since some maps (e.g. CH04M3) change title text per
        // dropdown option.
        function syncHeaderText(option) {
            const titleEl = document.getElementById('map-title')
            if (titleEl) titleEl.textContent = option.title
            const subtitleEl = document.getElementById('map-subtitle')
            if (subtitleEl) subtitleEl.textContent = option.subtitle || ''
        }

        let map = null

        function buildMap(code) {
            resetMapDom()

            const option = getOption(code)
            syncHeaderText(option)
            const insetsCfg = createOutermostInsetsConfig()
            createInsetDOMElements(document.getElementById('newInsets'), insetsCfg, resolvedInsetBoxPosition)

            map = eurostatmap
                .map('choropleth')
                .svgId(svgId)
                .containerId('container')
                .width(mapWidth)
                .height(mapHeight)
                .scale(json.scale)
                // 'mixed' (not the concrete json.nutsLevel) so any country whose data is only
                // coded at country level (e.g. Bosnia and Herzegovina, Türkiye - see comments.md)
                // renders as a single flat "data not available" region with no regional
                // boundaries, matching Ukraine and the static maps - see AGENTS.md's
                // "nutsLevel_ === 'mixed'" section for what this flips on.
                .nutsLevel('mixed')
                .position(resolvedPosition)
                .insets(insetsCfg)
                .insetBoxPosition(resolvedInsetBoxPosition)
                .zoomButtons(true)
                .zoomExtent(zoomExtent || [1, 10])

                // classification (fixed across all dropdown options)
                .colors(json.colors)
                .numberOfClasses(json.colors.length)
                .classificationMethod('threshold')
                .thresholds(json.thresholds)

                .footer(true)
                .showEstatLogo(true)
                //.showEstatRibbon(true)
                .logoPosition([2, mapHeight - 30])
                .ribbonPosition([mapWidth - 180, mapHeight - 30])
                .ribbonWidth(300)
                .ribbonHeight(50)
                .showSourceLink(false)
                .footnote(buildFootnote(option.footnote, option.source))
                .footnoteTooltipText(false)
                .footnoteWrap(75)

                //legendButton(true)
                .legend({
                    title: json.legendTitle,
                    x: 5,
                    y: 90,
                    boxPadding: 4,
                    boxOpacity: 0.9,
                    tickLength: 3,
                    sepLineLength: 22,
                    labelOffsets: { x: 5, y: 0 },
                    titlePadding: -7,
                    shapeHeight: 15,
                    shapeWidth: 20,
                    noDataShapeWidth: 20,
                    noDataShapeHeight: 15,
                    noDataPadding: 5,
                    maxMin: true,
                    labelFormatter: labelFormatter,
                    onlyApplyOpacityWhileZoomed: true,
                })
                .stat({
                    customData: option.data,
                    unitText: json.unitText,
                })

                .onBuild(() => {
                    // The library positions the footer group (translates it below the drawing
                    // area) in its own setTimeout(..., 20) inside recalculateLayout(), which runs
                    // AFTER onBuild fires. Measuring #em-footer-* here would catch it still at its
                    // untransformed (0,0) position, near the top of the SVG - defer past that.
                    setTimeout(() => {
                        addCartographyCredits(svgId, mapWidth)
                        // Scale #map-frame fluidly via CSS/viewBox (see responsive-map.js) instead
                        // of leaving it pinned at its native pixel size. Must run AFTER
                        // addCartographyCredits, which may grow #map's height attribute to fit the
                        // credits/footnote - makeResponsive reads that attribute to build the
                        // viewBox, so calling it first would scale to a stale (too-short) height
                        // and clip the credits once scaled.
                        RYBResponsiveMap.makeResponsive('map-frame', svgId)
                    }, 30)
                })

            map.build()
        }

        let currentCode = json.options[0].code
        buildMap(currentCode)

        // dropdown: the <ewc-singleselect> element (with its `options` attribute) is already
        // declared in the page HTML - just wire it up, exactly like human-services/dropdown.js.
        await customElements.whenDefined('ewc-singleselect')
        const select = document.getElementById(dropdownSelectId)
        if (!select) return console.warn('#' + dropdownSelectId + ' not found')

        select.addEventListener('option-selected', (e) => {
            currentCode = e.detail.option.code
            buildMap(currentCode)
        })
    }

    window.RYBDropdownChoropleth = { init }
})()
