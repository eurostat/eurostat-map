import { scaleSqrt, scaleBand, scaleRadial } from 'd3-scale'
import { select } from 'd3-selection'
import { arc, stack } from 'd3-shape'
import { extent, max } from 'd3-array'
import { schemeCategory10 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../core/utils'
import * as CoxcombLegend from '../legend/legend-coxcomb'

/**
 * Returns a coxcomb (polar area) chart map.
 *
 * @param {*} config
 */
export const map = function (config) {
    const out = StatMap.statMap(config, true, 'coxcomb')

    out.coxcombMinRadius_ = 10
    out.coxcombMaxRadius_ = 80
    out.coxcombInnerRadius_ = 0
    out.coxcombStrokeFill_ = 'white'
    out.coxcombStrokeWidth_ = 0.3

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.showOnlyWhenComplete_ = false

    out.classifierSize_ = null
    ;[
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'coxcombMaxRadius_',
        'coxcombMinRadius_',
        'coxcombInnerRadius_',
        'coxcombStrokeFill_',
        'coxcombStrokeWidth_',
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    if (config)
        [
            'catColors',
            'catLabels',
            'showOnlyWhenComplete',
            'noDataFillStyle',
            'coxcombMaxRadius',
            'coxcombMinRadius',
            'coxcombInnerRadius',
            'coxcombStrokeFill',
            'coxcombStrokeWidth',
        ].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

    out.statCodes_ = undefined
    out.totalCode_ = undefined

    // Helper for Eurostat datasets (like statSpark or statPie)
    out.statCoxcomb = function (stat, months, dimension, causes, labels, colors, totalCode) {
        out._coxcombMonths = months
        out._coxcombCauses = [...causes] // clone so we can append "other" later safely
        out._coxcombDim = dimension

        stat.filters = stat.filters || {}

        // Load each cause × month
        months.forEach((month) => {
            causes.forEach((cause) => {
                stat.filters.time = month
                stat.filters[dimension] = cause

                const sc_ = {}
                for (let key in stat) sc_[key] = stat[key]
                sc_.filters = {}
                for (let key in stat.filters) sc_.filters[key] = stat.filters[key]

                const key = `${month}:${cause}`
                out.stat(key, sc_)

                // Assign labels/colors for this cause
                if (colors) {
                    out.catColors_ = out.catColors_ || {}
                    out.catColors_[cause] = colors[causes.indexOf(cause)]
                }
                if (labels) {
                    out.catLabels_ = out.catLabels_ || {}
                    out.catLabels_[cause] = labels[causes.indexOf(cause)]
                }
            })
        })

        // Just register the total stat like in pies. (data will be available at render time)
        if (totalCode) {
            out.totalCode_ = totalCode
            stat.filters[dimension] = totalCode
            const sc_ = {}
            for (let key in stat) sc_[key] = stat[key]
            sc_.filters = { ...stat.filters }
            out.stat(totalCode, sc_)

            out.catColors_['other'] = '#FFCC80'
            out.catLabels_['other'] = 'Other'
        }
        return out
    }

    //@override
    out.updateClassification = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
        }
        applyClassificationToMap(out)
        return out
    }

    function applyClassificationToMap(map) {
        if (!out.statCodes_) {
            out.statCodes_ = Object.keys(out.statData_)
            const index = out.statCodes_.indexOf('default')
            if (index > -1) out.statCodes_.splice(index, 1)
        }
        const domain = getDatasetMaxMin()
        if (!isNaN(domain[0])) {
            out.classifierSize_ = scaleRadial().domain(domain).range([0, out.coxcombMaxRadius_])
        }
        return out
    }

    //@override
    out.updateStyle = function () {
        if (!out.catColors_) {
            out.catColors({})
            for (let i = 0; i < out.statCodes_.length; i++) {
                out.catColors_[out.statCodes_[i]] = schemeCategory10[i % 10]
            }
        }

        try {
            // apply style to insets
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }

            // apply to main map
            applyStyleToMap(out)

            return out
        } catch (e) {
            console.error('Error in updateStyle:', e.message)
            console.error(e)
        }

        return out
    }

    function applyStyleToMap(map) {
        out.catLabels_ = out.catLabels_ || {}

        if (out.svg_) {
            const s = out.svg_.selectAll('#em-prop-symbols')
            if (s) {
                const sym = s.selectAll('g.em-centroid')

                // Only keep regions that actually have data
                const regionFeatures = sym.data().filter((rg) => {
                    const id = rg.properties.id
                    return getRegionTotal(id) !== undefined // has non-zero or valid data
                })

                // Append container groups correctly (filter by bound data, not id)
                regionFeatures.forEach((rg) => {
                    sym.filter((d) => d.properties.id === rg.properties.id)
                        .append('g')
                        .attr('class', 'em-coxcomb')
                        .attr('id', 'cox_' + rg.properties.id)
                })

                // Hover behavior (skip no-data regions)
                addMouseEventsToRegions(map)

                addCoxcombChartsToMap(regionFeatures)
            }
        }
    }

    function addMouseEventsToRegions(map) {
        const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)
        const selector = getRegionsSelector(map)
        const regions = map.svg().selectAll(selector)
        const symbols = map.svg().selectAll('g.em-centroid')
        ;[
            // Merge selections so we apply handlers to both regions and charts
            regions,
            symbols,
        ].forEach((sel) => {
            sel.on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                if (!getRegionTotal(rg.properties.id)) return
                const sel = select(this)
                sel.attr('fill___', sel.style('fill'))
                sel.style('fill', out.hoverColor_)
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            })
                .on('mousemove', function (e, rg) {
                    if (shouldOmit(rg.properties.id)) return
                    if (!getRegionTotal(rg.properties.id)) return
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                })
                .on('mouseout', function (e, rg) {
                    if (shouldOmit(rg.properties.id)) return
                    if (!getRegionTotal(rg.properties.id)) return
                    const sel = select(this)
                    sel.style('fill', sel.attr('fill___') || out.noDataFillStyle_)
                    sel.attr('fill___', null)
                    if (out._tooltip) out._tooltip.mouseout()
                })
                .on('click', function (e, rg) {
                    if (shouldOmit(rg.properties.id)) return
                    if (!getRegionTotal(rg.properties.id)) return
                    if (out._tooltip) out._tooltip.click(rg, out)
                })
        })
    }

    function getDatasetMaxMin() {
        const totals = []
        const sel = out.svg().selectAll('#em-prop-symbols').selectAll('g.em-centroid').data()
        sel.forEach((rg) => {
            const total = getRegionTotal(rg.properties.id)
            if (total) totals.push(total)
        })
        return extent(totals)
    }

    function getRegionTotal(id) {
        let sumCauses = 0
        let hasValue = false

        for (const sc of out.statCodes_) {
            const s = out.statData(sc)?.get(id)
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                continue
            }
            sumCauses += s.value
            hasValue = true
        }

        // If totalCode_ is present, also add "other" explicitly
        if (out.totalCode_) {
            const sOther = out.statData(`${out._coxcombMonths?.[0]}:other`)?.get(id)
            if (sOther && !isNaN(sOther.value)) {
                sumCauses += sOther.value
            }
        }

        return hasValue ? sumCauses : undefined
    }

    function addCoxcombChartsToMap(regionFeatures) {
        const months = out._coxcombMonths
        const causes = out._coxcombCauses
        const angle = createAngleScale(months)

        const rScale = createRadiusScale(regionFeatures, months, causes)

        regionFeatures.forEach((region) => {
            const regionId = region.properties.id

            const monthData = buildMonthData(regionId, months, causes)
            if (!monthData.length) return

            const keys = getActiveKeys(monthData, causes)

            const stackGen = stack().keys(keys)
            const stacked = stackGen(monthData)

            drawCoxcomb(regionId, stacked, keys, angle, rScale)
        })
    }

    function getActiveKeys(monthData, causes) {
        const keys = [...causes]
        if (monthData.some((d) => (d['other'] || 0) > 0)) keys.push('other')
        return keys
    }

    function buildMonthData(regionId, months, causes) {
        return months
            .map((month) => {
                const row = { month }
                let sumCauses = 0

                causes.forEach((cause) => {
                    const s = out.statData(`${month}:${cause}`)?.get(regionId)
                    const val = s?.value || 0
                    row[cause] = val
                    sumCauses += val
                })

                if (out.totalCode_) {
                    const totalStat = out.statData(out.totalCode_)?.get(regionId)
                    const totalVal = totalStat?.value || 0
                    const otherVal = totalVal > sumCauses ? totalVal - sumCauses : 0
                    if (otherVal > 0) row['other'] = otherVal
                }

                const hasData = Object.values(row).some((v) => v && v > 0)
                return hasData ? row : null
            })
            .filter(Boolean)
    }

    function createAngleScale(months) {
        return scaleBand()
            .domain(months)
            .range([0, 2 * Math.PI])
            .align(0)
    }

    function createRadiusScale(regionFeatures, months, causes) {
        const totals = []
        regionFeatures.forEach((region) => {
            const id = region.properties.id
            months.forEach((month) => {
                let total = 0
                causes.forEach((cause) => {
                    const v = out.statData(`${month}:${cause}`)?.get(id)?.value
                    if (!isNaN(v)) total += v || 0
                })
                if (out.totalCode_) {
                    const t = out.statData(out.totalCode_)?.get(id)?.value
                    if (!isNaN(t)) total = Math.max(total, t)
                }
                if (total > 0) totals.push(total)
            })
        })

        const globalMax = totals.length ? Math.max(...totals) : 0
        out._coxcombGlobalMax = globalMax

        const minRadius = out.coxcombMinRadius_ || 0
        const maxRadius = out.coxcombMaxRadius_ || 80

        // Scale values to radii *increment* beyond min radius
        const incScale = scaleSqrt()
            .domain([0, globalMax])
            .range([0, maxRadius - minRadius])

        // Always return a full radius (min + increment)
        return (v) => minRadius + incScale(v)
    }

    function drawCoxcomb(regionId, stackedData, keys, angle, rScale) {
        const node = out.svg().selectAll('#cox_' + regionId)

        const arcGen = arc()
            .startAngle((d) => angle(d.data.month))
            .endAngle((d) => angle(d.data.month) + angle.bandwidth())
            .innerRadius((d) => rScale(d[0]))
            .outerRadius((d) => rScale(d[1]))
            .padAngle(0.01)
            .padRadius(0)

        keys.forEach((key) => {
            node.append('g')
                .attr('class', 'coxcombchart')
                .attr('stroke', out.coxcombStrokeFill_)
                .attr('stroke-width', out.coxcombStrokeWidth_)
                .selectAll('path')
                .data(stackedData[keys.indexOf(key)])
                .join('path')
                .attr('fill', out.catColors_[key] || (key === 'other' ? '#FFCC80' : 'lightgray'))
                .attr('fill___', out.catColors_[key] || (key === 'other' ? '#FFCC80' : 'lightgray'))
                .attr('code', key)
                .attr('d', arcGen)
                .append('title')
                .text((d) => {
                    const val = d[1] - d[0]
                    return `${d.data.month} – ${out.catLabels_[key] || key}: ${val.toFixed(1)}`
                })
        })
    }
    out.getLegendConstructor = function () {
        return CoxcombLegend.legend // Could implement a Coxcomb-specific legend later
    }

    out.tooltip_.textFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id

        const months = out._coxcombMonths || []
        const causes = [...out._coxcombCauses]

        // Add "other" if totals exceed sum of causes
        const includeOther = months.some((m) => {
            const totalVal = out.statData(out.totalCode_)?.get(regionId)?.value || 0
            const sumCauses = causes.reduce((a, c) => a + (out.statData(`${m}:${c}`)?.get(regionId)?.value || 0), 0)
            return totalVal > sumCauses
        })
        if (includeOther) causes.push('other')

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        // Header row
        const headerCells = [`<th class="em-breakdown-label">Month</th>`]
        causes.forEach((cause) => {
            const label = out.catLabels_[cause] || cause
            const color = out.catColors_[cause] || (cause === 'other' ? '#FFCC80' : '#999')
            headerCells.push(`<th class="em-breakdown-label" style="color:${color}">${label}</th>`)
        })
        const headerRow = `<tr>${headerCells.join('')}</tr>`

        // Data rows for each month
        const rows = months.map((month) => {
            const cells = [`<td class="em-breakdown-label">${month}</td>`]
            causes.forEach((cause) => {
                let rawVal = 0
                if (cause === 'other') {
                    const totalVal = out.statData(out.totalCode_)?.get(regionId)?.value || 0
                    const sumCauses = causes
                        .filter((c) => c !== 'other')
                        .reduce((a, c) => a + (out.statData(`${month}:${c}`)?.get(regionId)?.value || 0), 0)
                    rawVal = Math.max(totalVal - sumCauses, 0)
                } else {
                    rawVal = out.statData(`${month}:${cause}`)?.get(regionId)?.value || 0
                }

                if (rawVal > 0) {
                    const formatted = spaceAsThousandSeparator(rawVal)
                    cells.push(`<td><span class="em-breakdown-value">${formatted}</span></td>`)
                } else {
                    cells.push('<td></td>')
                }
            })
            return `<tr>${cells.join('')}</tr>`
        })

        // Total row
        const total = getRegionTotal(regionId)
        const unit = out.statData(out.statCodes_[0])?.unitText() || ''

        html += `<div class="em-tooltip-breakdown em-tooltip-cx"><table class="em-tooltip-cx-table">`
        html += headerRow + rows.join('')
        if (total !== undefined && total !== null) {
            const formattedTotal = spaceAsThousandSeparator(total)
            html += `
          <tr class="em-total">
            <td class="em-breakdown-label">Total</td>
            <td colspan="${causes.length}">
              <span class="em-breakdown-value">${formattedTotal} ${unit}</span>
            </td>
          </tr>`
        }
        html += `</table></div>`

        return html
    }

    return out
}
