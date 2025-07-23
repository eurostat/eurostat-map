import { executeForAllInsets, getLegendRegionsSelector } from '../core/utils'
import { select } from 'd3-selection'

export function appendPatternFillLegend(out, container) {
    const map = out.map
    const offsetY = 15 // offset for the pattern fill legend

    if (!map.patternFill_) return

    map.patternFill_.forEach((cfg, index) => {
        if (!cfg.legendLabel) return // skip if no label

        const y = index * out.shapeHeight + index * out.shapePadding + offsetY

        const item = container.append('g').attr('class', 'em-legend-item em-pattern-legend-item')

        const patternColor = cfg.color || '#000' // fallback to black if no color provided
        const isWhitePattern = patternColor.toLowerCase() === '#fff' || patternColor.toLowerCase() === 'white'

        // Add background if pattern is white
        if (isWhitePattern) {
            item.append('rect').attr('x', 0).attr('y', y).attr('width', out.shapeWidth).attr('height', out.shapeHeight).attr('fill', '#ddd') // light gray background
        }

        // Add pattern overlay
        item.append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', 0)
            .attr('y', y)
            .attr('width', out.shapeWidth)
            .attr('height', out.shapeHeight)
            .attr('fill', `url(#${cfg.patternId || cfg.pattern})`)
            .on('mouseover', function () {
                highlightPatternFillRegions(map, cfg.patternId || cfg.pattern)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightPatternFillRegions, cfg.patternId || cfg.pattern)
                }
            })
            .on('mouseout', function () {
                unhighlightPatternFillRegions(map)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightPatternFillRegions)
                }
            })

        // Add label
        item.append('text')
            .attr('class', 'em-legend-label')
            .attr('x', out.shapeWidth + out.labelOffsets.x)
            .attr('y', y + out.shapeHeight / 2)
            .attr('dominant-baseline', 'middle')
            .attr('dy', '0.35em') // ~vertical centering
            .text(cfg.legendLabel)
    })
}

// Highlight selected regions on mouseover
function highlightPatternFillRegions(map, patternId) {
    const targetFill = `url(#${patternId})`
    const selector = getLegendRegionsSelector(map)
    const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

    // Set all regions (except overlays) to white
    allRegions
        .filter(function () {
            return !select(this).classed('pattern-fill-overlay')
        })
        .style('fill', 'white')

    // Dim all overlays
    map.svg_.selectAll('.pattern-fill-overlay').style('opacity', 0) //.style('fill', 'unset')

    // Brighten only overlays with matching pattern fill
    map.svg_
        .selectAll('.pattern-fill-overlay')
        .filter(function () {
            return select(this).attr('fill') === targetFill
        })
        .style('opacity', 1)
    //.style('fill', 'red')
}

function unhighlightPatternFillRegions(map) {
    map.svg_.selectAll('.pattern-fill-overlay').style('opacity', 1) //.style('fill', 'unset')

    // Restore base region fills
    const selector = getLegendRegionsSelector(map)
    const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

    allRegions
        .filter(function () {
            return !select(this).classed('pattern-fill-overlay')
        })
        .each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
}
