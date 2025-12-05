import { select } from 'd3-selection'
import * as StatMap from '../../core/stat-map'
import * as TrivariateLegend from '../../legend/choropleth/legend-choropleth-trivariate'
import { getRegionsSelector, executeForAllInsets, spaceAsThousandSeparator } from '../../core/utils'
import { ternaryClassifier, ternaryColorClassifier } from './ternary-utils' // your extracted functions

/**
 * Trivariate (ternary) choropleth map.
 * Uses ternaryClassifier/ternaryColorClassifier for classification and coloring.
 */
export const map = function (config) {
    const out = StatMap.statMap(config, false, 'chtri')

    // Default colors (can be overridden via config)
    out.color1_ = config?.color1 || '#e41a1c' // Red
    out.color2_ = config?.color2 || '#4daf4a' // Green
    out.color3_ = config?.color3 || '#377eb8' // Blue
    out.startColor_ = config?.startColor || '#e8e8e8'

    out.centerCoefficient_ = config?.centerCoefficient || 0.2 // controls center circle size
    out.noDataFillStyle_ = config?.noDataFillStyle || '#ccc'

    // The classifier (will be created dynamically)
    out.colorClassifier_ = null

    // Tooltip renderer
    out.tooltip_.textFunction = tooltipTextFunctionTrivariate

    // Getter/setters for exposed attributes
    const paramNames = ['color1_', 'color2_', 'color3_', 'centerCoefficient_', 'noDataFillStyle_', 'colorClassifier_']
    paramNames.forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config) {
        paramNames.forEach(function (key) {
            let k = key.slice(0, -1) // remove trailing underscore
            if (config[k] != undefined) out[key](config[k])
        })
    }

    //@override
    out.updateClassification = function () {
        if (!out.statData('v1') || !out.statData('v2') || !out.statData('v3')) return out

        // Build a single ternary color classifier
        out.colorClassifier_ = ternaryColorClassifier(
            ['value1', 'value2', 'value3'],
            (d) => (+d.value1 || 0) + (+d.value2 || 0) + (+d.value3 || 0),
            [out.color1(), out.color2(), out.color3()],
            {
                centerCoefficient: out.centerCoefficient(),
                withMixedClasses: true,
                defaultColor: out.noDataFillStyle(),
            }
        )

        // Apply to all insets and main map
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
        }
        applyClassificationToMap(out)

        return out
    }

    function applyClassificationToMap(map) {
        if (!map.svg_) return
        const selector = getRegionsSelector(map)
        const regions = map.svg().selectAll(selector)

        regions.each(function (rg) {
            const v1 = +map.statData('v1').get(rg.properties.id)?.value || 0
            const v2 = +map.statData('v2').get(rg.properties.id)?.value || 0
            const v3 = +map.statData('v3').get(rg.properties.id)?.value || 0

            // Attach synthetic properties for classifier
            const d = { value1: v1, value2: v2, value3: v3 }
            const total = v1 + v2 + v3

            if (!total) {
                select(this).attr('regionClass', 'nd').style('fill', out.noDataFillStyle())
            } else {
                const color = out.colorClassifier_(d)
                select(this).attr('regionClass', 'tri').style('fill', color)
            }
        })
    }

    //@override
    out.updateStyle = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, styleRegions)
        }
        styleRegions(out)
        addMouseEventsToRegions(out, out.svg().selectAll(getRegionsSelector(out)))
        return out
    }

    function styleRegions(map) {
        if (!map.svg()) return
        const selector = getRegionsSelector(map)
        map.svg()
            .selectAll(selector)
            .transition()
            .duration(out.transitionDuration())
            .style('fill', function (rg) {
                const v1 = +map.statData('v1').get(rg.properties.id)?.value || 0
                const v2 = +map.statData('v2').get(rg.properties.id)?.value || 0
                const v3 = +map.statData('v3').get(rg.properties.id)?.value || 0
                const d = { value1: v1, value2: v2, value3: v3 }
                const total = v1 + v2 + v3
                return total ? out.colorClassifier_(d) : out.noDataFillStyle()
            })
            .end()
            .then(() => {
                map.svg()
                    .selectAll(selector)
                    .each(function () {
                        const sel = select(this)
                        sel.attr('fill___', sel.style('fill'))
                    })
            })
    }

    const addMouseEventsToRegions = function (map, regions) {
        const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)
        regions
            .on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', map.hoverColor_) // Apply highlight color
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
                sel.style('fill', sel.attr('fill___')) // Revert to original color
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

/**
 * Tooltip generator for trivariate maps.
 */
const tooltipTextFunctionTrivariate = function (rg, map) {
    const buf = []
    const name = rg.properties.na || ''
    const id = rg.properties.id || ''
    buf.push(`<div class="em-tooltip-bar">${name}${id ? ` (${id})` : ''}</div>`)

    const sv1 = map.statData('v1').get(id)
    const sv2 = map.statData('v2').get(id)
    const sv3 = map.statData('v3').get(id)

    buf.push(`<div class="em-tooltip-text" style="background:#fff;color:#171a22;padding:4px;font-size:15px;">
      <table class="em-tooltip-table"><tbody>
        <tr><td>${map.statData('v1').label_ || 'Variable 1'}: ${sv1?.value ? spaceAsThousandSeparator(sv1.value) : ''} ${sv1?.unitText?.() || ''}</td></tr>
        <tr><td>${map.statData('v2').label_ || 'Variable 2'}: ${sv2?.value ? spaceAsThousandSeparator(sv2.value) : ''} ${sv2?.unitText?.() || ''}</td></tr>
        <tr><td>${map.statData('v3').label_ || 'Variable 3'}: ${sv3?.value ? spaceAsThousandSeparator(sv3.value) : ''} ${sv3?.unitText?.() || ''}</td></tr>
      </tbody></table></div>`)

    return buf.join('')
}
