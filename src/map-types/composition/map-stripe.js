import { select } from 'd3-selection'
import { arc, pie } from 'd3-shape'
import { schemeCategory10 } from 'd3-scale-chromatic'
import { createStatMap } from '../../core/stat-map'
import * as StripeCompositionLegend from '../../legend/legend-stripe-composition'
import { getRegionsSelector } from '../../core/utils'
import { buildGetterSetters, applyConfigValues, getComposition, addMouseEventsToRegions, buildStatCompositionMethod } from './composition-map'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/map-types/composition/CompositionStatConfig').CompositionMapConfig} CompositionMapConfig */

/**
 * Return a stripe composition map.
 *
 * Regions are filled with a proportional stripe pattern — one stripe per category,
 * widths proportional to the category share. Unlike pie/waffle/bar maps, this type
 * fills regions directly rather than drawing a centroid symbol, and has no
 * proportional sizing (all regions show the same total stripe width).
 *
 * @param {*} config
 */
export const map = function (config) {
    const out = createStatMap(config, false, 'scomp')

    // ── Config defaults ──────────────────────────────────────────────────────

    out.stripeWidth_ = 50
    out.stripeOrientation_ = 0 // degrees; 0 = vertical stripes

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.showOnlyWhenComplete_ = false

    // Tooltip pie chart dimensions
    out.pieChartRadius_ = 40
    out.pieChartInnerRadius_ = 15

    // Internal — stripe maps don't use a totalCode
    out.statCodes_ = undefined

    // ── Getters/setters ──────────────────────────────────────────────────────
    buildGetterSetters(out, [
        'stripeWidth_',
        'stripeOrientation_',
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'pieChartRadius_',
        'pieChartInnerRadius_',
        'statCodes_',
    ])

    applyConfigValues(out, config, [
        'stripeWidth',
        'stripeOrientation',
        'catColors',
        'catLabels',
        'showOnlyWhenComplete',
        'noDataFillStyle',
        'pieChartRadius',
        'pieChartInnerRadius',
        'statCodes',
    ])

    // ── Convenience wrapper ──────────────────────────────────────────────────
    // Stripe maps have no totalCode — pass null so getComposition skips that logic
    const _getComposition = (id) => getComposition(id, out, null)

    // ── statComp config method ───────────────────────────────────────────────

    /**
     * Configure the stripe composition map using a single config object.
     *
     * @param {Object} config
     * @param {String} config.eurostatDatasetCode
     * @param {Object} [config.filters]
     * @param {String} [config.unitText]
     * @param {String} config.categoryParameter
     * @param {Array}  config.categoryCodes
     * @param {Array}  [config.categoryLabels]
     * @param {Array}  [config.categoryColors]
     *
     * @example
     * .statComp({
     *   eurostatDatasetCode: 'demo_pjan',
     *   filters: { sex: 'T' },
     *   unitText: 'Population',
     *   categoryParameter: 'age',
     *   categoryCodes: ['Y_LT15', 'Y15-64', 'Y_GE65'],
     *   categoryLabels: ['Under 15', '15-64', '65+'],
     *   categoryColors: ['#4daf4a', '#377eb8', '#e41a1c'],
     * })
     */
    out.statComp = buildStatCompositionMethod(out, null)

    // ── Classification ───────────────────────────────────────────────────────

    //@override
    out.updateClassification = function () {
        // Resolve statCodes from registered stat data if not explicitly set
        if (!out.statCodes_) {
            out.statCodes_ = Object.keys(out.statData_)
            const index = out.statCodes_.indexOf('default')
            if (index > -1) out.statCodes_.splice(index, 1)
        }
        return out
    }

    // ── Styling ──────────────────────────────────────────────────────────────

    //@override
    out.updateStyle = function () {
        // Assign default colors if not specified
        if (!out.catColors()) {
            out.catColors({})
            for (let i = 0; i < out.statCodes_.length; i++) {
                out.catColors()[out.statCodes_[i]] = schemeCategory10[i % 10]
            }
        }

        out.catLabels_ = out.catLabels_ || {}

        // Apply stripe fill patterns directly to region paths
        out.svg()
            .selectAll(getRegionsSelector(out))
            .style('fill', function (d) {
                if (this.parentNode.classList.contains('em-cntrg')) return

                const id = d.properties.id
                const composition = _getComposition(id)

                if (!composition) return out.noDataFillStyle() || 'gray'

                // Build an SVG <pattern> for this region
                const patt = out
                    .svg()
                    .append('pattern')
                    .attr('id', 'pattern_' + id)
                    .attr('x', '0')
                    .attr('y', '0')
                    .attr('width', out.stripeWidth())
                    .attr('height', 1)
                    .attr('patternUnits', 'userSpaceOnUse')

                if (out.stripeOrientation()) {
                    patt.attr('patternTransform', 'rotate(' + out.stripeOrientation() + ')')
                }

                // Background fallback
                patt.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', out.stripeWidth())
                    .attr('height', 1)
                    .style('stroke', 'none')
                    .style('fill', 'lightgray')

                // One stripe rect per category, proportionally wide, animated
                let x = 0
                for (const code in composition) {
                    let dx = composition[code]
                    if (!dx) continue
                    dx *= out.stripeWidth()

                    patt.append('rect')
                        .attr('x', x)
                        .attr('y', 0)
                        .attr('height', 1)
                        .style('stroke', 'none')
                        .attr('code', code)
                        .style('fill', out.catColors()[code] || 'lightgray')
                        .style('pointer-events', 'none')
                        .transition()
                        .duration(out.transitionDuration())
                        .on('end', function () {
                            select(this).style('pointer-events', null)
                        })
                        .attr('width', dx)

                    x += dx
                }

                return 'url(#pattern_' + id + ')'
            })
            .attr('nd', function (d) {
                return !_getComposition(d.properties.id) ? 'nd' : ''
            })

        // Region hover/tooltip events
        const regions = out.svg().selectAll(getRegionsSelector(out))
        addMouseEventsToRegions(regions, out)

        return out
    }

    // ── Legend ───────────────────────────────────────────────────────────────
    out.getLegendConstructor = function () {
        return StripeCompositionLegend.legend
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────

    // Pre-build pie arcs for tooltip (stripe maps show a summary pie in the tooltip)
    const _tooltipPie = pie()
        .sort(null)
        .value((d) => d.value)

    const tooltipTextFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const comp = _getComposition(regionId)
        const data = comp ? Object.entries(comp).map(([code, value]) => ({ code, value })) : []

        let html = `<div class="em-tooltip-bar"><b>${regionName}</b>${regionId ? ` (${regionId})` : ''}</div>`

        if (!data.length) {
            html += `<div>${out.noDataText()}</div>`
            return html
        }

        const r = out.pieChartRadius()
        const ir = out.pieChartInnerRadius()
        const arcGen = arc().innerRadius(ir).outerRadius(r)
        const pieData = _tooltipPie(data)

        let paths = ''
        for (const d of pieData) {
            const fill = out.catColors()[d.data.code] || 'lightgray'
            paths += `<path d="${arcGen(d)}" fill="${fill}" stroke="darkgray"></path>`
        }

        html += `
        <div style="display: flex; justify-content: center;">
            <svg viewBox="${-r} ${-r} ${2 * r} ${2 * r}" width="${2 * r}">
                <g>${paths}</g>
            </svg>
        </div>`

        return html
    }

    out.tooltip_.textFunction = tooltipTextFunction

    return out
}
