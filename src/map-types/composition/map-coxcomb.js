import { scaleBand } from 'd3-scale'
import { select } from 'd3-selection'
import { arc, stack } from 'd3-shape'
import { max, min } from 'd3-array'
import { schemeCategory10 } from 'd3-scale-chromatic'
import { createStatMap } from '../../core/stat-map'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../../core/utils'
import * as CoxcombLegend from '../../legend/legend-coxcomb.js'
import { interpolate } from 'd3-interpolate'
import { runDorlingSimulation, stopDorlingSimulation } from '../../core/dorling/dorling'
import { adjustGridCartogramTextLabels } from '../../core/cartograms'
import { buildGetterSetters, applyConfigValues } from '../composition/composition-map'
import { createRadialScale } from '../../core/scale.js'
import { getCentroidsGroup } from '../../core/geo/centroids'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/map-types/composition/coxcomb/CoxcombMapConfig').CoxcombMapConfig} CoxcombMapConfig */
/** @typedef {import('../../types/map-types/composition/coxcomb/CoxcombMap').CoxcombMap} CoxcombMap */

/**
 * Returns a coxcomb (polar area) chart map.
 *
 * Each region displays a circular chart divided into equal angular segments
 * (one per time period), with wedge radius proportional to the value for
 * that period. Wedges are stacked by category, making both temporal patterns
 * and category composition visible simultaneously.
 *
 * Unlike pie/waffle/bar/stripe maps, the data model here is 2-dimensional:
 * time × category. Each stat dataset is keyed as `"${time}:${category}"`.
 *
 * @param {CoxcombMapConfig} [config]
 * @returns {CoxcombMap}
 */
export const map = function (config) {
    const out = createStatMap(config, true, 'coxcomb')

    // ── Config defaults ──────────────────────────────────────────────────────

    out.coxcombMinRadius_ = 10
    out.coxcombMaxRadius_ = 30
    out.coxcombStrokeFill_ = 'white'
    out.coxcombStrokeWidth_ = 0.3
    out.coxcombRings_ = false
    out.coxcombOffsets_ = { x: 0, y: 0 }
    out.hoverColor_ = '#ffa500'

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.classifierSize_ = null

    out.statCodes_ = undefined
    out.totalCode_ = undefined
    out._anyRegionHasOther_ = false

    // ── Getters/setters ──────────────────────────────────────────────────────

    buildGetterSetters(out, [
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
    ])

    applyConfigValues(out, config, [
        'catColors',
        'catLabels',
        'noDataFillStyle',
        'coxcombMaxRadius',
        'coxcombMinRadius',
        'coxcombRings',
        'coxcombStrokeFill',
        'coxcombStrokeWidth',
        'hoverColor',
        'classifierSize',
        'coxcombOffsets',
    ])

    // ── statCoxcomb config method ────────────────────────────────────────────

    /**
     * Configure the coxcomb map from a single config object.
     *
     * Supports both Eurostat data API, custom data, and the legacy nested `stat` API for
     * backwards compatibility.
     *
     * @param {Object} config
     *
     * Eurostat API:
     * @param {String} config.eurostatDatasetCode
     * @param {Object} config.filters - Shared filters (excluding time and category params)
     * @param {String} [config.unitText]
     * @param {String} config.timeParameter - The dimension name for time (e.g. 'month')
     * @param {Array}  config.times - Time values to query (e.g. ['M01',...,'M12'])
     * @param {Array}  [config.timeLabels] - Display labels for times
     * @param {String} config.categoryParameter - The dimension name for categories
     * @param {Array}  config.categoryCodes - Category codes
     * @param {Array}  [config.categoryLabels]
     * @param {Array}  [config.categoryColors]
     * @param {String} [config.totalCode] - Optional total category code for "other" wedge
     *
     * Custom Data API (NEW):
     * @param {Object} config.customData - Custom data in format: { regionId: { time: { category: value } } }
     * @param {String} [config.unitText]
     * @param {Array}  config.times - Time values (e.g. ['Jan','Feb','Mar'])
     * @param {Array}  [config.timeLabels] - Display labels for times
     * @param {Array}  config.categoryCodes - Category codes
     * @param {Array}  [config.categoryLabels]
     * @param {Array}  [config.categoryColors]
     * @param {String} [config.totalCode] - Optional total category code for "other" wedge (auto-calculated if not provided)
     *
     * Legacy API (still supported):
     * @param {Object} config.stat - Nested stat config: { eurostatDatasetCode, filters, unitText }
     *
     * @example — Eurostat API
     * .statCoxcomb({
     *   eurostatDatasetCode: 'tour_occ_nin2m',
     *   filters: { unit: 'NR', nace_r2: 'I551-I553' },
     *   unitText: 'Nights spent',
     *   timeParameter: 'month',
     *   times: ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12'],
     *   timeLabels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
     *   categoryParameter: 'c_resid',
     *   categoryCodes: ['DOM','FOR'],
     *   categoryLabels: ['Domestic','Foreign'],
     *   categoryColors: ['#1b9e77','#d95f02'],
     *   totalCode: 'TOTAL',
     * })
     *
     * @example — Custom Data API
     * .statCoxcomb({
     *   customData: {
     *     'FR': { 'Jan': { 'Domestic': 1500, 'Foreign': 800 }, 'Feb': { 'Domestic': 1600, 'Foreign': 900 } },
     *     'DE': { 'Jan': { 'Domestic': 2200, 'Foreign': 1200 }, 'Feb': { 'Domestic': 2100, 'Foreign': 1300 } }
     *   },
     *   times: ['Jan','Feb','Mar','Apr','May','Jun'],
     *   timeLabels: ['January','February','March','April','May','June'],
     *   categoryCodes: ['Domestic','Foreign'],
     *   categoryLabels: ['Domestic tourists','Foreign tourists'],
     *   categoryColors: ['#1b9e77','#d95f02'],
     *   unitText: 'Tourist nights'
     * })
     */
    out.statCoxcomb = function (config) {
        // ── Backwards compat: flatten nested stat object ─────────────────────
        if (config.stat) {
            config = { ...config.stat, ...config }
            delete config.stat
        }

        const {
            eurostatDatasetCode,
            customData, // NEW: For custom data
            filters,
            unitText,
            timeParameter,
            times,
            timeLabels,
            categoryParameter,
            categoryCodes,
            categoryLabels,
            categoryColors,
            totalCode,
        } = config

        // Validation
        if (!times || !times.length) {
            throw new Error('Coxcomb maps require a "times" array. Example: times: ["Jan", "Feb", "Mar"]')
        }
        if (!categoryCodes || !categoryCodes.length) {
            throw new Error('Coxcomb maps require "categoryCodes". Example: categoryCodes: ["Domestic", "Foreign"]')
        }

        out._coxTimes = times
        out._coxCategoryCodes = [...categoryCodes] // clone — 'other' may be appended later
        out._coxTimeLabels = timeLabels

        // Set category colors and labels
        const assignCategoryProperties = () => {
            categoryCodes.forEach((category, idx) => {
                if (categoryColors?.[idx]) {
                    out.catColors_ = out.catColors_ || {}
                    out.catColors_[category] = categoryColors[idx]
                }
                if (categoryLabels?.[idx]) {
                    out.catLabels_ = out.catLabels_ || {}
                    out.catLabels_[category] = categoryLabels[idx]
                }
            })

            if (totalCode) {
                out.totalCode_ = totalCode
                out.catColors_ = out.catColors_ || {}
                out.catLabels_ = out.catLabels_ || {}
                out.catColors_['other'] = '#FFCC80'
                out.catLabels_['other'] = 'Other'
            }
        }

        // ── Custom Data Path ─────────────────────────────────────────────────
        if (customData && !eurostatDatasetCode) {
            assignCategoryProperties()

            // Store custom data and config for use after build (like pie charts)
            out._customData = customData
            out._customTimes = times
            out._customCategories = [...categoryCodes] // clone
            out._customTotalCode = totalCode
            out._customUnitText = unitText || 'Value'

            // Set up stat configs for each time:category combination (no data fetching)
            times.forEach((time) => {
                categoryCodes.forEach((category) => {
                    const key = `${time}:${category}`
                    out.stat(key, {
                        code: key,
                        unitText: unitText || 'Value',
                    })
                })

                if (totalCode) {
                    const key = `${time}:${totalCode}`
                    out.stat(key, {
                        code: key,
                        unitText: unitText || 'Value',
                    })
                }
            })

            // Store method to inject data after build (like pie charts do it manually)
            out._injectCustomData = function () {
                out._customTimes.forEach((time) => {
                    out._customCategories.forEach((category) => {
                        const key = `${time}:${category}`
                        const regionData = {}

                        for (const regionId in out._customData) {
                            if (regionId === 'UA') console.log('UA M01:DOM value:', out._customData['UA']?.['M01']?.['DOM'])
                            const value = out._customData[regionId]?.[time]?.[category]

                            if (value !== undefined) {
                                regionData[regionId] = value
                            }
                        }

                        if (Object.keys(regionData).length > 0) {
                            out.statData(key).setData(regionData)
                        }
                    })

                    if (out._customTotalCode) {
                        const key = `${time}:${out._customTotalCode}`
                        const regionData = {}

                        for (const regionId in out._customData) {
                            let total = out._customData[regionId]?.[time]?.[out._customTotalCode]
                            if (total === undefined) {
                                // Auto-calculate total from categories
                                total = 0
                                out._customCategories.forEach((cat) => {
                                    const val = out._customData[regionId]?.[time]?.[cat]
                                    if (val !== undefined && !isNaN(val)) total += parseFloat(val)
                                })
                            }
                            if (total === ':' || total > 0) {
                                regionData[regionId] = total
                            }
                        }

                        if (Object.keys(regionData).length > 0) {
                            out.statData(key).setData(regionData)
                        }
                    }
                })

                // After data injection, update the visualization
                out.updateStatValues()
            }

            // Set up build override to automatically inject data after build
            const originalBuild = out.build
            out.build = function () {
                const result = originalBuild.call(out)

                // Inject custom data after build completes
                out._injectCustomData()

                return result
            }

            return out
        }

        // ── Eurostat Data Path (unchanged - maintains backward compatibility) ──
        assignCategoryProperties()
        const baseFilters = filters ? { ...filters } : {}

        // Register one stat per time × category combination
        times.forEach((time) => {
            categoryCodes.forEach((category) => {
                const key = `${time}:${category}`
                out.stat(key, {
                    eurostatDatasetCode,
                    unitText,
                    filters: { ...baseFilters, [timeParameter]: time, [categoryParameter]: category },
                })
            })

            // Also load total per time (used to compute "other" wedge)
            if (totalCode) {
                out.stat(`${time}:${totalCode}`, {
                    eurostatDatasetCode,
                    unitText,
                    filters: { ...baseFilters, [timeParameter]: time, [categoryParameter]: totalCode },
                })
            }
        })

        return out
    }

    // ── Classification ───────────────────────────────────────────────────────

    //@override
    out.updateClassification = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
        }
        applyClassificationToMap()
        return out
    }

    // Note: `map` param satisfies the executeForAllInsets callback signature;
    // all data is read from the `out` closure.
    function applyClassificationToMap(map) {
        if (!out.statCodes_) {
            out.statCodes_ = Object.keys(out.statData_)
            const index = out.statCodes_.indexOf('default')
            if (index > -1) out.statCodes_.splice(index, 1)
        }
        computeTotals()
        computeCoxStatusMap()
        defineSizeScales()
        buildTooltipCache()
    }

    function buildTooltipCache() {
        out._tooltipCache = new Map()
        const months = out._coxTimes || []
        const unit = out.statData(out.statCodes_[0])?.unitText() || ''

        const allRegions = new Set()
        months.forEach((month) => {
            const stat = out.totalCode_ ? out.statData(`${month}:${out.totalCode_}`) : out.statData(`${month}:${out._coxCategoryCodes[0]}`)
            if (stat?._data_) Object.keys(stat._data_).forEach((id) => allRegions.add(id))
        })

        allRegions.forEach((regionId) => {
            const includeOther =
                out.totalCode_ &&
                months.some((month) => {
                    const totalVal = out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value || 0
                    const sumCauses = out._coxCategoryCodes.reduce((a, c) => a + (out.statData(`${month}:${c}`)?.get(regionId)?.value || 0), 0)
                    return totalVal > sumCauses
                })

            const causes = includeOther ? [...out._coxCategoryCodes, 'other'] : [...out._coxCategoryCodes]
            const regionYearly = out.yearlyTotals?.[regionId] || 0
            const monthlyTotals = out.monthlyTotals?.[regionId] || {}

            const headerCells = [`<th class="em-breakdown-label">Month</th>`]
            causes.forEach((cause) => {
                const label = out.catLabels_[cause] || cause
                const color = out.catColors_[cause] || (cause === 'other' ? '#FFCC80' : '#999')
                headerCells.push(`<th class="em-breakdown-label" style="color:${color}">${label}</th>`)
            })
            headerCells.push(`<th class="em-breakdown-label">Total</th>`)

            const rows = months.map((month, i) => {
                const label = out._coxTimeLabels ? out._coxTimeLabels[i] : month
                const cells = [`<td class="em-breakdown-label">${label}</td>`]
                const monthSum = monthlyTotals[month] || 0

                causes.forEach((cause) => {
                    let rawVal = 0
                    if (cause === 'other') {
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

                cells.push(monthSum > 0 ? `<td><span class="em-breakdown-value">${spaceAsThousandSeparator(monthSum)}</span></td>` : '<td></td>')
                return `<tr>${cells.join('')}</tr>`
            })

            const yearRow =
                regionYearly > 0
                    ? `<tr class="em-total"><td class="em-breakdown-label">Year total</td><td colspan="${causes.length}"></td><td><span class="em-breakdown-value">${spaceAsThousandSeparator(regionYearly)} ${unit}</span></td></tr>`
                    : ''

            out._tooltipCache.set(
                regionId,
                `
            <div class="em-tooltip-breakdown em-tooltip-cx">
                <table class="em-tooltip-cx-table">
                    <tr>${headerCells.join('')}</tr>
                    ${rows.join('')}
                    ${yearRow}
                </table>
            </div>`
            )
        })
    }

    // ── Totals computation ───────────────────────────────────────────────────

    /**
     * Pre-compute per-region yearly and monthly totals.
     * Stored on `out.yearlyTotals` and `out.monthlyTotals` for use during
     * rendering and tooltip generation.
     */
    function computeTotals() {
        const yearlyTotals = {}
        const monthlyTotals = {}

        if (out.totalCode_) {
            // Use the dedicated TOTAL series for each time period
            out._coxTimes.forEach((month) => {
                const stat = out.statData(`${month}:${out.totalCode_}`)
                if (!stat?._data_) return

                for (const region in stat._data_) {
                    const v = stat._data_[region]?.value || 0
                    monthlyTotals[region] = monthlyTotals[region] || {}
                    monthlyTotals[region][month] = v
                    yearlyTotals[region] = (yearlyTotals[region] || 0) + v
                }
            })
        } else {
            // Sum all categories per time period per region
            out._coxTimes.forEach((month) => {
                const perRegionMonthSum = {}

                out._coxCategoryCodes.forEach((cause) => {
                    const stat = out.statData(`${month}:${cause}`)
                    if (!stat?._data_) return

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

    /**
     * Build a status map: regionId → {value: ':'} (no data), {value: 0} (has data), null (not in dataset).
     * Used to style region polygons in mixed NUTS mode.
     */
    function computeCoxStatusMap() {
        const months = out._coxTimes || []
        const cats = out._coxCategoryCodes || []
        const useTotal = !!out.totalCode_
        const status = new Map()

        const regionIds = new Set()
        const addIdsFrom = (key) => {
            const st = out.statData(key)
            if (st?._data_) Object.keys(st._data_).forEach((id) => regionIds.add(id))
        }

        months.forEach((m) => {
            if (useTotal) addIdsFrom(`${m}:${out.totalCode_}`)
            else cats.forEach((c) => addIdsFrom(`${m}:${c}`))
        })

        regionIds.forEach((id) => {
            let seenAny = false,
                seenND = false,
                seenNumeric = false

            months.forEach((m) => {
                const entries = useTotal ? [out.statData(`${m}:${out.totalCode_}`)?.get(id)] : cats.map((c) => out.statData(`${m}:${c}`)?.get(id))

                entries.forEach((e) => {
                    if (!e) return
                    seenAny = true
                    if (e.value === ':') seenND = true
                    else if (typeof e.value === 'number') seenNumeric = true
                })
            })

            if (seenND) status.set(id, { value: ':' })
            else if (seenAny || seenNumeric) status.set(id, { value: 0 })
            else status.set(id, null)
        })

        out.coxStatus_ = status
    }

    function getRegionTotal(id) {
        return out.yearlyTotals[id] !== undefined ? out.yearlyTotals[id] : undefined
    }

    /**
     * Define the two size scales used for rendering:
     *  - `classifierSize_`: maps yearly total → outer circle radius (area ∝ total)
     *  - `classifierChartSize_`: maps a stacked value → inner/outer arc radius,
     *    normalised within the region so proportions are preserved
     */
    function defineSizeScales() {
        const minRadius = out.coxcombMinRadius_ || 0
        const maxRadius = out.coxcombMaxRadius_ || 80

        const allMonthlyValues = []
        for (const regionId in out.monthlyTotals) {
            for (const month in out.monthlyTotals[regionId]) {
                allMonthlyValues.push(out.monthlyTotals[regionId][month])
            }
        }

        const radialScale = createRadialScale(allMonthlyValues, maxRadius, 0)
        // minRadius is intentionally 0 here — the minimum chart size is enforced
        // geometrically via a per-chart scaleFactor in drawCoxcombChart, which
        // scales the entire chart group uniformly. Applying a floor in the scale
        // itself corrupts stacked inner radii and distorts category proportions.

        out.classifierChartSize_ = radialScale
        out._globalMonthlyMax = radialScale.domain()[1]
        out._globalMonthlyMin = radialScale.domain()[0]

        // stub for API compatibility
        out.classifierSize_ = radialScale
    }

    // ── Styling ──────────────────────────────────────────────────────────────

    //@override
    out.updateStyle = function () {
        out._anyRegionHasOther_ = false

        if (!out.catColors_) {
            out.catColors({})
            for (let i = 0; i < out.statCodes_.length; i++) {
                out.catColors_[out.statCodes_[i]] = schemeCategory10[i % 10]
            }
        }

        try {
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }
            applyStyleToMap(out)

            // Remove 'other' from legend if no region actually has it
            if (out.totalCode_ && !out._anyRegionHasOther_) {
                delete out.catColors_?.other
                delete out.catLabels_?.other
            }

            if (out.dorling_ && !out.gridCartogram_) {
                runDorlingSimulation(
                    out,
                    (d) => {
                        const regionalMax = Math.max(...Object.values(out.monthlyTotals[d.properties.id] || { 0: 0 }))
                        const naturalMax = out.classifierChartSize_(regionalMax) || 0
                        const minRadius = out.coxcombMinRadius_ || 0
                        // Mirror the scaleFactor logic in drawCoxcombChart so the Dorling
                        // simulation reserves the correct amount of space for enlarged charts.
                        const scaleFactor = naturalMax > 0 && naturalMax < minRadius ? minRadius / naturalMax : 1
                        return naturalMax * scaleFactor
                    },
                    out.dorlingSettings_.padding || 0
                )
            } else {
                stopDorlingSimulation(out)
            }

            return out
        } catch (e) {
            console.error('Error in updateStyle:', e.message, e)
        }

        return out
    }

    function getCoxcombAnchors(map) {
        if (map.gridCartogram_) {
            return map.svg().selectAll('#em-grid-container .em-grid-cell')
        }
        return getCentroidsGroup(map).selectAll('g.em-centroid')
    }

    function applyStyleToMap(map) {
        out.catLabels_ = out.catLabels_ || {}
        if (!out.svg_) return

        if (map.gridCartogram_) {
            const angle = createAngleScale(out._coxTimes)
            applyStyleToGridCartogram(map, angle)
            adjustGridCartogramTextLabels({
                map,
                getAnchors: getCoxcombAnchors,
                getRadius: getCoxcombTopRadius,
                margin: 2,
            })
        } else {
            const s = getCentroidsGroup(map)
            if (!s) return

            const regionFeatures = s
                .selectAll('g.em-centroid')
                .data()
                .filter((rg) => getRegionTotal(rg.properties.id) !== undefined)

            applyStyleToRegionPolygons(map)
            addMouseEventsToRegionPolygons(map)
            addMouseEventsToRegions(map)
            addCoxcombChartsToMap(regionFeatures, map)
        }
    }

    // ── Chart rendering ──────────────────────────────────────────────────────

    /**
     * Core drawing function: renders ring + stacked wedges into a pre-existing
     * container group. Used by both geographic and grid-cartogram paths.
     *
     * Previously duplicated as `drawCoxcombInContainer` (grid) and `drawCoxcomb`
     * (geographic). The only difference was that `drawCoxcomb` also created/joined
     * the container node — that responsibility is now on the caller.
     *
     * @param {Object} node - d3 selection of the container <g>
     * @param {string} regionId
     * @param {Array}  stackedData - output of d3.stack()
     * @param {Array}  keys - active category keys
     * @param {Function} angle - d3 scaleBand for time → angle
     */
    function drawCoxcombChart(node, regionId, stackedData, keys, angle) {
        const regionMonthlyMax = Math.max(...Object.values(out.monthlyTotals[regionId] || { 0: 0 }))
        const naturalMax = out.classifierChartSize_(regionMonthlyMax)
        const minRadius = out.coxcombMinRadius_ || 0

        // If this chart's largest wedge falls below minRadius, scale the entire
        // chart up uniformly so it remains legible. This preserves internal proportions
        // and only affects charts smaller than the threshold.
        const scaleFactor = naturalMax > 0 && naturalMax < minRadius ? minRadius / naturalMax : 1
        // Wrap all chart content in an inner group so scale() doesn't interfere
        // with the parent node's translate transform or origin point
        const chartG = node.append('g')
        if (scaleFactor > 1) chartG.attr('transform', `scale(${scaleFactor})`)

        // Outer reference ring
        if (out.coxcombRings_) {
            const regionMonthlyMax = Math.max(...Object.values(out.monthlyTotals[regionId] || { 0: 0 }))
            const targetOuter = out.classifierChartSize_(regionMonthlyMax)
            chartG
                .append('circle')
                .attr('class', 'em-coxcomb-max-outline')
                .attr('r', 0)
                .attr('fill', 'none')
                .attr('stroke', '#000')
                .attr('stroke-width', 0.3 / scaleFactor)
                .attr('opacity', 0.5)
                .attr('pointer-events', 'none')
                .transition()
                .duration(out.transitionDuration_ / 2)
                .attr('r', targetOuter)
        }

        // Arc generator — inner/outer radii are animated via attrTween
        const arcGen = arc()
            .startAngle((d) => angle(d.data.month))
            .endAngle((d) => angle(d.data.month) + angle.bandwidth())
            .padAngle(0.01)
            .padRadius(0)

        // One group per category key, stacked
        keys.forEach((key, ki) => {
            chartG
                .append('g')
                .attr('class', 'em-coxcomb-chart')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 0.1 / scaleFactor)
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
                    // No floor correction needed here — the scale has no minRadius floor,
                    // so d[0] correctly returns 0 for the first category and stacking
                    // boundaries are geometrically consistent. Chart enlargement for
                    // legibility is handled entirely by the scaleFactor transform on chartG.
                    const iInner = interpolate(0, out.classifierChartSize_(d[0]))
                    const iOuter = interpolate(0, out.classifierChartSize_(d[1]))
                    return (t) => arcGen.innerRadius(iInner(t)).outerRadius(iOuter(t))(d)
                })
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
            const stacked = stack().keys(keys)(monthData)

            // Create/join the container group at the centroid
            const centroid = map.svg().select('#ps' + regionId)
            if (centroid.empty()) return

            const node = centroid
                .selectAll('g.em-coxcomb')
                .data([regionId], (d) => d)
                .join(
                    (enter) =>
                        enter
                            .append('g')
                            .attr('class', 'em-coxcomb')
                            .attr('id', 'cox_' + regionId),
                    (update) => update,
                    (exit) => exit.remove()
                )

            node.selectAll('*').remove()
            drawCoxcombChart(node, regionId, stacked, keys, angle)
        })
    }

    function applyStyleToGridCartogram(map, angle) {
        const regionIds = []
        getCoxcombAnchors(map).attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'cox_' + rg.properties.id
        })
        addCoxcombChartsToGridCartogram(regionIds, map, angle)
        addMouseEventsToGridCartogram(map)
    }

    function addCoxcombChartsToGridCartogram(regionIds, map, angle) {
        const months = out._coxTimes
        const causes = out._coxCategoryCodes
        const offsets = { ...(out.coxcombOffsets_ || { x: 0, y: 0 }) }

        if (out.gridCartogramSettings_.shape === 'hexagon') {
            offsets.x -= (out.coxcombWidth_ || 0) - 4
            offsets.y -= (out.coxcombHeight_ || 0) + 4
        }

        regionIds.forEach((regionId) => {
            const node = out.svg().select('#cox_' + regionId)
            if (node.empty()) return

            const monthData = buildMonthData(regionId, months, causes)
            if (!monthData.length) return

            const keys = getActiveKeys(monthData, causes)
            const stacked = stack().keys(keys)(monthData)

            node.selectAll('.em-coxcomb').remove()

            const bbox = node.node().getBBox()
            const anchorX = bbox.width / 2
            const anchorY = bbox.height / 2

            const g = node
                .append('g')
                .attr('class', 'em-coxcomb')
                .attr('transform', `translate(${anchorX + offsets.x}, ${anchorY + offsets.y})`)

            drawCoxcombChart(g, regionId, stacked, keys, angle)

            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl?.nextSibling) node.node().insertBefore(g.node(), shapeEl.nextSibling)
        })
    }

    // ── Mouse events ─────────────────────────────────────────────────────────

    /**
     * Add tooltip mouse events to region polygons (like pie charts do).
     * This allows users to hover over the region fill, not just the coxcomb chart.
     */
    function addMouseEventsToRegionPolygons(map) {
        const selector = getRegionsSelector(map)
        const regions = map.svg().selectAll(selector)

        regions
            .on('mouseenter', function (e, rg) {
                console.log('mouseenter', rg.properties.id)
                if (!getRegionTotal(rg.properties.id)) return
                const sel = select(this)
                sel.attr('fill___', sel.style('fill'))
                sel.style('fill', out.hoverColor_)
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            })
            // .on('mousemove', function (e) {
            //     if (out._tooltip) out._tooltip.mousemove(e)
            // })
            .on('mouseleave', function (e, rg) {
                console.log('mouseleave', rg.properties.id)
                const sel = select(this)
                const newFill = sel.attr('fill___')
                if (newFill) {
                    sel.style('fill', newFill)
                    sel.attr('fill___', null)
                    if (out._tooltip) out._tooltip.mouseout()
                }
            })
    }

    /**
     * Coxcomb mouse events are attached to the centroid symbol groups (not region
     * paths) and include ring/chart stroke highlighting — distinct from the shared
     * addMouseEventsToRegions which operates on plain region fills.
     */
    function addMouseEventsToRegions(map) {
        const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)
        const symbols = map.svg().selectAll('g.em-centroid')

        // Cache to avoid repeated function calls on mousemove
        let cachedRegion = null
        let cachedSelection = null

        symbols
            .on('mouseenter', function (e, rg) {
                if (shouldOmit(rg.properties.id) || !getRegionTotal(rg.properties.id)) return

                // Cache for mousemove performance
                cachedRegion = rg
                cachedSelection = select(this)

                cachedSelection.attr('fill___', cachedSelection.style('fill'))
                cachedSelection.style('fill', out.hoverColor_)
                highlightCoxcombChart(cachedSelection, true)
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            })
            // .on('mousemove', function (e, rg) {
            //     // Use cached data to avoid expensive checks on every mousemove
            //     if (!cachedRegion) return
            //     if (out._tooltip) out._tooltip.mousemove(e)
            // })
            .on('mouseleave', function (e, rg) {
                // Use cached data for consistent behavior
                if (!cachedRegion || !cachedSelection) return

                cachedSelection.style('fill', cachedSelection.attr('fill___') || '')
                cachedSelection.attr('fill___', null)
                highlightCoxcombChart(cachedSelection, false)
                if (out._tooltip) out._tooltip.mouseout()

                // Clear cache
                cachedRegion = null
                cachedSelection = null
            })
    }

    function addMouseEventsToGridCartogram(map) {
        const shapes = out.svg().selectAll('#em-grid-container .em-grid-cell .em-grid-shape')
        const charts = out.svg().selectAll('#em-grid-container .em-grid-cell .em-coxcomb')

        const getRegionData = (el) => select(el.closest('.em-grid-cell')).datum()

        // Cache to avoid repeated DOM lookups on mousemove
        let cachedRegion = null
        let cachedCell = null

        const handleMouseOver = function (e) {
            const rg = getRegionData(this)
            if (!rg || !getRegionTotal(rg.properties.id)) return

            // Cache for mousemove performance
            cachedRegion = rg
            cachedCell = select(this.closest('.em-grid-cell'))

            const shape = cachedCell.select('.em-grid-shape')
            shape.attr('fill___', shape.style('fill')).style('fill', out.hoverColor_)
            highlightCoxcombChart(cachedCell, true)
            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
        }

        const handleMouseMove = function (e) {
            // Use cached data to avoid expensive DOM lookups on every mousemove
            if (!cachedRegion) return
            if (out._tooltip) out._tooltip.mousemove(e)
        }

        const handleMouseOut = function (e) {
            // Use cached data for consistent behavior
            if (!cachedRegion || !cachedCell) return

            const shape = cachedCell.select('.em-grid-shape')
            shape.style('fill', shape.attr('fill___') || '').attr('fill___', null)
            highlightCoxcombChart(cachedCell, false)
            if (out._tooltip) out._tooltip.mouseout()

            // Clear cache
            cachedRegion = null
            cachedCell = null
        }

        shapes.on('mouseenter', handleMouseOver).on('mousemove', handleMouseMove).on('mouseleave', handleMouseOut)
        charts.style('pointer-events', 'all').on('mouseenter', handleMouseOver).on('mousemove', handleMouseMove).on('mouseleave', handleMouseOut)
    }

    /**
     * Apply or remove hover highlight on a coxcomb chart.
     * When rings are shown, the outer circle stroke width is scaled by zoom.
     * Otherwise, the chart stroke color is changed.
     *
     * @param {Object} container - d3 selection containing the chart (centroid group or cell)
     * @param {boolean} active - true = highlight on, false = highlight off
     */
    function highlightCoxcombChart(container, active) {
        const k = out._lastZoomK || 1
        if (out.coxcombRings_) {
            const outline = container.select('circle.em-coxcomb-max-outline').node()
            if (outline) outline.style.setProperty('stroke-width', `${active ? 2 / k : 0.3 / k}px`, 'important')
        } else {
            container.selectAll('g.em-coxcomb-chart').style('stroke', active ? out.hoverColor_ : '#ffffff')
        }
    }

    // ── Region polygon styling ────────────────────────────────────────────────

    function applyStyleToRegionPolygons(map) {
        const selector = getRegionsSelector(map)
        const regions = map.svg().selectAll(selector)
        const status = out.coxStatus_

        if (map.geo_ !== 'WORLD' && map.nutsLevel_ == 'mixed') {
            styleMixedNUTSRegions(map, status, regions)
        }

        regions.attr('ecl', (rg) => {
            const sv = status.get(rg.properties.id)
            if (sv == null) return 'ni'
            if (sv?.value === ':') return 'nd'
            return null
        })

        regions.filter((rg) => status.get(rg.properties.id)?.value === ':').style('fill', out.noDataFillStyle())
    }

    function styleMixedNUTSRegions(map, status, regions) {
        regions.each(function (rg) {
            if (this.parentNode.classList.contains('em-cntrg')) return
            const sel = select(this)
            const sv = status.get(rg.properties.id)

            if (sv == null) {
                sel.style('display', 'none')
                return
            }

            const lvl = sel.attr('lvl')
            sel.style('display', 'block')

            if (lvl !== '0') {
                sel.style('stroke', sel.style('stroke') || '#777')
                if (map.geo_ !== 'WORLD') sel.style('stroke-width', sel.style('stroke-width') || 1)
            }
        })
    }

    // ── Data helpers ─────────────────────────────────────────────────────────

    /**
     * Get the maximum outer radius that appears at either the first or last
     * time period. Used for grid cartogram text label placement.
     */
    function getCoxcombTopRadius(regionId) {
        const months = out._coxTimes
        if (!months?.length) return 0

        let maxR = 0
        ;[months[0], months[months.length - 1]].forEach((month) => {
            let stackSum = out._coxCategoryCodes.reduce((a, cause) => {
                return a + (out.statData(`${month}:${cause}`)?.get(regionId)?.value || 0)
            }, 0)

            if (out.totalCode_) {
                const total = out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value || 0
                if (total > stackSum) stackSum = total
            }

            const r = out.classifierChartSize_(stackSum)
            if (r > maxR) maxR = r
        })

        return maxR
    }

    /**
     * Build the per-time-period row data for a region, ready for d3.stack().
     * Each row: { month, [category]: value, ..., other?: value }
     *
     * 'other' is computed as total − sum(categories) when totalCode is set
     * and the difference is positive.
     */
    function buildMonthData(regionId, months, causes) {
        const rows = months
            .map((month) => {
                const row = { month }
                let sumCauses = 0

                causes.forEach((cause) => {
                    const val = out.statData(`${month}:${cause}`)?.get(regionId)?.value || 0
                    row[cause] = val
                    sumCauses += val
                })

                if (out.totalCode_) {
                    const totalVal = out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value || 0
                    const otherVal = totalVal > sumCauses ? totalVal - sumCauses : 0
                    if (otherVal > 0) row['other'] = otherVal
                }

                return Object.values(row).some((v) => v && v > 0) ? row : null
            })
            .filter(Boolean)

        const hasOther = rows.some((r) => (r.other || 0) > 0)
        if (hasOther) {
            out._anyRegionHasOther_ = true
        } else {
            rows.forEach((r) => delete r.other)
        }

        return rows
    }

    function getActiveKeys(monthData, causes) {
        const keys = [...causes]
        if (monthData.some((d) => (d['other'] || 0) > 0)) keys.push('other')
        return keys
    }

    function createAngleScale(months) {
        return scaleBand()
            .domain(months)
            .range([0, 2 * Math.PI])
            .align(0)
    }

    // ── Legend ───────────────────────────────────────────────────────────────

    out.getLegendConstructor = function () {
        return CoxcombLegend.legend
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────

    out.tooltip_.textFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const cached = out._tooltipCache?.get(regionId) || ''
        return `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>${cached}`
    }

    return out
}
