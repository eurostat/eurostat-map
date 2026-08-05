import { select, selectAll } from 'd3-selection'
import { updateLegendButtonPosition } from './buttons/legend-button'
import { updateInsetsButtonPosition } from './buttons/insets-button'
import { updateZoomButtonsPosition } from './buttons/zoom-buttons'

//types
/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */

/**
 * @param {MapInstance} out
 */
export const createMapSVG = function (out) {
    //get svg element. Create it if it does not exists
    let svg = select('#' + out.svgId())
    if (svg.size() == 0) {
        svg = select('body').append('svg').attr('id', out.svgId())
    }
    svg.attr('class', 'em-map')
    if (out.isInset) svg.classed('em-inset', true)

    // Determine the base map type
    const baseLayer = out.layers_ && out.layers_.find(l => l.role === 'base')
    const mapType = baseLayer ? (baseLayer.type || baseLayer._mapType) : out._mapType

    const CANONICAL_MAP_TYPES = {
        choropleth: 'ch',
        ch: 'ch',
        categorical: 'ct',
        ct: 'ct',
        proportionalSymbol: 'ps',
        proportionalSymbols: 'ps',
        ps: 'ps',
        bivariateChoropleth: 'chbi',
        chbi: 'chbi',
        trivariateChoropleth: 'chtri',
        ternary: 'chtri',
        chtri: 'chtri',
        stripeComposition: 'scomp',
        stripe: 'scomp',
        scomp: 'scomp',
        pieChart: 'pie',
        pie: 'pie',
        composition: 'pie',
        sparkline: 'spark',
        spark: 'spark',
        sparklines: 'spark',
        flow: 'flow',
        flowmap: 'flow',
        coxcomb: 'coxcomb',
        polar: 'coxcomb',
    }
    const typeClass = CANONICAL_MAP_TYPES[mapType] || mapType

    if (typeClass) {
        svg.classed('em--' + typeClass, true)
        // pies and coxcombs are proportional symbols, so add proportional-symbols class too
        if (typeClass === 'pie' || typeClass === 'coxcomb' || typeClass === 'ps') {
            svg.classed('em--ps', true)
        }
    }
    return svg
}

export const wrapMapSvg = function (svg) {
    const node = svg.node()
    if (!node) return

    const parent = node.parentNode
    if (!parent) return

    // already wrapped
    if (parent.classList?.contains('em-map-wrapper')) return parent

    // If parent is itself SVG (e.g. IMAGE, which nests the whole map inside one outer
    // <svg> so static PNG/SVG exports are a single self-contained document), a plain HTML
    // <div> can't be inserted there and the map node can't be reparented into one without
    // breaking its coordinate system. Walk up to the first non-SVG ancestor (the real HTML
    // element the SVG document sits in) and overlay the spinner/tooltip wrapper there instead.
    if (parent instanceof SVGElement) {
        let host = parent
        while (host instanceof SVGElement) {
            host = host.parentNode
            if (!host) return
        }

        // Reuse the existing overlay host rather than creating a new one on every rebuild -
        // buildMapTemplateBase() calls wrapMapSvg() again on each build()/update(), and each
        // fresh div left the previous one (potentially still showing "Loading...") orphaned on
        // top of the new map, since it's a sibling overlay appended to `host` rather than a
        // container the old svg node was reparented into (unlike the non-nested-SVG branch below,
        // where `parent.classList.contains('em-map-wrapper')` correctly detects reuse because the
        // svg node's own parent *is* the wrapper).
        const existingOverlayHost = host.querySelector(':scope > .em-map-wrapper')
        if (existingOverlayHost) return existingOverlayHost

        const overlayHost = document.createElement('div')
        overlayHost.className = 'em-map-wrapper'
        overlayHost.style.position = 'absolute'
        overlayHost.style.inset = '0'
        // This div sits on top of the existing map content (rather than containing it, like the
        // normal wrapper below), so it must not block hover/click on the map underneath. Only
        // #em-loading-overlay (which sets its own pointer-events: auto while visible) should
        // ever intercept events here.
        overlayHost.style.pointerEvents = 'none'
        if (getComputedStyle(host).position === 'static') {
            host.style.position = 'relative'
        }
        host.appendChild(overlayHost)

        return overlayHost
    }

    const wrapper = document.createElement('div')
    wrapper.className = 'em-map-wrapper'

    parent.insertBefore(wrapper, node)
    wrapper.appendChild(node)

    return wrapper
}

export const recalculateLayout = function (out) {
    const svg = out.svg()
    const header = svg.select('#em-header-' + out.svgId_)
    const drawing = svg.select('#em-drawing-' + out.svgId_)
    const footer = svg.select('#em-footer-' + out.svgId_)
    const frame = drawing.select('#em-frame-' + out.geo_)
    const clipRect = svg.select(`#${out.svgId_}-clip-path rect`)

    let headerHeight = 0
    let footerHeight = 0

    // --- Define consistent vertical padding between header and map ---
    const headerMapPadding = out.headerPadding_ ? out.headerPadding_ : 20 // px (tweak visually as needed)
    const footerMapPadding = out.footerPadding_ ? out.footerPadding_ : 10 // px below map before footer

    // --- Measure header height ---
    if (out.header_ && !header.empty()) {
        const hb = header.node()?.getBBox?.()
        if (hb) headerHeight = hb.height + headerMapPadding
    }

    // --- Measure footer height ---
    if (out.footer_ && !footer.empty()) {
        const fb = footer.node()?.getBBox?.()
        if (fb) footerHeight = fb.height + footerMapPadding
    }

    // --- Move the map group below the header ---
    drawing.attr('transform', `translate(0, ${headerHeight})`)

    // --- Move footer below map ---
    footer.attr('transform', `translate(0, ${headerHeight + out.height_ + footerMapPadding})`)

    // --- Frame bounds ---
    frame.attr('x', 0).attr('y', 0).attr('width', out.width_).attr('height', out.height_)

    // --- Update clipRect (same dimensions as map area) ---
    clipRect.attr('x', 0).attr('y', 0).attr('width', out.width_).attr('height', out.height_)

    // --- Resize entire SVG ---
    const totalHeight = out.height_ + headerHeight + footerHeight + footerMapPadding
    svg.attr('width', out.width_).attr('height', totalHeight)

    if (out.zoomButtons_ && !out.gridCartogram_) updateZoomButtonsPosition(out)
    // Always attempt this (not gated on out.insetsButton_): the button may exist even when that
    // flag is false, via the mobile auto-show default in map-instance.js. updateInsetsButtonPosition
    // itself no-ops safely if the button isn't in the DOM.
    updateInsetsButtonPosition(out)
    if (out.legendButton_) updateLegendButtonPosition(out)
    if (out.legendObj_?.applyPosition) out.legendObj_.applyPosition()
}
