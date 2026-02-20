//supports:
// Sequential interpolators (like d3.interpolatePurples)
// Stretched interpolators (e.g., stretchedColor using .valueTransform)
// D3 diverging scales (d3.scaleDiverging(...).domain([-60, 0, 38.7]))
import { pointer, select } from 'd3-selection'
import { getChoroplethLabelFormatter } from './choropleth/legend-choropleth'
import { getLegendRegionsSelector } from '../core/utils'
import { format } from 'd3-format'
import { spaceAsThousandSeparator } from '../core/utils'

// All of the above with or without .valueTransform / .valueUntransform
export function createContinuousLegend(out, baseX, baseY) {
    const m = out.map
    out._continuousLegendContainer = out.lgg
        .append('g')
        .attr('class', 'em-continuous-legend')
        .attr('id', 'em-continuous-legend')
        .attr('transform', `translate(${baseX}, ${baseY})`)

    // choropleths dont have multiple visual variables (yet), so we use the root legend config
    const config = out.map._mapType == 'ps' ? out.colorLegend : out // Use out.colorLegend for proportional symbols, out for choropleth
    const isVertical = config.orientation === 'vertical'
    const legendId = 'legend-gradient-' + Math.random().toString(36).substr(2, 5)
    const legendWidth = out.width || out.shapeWidth * 6
    const legendHeight = isVertical ? out.shapeWidth : out.shapeHeight

    createLegendGradient(out, legendId, isVertical)
    drawLegendRect(legendId, out, legendWidth, legendHeight, isVertical)

    if (hasTicks(out)) {
        drawTickLabels(out, legendWidth, legendHeight, isVertical)
    } else {
        drawLowHighLabels(out, legendWidth, legendHeight, isVertical)
    }

    if (out.noData) {
        let y = (isVertical ? out.width + 5 : legendHeight + 30) + getTitlePadding(out)
        const x = 0
        if (config.pointOfDivergence && config.pointOfDivergencePadding) y += config.pointOfDivergencePadding // shift legend items down after point of divergence
        const container = out._continuousLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${x},${y})`)
        out.appendNoDataLegend(container, config.noDataText, highlightRegions, unhighlightRegions)
    }
}

function getUntransformedDomain(map) {
    return typeof map.colorFunction_?.domain === 'function' ? map.colorFunction_.domain() : map.domain_ || [0, 1]
}

function getTransformedDomain(map) {
    const valueTransform = map.valueTransform_ || ((d) => d)
    const rawDomain = getUntransformedDomain(map)
    return rawDomain.map(valueTransform)
}

function getTitlePadding(out) {
    const map = out.map
    const p = map._mapType == 'ps' ? out.colorLegend?.titlePadding : out.titlePadding
    return p || 0
}
function createLegendGradient(out, gradientId, isVertical) {
    const map = out.map
    const isD3Scale = typeof map.colorFunction_?.domain === 'function'
    const steps = 20

    // Determine domain
    const domain = getTransformedDomain(map)
    // Destructure the domain into three points for a diverging scale.
    // If the domain already has three values (e.g., [-10, 0, 10]), use them as-is.
    // Otherwise, assume a two-point domain ([min, max]) and insert a null for the center (d1),
    // so later code can still treat it like a diverging scale.
    const [d0, d1, d2] = domain.length === 3 ? domain : [domain[0], null, domain[1]]

    // Create gradient
    const defs = out._continuousLegendContainer.append('defs')
    const gradient = defs
        .append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', isVertical ? '0%' : '0%')
        .attr('x2', isVertical ? '0%' : '100%')
        .attr('y1', isVertical ? '100%' : '0%')
        .attr('y2', isVertical ? '0%' : '0%')

    for (let i = 0; i <= steps; i++) {
        const t = i / steps

        let val
        if (domain.length === 3) {
            // Diverging domain: interpolate in two halves
            val = t < 0.5 ? d0 + (d1 - d0) * (t * 2) : d1 + (d2 - d1) * ((t - 0.5) * 2)
        } else {
            // Sequential domain: linear interpolation
            val = d0 + t * (d2 - d0)
        }

        const color = map.colorFunction_(isD3Scale ? val : t)

        gradient
            .append('stop')
            .attr('offset', `${t * 100}%`)
            .attr('stop-color', color)
    }
}

function drawLegendRect(gradientId, out, width, height, isVertical) {
    const titlePadding = getTitlePadding(out)
    const rect = out._continuousLegendContainer
        .append('rect')
        .attr('class', 'em-legend-gradient')
        .attr('id', 'em-legend-gradient')
        .attr('x', 0)
        .attr('y', titlePadding)
        .attr('width', isVertical ? height : width)
        .attr('height', isVertical ? width : height)
        .style('fill', `url(#${gradientId})`)

    // Attach mouse events for hover highlighting
    addMouseEvents(rect, out, width, isVertical)
}

function addMouseEvents(rect, out, legendLength, isVertical) {
    const map = out.map
    const domain = getUntransformedDomain(map)
    const untransform = map.valueUntransform_ || ((d) => d)
    const container = out._continuousLegendContainer
    const titlePadding = getTitlePadding(out)
    const highlightFunction = getHighlightFunction(map)
    const unhighlightFunction = getUnHighlightFunction(map)
    const formatter = getChoroplethLabelFormatter(out)

    rect.on('mousemove', function (event) {
        const [mx, my] = pointer(event, this)

        const along = isVertical ? my - titlePadding : mx
        const clamped = Math.max(0, Math.min(legendLength, along))
        const norm = clamped / legendLength
        const t = isVertical ? 1 - norm : norm

        // ---- Interpolate value ----
        let rawVal
        if (domain.length === 3) {
            const [d0, d1, d2] = domain
            if (t < 0.5) {
                const tt = t / 0.5
                rawVal = d0 + (d1 - d0) * tt
            } else {
                const tt = (t - 0.5) / 0.5
                rawVal = d1 + (d2 - d1) * tt
            }
        } else {
            const [d0, d1] = domain
            rawVal = d0 + t * (d1 - d0)
        }

        rawVal = untransform(rawVal)

        // Clear previous hover elements
        container.selectAll('.em-hover-line, .em-hover-tick, .em-hover-label').remove()

        const x = isVertical ? 0 : clamped
        const y = isVertical ? clamped + titlePadding : 0

        // Hover line
        container
            .append('line')
            .attr('class', 'em-hover-line')
            .attr('x1', isVertical ? x : x)
            .attr('y1', isVertical ? y : y)
            .attr('x2', isVertical ? x + out.shapeWidth : x)
            .attr('y2', isVertical ? y : y + out.shapeHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('pointer-events', 'none')

        // Hover tick
        container
            .append('circle')
            .attr('class', 'em-hover-tick')
            .attr('cx', isVertical ? x + out.shapeWidth : x)
            .attr('cy', isVertical ? y : y + out.shapeHeight)
            .attr('r', 3)
            .attr('fill', 'black')
            .attr('pointer-events', 'none')

        // Hover label
        container
            .append('text')
            .attr('class', 'em-hover-label')
            .attr('x', isVertical ? x + out.shapeWidth + 5 : x)
            .attr('y', isVertical ? y : y + out.shapeHeight + 12)
            .attr('text-anchor', isVertical ? 'start' : 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('pointer-events', 'none')
            .text(formatter(rawVal))

        // Highlight on map
        highlightFunction(map, rawVal)
    })

    rect.on('mouseout', function () {
        container.selectAll('.em-hover-line, .em-hover-tick, .em-hover-label').remove()
        unhighlightFunction(map)
    })
}

function hasTicks(out) {
    return out.ticks > 1 || out.tickValues
}

function drawTickLabels(out, legendLength, legendThickness, isVertical) {
    const map = out.map
    const domain = getUntransformedDomain(map)
    const tickGroup = out._continuousLegendContainer.append('g').attr('class', 'em-legend-ticks')
    const labelFormatter = getChoroplethLabelFormatter(out)
    const transform = map.valueTransform_ || ((d) => d)
    const titleOffset = getTitlePadding(out)

    const raw = Array.isArray(out.tickValues) && out.tickValues ? out.tickValues.map(transform) : generateTickValues(domain, out.ticks, transform)

    raw.forEach((val, i) => {
        const t = computeNormalizedTickPosition(val, domain) // 0..1

        if (isVertical) {
            // existing vertical logic (works fine)
            const along = legendLength - t * legendLength
            const x = legendThickness
            const y = along + titleOffset

            tickGroup
                .append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', x)
                .attr('y1', y)
                .attr('x2', x + out.tickLength)
                .attr('y2', y)

            const label =
                Array.isArray(out.tickLabels) && out.tickLabels[i] != null
                    ? out.tickLabels[i]
                    : map.valueUntransform_
                      ? labelFormatter(map.valueUntransform_(val))
                      : labelFormatter(val)

            tickGroup
                .append('text')
                .attr('class', 'em-legend-label em-legend-ticklabel')
                .attr('x', x + out.tickLength + 3)
                .attr('y', y)
                .attr('dy', '0.35em')
                .attr('text-anchor', 'start')
                .text(label)
        } else {
            // Fixed horizontal logic
            const along = t * legendLength // left to right
            const x = along
            const y = legendThickness + titleOffset

            tickGroup
                .append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', x)
                .attr('y1', y)
                .attr('x2', x)
                .attr('y2', y + out.tickLength)

            const label =
                Array.isArray(out.tickLabels) && out.tickLabels[i] != null
                    ? out.tickLabels[i]
                    : map.valueUntransform_
                      ? labelFormatter(map.valueUntransform_(val))
                      : labelFormatter(val)

            tickGroup
                .append('text')
                .attr('class', 'em-legend-label em-legend-ticklabel')
                .attr('x', x)
                .attr('y', y + out.tickLength + 10) // below tick
                .attr('dy', '0') // no vertical baseline offset
                .attr('text-anchor', i === 0 ? 'start' : i === raw.length - 1 ? 'end' : 'middle')
                .text(label)
        }
    })
}

/**
 * Generate evenly spaced tick values across a domain.
 * Supports both 2-point (sequential) and 3-point (diverging) domains.
 *
 * @param {number[]} domain - The domain array: [min, max] or [min, divergence, max]
 * @param {number} count - Number of ticks to generate
 * @param {Function} transform - Optional value transform function
 * @returns {number[]} Array of transformed tick values
 */
function generateTickValues(domain, count, transform = (x) => x) {
    if (Array.isArray(domain) && domain.length === 3) {
        const [min, center, max] = domain
        return Array.from({ length: count }, (_, i) => {
            const t = i / (count - 1)
            const raw = t < 0.5 ? min + (center - min) * (t * 2) : center + (max - center) * ((t - 0.5) * 2)
            return transform(raw)
        })
    }

    // Default: sequential 2-point domain
    const [start, end] = domain
    return Array.from({ length: count }, (_, i) => transform(start + (i / (count - 1)) * (end - start)))
}

function computeNormalizedTickPosition(val, domain) {
    if (domain.length === 3) {
        const [d0, d1, d2] = domain
        return val < d1 ? (0.5 * (val - d0)) / (d1 - d0) : 0.5 + (0.5 * (val - d1)) / (d2 - d1)
    } else {
        return (val - domain[0]) / (domain[1] - domain[0])
    }
}

function drawLowHighLabels(out, width, height, isVertical) {
    const titleOffset = getTitlePadding(out)
    const low = out.lowLabel
    const high = out.highLabel
    const divergence = out.pointOfDivergenceLabel
    const container = out._continuousLegendContainer

    if (isVertical) {
        const barLength = width // vertical length of gradient
        const barThickness = height // horizontal thickness
        const xPos = barThickness + 5

        // Low (exactly at bottom edge of gradient)
        if (low) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', xPos)
                .attr('y', titleOffset + barLength)
                .attr('dy', '-0.2em') // no offset, baseline sits at edge
                .attr('text-anchor', 'start')
                .text(low)
        }

        // High (exactly at top edge of gradient)
        if (high) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', xPos)
                .attr('y', titleOffset)
                .attr('dy', '0.8em') // no offset, baseline sits at edge
                .attr('text-anchor', 'start')
                .text(high)
        }

        // Divergence (center)
        if (divergence) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', xPos)
                .attr('y', titleOffset + barLength / 2)
                .attr('dy', '0.35em') // center text vertically
                .attr('text-anchor', 'start')
                .text(divergence)
        }
    } else {
        const barY = height + titleOffset + 10 // 10px below horizontal bar

        if (low) {
            container.append('text').attr('class', 'em-legend-label').attr('x', 0).attr('y', barY).attr('text-anchor', 'start').text(low)
        }

        if (high) {
            container.append('text').attr('class', 'em-legend-label').attr('x', width).attr('y', barY).attr('text-anchor', 'end').text(high)
        }

        if (divergence) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', width / 2)
                .attr('y', barY)
                .attr('text-anchor', 'middle')
                .text(divergence)
        }
    }
}

function getHighlightTolerance(map) {
    if (!map || !map.legend_) return 1 // default if map or legend is undefined
    return map.legend_.highlightTolerance ?? map.legend_.colorLegend?.highlightTolerance ?? 1
}

function getHighlightFunction(map) {
    if (map._mapType == 'ps') return highlightPsSymbols
    return highlightRegions
}

function getUnHighlightFunction(map) {
    if (map._mapType == 'ps') return unhighlightPsSymbols
    return unhighlightRegions
}

// Highlight selected regions on mouseover
//TODO: merge these with legend-choropleth.js and legend-proportional-symbols.js highlight functions
function highlightRegions(map, rawVal) {
    const tolerance = getHighlightTolerance(map)
    // Select all regions
    const selector = getLegendRegionsSelector(map)
    const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')
    if (!allRegions) return

    allRegions.each(function () {
        const sel = select(this)
        const ecl = sel.attr('ecl')
        if (!ecl || ecl === 'nd') {
            if (rawVal === 'nd') {
                // dont whiten no data when no data is being hovered
                return
            }
            sel.style('fill', 'white') // Dim the region
            return
        }

        const val = +ecl // raw stat value
        if (val >= rawVal - tolerance && val <= rawVal + tolerance) {
            sel.style('fill', select(this).attr('fill___')) // Restore original color for selected regions
        } else {
            sel.style('fill', 'white') // dim others
        }
    })
}

// Reset all regions to their original colors on mouseout
function unhighlightRegions(map) {
    const selector = getLegendRegionsSelector(map)
    const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

    // Restore each region's original color from the fill___ attribute
    allRegions.each(function () {
        select(this).style('fill', select(this).attr('fill___'))
    })
}

function highlightPsSymbols(map, rawVal) {
    const tolerance = getHighlightTolerance(map)
    const allSymbols = map.getCentroidsGroup(map).selectAll('[ecl]')

    allSymbols.each(function () {
        const symbol = select(this)
        const ecl = symbol.attr('ecl')

        // Handle no-data
        if (!ecl || ecl === 'nd') {
            if (rawVal === 'nd') {
                // Don't dim if we're hovering "no data"
                symbol.style('opacity', map.psFillOpacity_)
                return
            }
            symbol.style('opacity', 0) // Dim "no data" if hovering a value
            return
        }

        const val = +ecl // raw stat value
        if (val >= rawVal - tolerance && val <= rawVal + tolerance) {
            // Within range: keep full opacity
            symbol.style('opacity', map.psFillOpacity_)
        } else {
            // Outside range: dim
            symbol.style('opacity', 0)
        }
    })
}

function unhighlightPsSymbols(map) {
    const allSymbols = map.getCentroidsGroup(map).selectAll('[ecl]')

    // Restore all to default opacity
    allSymbols.each(function () {
        select(this).style('opacity', map.psFillOpacity_)
    })
}
