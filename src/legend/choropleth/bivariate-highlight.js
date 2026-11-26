import { select } from 'd3-selection'
import * as Legend from '../legend'
import { getLegendRegionsSelector } from '../../core/utils'

// Highlight selected regions on mouseover
export function highlightBivariateRegions(map, ecl1, ecl2) {
    const selector = getLegendRegionsSelector(map)
    const dimmedFill = Legend.getDimmedFill(map)
    const allRegions = map.svg_.selectAll(selector).selectAll('[ecl1]')

    map._bivariateLegendHighlightActive = true

    allRegions.each(function () {
        const sel = select(this)
        if (!sel.attr('data-fill')) sel.attr('data-fill', sel.style('fill'))
    })

    allRegions.style('fill', dimmedFill)

    allRegions
        .filter(`[ecl1='${ecl1}']`)
        .filter(`[ecl2='${ecl2}']`)
        .filter(':not([nd])')
        .each(function () {
            select(this).style('fill', select(this).attr('data-fill'))
        })
}

export function unhighlightBivariateRegions(map) {
    const selector = getLegendRegionsSelector(map)
    map.svg_
        .selectAll(selector)
        .selectAll('[ecl1],[ecl2]')
        .each(function () {
            const sel = select(this)
            const original = sel.attr('data-fill')
            if (original) sel.style('fill', original)
        })
    map._bivariateLegendHighlightActive = false
}
