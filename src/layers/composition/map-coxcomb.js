import { select } from 'd3-selection'
import { arc, stack } from 'd3-shape'
import { max } from 'd3-array'
import { buildSingleLayerMap } from '../../core/stat-map'
import * as StatisticalData from '../../core/stat-data'
import { reportConfigError } from '../../core/errors'
import { registerLayerType } from '../../core/layer-registry'
import { applyPatternFill } from '../../core/decoration/pattern-fill'
import { executeForAllInsets, getRegionsSelector } from '../../core/utils'
import * as CoxcombLegend from '../../legend/legend-coxcomb.js'
import { interpolate } from 'd3-interpolate'
import { runDorlingSimulation, stopDorlingSimulation } from '../../core/dorling/dorling'
import { adjustGridCartogramTextLabels, getGridCartogramChartOffset } from '../../core/cartograms'
import { buildGetterSetters, applyConfigValues, buildCompositionCategoryColorFn } from '../composition/composition-map'
import { getCentroidsGroup } from '../../core/geo/centroids'
import { DEFAULT_CATEGORICAL_COLORS } from '../../core/color-palettes'
import { getResponsiveSymbolSize } from '../../core/responsive'
import { buildTooltipCache, computeTotals, computeCoxStatusMap, getRegionTotal, defineSizeScales, getCoxcombTopRadius, buildMonthData, getActiveKeys, createAngleScale } from './coxcomb-data'
import { addMouseEventsToRegionPolygons, addMouseEventsToRegions, addMouseEventsToGridCartogram } from './coxcomb-interactions'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/layers/composition/coxcomb/CoxcombMapConfig').CoxcombMapConfig} CoxcombMapConfig */
/** @typedef {import('../../types/layers/composition/coxcomb/CoxcombMap').CoxcombMap} CoxcombMap */

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
    return buildSingleLayerMap('coxcomb', config)
}

export const decorateCoxcombLayer = function (out, config) {

    // ── Config defaults ──────────────────────────────────────────────────────

    out.coxcombMinRadius_ = 10
    out.coxcombMaxRadius_ = 30
    out.coxcombStrokeFill_ = 'white'
    out.coxcombStrokeWidth_ = 0.1
    out.coxcombRings_ = false
    out.coxcombOffsets_ = { x: 0, y: 0 }
    out.hoverColor_ = '#ffa500'

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.classifierSize_ = null
    out.categoryFillStyle_ = undefined
    out.categoryText_ = undefined

    out.statCodes_ = undefined
    out.totalCode_ = undefined
    out._anyRegionHasOther_ = false

    const defaultCoxcombSettings = {
        minRadius: out.coxcombMinRadius_,
        maxRadius: out.coxcombMaxRadius_,
        strokeFill: out.coxcombStrokeFill_,
        strokeWidth: out.coxcombStrokeWidth_,
        rings: out.coxcombRings_,
        offsets: out.coxcombOffsets_,
    }

    out.coxcombSettings_ = { ...defaultCoxcombSettings, ...(config?.coxcombSettings || {}) }
    out.coxcombMinRadius_ = out.coxcombSettings_.minRadius
    out.coxcombMaxRadius_ = out.coxcombSettings_.maxRadius
    out.coxcombStrokeFill_ = out.coxcombSettings_.strokeFill
    out.coxcombStrokeWidth_ = out.coxcombSettings_.strokeWidth
    out.coxcombRings_ = out.coxcombSettings_.rings
    out.coxcombOffsets_ = out.coxcombSettings_.offsets

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
        'categoryFillStyle_',
        'categoryText_',
    ])

    out.coxcombSettings = function (v) {
        if (!arguments.length) {
            return {
                minRadius: out.coxcombMinRadius_,
                maxRadius: out.coxcombMaxRadius_,
                strokeFill: out.coxcombStrokeFill_,
                strokeWidth: out.coxcombStrokeWidth_,
                rings: out.coxcombRings_,
                offsets: out.coxcombOffsets_,
            }
        }

        out.coxcombSettings_ = { ...out.coxcombSettings_, ...v }
        if (v.minRadius !== undefined) out.coxcombMinRadius_ = v.minRadius
        if (v.maxRadius !== undefined) out.coxcombMaxRadius_ = v.maxRadius
        if (v.strokeFill !== undefined) out.coxcombStrokeFill_ = v.strokeFill
        if (v.strokeWidth !== undefined) out.coxcombStrokeWidth_ = v.strokeWidth
        if (v.rings !== undefined) out.coxcombRings_ = v.rings
        if (v.offsets !== undefined) out.coxcombOffsets_ = v.offsets
        return out
    }

    const legacyCoxcombSettingsWrappers = {
        coxcombMaxRadius: 'maxRadius',
        coxcombMinRadius: 'minRadius',
        coxcombRings: 'rings',
        coxcombStrokeFill: 'strokeFill',
        coxcombStrokeWidth: 'strokeWidth',
        coxcombOffsets: 'offsets',
    }

    Object.entries(legacyCoxcombSettingsWrappers).forEach(([legacyMethod, settingsKey]) => {
        out[legacyMethod] = function (v) {
            if (!arguments.length) return out.coxcombSettings()[settingsKey]
            console.warn(`map.${legacyMethod}() is now DEPRECATED. Please use map.coxcombSettings({ ${settingsKey} }) instead.`)
            out.coxcombSettings({ [settingsKey]: v })
            return out
        }
    })

    applyConfigValues(out, config, [
        'coxcombSettings',
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
            out.catColors_ = out.catColors_ || {}
            out.catLabels_ = out.catLabels_ || {}
            categoryCodes.forEach((category, idx) => {
                const color = categoryColors?.[idx] || out.catColors_[category]
                out.catColors_[category] = color || DEFAULT_CATEGORICAL_COLORS[idx % DEFAULT_CATEGORICAL_COLORS.length]
                if (categoryLabels?.[idx]) out.catLabels_[category] = categoryLabels[idx]
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
        // Registers each time:category statData object directly (setData(), synchronously -
        // same pattern as _registerCategoricalStatChannel used by pie/bar/waffle/stripe), rather
        // than registering an empty out.stat() config and deferring the real data into a patched
        // out.build(). That build-patching approach silently broke when eurostatmap.map('coxcomb')
        // started returning a facade distinct from this layer (the "migrate to layers" change):
        // the facade's own .build() - the one callers actually invoke - never delegated to this
        // patched version, so the data injection never ran and no region ever got stat data.
        // Setting data synchronously here sidesteps the problem entirely: by the time build()
        // runs, out.statData_[key].isReady() is already true for every key, exactly as if a
        // remote fetch had already resolved.
        if (customData && !eurostatDatasetCode) {
            assignCategoryProperties()

            const setStatData = (key, regionData) => {
                if (Object.keys(regionData).length === 0) return
                const statData = StatisticalData.statData({ code: key, unitText: unitText || 'Value' })
                statData.setData(regionData)
                out.statData(key, statData)
            }

            times.forEach((time) => {
                categoryCodes.forEach((category) => {
                    const regionData = {}
                    for (const regionId in customData) {
                        const value = customData[regionId]?.[time]?.[category]
                        if (value !== undefined) regionData[regionId] = value
                    }
                    setStatData(`${time}:${category}`, regionData)
                })

                if (totalCode) {
                    const regionData = {}
                    for (const regionId in customData) {
                        let total = customData[regionId]?.[time]?.[totalCode]
                        if (total === undefined) {
                            // Auto-calculate total from categories
                            total = 0
                            categoryCodes.forEach((cat) => {
                                const val = customData[regionId]?.[time]?.[cat]
                                if (val !== undefined && !isNaN(val)) total += parseFloat(val)
                            })
                        }
                        if (total === ':' || total > 0) regionData[regionId] = total
                    }
                    setStatData(`${time}:${totalCode}`, regionData)
                }
            })

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

    // a coxcomb has two dimensions, time periods and categories, which only statCoxcomb() describes
    const isConfigured = () => {
        if (out._coxTimes) return true
        reportConfigError(
            out.map || out,
            "Coxcomb maps are set up with statCoxcomb({ times, categoryCodes, ... }), not with stat() and encoding('composition')."
        )
        return false
    }

    //@override
    out.updateClassification = function () {
        if (!isConfigured()) return out
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
        computeTotals(out)
        computeCoxStatusMap(out)
        defineSizeScales(out)
        buildTooltipCache(out)
    }

    // ── Styling ──────────────────────────────────────────────────────────────

    //@override
    out.updateStyle = function () {
        if (!out._coxTimes) return out
        out._anyRegionHasOther_ = false

        if (!out.catColors_) {
            out.catColors({})
            for (let i = 0; i < out.statCodes_.length; i++) {
                out.catColors_[out.statCodes_[i]] = DEFAULT_CATEGORICAL_COLORS[i % DEFAULT_CATEGORICAL_COLORS.length]
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
                        const minRadius = getResponsiveSymbolSize(out.coxcombMinRadius_ || 0, 0)
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
                getRadius: (regionId) => getCoxcombTopRadius(out, regionId),
                margin: 2,
            })
        } else {
            const s = getCentroidsGroup(map)
            if (!s) return

            const regionFeatures = s
                .selectAll('g.em-centroid')
                .data()
                .filter((rg) => getRegionTotal(out, rg.properties.id) !== undefined)

            applyStyleToRegionPolygons(map)
            addMouseEventsToRegionPolygons(out, map)
            addMouseEventsToRegions(out, map)
            addCoxcombChartsToMap(regionFeatures, map)
        }

        if (out.patternFill_) {
            applyPatternFill(map, out.patternFill_)
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
        const minRadius = getResponsiveSymbolSize(out.coxcombMinRadius_ || 0, 0)

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
                .attr('stroke', out.coxcombStrokeFill_)
                .attr('stroke-width', out.coxcombStrokeWidth_ / scaleFactor)
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
            const monthData = buildMonthData(out, regionId, months, causes)
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
        addMouseEventsToGridCartogram(out, map)
    }

    function addCoxcombChartsToGridCartogram(regionIds, map, angle) {
        const months = out._coxTimes
        const causes = out._coxCategoryCodes
        const offsets = { ...(out.coxcombOffsets_ || { x: 0, y: 0 }) }
        const sharedOffset = getGridCartogramChartOffset(out)
        offsets.x += sharedOffset.x
        offsets.y += sharedOffset.y

        if (out.gridCartogramSettings_.shape === 'hexagon') {
            offsets.x -= (out.coxcombWidth_ || 0) - 4
            offsets.y -= (out.coxcombHeight_ || 0) + 4
        }

        regionIds.forEach((regionId) => {
            const node = out.svg().select('#cox_' + regionId)
            if (node.empty()) return

            const monthData = buildMonthData(out, regionId, months, causes)
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

    // ── Region polygon styling ────────────────────────────────────────────────

    function applyStyleToRegionPolygons(map) {
        const selector = getRegionsSelector(map)
        const regions = map.svg().selectAll(selector)
        const status = out.coxStatus_
        // A region's own default/unnamed stat (independent of coxStatus_, coxcomb's own
        // composition-presence tracker) can hold an extra categorical value - colors the
        // region's polygon, same as ps/pie/bar/waffle - see buildCompositionCategoryColorFn().
        const getCategoryColor = buildCompositionCategoryColorFn(map, out)

        // For cntrg regions (RS, EL), we need to apply ecl to ALL paths inside, including Kosovo/XK
        // even though the cntrg container itself is excluded from the main selector
        const allRegionsSelector = map.nutsLevel_ === 'mixed' ? '#em-mixed-nutsrg path, #em-cntrg path' : '#em-nutsrg path, #em-cntrg path'
        const allRegions = map.svg().selectAll(allRegionsSelector)

        // Apply ecl attribute to ALL regions (including those in excluded cntrg groups)
        allRegions.attr('ecl', (rg) => {
            const sv = status.get(rg.properties.id)
            if (sv == null) return 'ni'
            if (sv?.value === ':') return 'nd'
            return null
        })

        if (map.geo_ !== 'WORLD' && map.nutsLevel_ == 'mixed') {
            styleMixedNUTSRegions(map, status, regions)
        }

        // Apply no-data fill style only to regions in the filtered selector
        regions.filter((rg) => status.get(rg.properties.id)?.value === ':').style('fill', out.noDataFillStyle())

        // Apply category fill for regions matching an extra categorical class
        if (getCategoryColor) {
            regions
                .filter((rg) => getCategoryColor(rg.properties.id) !== undefined)
                .style('fill', (rg) => getCategoryColor(rg.properties.id))
        }
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

registerLayerType('coxcomb', 'overlay', decorateCoxcombLayer)
registerLayerType('polar', 'overlay', decorateCoxcombLayer)
