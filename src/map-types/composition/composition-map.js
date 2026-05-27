import { scaleSqrt } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'
import { select } from 'd3-selection'
import { extent } from 'd3-array'
import { getCentroidsGroup } from '../../core/geo/centroids'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/map-types/composition/CompositionStatConfig').CompositionStatConfig} CompositionStatConfig */

/**
 * Shared utilities for composition-based map types (pie, waffle, bar).
 * These maps all display multi-category statistical data as symbols
 * proportionally sized to a total value, positioned at region centroids.
 */

// ─── Getter/Setter boilerplate ───────────────────────────────────────────────

/**
 * Attach getter/setter methods for a list of trailing-underscore attributes.
 * Follows the pattern: out.attrName(v?) → get/set out.attrName_
 *
 * @param {Object} out - The map object
 * @param {string[]} attrs - Array of attribute names with trailing underscore
 */
export const buildGetterSetters = function (out, attrs) {
    attrs.forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })
}

/**
 * Apply config values to map using getter/setter methods.
 *
 * @param {Object} out - The map object
 * @param {Object} config - Config object
 * @param {string[]} keys - Keys to apply (without trailing underscore)
 */
export const applyConfigValues = function (out, config, keys) {
    if (config) {
        keys.forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })
    }
}

// ─── Statistical data helpers ─────────────────────────────────────────────────

/**
 * Compute the composition (category proportions) for a region.
 * Returns an object keyed by category code with proportional values [0,1],
 * or undefined if no valid data.
 *
 * @param {string} id - NUTS/region ID
 * @param {Object} out - The map object (must have statData, statCodes_, showOnlyWhenComplete_)
 * @param {string} totalCodeKey - The name of the totalCode attribute on `out` (e.g. 'pieTotalCode_')
 * @returns {Object|undefined}
 */
export const getComposition = function (id, out, totalCodeKey) {
    const comp = {}
    let sum = 0
    const codes = out.statCodes_

    for (let i = 0; i < codes.length; i++) {
        const sc = codes[i]
        const s = out.statData(sc).get(id)
        const val = s?.value

        if (val === null || val === undefined || isNaN(val)) {
            if (out.showOnlyWhenComplete()) return undefined
            continue
        }

        comp[sc] = val
        sum += val
    }

    if (out[totalCodeKey]) {
        const totalData = out.statData(out[totalCodeKey])
        const totalEntry = totalData.get(id)
        const totalVal = totalEntry?.value

        if (totalVal === null || totalVal === undefined || isNaN(totalVal)) {
            sum = 0
        } else {
            sum = totalVal
        }
    }

    if (!sum || isNaN(sum)) return undefined

    for (const sc of codes) {
        if (comp[sc] !== undefined) {
            comp[sc] /= sum
        }
    }

    if (out[totalCodeKey]) {
        const totalPerc = Object.values(comp).reduce((a, b) => a + b, 0)
        comp['other'] = Math.max(0, 1 - totalPerc)
    }

    return comp
}

/**
 * Get absolute total value for a region across all categories.
 *
 * @param {string} id - NUTS/region ID
 * @param {Object} out - The map object
 * @param {string} totalCodeKey - The name of the totalCode attribute on `out`
 * @returns {number|undefined}
 */
export const getRegionTotal = function (id, out, totalCodeKey) {
    let sum = 0
    let s

    if (out[totalCodeKey]) {
        const totalData = out.statData(out[totalCodeKey])
        s = totalData.get(id)
        if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
            if (out.showOnlyWhenComplete()) {
                sum = undefined
            }
        } else {
            sum = s.value
        }
    } else {
        for (let i = 0; i < out.statCodes_.length; i++) {
            const sc = out.statCodes_[i]
            s = out.statData(sc).get(id)
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                else continue
            }
            sum += s.value
        }
    }

    if (sum == 0) return undefined
    return sum
}

/**
 * Get the [min, max] total values across all regions, for sizing scale domain.
 *
 * @param {Object} map - The map instance (main or inset)
 * @param {Object} out - The outer map object (has statCodes_, statData, etc.)
 * @param {Function} getAnchors - Function(map) → d3 selection of anchor elements
 * @param {string} totalCodeKey - The name of the totalCode attribute on `out`
 * @returns {[number, number]}
 */
export const getDatasetMaxMin = function (map, out, getAnchors, totalCodeKey) {
    let totals = []
    let sel

    if (map && map.gridCartogram_) {
        sel = getAnchors(map).data()
    } else {
        sel = getCentroidsGroup(map).selectAll('g.em-centroid').data()
    }

    sel.forEach((rg) => {
        const total = getRegionTotal(rg.properties.id, out, totalCodeKey)
        if (total) totals.push(total)
    })

    return extent(totals)
}

// ─── Classification ───────────────────────────────────────────────────────────

/**
 * Apply size classification (scaleSqrt) to the map, storing result on out.classifierSize_.
 * Identical for pie, waffle, bar maps.
 *
 * @param {Object} map - The map instance (main or inset)
 * @param {Object} out - The outer map object
 * @param {Function} getAnchors - Function(map) → d3 selection of anchor elements
 * @param {string} totalCodeKey - The name of the totalCode attribute on `out`
 * @param {number} minSize - Minimum size (pixels)
 * @param {number} maxSize - Maximum size (pixels)
 */
export const applyClassificationToMap = function (map, out, getAnchors, totalCodeKey, minSize, maxSize) {
    if (!out.statCodes_) {
        out.statCodes_ = Object.keys(out.statData_)
        const index = out.statCodes_.indexOf('default')
        if (index > -1) out.statCodes_.splice(index, 1)
    }

    const domain = getDatasetMaxMin(map, out, getAnchors, totalCodeKey)
    if (!isNaN(domain[0])) {
        out.classifierSize_ = scaleSqrt().domain(domain).range([minSize, maxSize])
    }
}

// ─── Default colors ───────────────────────────────────────────────────────────

/**
 * Assign default category colors from schemeCategory10 if not already set.
 * Also handles the 'other' category when a totalCode is used.
 *
 * @param {Object} out - The map object
 * @param {string} totalCodeKey - The name of the totalCode attribute on `out`
 * @param {string} otherColor - Color for the 'other' slice
 * @param {string} otherText - Label for the 'other' slice
 */
export const ensureCategoryColors = function (out, totalCodeKey, otherColor, otherText) {
    if (!out.catColors_) {
        out.catColors({})
        for (let i = 0; i < out.statCodes_.length; i++) {
            out.catColors_[out.statCodes_[i]] = schemeCategory10[i % 10]
        }
    }
    if (out[totalCodeKey]) {
        out.catColors_['other'] = otherColor
        if (!out.catLabels_) out.catLabels_ = {}
        out.catLabels_['other'] = otherText
    }
    out.catLabels_ = out.catLabels_ || {}
}

// ─── Mouse events ─────────────────────────────────────────────────────────────

/**
 * Attach hover/tooltip mouse events to geographic region paths.
 * Shared by all composition map types.
 *
 * @param {Object} regions - d3 selection of region elements
 * @param {Object} out - The map object
 */
export const addMouseEventsToRegions = function (regions, out) {
    regions
        .on('mouseover', function (e, rg) {
            const sel = select(this)
            sel.attr('fill___', sel.style('fill'))
            sel.style('fill', out.hoverColor_)
            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
        })
        .on('mousemove', function (e) {
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
}

/**
 * Attach hover/tooltip mouse events to grid cartogram cells.
 * Handles both the background shape and the chart overlay element.
 *
 * @param {Object} out - The map object
 * @param {string} chartSelector - CSS selector for the chart element within a cell (e.g. '.piechart', '.wafflechart', '.barchart')
 * @param {Function} getRegionTotalFn - Function(regionId) → total value
 * @param {Function} onHighlight - Function(chart) called on mouseover to highlight the chart
 * @param {Function} onUnhighlight - Function(chart) called on mouseout to restore chart style
 */
export const addMouseEventsToGridCartogram = function (out, chartSelector, getRegionTotalFn, onHighlight, onUnhighlight) {
    const shapes = out.svg().selectAll('#em-grid-container .em-grid-cell .em-grid-shape')
    const charts = out.svg().selectAll('#em-grid-container .em-grid-cell [class^="em-"]')

    const getRegionData = (element) => {
        const cell = select(element.closest('.em-grid-cell'))
        return cell.datum()
    }

    const handleMouseOver = function (e) {
        const rg = getRegionData(this)
        if (!rg) return
        const regionId = rg.properties.id
        if (!getRegionTotalFn(regionId)) return

        const cell = select(this.closest('.em-grid-cell'))
        const shape = cell.select('.em-grid-shape')
        const chart = cell.select(chartSelector)

        shape.attr('fill___', shape.style('fill'))
        shape.style('fill', out.hoverColor_)
        if (!chart.empty()) onHighlight(chart)
        if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
    }

    const handleMouseMove = function (e) {
        const rg = getRegionData(this)
        if (!rg || !getRegionTotalFn(rg.properties.id)) return
        if (out._tooltip) out._tooltip.mousemove(e)
    }

    const handleMouseOut = function (e) {
        const rg = getRegionData(this)
        if (!rg) return
        const regionId = rg.properties.id
        if (!getRegionTotalFn(regionId)) return

        const cell = select(this.closest('.em-grid-cell'))
        const shape = cell.select('.em-grid-shape')
        const chart = cell.select(chartSelector)

        shape.style('fill', shape.attr('fill___') || '')
        shape.attr('fill___', null)
        if (!chart.empty()) onUnhighlight(chart)
        if (out._tooltip) out._tooltip.mouseout()
    }

    shapes.on('mouseover', handleMouseOver).on('mousemove', handleMouseMove).on('mouseout', handleMouseOut)
    charts.style('pointer-events', 'all').on('mouseover', handleMouseOver).on('mousemove', handleMouseMove).on('mouseout', handleMouseOut)
}

// ─── Mixed NUTS styling ───────────────────────────────────────────────────────

/**
 * Apply display/stroke styles to regions in a mixed NUTS level map,
 * hiding regions without composition data.
 * Shared by all composition map types.
 *
 * @param {Object} map - The map instance
 * @param {Object} regions - d3 selection of region elements
 * @param {Function} getCompositionFn - Function(id) → composition or undefined
 */
export const styleMixedNUTSRegions = function (map, regions, getCompositionFn) {
    regions.each(function (rg) {
        const sel = select(this)
        if (this.parentNode.classList.contains('em-cntrg')) return

        const lvl = sel.attr('lvl')
        const comp = getCompositionFn(rg.properties.id)
        const hasData = !!comp

        let display = hasData ? (map.geo_ === 'WORLD' ? 'block' : null) : 'none'
        let stroke = null
        let strokeWidth = null

        if (hasData && lvl !== '0') {
            stroke = sel.style('stroke') || '#777'
            if (map.geo_ === 'WORLD') strokeWidth = sel.style('stroke-width') || '#777'
        }

        sel.style('display', display).style('stroke', stroke).style('stroke-width', strokeWidth)
    })
}

// ─── Stat composition config builder ─────────────────────────────────────────

/**
 * Factory that returns a `statXxx` config method (like `statPie`, `statWaffle`, `statBar`).
 * Builds one stat dataset per category code and registers colors/labels.
 *
 * Supports three call signatures for backwards compatibility:
 *
 * 1. New flat object API (preferred):
 *    .statBar({ eurostatDatasetCode, filters, transform, categoryParameter, categoryCodes, ... })
 *
 * 2. Legacy positional arguments API:
 *    .statBar(statConfig, categoryParameter, categoryCodes, categoryLabels, categoryColors, totalCode)
 *    where statConfig is { eurostatDatasetCode, filters, unitText }
 *
 * 3. Legacy nested stat object API:
 *    .statBar({ stat: { eurostatDatasetCode, filters, unitText, transform }, categoryParameter, categoryCodes, ... })
 *
 * @param {Object} out - The map object
 * @param {string|null} totalCodeKey - e.g. 'pieTotalCode_', 'waffleTotalCode_', 'barTotalCode_'.
 *   Pass `null` for map types that have no "total" concept (e.g. stripe composition).
 *   When null, any `totalCode` in config is silently ignored.
 * @returns {Function} The configuration method to attach as `out.statPie` / `out.statWaffle` / etc.
 */
export const buildStatCompositionMethod = function (out, totalCodeKey) {
    return function (config, categoryParameter, categoryCodes, categoryLabels, categoryColors, totalCode) {
        // ── Backwards compat: positional arguments ───────────────────────────
        // Old API: .statBar(statConfig, categoryParameter, categoryCodes, labels, colors, totalCode)
        if (categoryParameter !== undefined && typeof categoryParameter === 'string') {
            config = {
                ...config,
                categoryParameter,
                categoryCodes,
                categoryLabels,
                categoryColors,
                totalCode,
            }
        }

        // ── Backwards compat: nested stat object ─────────────────────────────
        // Old API: .statBar({ stat: { eurostatDatasetCode, filters, unitText }, ... })
        if (config.stat) {
            config = { ...config.stat, ...config }
            delete config.stat
        }

        const {
            eurostatDatasetCode,
            filters,
            unitText,
            transform,
            categoryParameter: cp,
            categoryCodes: cc,
            categoryLabels: cl,
            categoryColors: ccol,
            totalCode: tc,
        } = config
        // Resolve after normalisation so all three call paths produce the same names
        ;[categoryParameter, categoryCodes, categoryLabels, categoryColors, totalCode] = [cp, cc, cl, ccol, tc]

        if (!eurostatDatasetCode) {
            console.error('eurostatDatasetCode is required')
            return out
        }
        if (!categoryParameter) {
            console.error('categoryParameter is required')
            return out
        }
        if (!categoryCodes?.length) {
            console.error('categoryCodes array is required')
            return out
        }

        const baseFilters = filters ? { ...filters } : {}

        for (let i = 0; i < categoryCodes.length; i++) {
            const code = categoryCodes[i]
            out.stat(code, { eurostatDatasetCode, unitText, transform, filters: { ...baseFilters, [categoryParameter]: code } })

            if (categoryColors?.[i]) {
                out.catColors_ = out.catColors_ || {}
                out.catColors_[code] = categoryColors[i]
            }
            if (categoryLabels?.[i]) {
                out.catLabels_ = out.catLabels_ || {}
                out.catLabels_[code] = categoryLabels[i]
            }
        }

        out.statCodes_ = categoryCodes

        // totalCode only applies when the map type supports it (totalCodeKey !== null)
        if (totalCodeKey) {
            if (totalCode) {
                out[totalCodeKey] = totalCode
                out.stat(totalCode, { eurostatDatasetCode, unitText, transform, filters: { ...baseFilters, [categoryParameter]: totalCode } })
            } else {
                out[totalCodeKey] = undefined
            }
        }

        return out
    }
}

// ─── Tooltip breakdown HTML ───────────────────────────────────────────────────

/**
 * Build the shared breakdown list HTML used in all composition map tooltips.
 * Shows each category with its color swatch, label, absolute value and percentage.
 *
 * Each map type builds its own unique chart visual in the tooltip, but all share
 * this breakdown table. Import spaceAsThousandSeparator from utils at call site.
 *
 * @param {string} regionId
 * @param {Object} out - The map object (needs statCodes_, catLabels_, catColors_, statData)
 * @param {Function} getRegionTotalFn - Function(regionId) → total
 * @param {Function} spaceAsThousandSeparator - Formatter from utils
 * @returns {string} HTML string
 */
export const buildTooltipBreakdownHTML = function (regionId, out, getRegionTotalFn, spaceAsThousandSeparator) {
    const breakdownData = out.statCodes_
        .map((sc) => {
            const s = out.statData(sc).get(regionId)
            return s && s.value !== undefined && s.value !== null
                ? { code: sc, label: out.catLabels_[sc], value: s.value, color: out.catColors()[sc] || '#666' }
                : null
        })
        .filter(Boolean)
        .sort((a, b) => b.value - a.value)

    const total = getRegionTotalFn(regionId) || breakdownData.reduce((sum, d) => sum + d.value, 0)

    let html = `<div class="em-tooltip-breakdown">`

    for (const item of breakdownData) {
        const percent = total ? ((item.value / total) * 100).toFixed(0) : 0
        html += `
        <div class="em-breakdown-item">
            <span class="em-breakdown-color" style="background:${item.color}"></span>
            <span class="em-breakdown-label">${item.label || item.code}</span>
            <span class="em-breakdown-value">${item.value?.toFixed ? spaceAsThousandSeparator(item.value) : 0} (${isNaN(percent) ? 0 : percent}%)</span>
        </div>`
    }

    if (total !== undefined && total !== null) {
        const unit = out.statData(out.statCodes_[0]).unitText() || ''
        html += `
        <div class="em-breakdown-item em-total">
            <span class="em-breakdown-label">Total</span>
            <span class="em-breakdown-value">${spaceAsThousandSeparator(total)} ${unit}</span>
        </div>`
    }

    html += `</div>`
    return html
}
