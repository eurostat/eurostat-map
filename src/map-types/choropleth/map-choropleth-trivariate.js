import { select } from 'd3-selection'
import { createStatMap } from '../../core/stat-map'
import * as TrivariateLegend from '../../legend/choropleth/legend-choropleth-trivariate'
import { getRegionsSelector, executeForAllInsets, spaceAsThousandSeparator } from '../../core/utils'
import { tricolore, CompositionUtils } from '../../lib/tricolore/src'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/map-types/choropleth/TrivariateChoroplethConfig').TrivariateChoroplethConfig} TrivariateChoroplethConfig */
/** @typedef {import('../../types/map-types/choropleth/TrivariateChoroplethMap').TrivariateChoroplethMap} TrivariateChoroplethMap */

/**
 * Trivariate (ternary) choropleth map — Observable-style
 *
 * @param {TrivariateChoroplethConfig} [config]
 * @returns {TrivariateChoroplethMap}
 */
export const map = function (config) {
    const out = createStatMap(config, false, 'chtri')

    // ===============================
    // Configuration
    // ===============================

    out.ternaryCodes_ = ['v1', 'v2', 'v3']

    out.noDataFillStyle_ = '#ccc'

    // tricolore parameters
    out.ternarySettings_ = {
        hue: 20,
        chroma: 120,
        lightness: 70,
        contrast: 1,
        spread: 0.8,
        breaks: 5,
        meanCentering: true,
    }

    // internal cache (index → color)
    out._ternaryColors_ = null
    out._ternaryData_ = null //stats composition data
    out._ternaryCenter_ = null

    // ===============================

    // Tooltip renderer
    out.tooltip_.textFunction = tooltipTextFunctionTrivariate

    // ===============================
    // Getters / setters
    // ===============================
    const paramNames = ['ternaryCodes_', 'noDataFillStyle_', 'ternarySettings_']
    paramNames.forEach((att) => {
        const name = att.slice(0, -1)

        out[name] = function (v) {
            if (!arguments.length) return out[att]

            if (att === 'ternarySettings_') {
                // MERGE, don’t replace
                out.ternarySettings_ = {
                    ...out.ternarySettings_,
                    ...v,
                }
            } else {
                out[att] = v
            }

            return out
        }
    })

    //override attribute values with config values
    if (config) {
        paramNames.forEach(function (key) {
            let k = key.slice(0, -1) // remove trailing underscore
            if (config[k] != undefined) out[k](config[k])
        })
    }

    // ===============================
    // Classification (compute colors ONCE)
    // ===============================
    //@override
    out.updateClassification = function () {
        applyClassificationToMap(out)
        return out
    }

    function applyClassificationToMap(out) {
        out._ternaryData_ = []
        out._ternaryColorById_ = new Map()
        out._ternaryClassById_ = new Map()
        out._ternaryCenter_ = null

        const [c1, c2, c3] = out.ternaryCodes_
        const statData1 = out.statData(c1)
        const statData2 = out.statData(c2)
        const statData3 = out.statData(c3)

        // collect features from main map AND all insets
        const allMaps = [out]
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, (inset) => allMaps.push(inset))
        }

        const filtered = []
        const seenIds = new Set()

        allMaps.forEach((map) => {
            const features = map.Geometries.getRegionFeatures()
            if (!features || features.length === 0) return
            features.forEach((f) => {
                const id = f.properties.id
                if (seenIds.has(id)) return
                seenIds.add(id)
                const v1 = +statData1.get(id)?.value
                const v2 = +statData2.get(id)?.value
                const v3 = +statData3.get(id)?.value
                if (Number.isFinite(v1) && Number.isFinite(v2) && Number.isFinite(v3) && v1 + v2 + v3 > 0) {
                    filtered.push({ id, values: [v1, v2, v3] })
                }
            })
        })

        out._ternaryData_ = filtered.map((d) => d.values)
        out._ternaryCenter_ = out.ternarySettings_.meanCentering ? CompositionUtils.centre(out._ternaryData_) : [1 / 3, 1 / 3, 1 / 3]

        const colors = tricolore(out._ternaryData_, {
            center: out._ternaryCenter_,
            breaks: out.ternarySettings_.breaks,
            hue: out.ternarySettings_.hue,
            chroma: out.ternarySettings_.chroma,
            lightness: out.ternarySettings_.lightness,
            contrast: out.ternarySettings_.contrast,
            spread: out.ternarySettings_.spread,
        })

        filtered.forEach((d, i) => {
            const color = colors[i]
            if (color != null && !color.includes('NaN')) {
                out._ternaryColorById_.set(d.id, color)
                out._ternaryClassById_.set(d.id, i)
            }
        })

        // share lookup with all insets
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, (inset) => {
                inset._ternaryColorById_ = out._ternaryColorById_
                inset._ternaryClassById_ = out._ternaryClassById_
                inset._ternaryCenter_ = out._ternaryCenter_
                inset._ternaryData_ = out._ternaryData_
            })
        }
    }

    // ===============================
    // Styling (apply cached colors)
    // ===============================
    //@override
    out.updateStyle = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, styleRegions)
        }
        styleRegions(out)

        addMouseEventsToRegions(out, out.svg().selectAll(getRegionsSelector(out)))
        return out
    }

    function regionsFillFunction(rg) {
        const id = rg.properties.id
        const c = out._ternaryColorById_.get(id)
        const cls = out._ternaryClassById_.get(id)

        const sel = select(this)
        sel.attr('ecl', cls ?? null)

        return c ?? map.noDataFillStyle_
    }

    function styleRegions(map) {
        if (!map.svg() || !map._ternaryColorById_) return

        const selector = getRegionsSelector(map)
        const regions = map.svg().selectAll(selector)

        // defined here so it closes over the correct map instance
        const regionsFillFunction = function (rg) {
            const id = rg.properties.id
            const c = map._ternaryColorById_.get(id)
            const cls = map._ternaryClassById_.get(id)
            select(this).attr('ecl', cls ?? null)
            return c ?? out.noDataFillStyle_
        }

        regions
            .style('pointer-events', 'none')
            .transition()
            .duration(out.transitionDuration())
            .style('fill', regionsFillFunction)
            .end()
            .then(() => {
                // Re-enable interaction after the transition
                regions.style('pointer-events', null)
                // Store the original color for each region
                regions.each(function () {
                    const sel = select(this)
                    sel.attr('fill___', sel.style('fill'))
                })
                // Set up mouse events
                addMouseEventsToRegions(map, regions)

                // update font color for grid cartograms (contrast)
                if (out.gridCartogram_) {
                    map.svg()
                        .selectAll('.em-grid-text')
                        .each(function () {
                            const cellColor = select(this.parentNode).style('fill')
                            select(this).attr('fill', getTextColorForBackground(cellColor))
                        })
                }
            })
            .catch((err) => {
                //console.error('Error applying transition to regions:', err)
            })
    }

    // ===============================
    // Hover / tooltip
    // ===============================
    function addMouseEventsToRegions(map, regions) {
        const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)

        regions
            .on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', map.hoverColor_)
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
            })
            .on('mousemove', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                if (out._tooltip) out._tooltip.mousemove(e)
                if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
            })
            .on('mouseout', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', sel.attr('fill___'))
                if (out._tooltip) out._tooltip.mouseout()
                if (out.onRegionMouseOut_) out.onRegionMouseOut_(e, rg, this, map)
            })
    }

    //@override
    out.getLegendConstructor = function () {
        return TrivariateLegend.legend
    }

    return out
}

// ===============================
// Tooltip
// ===============================
const tooltipTextFunctionTrivariate = function (rg, map) {
    const buf = []
    const name = rg.properties.na || ''
    const id = rg.properties.id || ''
    buf.push(`<div class="em-tooltip-bar">${name}${id ? ` (${id})` : ''}</div>`)

    const [c1, c2, c3] = map.ternaryCodes_

    const sv1 = map.statData(c1).get(id)
    const sv2 = map.statData(c2).get(id)
    const sv3 = map.statData(c3).get(id)

    const fmt = (sv) => (sv?.value != null && sv.value !== ':' ? spaceAsThousandSeparator(sv.value) + unitText : '')

    //we assume all three stats have the same unit
    const unitText = map.statData(c1).unitText() || map.statData(c2).unit_ || map.statData(c3).unit_ || ''

    buf.push(`<div class="em-tooltip-text" style="background:#fff;color:#171a22;padding:4px;font-size:15px;">
  <table class="em-tooltip-table"><tbody>
    <tr><td>${map.statData(c1).label_ || c1}: ${fmt(sv1)}</td></tr>
    <tr><td>${map.statData(c2).label_ || c2}: ${fmt(sv2)}</td></tr>
    <tr><td>${map.statData(c3).label_ || c3}: ${fmt(sv3)}</td></tr>
  </tbody></table></div>`)

    return buf.join('')
}
