import { scaleSqrt, scaleBand, scaleRadial, scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { arc, stack } from 'd3-shape'
import { extent, max, min } from 'd3-array'
import { schemeCategory10 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../core/utils'
import * as CoxcombLegend from '../legend/legend-coxcomb'
import { interpolate } from 'd3-interpolate'
import { runDorlingSimulation, stopDorlingSimulation } from '../core/dorling/dorling'
import { adjustGridCartogramTextLabels } from '../core/cartograms'

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
    out.coxcombOffsets_ = { x: 0, y: 0 }
    out.hoverColor_ = '#ffa500'

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.classifierSize_ = null
    const paramNames = [
        'catColors_',
        'catLabels_',
        'noDataFillStyle_',
        'coxcombMaxRadius_',
        'coxcombMinRadius_',
        'coxcombRings_',
        'coxcombStrokeFill_',
        'coxcombStrokeWidth_',
        'hoverColor_',
        'classifierSize_',
        'coxcombOffsets_',
    ]
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
            if (config[k] != undefined) out[k](config[k])
        })
    }

    out.statCodes_ = undefined
    out.totalCode_ = undefined

    // Helper for Eurostat datasets (like statSpark or statPie)
    // For example:
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
        computeCoxStatusMap(map)
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

    function computeCoxStatusMap(map) {
        const months = out._coxTimes || []
        const cats = out._coxCategoryCodes || []
        const useTotal = !!out.totalCode_
        const status = new Map() // id -> {value: ':'} for ND, {value:0} for HAS (incl. zero), null for NI

        // Collect region ids seen in any relevant series
        const regionIds = new Set()
        const addIdsFrom = (key) => {
            const st = out.statData(key)
            if (st && st._data_) Object.keys(st._data_).forEach((id) => regionIds.add(id))
        }
        months.forEach((m) => {
            if (useTotal) addIdsFrom(`${m}:${out.totalCode_}`)
            else cats.forEach((c) => addIdsFrom(`${m}:${c}`))
        })

        // Determine status for each region
        regionIds.forEach((id) => {
            let seenAny = false,
                seenND = false,
                seenNumeric = false
            months.forEach((m) => {
                if (useTotal) {
                    const e = out.statData(`${m}:${out.totalCode_}`)?.get(id)
                    if (!e) return
                    seenAny = true
                    if (e.value === ':') seenND = true
                    else if (typeof e.value === 'number') seenNumeric = true // zero counts as data
                } else {
                    cats.forEach((c) => {
                        const e = out.statData(`${m}:${c}`)?.get(id)
                        if (!e) return
                        seenAny = true
                        if (e.value === ':') seenND = true
                        else if (typeof e.value === 'number') seenNumeric = true // zero counts as data
                    })
                }
            })

            if (seenND)
                status.set(id, { value: ':' }) // ND
            else if (seenAny || seenNumeric)
                status.set(id, { value: 0 }) // HAS (incl. all-zero)
            else status.set(id, null) // NI
        })

        out.coxStatus_ = status
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

            // dorling cartogram (not applicable for grid cartograms)
            if (out.dorling_ && !out.gridCartogram_) {
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

    /**
     * Get the appropriate anchor elements for coxcomb charts
     * For grid cartograms: grid cells
     * For geographic maps: centroid groups
     */
    function getCoxcombAnchors(map) {
        if (map.gridCartogram_) {
            return map.svg().selectAll('#em-grid-container .em-grid-cell')
        }
        return map.getCentroidsGroup(map).selectAll('g.em-centroid')
    }

    function applyStyleToMap(map) {
        out.catLabels_ = out.catLabels_ || {}

        if (out.svg_) {
            if (map.gridCartogram_) {
                // Grid cartogram mode
                const angle = createAngleScale(out._coxTimes)

                applyStyleToGridCartogram(map, angle)

                adjustGridCartogramTextLabels({
                    map,
                    getAnchors: getCoxcombAnchors,
                    getRadius: (regionId) => getCoxcombTopRadius(regionId),
                    margin: 2,
                })
            } else {
                // Geographic map mode
                const s = map.getCentroidsGroup(map)
                if (s) {
                    const sym = s.selectAll('g.em-centroid')

                    // Only keep regions that actually have data
                    const regionFeatures = sym.data().filter((rg) => {
                        const id = rg.properties.id
                        return getRegionTotal(id) !== undefined // has non-zero or valid data
                    })

                    applyStyleToRegionPolygons(map)

                    // Hover behavior (skip no-data regions)
                    addMouseEventsToRegions(map)

                    // append charts to regions
                    addCoxcombChartsToMap(regionFeatures, map)
                }
            }
        }
    }

    function getCoxcombTopRadius(regionId) {
        const months = out._coxTimes
        if (!months || months.length === 0) return 0

        const jan = months[0]
        const dec = months[months.length - 1]

        let maxR = 0

        ;[jan, dec].forEach((month) => {
            let stackSum = 0

            // stack causes in the same order as the chart
            out._coxCategoryCodes.forEach((cause) => {
                const v = out.statData(`${month}:${cause}`)?.get(regionId)?.value || 0
                stackSum += v
            })

            // include "other" if present
            if (out.totalCode_) {
                const total = out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value || 0
                if (total > stackSum) stackSum = total
            }

            const r = out.classifierChartSize_(stackSum, regionId)
            if (r > maxR) maxR = r
        })

        return maxR
    }

    function applyStyleToGridCartogram(map, angle) {
        // Collect region IDs from grid cells
        const regionIds = []
        const anchors = getCoxcombAnchors(map)

        anchors.attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'cox_' + rg.properties.id
        })

        // Add coxcomb charts to grid cells
        addCoxcombChartsToGridCartogram(regionIds, map, angle)

        // Add mouse events to grid shapes
        addMouseEventsToGridCartogram(map)
    }

    function addCoxcombChartsToGridCartogram(regionIds, map, angle) {
        const months = out._coxTimes
        const causes = out._coxCategoryCodes
        let offsets = out.coxcombOffsets_ || { x: 0, y: 0 }
        //fine tuning for hexagon grid
        if (out.gridCartogramShape_ === 'hexagon') {
            offsets.x -= out.coxcombWidth_ - 4
            offsets.y -= out.coxcombHeight_ + 4
        }

        regionIds.forEach((regionId) => {
            const node = out.svg().select('#cox_' + regionId)
            if (node.empty()) return

            const monthData = buildMonthData(regionId, months, causes)
            if (!monthData.length) return

            const keys = getActiveKeys(monthData, causes)
            const stackGen = stack().keys(keys)
            const stacked = stackGen(monthData)

            // Clear previous chart
            node.selectAll('.em-coxcomb').remove()

            // Get cell dimensions for positioning
            const bbox = node.node().getBBox()
            const anchorX = bbox.width / 2
            const anchorY = bbox.height / 2

            // Create chart container
            const g = node
                .append('g')
                .attr('class', 'em-coxcomb')
                .attr('transform', `translate(${anchorX + offsets.x}, ${anchorY + offsets.y})`)
            //.style('pointer-events', 'none')

            // Draw the coxcomb chart
            drawCoxcombInContainer(g, regionId, stacked, keys, angle, map)

            // Move chart after the shape element for proper z-ordering
            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl && shapeEl.nextSibling) {
                node.node().insertBefore(g.node(), shapeEl.nextSibling)
            }
        })
    }

    function drawCoxcombInContainer(node, regionId, stackedData, keys, angle, map) {
        // Outer ring
        if (out.coxcombRings_) {
            const yearlyTotal = out.yearlyTotals[regionId] || 0
            const targetOuter = out.classifierSize_(yearlyTotal)
            node.append('circle')
                .attr('class', 'em-coxcomb-max-outline')
                .attr('r', 0)
                .attr('fill', 'none')
                .attr('stroke', '#000')
                .attr('stroke-width', 0.3)
                .attr('opacity', 0.5)
                .attr('pointer-events', 'none')
                .transition()
                .duration(out.transitionDuration_ / 2)
                .attr('r', targetOuter)
        }

        // Arc generator
        const arcGen = arc()
            .startAngle((d) => angle(d.data.month))
            .endAngle((d) => angle(d.data.month) + angle.bandwidth())
            .padAngle(0.01)
            .padRadius(0)

        // Stacked wedges
        let lastEnded = false
        keys.forEach((key, ki) => {
            node.append('g')
                .attr('class', 'em-coxcomb-chart')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 0.3)
                .selectAll('path')
                .data(stackedData[ki])
                .join('path')
                .attr('fill', out.catColors_[key] || (key === 'other' ? '#FFCC80' : 'lightgray'))
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

    function addMouseEventsToGridCartogram(map) {
        const shapes = out.svg().selectAll('#em-grid-container .em-grid-cell .em-grid-shape')
        const charts = out.svg().selectAll('#em-grid-container .em-grid-cell .em-coxcomb')

        // Helper to get region data - shapes have it directly, charts need to get it from parent cell
        const getRegionData = (element) => {
            const cell = select(element.closest('.em-grid-cell'))
            return cell.datum()
        }

        // Helper to get the shape element for a cell
        const getShapeForCell = (cell) => {
            return cell.select('.em-grid-shape')
        }

        // Shared mouseover logic
        const handleMouseOver = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return

            const cell = select(this.closest('.em-grid-cell'))
            const shape = getShapeForCell(cell)

            // Highlight shape
            shape.attr('fill___', shape.style('fill'))
            shape.style('fill', out.hoverColor_)

            // Highlight ring or chart
            const k = out._lastZoomK || 1
            if (out.coxcombRings_) {
                const outline = cell.select('circle.em-coxcomb-max-outline').node()
                if (outline) outline.style.setProperty('stroke-width', `${2 / k}px`, 'important')
            } else {
                cell.selectAll('g.em-coxcomb-chart').style('stroke', out.hoverColor_)
            }

            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
        }

        // Shared mousemove logic
        const handleMouseMove = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return
            if (out._tooltip) out._tooltip.mousemove(e)
        }

        // Shared mouseout logic
        const handleMouseOut = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return

            const cell = select(this.closest('.em-grid-cell'))
            const shape = getShapeForCell(cell)

            // Restore shape fill
            shape.style('fill', shape.attr('fill___') || '')
            shape.attr('fill___', null)

            // Restore ring or chart
            const k = out._lastZoomK || 1
            if (out.coxcombRings_) {
                const outline = cell.select('circle.em-coxcomb-max-outline').node()
                if (outline) outline.style.setProperty('stroke-width', `${0.3 / k}px`, 'important')
            } else {
                cell.selectAll('g.em-coxcomb-chart').style('stroke', '#ffffff')
            }

            if (out._tooltip) out._tooltip.mouseout()
        }

        // Attach events to shapes
        shapes.on('mouseover', handleMouseOver).on('mousemove', handleMouseMove).on('mouseout', handleMouseOut)

        // Attach events to charts
        charts.style('pointer-events', 'all').on('mouseover', handleMouseOver).on('mousemove', handleMouseMove).on('mouseout', handleMouseOut)
    }

    function applyStyleToRegionPolygons(map) {
        const selector = getRegionsSelector(map)
        let regions = map.svg().selectAll(selector)
        const status = out.coxStatus_ // id -> {...} or null

        if (map.geo_ !== 'WORLD') {
            if (map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, status, regions) // pass status instead of sizeData
                // (centroids build stays the same)
            }

            // set ecl for legend/hover
            regions.attr('ecl', (rg) => {
                const sv = status.get(rg.properties.id)
                if (sv == null) return 'ni' // no input
                if (sv?.value === ':') return 'nd' // not available
                return null // has data
            })

            // color ND polygons
            regions.filter((rg) => status.get(rg.properties.id)?.value === ':').style('fill', out.noDataFillStyle())
        }
    }

    function styleMixedNUTSRegions(map, status, regions) {
        regions.style('display', function (rg) {
            if (this.parentNode.classList.contains('em-cntrg')) return
            const sv = status.get(rg.properties.id)
            if (sv == null) return 'none' // NI: hide
            return 'block'
        })

        regions
            .style('stroke', function (rg) {
                const sel = select(this)
                const lvl = sel.attr('lvl')
                const sv = status.get(rg.properties.id)
                if (!sv || sv.value == null) return
                if (lvl !== '0') return sel.style('stroke') || '#777'
            })
            .style('stroke-width', function (rg) {
                const sel = select(this)
                const lvl = sel.attr('lvl')
                const sv = status.get(rg.properties.id)
                if (!sv || sv.value == null) return
                if (out.geo_ == 'WORLD') return
                if (lvl !== '0') return sel.style('stroke-width') || 1
            })
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
        // 1) Anchor to the centroid group for this region
        const centroid = map.svg().select('#ps' + regionId)
        if (centroid.empty()) return

        // 2) One container per region, keyed join
        const node = centroid
            .selectAll('g.em-coxcomb')
            .data([regionId], (d) => d) // stable key
            .join(
                (enter) =>
                    enter
                        .append('g')
                        .attr('class', 'em-coxcomb')
                        .attr('id', 'cox_' + regionId),
                (update) => update,
                (exit) => exit.remove()
            )

        // 3) Clear children before (re)building chart contents
        node.selectAll('*').remove()

        // 4) Outer ring
        if (out.coxcombRings_) {
            const yearlyTotal = out.yearlyTotals[regionId] || 0
            const targetOuter = out.classifierSize_(yearlyTotal)
            node.append('circle')
                .attr('class', 'em-coxcomb-max-outline')
                .attr('r', 0)
                .attr('fill', 'none')
                .attr('stroke', '#000')
                .attr('stroke-width', 0.3)
                .attr('opacity', 0.5)
                .attr('pointer-events', 'none')
                .transition()
                .duration(out.transitionDuration_ / 2)
                .attr('r', targetOuter)
        }

        // 4) Arc generator (shared for tween)
        const arcGen = arc()
            .startAngle((d) => angle(d.data.month))
            .endAngle((d) => angle(d.data.month) + angle.bandwidth())
            .padAngle(0.01)
            .padRadius(0)

        // 5) Stacked wedges
        keys.forEach((key, ki) => {
            node.append('g')
                .attr('class', 'em-coxcomb-chart')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 0.3)
                .selectAll('path')
                .data(stackedData[ki])
                .join('path')
                .attr('fill', out.catColors_[key] || (key === 'other' ? '#FFCC80' : 'lightgray'))
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
        // ;[
        //     // Merge selections so we apply handlers to both regions and charts
        //     regions,
        //     symbols,
        // ].forEach((sel) => {
        symbols
            .on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                if (!getRegionTotal(rg.properties.id)) return
                const sel = select(this)
                sel.attr('fill___', sel.style('fill'))
                sel.style('fill', out.hoverColor_)

                const k = out._lastZoomK || 1
                if (out.coxcombRings_) {
                    //highlight ring
                    sel.select('circle.em-coxcomb-max-outline')
                        .node()
                        .style.setProperty('stroke-width', `${2 / k}px`, 'important')
                } else {
                    //highlight chart
                    sel.selectAll('g.em-coxcomb-chart').style('stroke', out.hoverColor_)
                }

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
                sel.style('fill', sel.attr('fill___') || '')
                sel.attr('fill___', null)
                // Thicken the first circle (outline) inside the symbol group
                const k = out._lastZoomK || 1
                if (out.coxcombRings_) {
                    //highlight ring
                    sel.select('circle.em-coxcomb-max-outline')
                        .node()
                        .style.setProperty('stroke-width', `${0.3 / k}px`, 'important') // restore base
                } else {
                    //highlight chart
                    sel.selectAll('g.em-coxcomb-chart').style('stroke', '#ffffff')
                }
                if (out._tooltip) out._tooltip.mouseout()
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

        // *** Remove "other" column if it's zero for every row ***
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
