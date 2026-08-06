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
// and 2026/common/insets/overseas.js (createOutermostInsetsConfig/createInsetDOMElements).
;(function () {
    function buildFootnote(footnote, source) {
        const parts = []
        if (footnote) parts.push(footnote)
        if (source) parts.push('<tspan style="font-style: italic;">Source</tspan>: ' + source.replace(/^Source:\s*/i, ''))
        return parts.join('<br/>')
    }

    // Boilerplate cartography credit lines used across RYB/2026 maps (see CH02M03.html, CH03M02.html,
    // CH10M02.html). Those pages position each line at a hand-tuned "mapWidth - N" left edge, which
    // only avoids clipping because they all use one large fixed MAPWIDTH (797) the offsets were
    // tuned against. Our mapWidth is computed from the actual (possibly much narrower) container, so
    // the same fixed offsets run text off the right edge. Right-align instead (text-anchor: end at a
    // fixed right margin) so it fits regardless of mapWidth or exact rendered text width.
    //
    // Y position is relative to the ACTUAL rendered footer bottom (not a fixed offset from
    // mapHeight, for the same reason - our footnote, note + source combined, is taller than theirs).
    function addCartographyCredits(svgId, mapWidth) {
        const svg = d3.select('#' + svgId)
        svg.selectAll('#em-footnote-2, #em-footnote-3').remove()

        let creditsY = 20
        const footerGroup = svg.select('#em-footer-' + svgId)
        if (!footerGroup.empty()) {
            const transformMatch = (footerGroup.attr('transform') || '').match(/translate\(\s*[-\d.]+(?:[,\s]+([-\d.]+))?\s*\)/)
            const groupY = transformMatch ? Number(transformMatch[1]) || 0 : 0
            const node = footerGroup.node()
            const bbox = node && node.getBBox ? node.getBBox() : null
            // Bottom edge of the footer group's own content (note + source, see buildFootnote),
            // in absolute SVG space, plus a small gap - not "- 10", which landed the credits'
            // baseline at roughly the SAME height as the footnote's own baseline (overlapping it)
            // rather than below its full rendered box.
            if (bbox) creditsY = groupY + bbox.y + bbox.height + 12
        }

        const rightEdge = mapWidth - 10
        const creditsBottom = creditsY + 13 + 4 // second line's y (creditsY + 13, set below) + its own line height

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

        // #map-frame (the outer wrapper #map sits in - see the comment on it in measure()) must
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
        const {
            dataUrl,
            mapContainerId = 'map-container',
            svgId = 'map',
            dropdownSelectId = 'optionSelect',
            position,
            insetBoxPosition,
            zoomExtent,
        } = config

        const res = await fetch(dataUrl)
        const json = await res.json()

        const mapContainer = document.getElementById(mapContainerId)
        // Mutable sizing state, recomputed by measure() on init and on every resize (see the
        // resize listener at the bottom of init()) so the map stays fluid - CSS alone (#container's
        // max-width: 700px) shrinks the surrounding HTML boxes, but #map/#map-frame's own SVG
        // width ATTRIBUTE only changes when we explicitly recompute and re-apply it here.
        let isMobile, mapWidth, mapHeight, resolvedPosition, resolvedInsetBoxPosition

        function measure() {
            isMobile = window.innerWidth <= 699
            mapWidth = mapContainer ? mapContainer.clientWidth : isMobile ? window.innerWidth : 700

            // #map-container is content-driven height now (see dropdown-choropleth.css), not
            // clamped to a fixed viewport-derived height - so mapHeight only needs to express the
            // drawing area's own natural framing (continental Europe, ~0.82x mapWidth), not fit
            // inside any pre-existing container budget. #map-frame/#map-container then grow to
            // whatever the map (drawing area + footer + our credits, see addCartographyCredits)
            // actually renders at - nothing is ever clipped, regardless of footnote length.
            mapHeight = Math.max(Math.round(mapWidth * 0.82), 240)

            // #map-frame wraps #map only so the static insets group (<g id="newInsets">) has a valid
            // SVG rendering context (see the comment on #map in dropdown-choropleth.css). Percentage
            // width/height on a NESTED <svg> (one inside another <svg>, as opposed to inside a plain
            // HTML element) resolves unreliably in Chromium - #map-frame's own rendered box can end up
            // many times too large. Giving it explicit pixel dimensions here (matching the proven
            // working pattern in CH02M03.html/CH10M02.html, whose wrapping <svg id="container"> always
            // has a fixed pixel height, never height:100%) sidesteps that entirely. Height is set to
            // match mapHeight for now and grown further in addCartographyCredits once the real
            // (footnote-length-dependent) footer content height is known.
            const mapFrameEl = document.getElementById('map-frame')
            if (mapFrameEl) {
                mapFrameEl.setAttribute('width', mapWidth)
                mapFrameEl.setAttribute('height', mapHeight)
            }

            // Default continental-Europe framing; overseas regions are shown separately via the static insets.
            resolvedPosition = position || { x: 4900000, y: 3400000, z: 7000 }
            resolvedInsetBoxPosition = insetBoxPosition || [mapWidth - 250, 8]
        }

        measure()

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
                .zoomExtent(zoomExtent || (isMobile ? [0.7, 10] : [0.6, 10]))

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
                    position: isMobile ? 'top left' : '',
                    x: isMobile ? undefined : 5,
                    y: isMobile ? undefined : 90,
                    boxPadding: 4,
                    boxOpacity: 0.9,
                    tickLength: 3,
                    sepLineLength: 15,
                    titlePadding: 0,
                    shapeHeight: 15,
                    shapeWidth: 15,
                    noDataShapeWidth: 15,
                    noDataShapeHeight: 15,
                    noDataPadding: 2,
                    maxMin: false,
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
                    setTimeout(() => addCartographyCredits(svgId, mapWidth), 30)
                })

            map.build()
        }

        let currentCode = json.options[0].code
        buildMap(currentCode)

        // Re-measure and rebuild on resize so the map stays fluid for its whole lifetime, not just
        // at initial load - these maps are embedded in iframes on the Eurostat website, which can
        // resize the iframe (e.g. on window resize/orientation change) without reloading the page.
        // Debounced since a full rebuild re-fetches nothing but does redraw geometries/insets, which
        // isn't free; only the container WIDTH actually matters (CSS max-width: 700px already caps
        // it), so skip rebuilding on pure height-only changes (e.g. a mobile URL bar hide/show).
        let resizeTimer = null
        let lastMeasuredWidth = mapWidth
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer)
            resizeTimer = setTimeout(() => {
                const newWidth = mapContainer ? mapContainer.clientWidth : window.innerWidth
                if (newWidth === lastMeasuredWidth) return
                lastMeasuredWidth = newWidth
                measure()
                buildMap(currentCode)
            }, 150)
        })

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
