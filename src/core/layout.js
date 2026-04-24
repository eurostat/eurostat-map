import { select, selectAll } from 'd3-selection'

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
    //add mapType css class
    svg.classed('em--' + out._mapType, true)
    // pies and coxcombs are proportional symbols, so add proportional-symbols class too
    if (out._mapType === 'pie' || out._mapType === 'coxcomb') {
        svg.classed('em--ps', true)
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
}
