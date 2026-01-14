import { select } from 'd3-selection'
import * as StatMap from '../../core/stat-map'
import * as TrivariateLegend from '../../legend/choropleth/legend-choropleth-trivariate'
import { getRegionsSelector, executeForAllInsets, spaceAsThousandSeparator } from '../../core/utils'
import { tricolore, CompositionUtils } from '../../lib/tricolore'


/**
 * Trivariate (ternary) choropleth map — Observable-style
 */
export const map = function (config) {
    const out = StatMap.statMap(config, false, 'chtri')

    // ===============================
    // Configuration
    // ===============================

    out.ternaryCodes_ = config?.ternaryCodes || ['v1', 'v2', 'v3']

    out.meanCentering_ = config?.meanCentering ?? true
    out.noDataFillStyle_ = config?.noDataFillStyle || '#ccc'

    // tricolore parameters
    out.hue_ = config?.hue ?? 10
    out.chroma_ = config?.chroma ?? 120
    out.lightness_ = config?.lightness ?? 70
    out.contrast_ = config?.contrast ?? 0.2
    out.spread_ = config?.spread ?? 0.8
    out.breaks_ = config?.breaks ?? 16

    // internal cache (index → color)
    out._ternaryColors_ = null

    // Tooltip renderer
    out.tooltip_.textFunction = tooltipTextFunctionTrivariate

    // ===============================
    // Getters / setters
    // ===============================

    ;[
        'ternaryCodes_',
        'meanCentering_',
        'noDataFillStyle_',
        'hue_',
        'chroma_',
        'lightness_',
        'contrast_',
        'spread_',
        'breaks_',
    ].forEach((att) => {
        out[att.slice(0, -1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    // ===============================
    // Classification (compute colors ONCE)
    // ===============================
    //@override
    out.updateClassification = function () {
        const features = out.Geometries.getRegionFeatures()
        if (!features || features.length === 0) return out

        const [c1, c2, c3] = out.ternaryCodes_
        if (!out.statData(c1) || !out.statData(c2) || !out.statData(c3)) {
            console.warn('Ternary map requires exactly 3 stat datasets')
            return out
        }

        // --- Build composition array in feature order ---
        const compositions = features.map((f) => {
            const id = f.properties.id
            const v1 = +out.statData(c1).get(id)?.value || 0
            const v2 = +out.statData(c2).get(id)?.value || 0
            const v3 = +out.statData(c3).get(id)?.value || 0
            return [v1, v2, v3]
        })

        // --- Determine center ---
        const center = out.meanCentering_
            ?  CompositionUtils.centre(compositions)
            : [1 / 3, 1 / 3, 1 / 3]

        // --- Compute colors (Observable-style) ---
        out._ternaryColors_ = tricolore(compositions, {
            center,
            breaks: out.breaks_,
            hue: out.hue_,
            chroma: out.chroma_,
            lightness: out.lightness_,
            contrast: out.contrast_,
            spread: out.spread_,
        })

        return out
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

    function styleRegions(map) {
        if (!map.svg() || !map._ternaryColors_) return

        const selector = getRegionsSelector(map)
        const colors = map._ternaryColors_

        map.svg()
            .selectAll(selector)
            .transition()
            .duration(out.transitionDuration())
            .style('fill', function (rg, i) {
                const c = colors[i]
                return c || map.noDataFillStyle_()
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

    buf.push(`<div class="em-tooltip-text" style="background:#fff;color:#171a22;padding:4px;font-size:15px;">
      <table class="em-tooltip-table"><tbody>
        <tr><td>${map.statData(c1).label_ || c1}: ${sv1?.value ? spaceAsThousandSeparator(sv1.value) : ''}</td></tr>
        <tr><td>${map.statData(c2).label_ || c2}: ${sv2?.value ? spaceAsThousandSeparator(sv2.value) : ''}</td></tr>
        <tr><td>${map.statData(c3).label_ || c3}: ${sv3?.value ? spaceAsThousandSeparator(sv3.value) : ''}</td></tr>
      </tbody></table></div>`)

    return buf.join('')
}
