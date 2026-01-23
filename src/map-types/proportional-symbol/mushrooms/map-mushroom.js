import { max } from 'd3-array'
import { scaleSqrt } from 'd3-scale'
import { arc } from 'd3-shape'
import { select } from 'd3-selection'
import * as StatMap from '../../../core/stat-map.js'
import { executeForAllInsets, spaceAsThousandSeparator } from '../../../core/utils.js'
import { runDorlingSimulation, stopDorlingSimulation } from '../../../core/dorling/dorling.js'
import { addMouseEvents } from './map-mushroom-interactions.js'

/**
 * Mushroom (dual semi-circle) proportional symbol map
 * v1 = left / top
 * v2 = right / bottom
 */
export const map = function (config) {
    const out = StatMap.statMap(config, true, 'mushroom')

    // ===============================
    // Configuration
    // ===============================

    out.mushroomCodes_ = ['v1', 'v2']
    out.mushroomMinSize_ = 4
    out.mushroomMaxSize_ = 30
    out.mushroomColors_ = ['#2c7bb6', '#d7191c']
    out.mushroomOrientation_ = 'horizontal' // 'horizontal' | 'vertical'

    out._mushroomScale_ = null

    out.tooltip_.textFunction = tooltipTextFunctionMushroom

    // ===============================
    // Getters / setters
    // ===============================

    const paramNames = ['mushroomCodes_', 'mushroomMinSize_', 'mushroomMaxSize_', 'mushroomColors_', 'mushroomOrientation_']

    paramNames.forEach((att) => {
        const name = att.slice(0, -1)
        out[name] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    // override via config
    if (config) {
        paramNames.forEach((key) => {
            const k = key.slice(0, -1)
            if (config[k] !== undefined) out[k](config[k])
        })
    }

    // ===============================
    // Classification (shared size scale)
    // ===============================
    //@override
    out.updateClassification = function () {
        out._mushroomScale_ = null

        const features = out.Geometries.getRegionFeatures()
        if (!features || features.length === 0) return out

        const [c1, c2] = out.mushroomCodes_
        const stat1 = out.statData(c1)
        const stat2 = out.statData(c2)

        const values = []

        features.forEach((f) => {
            const id = f.properties.id

            const sv1 = stat1.get(id)
            const sv2 = stat2.get(id)

            const v1 = +sv1?.value
            const v2 = +sv2?.value

            if (Number.isFinite(v1)) values.push(v1)
            if (Number.isFinite(v2)) values.push(v2)
        })

        const maxVal = max(values) || 0

        out._mushroomScale_ = scaleSqrt().domain([0, maxVal]).range([out.mushroomMinSize_, out.mushroomMaxSize_])

        return out
    }

    // ===============================
    // Styling
    // ===============================
    //@override
    out.updateStyle = function () {
        applyStyleToMap(out)

        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
        }

        // dorling cartogram
        if (out.dorling_ && out._mushroomScale_) {
            const [c1, c2] = out.mushroomCodes()
            const stat1 = out.statData(c1)
            const stat2 = out.statData(c2)

            runDorlingSimulation(out, (d) => {
                const id = d.properties.id

                const v1 = +stat1.get(id)?.value || 0
                const v2 = +stat2.get(id)?.value || 0

                const r1 = out._mushroomScale_(v1)
                const r2 = out._mushroomScale_(v2)

                // collision radius = max extent
                return Math.max(r1, r2)
            })
        } else {
            stopDorlingSimulation(out)
        }

        return out
    }

    return out
}

/**
 * Draw mushroom symbols
 */
function applyStyleToMap(map) {
    if (!map.svg() || !map._mushroomScale_) return

    const [c1, c2] = map.mushroomCodes()
    const colors = map.mushroomColors()
    const orient = map.mushroomOrientation()

    const stat1 = map.statData(c1)
    const stat2 = map.statData(c2)

    const arcGen = arc().innerRadius(0)

    const centroids = map.svg().selectAll('g.em-centroid')

    centroids.selectAll('*').remove()

    centroids.each(function (d) {
        const id = d.properties.id

        const v1 = +stat1.get(id)?.value || 0
        const v2 = +stat2.get(id)?.value || 0

        const r1 = map._mushroomScale_(v1)
        const r2 = map._mushroomScale_(v2)

        const g = select(this)

        if (orient === 'vertical') {
            // top
            g.append('path')
                .attr(
                    'd',
                    arcGen({
                        startAngle: Math.PI,
                        endAngle: 2 * Math.PI,
                        outerRadius: r1,
                    })
                )
                .attr('fill', colors[0])

            // bottom
            g.append('path')
                .attr(
                    'd',
                    arcGen({
                        startAngle: 0,
                        endAngle: Math.PI,
                        outerRadius: r2,
                    })
                )
                .attr('fill', colors[1])
        } else {
            // left
            g.append('path')
                .attr(
                    'd',
                    arcGen({
                        startAngle: -Math.PI / 2,
                        endAngle: Math.PI / 2,
                        outerRadius: r1,
                    })
                )
                .attr('fill', colors[0])

            // right
            g.append('path')
                .attr(
                    'd',
                    arcGen({
                        startAngle: Math.PI / 2,
                        endAngle: (3 * Math.PI) / 2,
                        outerRadius: r2,
                    })
                )
                .attr('fill', colors[1])
        }
    })

    addMouseEvents(map, map)
}

// ===============================
// Tooltip
// ===============================
const tooltipTextFunctionMushroom = function (rg, map) {
    const [c1, c2] = map.mushroomCodes()
    const id = rg.properties.id
    const name = rg.properties.na || ''

    const sv1 = map.statData(c1).get(id)
    const sv2 = map.statData(c2).get(id)

    const unit1 = map.statData(c1).unitText?.() || ''
    const unit2 = map.statData(c2).unitText?.() || ''

    const fmt = (v, u) => {
        if (v === ':' || v == null) return map.noDataText_ || 'No data'
        return spaceAsThousandSeparator(v) + (u ? ' ' + u : '')
    }

    return `
        <div class="em-tooltip-bar">
            ${name}${id ? ` (${id})` : ''}
        </div>
        <div class="em-tooltip-text">
            <table class="em-tooltip-table">
                <tbody>
                    <tr>
                        <td>${map.statData(c1).label_ || c1}</td>
                        <td>${fmt(sv1?.value, unit1)}</td>
                    </tr>
                    <tr>
                        <td>${map.statData(c2).label_ || c2}</td>
                        <td>${fmt(sv2?.value, unit2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `.trim()
}
