import { scaleSqrt, scaleBand, scaleRadial } from 'd3-scale'
import { select } from 'd3-selection'
import { arc, stack } from 'd3-shape'
import { extent } from 'd3-array'
import { schemeCategory10 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import { executeForAllInsets, getRegionsSelector } from '../core/utils'
import * as CoxcombLegend from '../legend/legend-coxcomb'

/**
 * Returns a coxcomb (polar area) chart map.
 *
 * @param {*} config
 */
export const map = function (config) {
    const out = StatMap.statMap(config, true, 'coxcomb')

    out.coxcombMinRadius_ = 5
    out.coxcombMaxRadius_ = 15
    out.coxcombInnerRadius_ = 0
    out.coxcombStrokeFill_ = 'white'
    out.coxcombStrokeWidth_ = 0.3

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.showOnlyWhenComplete_ = false

    out.sizeClassifier_ = null
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

    // Allow manual Coxcomb data injection
    out.coxcombData_ = undefined
    out.coxcombData = function (dataObject) {
        // Infer months and categories from first region
        const months = Object.keys(dataObject[Object.keys(dataObject)[0]])
        out._coxcombMonths = months

        // Store causes (stack keys)
        const firstRegion = dataObject[Object.keys(dataObject)[0]]
        const firstMonthData = firstRegion[months[0]]
        out._coxcombCauses = Object.keys(firstMonthData)

        // Load each month × cause into statData
        months.forEach((month) => {
            out._coxcombCauses.forEach((cause) => {
                const statData = StatisticalData.statData()
                const perRegionValues = {}

                for (const regionId in dataObject) {
                    const regionValues = dataObject[regionId]
                    const monthData = regionValues[month] || {}
                    perRegionValues[regionId] = monthData[cause] || 0
                }

                const key = `${month}:${cause}`
                statData.setData(perRegionValues)
                out.stat(key, statData)
            })
        })

        return out
    }

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

        // Optional: add an "Other" slice by using the total code
        // Optional: add an "Other" slice by using the total code
        if (totalCode) {
            out.totalCode_ = totalCode

            months.forEach((month) => {
                // Fetch the total stat for this month
                stat.filters.time = month
                stat.filters[dimension] = totalCode

                const sc_ = {}
                for (let key in stat) sc_[key] = stat[key]
                sc_.filters = {}
                for (let key in stat.filters) sc_.filters[key] = stat.filters[key]

                const totalKey = `${month}:total`
                out.stat(totalKey, sc_)
            })

            // Now derive "other" by subtracting specified causes from the total
            months.forEach((month) => {
                const totalData = out.statData(`${month}:total`)
                console.log(totalData)
                if (!totalData || typeof totalData.data !== 'function') return

                const perRegionValues = {}
                const totalValues = totalData.data() // usually returns { regionId: {value, unit,...}, ... }

                for (const regionId in totalValues) {
                    const totalVal = totalValues[regionId]?.value || 0

                    // Sum all specified causes for this region+month
                    const sumCauses = causes.reduce((sum, c) => {
                        const s = out.statData(`${month}:${c}`)?.get(regionId)
                        return sum + (s?.value || 0)
                    }, 0)

                    const diff = totalVal - sumCauses
                    perRegionValues[regionId] = diff > 0 ? diff : 0
                }

                const statData = StatisticalData.statData()
                statData.setData(perRegionValues)
                out.stat(`${month}:other`, statData)
            })

            // Register "Other" category and push it for stacking
            out.catColors_ = out.catColors_ || {}
            out.catLabels_ = out.catLabels_ || {}
            out.catColors_['other'] = '#FFCC80'
            out.catLabels_['other'] = 'Other'
            out._coxcombCauses.push('other')
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
            out.sizeClassifier_ = scaleRadial().domain(domain).range([out.coxcombMinRadius_, out.coxcombMaxRadius_])
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
                const selector = getRegionsSelector(out)
                const regions = out.svg().selectAll(selector)
                regions
                    .on('mouseover', function (e, rg) {
                        if (!getRegionTotal(rg.properties.id)) return
                        const sel = select(this)
                        sel.attr('fill___', sel.style('fill'))
                        sel.style('fill', out.hoverColor_)
                        if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                    })
                    .on('mousemove', function (e, rg) {
                        if (!getRegionTotal(rg.properties.id)) return
                        if (out._tooltip) out._tooltip.mousemove(e)
                    })
                    .on('mouseout', function () {
                        const sel = select(this)
                        const newFill = sel.attr('fill___')
                        if (newFill) {
                            sel.style('fill', newFill)
                            if (out._tooltip) out._tooltip.mouseout()
                        }
                    })

                addCoxcombChartsToMap(regionFeatures)
            }
        }
        return out
    }

    function getComposition(id) {
        const comp = {}
        let sumCauses = 0

        // Collect all specified categories
        for (const sc of out.statCodes_) {
            const s = out.statData(sc)?.get(id)
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                continue
            }
            comp[sc] = s.value
            sumCauses += s.value
        }

        // If there's a total code, use it to compute "other"
        if (out.totalCode_) {
            const totalStat = out.statData(`${out._coxcombMonths[0]}:total`)
                ? out.statData(`${out._coxcombMonths[0]}:total`).get(id)
                : out.statData(out.totalCode_)?.get(id) // fallback if single total series

            const totalVal = totalStat?.value || 0

            // Only add "other" if there’s a positive remainder
            const otherVal = Math.max(totalVal - sumCauses, 0)
            if (otherVal > 0) {
                comp['other'] = otherVal

                // Ensure color/label defaults
                out.catColors_ = out.catColors_ || {}
                out.catLabels_ = out.catLabels_ || {}
                if (!out.catColors_['other']) out.catColors_['other'] = '#FFCC80'
                if (!out.catLabels_['other']) out.catLabels_['other'] = 'Other'
            }
        }

        // If there’s no data at all
        const total = Object.values(comp).reduce((a, b) => a + b, 0)
        if (total === 0) return undefined

        return comp
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

        // Sum only specified causes
        for (const sc of out.statCodes_) {
            const s = out.statData(sc)?.get(id)
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                continue
            }
            sumCauses += s.value
            hasValue = true
        }

        // If there’s a totalCode_, use it for overall scaling (includes "other")
        if (out.totalCode_) {
            const totalStat = out.statData(`${out._coxcombMonths?.[0]}:total`)
                ? out.statData(`${out._coxcombMonths[0]}:total`).get(id)
                : out.statData(out.totalCode_)?.get(id)

            const totalVal = totalStat?.value || 0

            // If total > 0, return total (so radii reflect the full total, not just specified causes)
            if (totalVal > 0) return totalVal

            // If no total, fall back to specified causes
            return hasValue ? sumCauses : undefined
        }

        // If no totalCode_, just return the sum of specified causes
        return hasValue ? sumCauses : undefined
    }

    function addCoxcombChartsToMap(regionFeatures) {
        const months = out._coxcombMonths
        const causes = out._coxcombCauses

        const angle = scaleBand()
            .domain(months)
            .range([0, 2 * Math.PI])
            .align(0)

        regionFeatures.forEach((region) => {
            const regionId = region.properties.id

            // Assemble monthly data, including dynamically computed "other"
            const monthData = months.map((month) => {
                const row = { month }

                // Sum specified causes
                let sumCauses = 0
                causes.forEach((cause) => {
                    const s = out.statData(`${month}:${cause}`)?.get(regionId)
                    const val = s?.value || 0
                    row[cause] = val
                    sumCauses += val
                })

                // If totalCode is specified, compute "other" as the remainder
                if (out.totalCode_) {
                    const totalStat = out.statData(`${month}:total`)?.get(regionId)
                    const totalVal = totalStat?.value || 0
                    const otherVal = Math.max(totalVal - sumCauses, 0)
                    row['other'] = otherVal
                }

                return row
            })

            // Build stack keys (causes plus "other" if present)
            const keys = out.totalCode_ ? [...causes, 'other'] : causes

            const stackGen = stack().keys(keys)
            const stacked = stackGen(monthData)

            // Max total for scaling
            const maxTotal = Math.max(...monthData.map((d) => keys.reduce((sum, k) => sum + (d[k] || 0), 0)))

            const rScale = out.sizeClassifier_
                ? (v) => out.sizeClassifier_(v)
                : scaleSqrt()
                      .domain([0, maxTotal])
                      .range([out.coxcombMinRadius_ || 0, out.coxcombMaxRadius_])

            const arcGen = arc()
                .startAngle((d) => angle(d.data.month))
                .endAngle((d) => angle(d.data.month) + angle.bandwidth())
                .innerRadius((d) => rScale(d[0]))
                .outerRadius((d) => rScale(d[1]))
                .padAngle(0.01)
                .padRadius(out.coxcombInnerRadius_ || 0)

            const node = out.svg().selectAll('#cox_' + regionId)

            keys.forEach((key, i) => {
                node.append('g')
                    .attr('class', 'coxcombchart')
                    .attr('stroke', out.coxcombStrokeFill_)
                    .attr('stroke-width', out.coxcombStrokeWidth_)
                    .selectAll('path')
                    .data(stacked[i]) // slice per category
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
        })
    }

    out.getLegendConstructor = function () {
        return CoxcombLegend.legend // Could implement a Coxcomb-specific legend later
    }

    out.tooltip_.textFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id

        const months = out._coxcombMonths || []
        const causes = out._coxcombCauses || []

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        // Build table header: Month + each cause label
        const headerCells = [`<th class="em-breakdown-label">Month</th>`]
        causes.forEach((cause) => {
            const label = out.catLabels_[cause] || cause
            headerCells.push(`<th class="em-breakdown-label">${label}</th>`)
        })
        const headerRow = `<tr>${headerCells.join('')}</tr>`

        // Build month rows
        const rows = months.map((month) => {
            const cells = [`<td class="em-breakdown-label">${month}</td>`]

            causes.forEach((cause) => {
                const s = out.statData(`${month}:${cause}`)?.get(regionId)
                const val = s?.value || 0
                if (val > 0) {
                    const color = out.catColors_[cause] || (cause === 'other' ? '#FFCC80' : '#999')
                    cells.push(`
                    <td>
                        <span class="em-breakdown-color" style="background:${color}"></span>
                        <span class="em-breakdown-value">${val.toFixed()}</span>
                    </td>
                `)
                } else {
                    // Keep empty cell for alignment
                    cells.push(`<td></td>`)
                }
            })

            return `<tr>${cells.join('')}</tr>`
        })

        // Compute region total (includes "other" if totalCode_ used)
        const total = getRegionTotal(regionId)
        const unit = out.statData(out.statCodes_[0])?.unitText() || ''

        html += `<div class="em-tooltip-breakdown em-tooltip-cx"><table class="em-tooltip-cx-table">`
        html += headerRow
        html += rows.join('')
        if (total !== undefined && total !== null) {
            html += `
            <tr class="em-total">
                <td class="em-breakdown-label">Total</td>
                <td colspan="${causes.length}">
                    <span class="em-breakdown-value">${total.toFixed()} ${unit}</span>
                </td>
            </tr>
        `
        }
        html += `</table></div>`

        return html
    }

    return out
}
