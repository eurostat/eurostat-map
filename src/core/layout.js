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

    //  If parent is SVG (e.g. IMAGE), abandon wrapping
    if (parent instanceof SVGElement) return

    // already wrapped
    if (parent.classList?.contains('em-map-wrapper')) return parent

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
    if (out.insetsButton_) updateInsetsButtonPosition(out)
    if (out.legendButton_) updateLegendButtonPosition(out)
    if (out.legendObj_?.applyPosition) out.legendObj_.applyPosition()
}
