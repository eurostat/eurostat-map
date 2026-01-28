import { select } from 'd3-selection'
import { executeForAllInsets } from './utils'

export function appendCoastalMargin(out) {
    if (!out.svg_ || !out._pathFunction) return

    const draw = (map) => {
        const zg = select('#em-zoom-group-' + map.svgId_)
        if (zg.empty()) return

        // Remove only within THIS zoom group
        zg.select('.em-coastal-margin').remove()

        if (!map.drawCoastalMargin_) return

        // Ensure filter once (SVG-level)
        ensureCoastalMarginFilter(map.svg_, map.coastalMarginSettings_)

        // Create margin group
        const cg = zg
            .append('g')
            .attr('class', 'em-coastal-margin')
            .attr('filter', 'url(#em-coastal-margin-filter)')
            .attr('fill', 'none')
            .style('stroke', map.coastalMarginSettings_.color)
            .style('stroke-width', map.coastalMarginSettings_.strokeWidth)
            .style('opacity', map.coastalMarginSettings_.opacity)
            .attr('pointer-events', 'none')

        // Helper
        const drawPaths = (features, predicate, cls) => {
            if (!features) return
            cg.append('g').attr('class', cls).selectAll('path').data(features.filter(predicate)).enter().append('path').attr('d', map._pathFunction)
        }

        drawPaths(map.Geometries.geoJSONs.cntbn, (d) => d.properties.co === 'T', 'em-coastal-margin-cnt')

        drawPaths(map.Geometries.geoJSONs.nutsbn, (d) => d.properties.co === 'T', 'em-coastal-margin-nuts')

        drawPaths(map.Geometries.geoJSONs.worldbn, (d) => d.properties.COAS_FLAG === 'T', 'em-coastal-margin-world')

        // Z-order: above sea, below land
        const parent = cg.node().parentNode
        const refIndex = map.geo_ === 'WORLD' ? 3 : 1
        if (parent.childNodes[refIndex]) {
            parent.insertBefore(cg.node(), parent.childNodes[refIndex])
        }
    }

    // Insets first (their own SVGs)
    if (out.insetTemplates_) {
        executeForAllInsets(out.insetTemplates_, out.svgId_, draw)
    }

    // Main map
    draw(out)
}

function ensureCoastalMarginFilter(svg, settings) {
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs')

    if (!defs.select('#em-coastal-margin-filter').empty()) return

    const filter = defs
        .append('filter')
        .attr('id', 'em-coastal-margin-filter')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%')

    // Outer glow
    filter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', settings.standardDeviation).attr('result', 'blur')

    // Fade it
    filter
        .append('feColorMatrix')
        .attr('in', 'blur')
        .attr('type', 'matrix')
        .attr(
            'values',
            `
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 ${settings.opacity ?? 0.4} 0
        `
        )
        .attr('result', 'blurred')

    // Merge sharp line back on top
    const merge = filter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blurred')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')
}
