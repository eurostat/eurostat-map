import { scaleSqrt, scaleBand, scaleRadial, scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { arc, stack } from 'd3-shape'
import { extent, max, min } from 'd3-array'
import { schemeCategory10 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../core/utils'
import * as CoxcombLegend from '../legend/legend-coxcomb'
import { interpolate } from 'd3'
import { runDorlingSimulation } from '../core/dorling/dorling'

/**
 * Returns a coxcomb (polar area) chart map.
 *
 * @param {*} config
 */
export const map = function (config) {
    const out = StatMap.statMap(config, true, 'coxcomb')

    out.coxcombMinRadius_ = 10
    out.coxcombMaxRadius_ = 80
    out.coxcombStrokeFill_ = 'white'
    out.coxcombStrokeWidth_ = 0.3
    out.coxcombRings_ = true // Show outer rings by default

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.classifierSize_ = null
    ;[
        'catColors_',
        'catLabels_',
        'noDataFillStyle_',
        'coxcombMaxRadius_',
        'coxcombMinRadius_',
        'coxcombRings_',
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
    // .statCoxcomb({
    //     filters: {
    //       //data/tour_occ_nin2m?format=JSON&unit=NR&c_resid=TOTAL&nace_r2=I551-I553&month=M01&lang=EN
    //       eurostatDatasetCode: "tour_occ_nin2m",
    //       filters: { unit: "NR", nace_r2: "I551-I553", TIME: 2022 }, // shared filters
    //       unitText: "Nights spent",
    //     },
    //     timeParameter: "month",
    //     times: ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12"],
    //     timeLabels:['Jan','Feb','March']
    //     categoryParameter: "c_resid",
    //     categoryCodes: ["DOM", "FOR"],
    //     categoryLabels: ["Domestic", "Foreign"],
    //     categoryColors: ["#1b9e77", "#d95f02"],
    //     totalCode: "TOTAL",
    //   })
    out.statCoxcomb = function (config) {
        out._coxTimes = config.times
        out._coxCategoryCodes = [...config.categoryCodes] // clone so we can append "other" later safely
        out._coxTimeLabels = config.timeLabels

        config.filters = config.filters || {}

        // Load each category × time
        config.times.forEach((time) => {
            config.categoryCodes.forEach((category) => {
                config.stat.filters[config.timeParameter] = time
                config.stat.filters[config.categoryParameter] = category

                const sc_ = {}
                for (let key in config.stat) sc_[key] = config.stat[key]
                sc_.filters = {}
                for (let key in config.stat.filters) sc_.filters[key] = config.stat.filters[key]

                const key = `${time}:${category}`
                out.stat(key, sc_)

                // Assign labels/colors
                if (config.categoryColors) {
                    out.catColors_ = out.catColors_ || {}
                    out.catColors_[category] = config.categoryColors[config.categoryCodes.indexOf(category)]
                }
                if (config.categoryLabels) {
                    out.catLabels_ = out.catLabels_ || {}
                    out.catLabels_[category] = config.categoryLabels[config.categoryCodes.indexOf(category)]
                }
            })

            // Also load TOTAL for each month (if available)
            if (config.totalCode) {
                config.stat.filters[config.timeParameter] = time
                config.stat.filters[config.categoryParameter] = config.totalCode

                const scTotal = {}
                for (let key in config.stat) scTotal[key] = config.stat[key]
                scTotal.filters = {}
                for (let key in config.stat.filters) scTotal.filters[key] = config.stat.filters[key]

                const totalKey = `${time}:${config.totalCode}`
                out.stat(totalKey, scTotal)
            }
        })

        // Store totalCode so buildMonthData() and tooltips know it exists
        if (config.totalCode) {
            out.totalCode_ = config.totalCode
            out.catColors_['other'] = '#FFCC80'
            out.catLabels_['other'] = 'Other'
        }

        return out
    }

    //@override
    out.updateClassification = function () {
        // apply classification to all insets that are outside of the main map's SVG
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
        }

        //main map
        applyClassificationToMap()

        return out
    }

    function applyClassificationToMap(map) {
        if (!out.statCodes_) {
            out.statCodes_ = Object.keys(out.statData_)
            const index = out.statCodes_.indexOf('default')
            if (index > -1) out.statCodes_.splice(index, 1)
        }
        getTotals(map)
        defineSizeScales(map)
    }

    function getTotals(map) {
        const yearlyTotals = {}
        const monthlyTotals = {} // regionId -> { month: total }

        if (out.totalCode_) {
            // Use month-specific TOTAL series for each region (loaded as `${month}:${totalCode_}`)
            out._coxTimes.forEach((month) => {
                const stat = out.statData(`${month}:${out.totalCode_}`)
                if (!stat || !stat._data_) return

                for (const region in stat._data_) {
                    const v = stat._data_[region]?.value || 0
                    monthlyTotals[region] = monthlyTotals[region] || {}
                    monthlyTotals[region][month] = v
                    yearlyTotals[region] = (yearlyTotals[region] || 0) + v
                }
            })
        } else {
            // Fallback: sum all causes per month for each region
            out._coxTimes.forEach((month) => {
                const perRegionMonthSum = {}

                out._coxCategoryCodes.forEach((cause) => {
                    const stat = out.statData(`${month}:${cause}`)
                    if (!stat || !stat._data_) return

                    for (const region in stat._data_) {
                        const v = stat._data_[region]?.value || 0
                        perRegionMonthSum[region] = (perRegionMonthSum[region] || 0) + v
                    }
                })

                for (const region in perRegionMonthSum) {
                    monthlyTotals[region] = monthlyTotals[region] || {}
                    monthlyTotals[region][month] = perRegionMonthSum[region]
                    yearlyTotals[region] = (yearlyTotals[region] || 0) + perRegionMonthSum[region]
                }
            })
        }

        out.yearlyTotals = yearlyTotals
        out.monthlyTotals = monthlyTotals
    }

    function getRegionTotal(id) {
        const totalsByRegion = out.yearlyTotals
        return totalsByRegion[id] !== undefined ? totalsByRegion[id] : undefined
    }

    function defineSizeScales(map) {
        const yearlyValues = Object.values(out.yearlyTotals)
        const minRadius = out.coxcombMinRadius_ || 0
        const maxRadius = out.coxcombMaxRadius_ || 80

        const globalMin = min(yearlyValues) || 0
        const globalMax = max(yearlyValues) || 0

        // Scale yearly totals → outer chart radius (ensures area ∝ total)
        const outerScale = scaleRadial().domain([globalMin, globalMax]).range([minRadius, maxRadius])

        // Scale individual stacked values so that wedge areas stay proportional
        out.classifierChartSize_ = (v, regionId) => {
            const targetOuter = outerScale(out.yearlyTotals[regionId] || 0)
            const regionMax = Math.max(...Object.values(out.monthlyTotals[regionId] || { 0: 1 }))
            const proportion = v / regionMax
            return Math.sqrt(proportion) * targetOuter // sqrt keeps area consistent
        }

        out.classifierSize_ = outerScale
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

            // dorling cartogram
            if (out.dorling_) {
                runDorlingSimulation(out, (d) => {
                    const total = getRegionTotal(d.properties.id) || 0
                    return out.classifierSize_(total) || 0
                })
            } else {
                stopDorlingSimulation(out)
            }

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
            const s = map.getCentroidsGroup(map)
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

                // append charts to regions
                addCoxcombChartsToMap(regionFeatures, map)

                //run dorling (prevent overlapping)
                if (out.dorling_) {
                    runDorlingSimulation(out, (d) => {
                        const total = getRegionTotal(d.properties.id) || 0
                        return out.classifierSize_(total) || 0
                    })
                } else {
                    stopDorlingSimulation(out)
                }
            }
        }
    }
    function addCoxcombChartsToMap(regionFeatures, map) {
        const months = out._coxTimes
        const causes = out._coxCategoryCodes
        const angle = createAngleScale(months)

        regionFeatures.forEach((region) => {
            const regionId = region.properties.id

            const monthData = buildMonthData(regionId, months, causes)
            if (!monthData.length) return

            const keys = getActiveKeys(monthData, causes)

            const stackGen = stack().keys(keys)
            const stacked = stackGen(monthData)

            drawCoxcomb(regionId, stacked, keys, angle, map)
        })
    }

    function drawCoxcomb(regionId, stackedData, keys, angle, map) {
        const node = map.svg().selectAll('#cox_' + regionId)

        // Draw outer ring (animate it growing)
        if (out.coxcombRings_) {
            const yearlyTotal = out.yearlyTotals[regionId] || 0
            const targetOuter = out.classifierSize_(yearlyTotal) // legend-based scale
            node.append('circle')
                .attr('class', 'em-coxcomb-max-outline')
                .attr('r', 0) // start collapsed
                .attr('fill', 'none')
                .attr('stroke', '#000')
                .attr('stroke-width', 0.3)
                .attr('opacity', 0.5)
                .attr('pointer-events', 'none')
                .transition()
                .duration(out.transitionDuration_ / 2)
                .attr('r', targetOuter)
        }

        // Arc generator (shared for tween)
        const arcGen = arc()
            .startAngle((d) => angle(d.data.month))
            .endAngle((d) => angle(d.data.month) + angle.bandwidth())
            .padAngle(0.01)
            .padRadius(0)

        // Draw stacked wedges with animated "grow out" effect
        keys.forEach((key) => {
            node.append('g')
                .attr('class', 'em-coxcomb-chart')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 0.3)
                .selectAll('path')
                .data(stackedData[keys.indexOf(key)])
                .join('path')
                .attr('fill', out.catColors_[key] || (key === 'other' ? '#FFCC80' : 'lightgray'))
                .attr('fill___', out.catColors_[key] || (key === 'other' ? '#FFCC80' : 'lightgray'))
                .attr('code', key)
                .attr('month', (d) => d.data.month)
                .transition()
                .delay((d, i) => i * 120)
                .duration(out.transitionDuration_)
                .attrTween('d', function (d) {
                    const iInner = interpolate(0, out.classifierChartSize_(d[0], regionId))
                    const iOuter = interpolate(0, out.classifierChartSize_(d[1], regionId))
                    return (t) => arcGen.innerRadius(iInner(t)).outerRadius(iOuter(t))(d)
                })
        })
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
                // Thicken the first circle (outline) inside the symbol group
                sel.select('circle.em-coxcomb-max-outline').attr('stroke-width', 2) // temporarily increase stroke
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
                    // Thicken the first circle (outline) inside the symbol group
                    sel.select('circle.em-coxcomb-max-outline').attr('stroke-width', 0.3) // temporarily increase stroke
                    if (out._tooltip) out._tooltip.mouseout()
                })
                .on('click', function (e, rg) {
                    if (shouldOmit(rg.properties.id)) return
                    if (!getRegionTotal(rg.properties.id)) return
                    if (out._tooltip) out._tooltip.click(rg, out)
                })
        })
    }

    function getActiveKeys(monthData, causes) {
        const keys = [...causes]
        if (monthData.some((d) => (d['other'] || 0) > 0)) keys.push('other')
        return keys
    }

    function buildMonthData(regionId, months, causes) {
        const rows = months
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
                    const totalStat = out.statData(`${month}:${out.totalCode_}`)?.get(regionId)
                    const totalVal = totalStat?.value || 0
                    const otherVal = totalVal > sumCauses ? totalVal - sumCauses : 0
                    if (otherVal > 0) row['other'] = otherVal
                }

                const hasData = Object.values(row).some((v) => v && v > 0)
                return hasData ? row : null
            })
            .filter(Boolean)

        // *** Remove "other" column if it’s zero for every row ***
        const hasOther = rows.some((r) => (r['other'] || 0) > 0)
        if (!hasOther) {
            rows.forEach((r) => delete r['other'])
            // Also drop the color & label entry for "other" so it won't appear in legend
            delete out.catColors_?.other
            delete out.catLabels_?.other
        }

        return rows
    }

    function createAngleScale(months) {
        return scaleBand()
            .domain(months)
            .range([0, 2 * Math.PI])
            .align(0)
    }

    out.getLegendConstructor = function () {
        return CoxcombLegend.legend // Could implement a Coxcomb-specific legend later
    }

    out.tooltip_.textFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id

        const months = out._coxTimes || []
        const causes = [...out._coxCategoryCodes]

        // Add "other" if any month has TOTAL > sum of causes
        const includeOther = months.some((month) => {
            const totalVal = out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value || 0
            const sumCauses = out._coxCategoryCodes.reduce((a, c) => a + (out.statData(`${month}:${c}`)?.get(regionId)?.value || 0), 0)
            return totalVal > sumCauses
        })

        if (includeOther) causes.push('other')

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        // Header row (with monthly totals column)
        const headerCells = [`<th class="em-breakdown-label">Month</th>`]
        causes.forEach((cause) => {
            const label = out.catLabels_[cause] || cause
            const color = out.catColors_[cause] || (cause === 'other' ? '#FFCC80' : '#999')
            headerCells.push(`<th class="em-breakdown-label" style="color:${color}">${label}</th>`)
        })
        headerCells.push(`<th class="em-breakdown-label">Total</th>`) // totals column
        const headerRow = `<tr>${headerCells.join('')}</tr>`

        // Precomputed totals
        const yearlyTotals = out.yearlyTotals || {}
        const monthlyTotals = out.monthlyTotals || {}
        const regionYearly = yearlyTotals[regionId] || 0

        // Data rows for each month
        const rows = months.map((month, i) => {
            const cells = [`<td class="em-breakdown-label">${out._coxTimeLabels ? out._coxTimeLabels[i] : month}</td>`]
            let monthSum = monthlyTotals[regionId]?.[month] || 0

            causes.forEach((cause) => {
                let rawVal = 0
                if (cause === 'other') {
                    // Derive "other" from month-specific TOTAL, not monthSum
                    const totalVal = out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value || 0
                    const sumCauses = causes
                        .filter((c) => c !== 'other')
                        .reduce((a, c) => a + (out.statData(`${month}:${c}`)?.get(regionId)?.value || 0), 0)
                    rawVal = Math.max(totalVal - sumCauses, 0)
                } else {
                    rawVal = out.statData(`${month}:${cause}`)?.get(regionId)?.value || 0
                }

                cells.push(rawVal > 0 ? `<td><span class="em-breakdown-value">${spaceAsThousandSeparator(rawVal)}</span></td>` : '<td></td>')
            })

            // Monthly total cell (directly from monthlyTotals)
            cells.push(monthSum > 0 ? `<td><span class="em-breakdown-value">${spaceAsThousandSeparator(monthSum)}</span></td>` : '<td></td>')

            return `<tr>${cells.join('')}</tr>`
        })

        // Yearly total row (from yearlyTotals)
        const unit = out.statData(out.statCodes_[0])?.unitText() || ''

        html += `<div class="em-tooltip-breakdown em-tooltip-cx"><table class="em-tooltip-cx-table">`
        html += headerRow + rows.join('')
        if (regionYearly > 0) {
            html += `
      <tr class="em-total">
        <td class="em-breakdown-label">Year total</td>
        <td colspan="${causes.length}"></td>
        <td>
          <span class="em-breakdown-value">${spaceAsThousandSeparator(regionYearly)} ${unit}</span>
        </td>
      </tr>`
        }
        html += `</table></div>`

        return html
    }

    return out
}
