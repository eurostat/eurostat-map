// The numbers behind a coxcomb map: totals, scales, per-period rows and tooltip tables. All state is on `out`.
import { scaleBand } from 'd3-scale'
import { spaceAsThousandSeparator } from '../../core/utils'
import { createRadialScale } from '../../core/scale.js'
import { getResponsiveSymbolSize } from '../../core/responsive'

/** A value as a number to add up: ':' (no data), text and missing values count as nothing. */
const asNumber = (v) => (Number.isFinite(+v) ? +v : 0)

export function buildTooltipCache(out) {
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
                const totalVal = asNumber(out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value)
                const sumCauses = out._coxCategoryCodes.reduce((a, c) => a + (asNumber(out.statData(`${month}:${c}`)?.get(regionId)?.value)), 0)
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
                    const totalVal = asNumber(out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value)
                    const sumCauses = causes
                        .filter((c) => c !== 'other')
                        .reduce((a, c) => a + (asNumber(out.statData(`${month}:${c}`)?.get(regionId)?.value)), 0)
                    rawVal = Math.max(totalVal - sumCauses, 0)
                } else {
                    rawVal = asNumber(out.statData(`${month}:${cause}`)?.get(regionId)?.value)
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
export function computeTotals(out) {
    const yearlyTotals = {}
    const monthlyTotals = {}

    if (out.totalCode_) {
        // Use the dedicated TOTAL series for each time period
        out._coxTimes.forEach((month) => {
            const stat = out.statData(`${month}:${out.totalCode_}`)
            if (!stat?._data_) return

            for (const region in stat._data_) {
                const v = asNumber(stat._data_[region]?.value)
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
                    const v = asNumber(stat._data_[region]?.value)
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
export function computeCoxStatusMap(out) {
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

export function getRegionTotal(out, id) {
    return out.yearlyTotals[id] !== undefined ? out.yearlyTotals[id] : undefined
}

/**
 * Define the two size scales used for rendering:
 *  - `classifierSize_`: maps yearly total → outer circle radius (area ∝ total)
 *  - `classifierChartSize_`: maps a stacked value → inner/outer arc radius,
 *    normalised within the region so proportions are preserved
 */
export function defineSizeScales(out) {
    const minRadius = getResponsiveSymbolSize(out.coxcombMinRadius_ || 0, 0)
    const maxRadius = getResponsiveSymbolSize(out.coxcombMaxRadius_ || 80, 8)

    const allMonthlyValues = []
    for (const regionId in out.monthlyTotals) {
        for (const month in out.monthlyTotals[regionId]) {
            allMonthlyValues.push(out.monthlyTotals[regionId][month])
        }
    }

    // Also check custom size legend values
    const legendConfig = out.legend()
    if (legendConfig && legendConfig.sizeLegend && Array.isArray(legendConfig.sizeLegend.values)) {
        allMonthlyValues.push(...legendConfig.sizeLegend.values)
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

// ── Data helpers ─────────────────────────────────────────────────────────

/**
 * Get the maximum outer radius that appears at either the first or last
 * time period. Used for grid cartogram text label placement.
 */
export function getCoxcombTopRadius(out, regionId) {
    const months = out._coxTimes
    if (!months?.length) return 0

    let maxR = 0
    ;[months[0], months[months.length - 1]].forEach((month) => {
        let stackSum = out._coxCategoryCodes.reduce((a, cause) => {
            return a + (asNumber(out.statData(`${month}:${cause}`)?.get(regionId)?.value))
        }, 0)

        if (out.totalCode_) {
            const total = asNumber(out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value)
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
export function buildMonthData(out, regionId, months, causes) {
    const rows = months
        .map((month) => {
            const row = { month }
            let sumCauses = 0

            causes.forEach((cause) => {
                const val = asNumber(out.statData(`${month}:${cause}`)?.get(regionId)?.value)
                row[cause] = val
                sumCauses += val
            })

            if (out.totalCode_) {
                const totalVal = asNumber(out.statData(`${month}:${out.totalCode_}`)?.get(regionId)?.value)
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

export function getActiveKeys(monthData, causes) {
    const keys = [...causes]
    if (monthData.some((d) => (d['other'] || 0) > 0)) keys.push('other')
    return keys
}

export function createAngleScale(months) {
    return scaleBand()
        .domain(months)
        .range([0, 2 * Math.PI])
        .align(0)
}
