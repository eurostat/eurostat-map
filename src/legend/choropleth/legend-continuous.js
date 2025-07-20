//supports:
// Sequential interpolators (like d3.interpolatePurples)
// Stretched interpolators (e.g., stretchedColor using .valueTransform)
// D3 diverging scales (d3.scaleDiverging(...).domain([-60, 0, 38.7]))
import { executeForAllInsets } from '../../core/utils'
import { getLabelFormatter, highlightRegions, unhighlightRegions } from './legend-choropleth'

// All of the above with or without .valueTransform / .valueUntransform
export function createContinuousLegend(out, baseX, baseY) {
    const m = out.map
    const container = out.lgg.append('g').attr('class', 'em-continuous-legend')
    const isVertical = out.continuousOrientation === 'vertical'
    const legendId = 'legend-gradient-' + Math.random().toString(36).substr(2, 5)
    const domain = getColorDomain(m)
    const legendWidth = out.width || out.shapeWidth * 6
    const legendHeight = isVertical ? out.shapeWidth : out.shapeHeight

    createLegendGradient(container, m, legendId, isVertical)
    drawLegendRect(container, legendId, out, baseY, legendWidth, legendHeight, isVertical)

    if (hasTicks(out)) {
        drawTickLabels(container, out, domain, legendWidth, baseY, isVertical)
    } else {
        drawLowHighLabels(container, out, baseY, legendWidth, legendHeight, isVertical)
    }

    if (out.noData) {
        drawNoDataBox(container, out, baseY, legendWidth, legendHeight, isVertical)
    }
}

function getColorDomain(map) {
    return typeof map.colorFunction_?.domain === 'function' ? map.colorFunction_.domain() : map.domain_ || [0, 1]
}

function createLegendGradient(container, map, gradientId, isVertical) {
    const isD3Scale = typeof map.colorFunction_?.domain === 'function'
    const valueTransform = map.valueTransform_ || ((d) => d)
    const steps = 20

    // Determine domain
    const rawDomain = isD3Scale ? map.colorFunction_.domain() : map.domain_ || [0, 1]
    const domain = rawDomain.map(valueTransform)
    const [d0, d1, d2] = domain.length === 3 ? domain : [domain[0], null, domain[1]]

    // Create gradient
    const defs = container.append('defs')
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

function drawLegendRect(container, gradientId, out, baseY, width, height, isVertical) {
    container
        .append('rect')
        .attr('x', out.boxPadding)
        .attr('y', baseY)
        .attr('width', isVertical ? height : width)
        .attr('height', isVertical ? width : height)
        .style('fill', `url(#${gradientId})`)
}

function hasTicks(out) {
    return out.continuousTicks > 1 || out.continuousTickValues.length > 1
}

function drawTickLabels(container, out, domain, legendWidth, baseY, isVertical) {
    const m = out.map
    const tickGroup = container.append('g').attr('class', 'em-legend-ticks')
    const labelFormatter = getLabelFormatter(out)
    const transform = m.valueTransform_ || ((d) => d)

    // Generate the tick values in transformed space
    const raw =
        Array.isArray(out.continuousTickValues) && out.continuousTickValues.length > 0
            ? out.continuousTickValues.map(transform)
            : generateTickValues(domain, out.continuousTicks, transform)

    raw.forEach((val, i) => {
        const t = computeNormalizedTickPosition(val, domain)
        const pos = isVertical ? baseY + legendWidth - t * legendWidth : out.boxPadding + t * legendWidth
        const x = isVertical ? out.boxPadding + (out.shapeHeight || 20) : pos
        const y = isVertical ? pos + 1 : baseY + (out.shapeHeight || 20)

        tickGroup
            .append('line')
            .attr('class', 'em-legend-tick')
            .attr('x1', x)
            .attr('y1', y)
            .attr('x2', isVertical ? x + out.tickLength : x)
            .attr('y2', isVertical ? y : y + out.tickLength)

        const label =
            Array.isArray(out.continuousTickLabels) && out.continuousTickLabels[i] != null
                ? out.continuousTickLabels[i]
                : m.valueUntransform_
                  ? labelFormatter(m.valueUntransform_(val))
                  : labelFormatter(val)

        tickGroup
            .append('text')
            .attr('class', 'em-legend-label em-legend-ticklabel')
            .attr('x', isVertical ? x + out.tickLength + 3 : x)
            .attr('y', isVertical ? y + 4 : y + out.tickLength + 10)
            .attr('dy', isVertical ? (i === 0 ? '-0.1em' : i === raw.length - 1 ? '0.35em' : '') : '0.35em')
            .attr('text-anchor', isVertical ? 'start' : i === 0 ? 'start' : i === raw.length - 1 ? 'end' : 'middle')
            .attr('dominant-baseline', isVertical ? (i === 0 ? 'text-after-edge' : i === raw.length - 1 ? 'hanging' : 'middle') : null)
            .text(label)
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

function drawLowHighLabels(container, out, baseY, width, height, isVertical) {
    const labelX = out.boxPadding + (isVertical ? height + 5 : 0)
    const labelY = baseY + (isVertical ? out.boxPadding : height + 15)
    const labelWidth = isVertical ? width : width
    const boxPadding = out.boxPadding

    const low = out.lowLabel
    const high = out.highLabel
    const mid = out.pointOfDivergenceLabel

    if (isVertical) {
        // Low (bottom)
        if (low) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', labelX)
                .attr('y', baseY + boxPadding + labelWidth - 15)
                .attr('text-anchor', 'start')
                .attr('dy', '0.35em')
                .text(low)
        }

        // High (top)
        if (high) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', labelX)
                .attr('y', baseY + boxPadding)
                .attr('text-anchor', 'start')
                .attr('dy', '0.35em')
                .text(high)
        }

        // Mid (center)
        if (mid) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', labelX)
                .attr('y', baseY + boxPadding + labelWidth / 2)
                .attr('text-anchor', 'start')
                .attr('dy', '0.35em')
                .text(mid)
        }
    } else {
        // Low (left)
        if (low) {
            container.append('text').attr('class', 'em-legend-label').attr('x', boxPadding).attr('y', labelY).attr('text-anchor', 'start').text(low)
        }

        // High (right)
        if (high) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', boxPadding + width)
                .attr('y', labelY)
                .attr('text-anchor', 'end')
                .text(high)
        }

        // Mid (center)
        if (mid) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', boxPadding + width / 2)
                .attr('y', labelY)
                .attr('text-anchor', 'middle')
                .text(mid)
        }
    }
}

function drawNoDataBox(container, out, baseY, width, height, isVertical) {
    const m = out.map
    const y = isVertical ? baseY + out.boxPadding + width + 5 : baseY + height + 30
    const g = container.append('g').attr('class', 'em-no-data-legend')

    g.append('rect')
        .attr('class', 'em-legend-rect')
        .attr('x', out.boxPadding)
        .attr('y', y)
        .attr('width', out.shapeWidth)
        .attr('height', out.shapeHeight)
        .style('fill', m.noDataFillStyle_)
        .on('mouseover', () => {
            highlightRegions(m, 'nd')
            if (m.insetTemplates_) {
                executeForAllInsets(m.insetTemplates_, m.svgId, highlightRegions, 'nd')
            }
        })
        .on('mouseout', () => {
            unhighlightRegions(m)
            if (m.insetTemplates_) {
                executeForAllInsets(m.insetTemplates_, m.svgId, unhighlightRegions)
            }
        })

    g.append('text')
        .attr('class', 'em-legend-label')
        .attr('x', out.boxPadding + out.shapeWidth + out.labelOffset)
        .attr('y', y + out.shapeHeight / 2)
        .attr('dy', '0.35em')
        .text(out.noDataText)
}
