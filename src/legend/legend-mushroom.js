import { select } from 'd3-selection'
import { arc } from 'd3-shape'
import * as Legend from './legend'
import { spaceAsThousandSeparator } from '../core/utils'

/**
 * Legend for mushroom (dual semi-circle) proportional symbols
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    // -------------------------------
    // Size legend config
    // -------------------------------
    out.sizeLegend = {
        marginTop: 15,
        values: undefined, // raw data values
        valuesV1: undefined, // raw data values for v1 side
        valuesV2: undefined, // raw data values for v2 side
        labels: null, // optional labels
        labelsV1: null, // optional labels for v1 side
        labelsV2: null, // optional labels for v2 side
        shapePadding: 2, // vertical spacing
        labelOffsets: { x: 5, y: 0 },
    }

    out.colorLegend = {
        marginTop: 5,
        labelOffsets: { x: 5, y: 5 },
    }

    // override via config
    if (config?.sizeLegend) {
        Object.assign(out.sizeLegend, config.sizeLegend)
    }
    if (config?.colorLegend) {
        Object.assign(out.colorLegend, config.colorLegend)
    }

    // -------------------------------
    // Override update
    // -------------------------------
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (!out.lgg.node()) return

        // clear
        out.lgg.selectAll('*').remove()

        // background + title
        out.makeBackgroundBox()
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        const baseX = out.getBaseX()
        let cursorY = out.getBaseY() + out.sizeLegend.marginTop
        const legendSpacing = 8

        // -----------------------------
        // SIZE LEGEND
        // -----------------------------
        const hasIndependentScales = out.map.mushroomSizeScaleFunctionV1_ && out.map.mushroomSizeScaleFunctionV2_

        if (hasIndependentScales) {
            // --- v1 legend ---
            const v1Box = drawMushroomSizeLegend(out, baseX, cursorY, 'v1')

            // v1 label BELOW v1 legend
            drawSideLabel(out, baseX, v1Box.bottom + 5, 'v1')

            // move cursor directly to v1 legend bottom (NO extra spacing)
            cursorY = v1Box.bottom

            // --- v2 legend ---
            const v2Box = drawMushroomSizeLegend(out, baseX, cursorY, 'v2')

            // v2 label JUST ABOVE v2 legend
            drawSideLabel(out, baseX, v2Box.top + 30, 'v2')
        } else {
            cursorY = drawMushroomSizeLegend(out, baseX, cursorY)?.bottom || out.getBaseY() + out.sizeLegend.marginTop
        }

        // -----------------------------
        // COLOR KEY (only for shared scale)
        // -----------------------------
        if (!hasIndependentScales) {
            drawColorKey(out, baseX, cursorY + out.colorLegend.marginTop)
        }

        out.setBoxDimension()
    }

    return out
}

function drawSideLabel(out, x, y, side) {
    const map = out.map
    const colors = map.mushroomColors()
    const [c1, c2] = map.mushroomCodes()

    const label = side === 'v1' ? map.statData(c1)?.label_ || c1 : map.statData(c2)?.label_ || c2

    const color = side === 'v1' ? colors[0] : colors[1]

    const text = out.lgg
        .append('text')
        .attr('x', x)
        .attr('y', y)
        .style('fill', color)
        .attr('font-weight', '600')
        .attr('dominant-baseline', 'hanging') // ← IMPORTANT
        .attr('class', 'em-legend-label')
        .text(label)

    return text.node().getBBox()
}

/* ===================================================================== */
/* ======================= Drawing helpers ============================== */
/* ===================================================================== */

function drawMushroomSizeLegend(out, x, y, side = null) {
    const map = out.map
    const cfg = out.sizeLegend

    const scaleShared = map._mushroomScale_
    const scaleV1 = map.mushroomSizeScaleFunctionV1_
    const scaleV2 = map.mushroomSizeScaleFunctionV2_
    const hasIndependentScales = scaleV1 && scaleV2

    let scale
    let sideIndex = null

    if (side === 'v1') {
        scale = scaleV1
        sideIndex = 0
    } else if (side === 'v2') {
        scale = scaleV2
        sideIndex = 1
    } else {
        scale = scaleShared
    }

    if (!scale) return y

    // geometry + style
    const orient = map.mushroomOrientation()
    const arcGen = arc().innerRadius(0)
    const arcDef = getSizeLegendArc(orient, sideIndex)

    const labelOffsetX = cfg.labelOffsets?.x ?? 8
    const leaderDash = '3,2'
    const stroke = cfg.shapeStroke || '#000000'
    const strokeWidth = cfg.shapeStrokeWidth ?? 1

    const legendValuesRaw = getValues(cfg, scale, hasIndependentScales, side)
    if (!legendValuesRaw) return y

    const legendValues = [...legendValuesRaw].sort((a, b) => scale(b) - scale(a))

    const radii = legendValues.map((v) => scale(v))
    const maxR = Math.max(...radii)
    if (!Number.isFinite(maxR) || maxR <= 0) return y

    // labels (per side)
    const labels = getLabels(cfg, legendValues, hasIndependentScales, side)

    const g = out.lgg.append('g').attr('class', 'em-mushroom-size-legend').attr('transform', `translate(${x},${y})`)

    const cx = maxR
    const cy = maxR
    const colors = map.mushroomColors()

    const fillColor = hasIndependentScales && sideIndex != null ? colors[sideIndex] : 'none'

    legendValues.forEach((v, i) => {
        const r = scale(v)
        if (!r || r <= 0) return

        const row = g.append('g').attr('transform', `translate(${cx},${cy})`)

        row.append('path')
            .attr(
                'd',
                arcGen({
                    startAngle: arcDef.start,
                    endAngle: arcDef.end,
                    outerRadius: r,
                })
            )
            .style('fill', fillColor)
            .attr('stroke', stroke)
            .attr('stroke-width', strokeWidth)
            .attr('data-mushroom-side', sideIndex)

        const yLeader =
            orient === 'vertical' && sideIndex === 1
                ? r // bottom semi-circle
                : -r // top (or default)
        let xLabel = maxR + labelOffsetX
        if (orient === 'horizontal') {
            // left side
            xLabel = 10 + labelOffsetX
        }

        row.append('line')
            .attr('x1', 0)
            .attr('x2', xLabel)
            .attr('y1', yLeader)
            .attr('y2', yLeader)
            .attr('stroke', stroke)
            .attr('stroke-width', 0.6)
            .attr('stroke-dasharray', leaderDash)

        row.append('text')
            .attr('x', xLabel + 3)
            .attr('y', yLeader)
            .attr('dy', '0.35em')
            .attr('dominant-baseline', 'middle')
            .attr('class', 'em-legend-label')
            .text(labels ? labels[i] : spaceAsThousandSeparator(v))
    })

    const bbox = g.node()?.getBBox()
    return bbox ? { top: y, bottom: y + bbox.height } : { top: y, bottom: y }
}

function getValues(cfg, scale, hasIndependentScales, side) {
    let values

    if (hasIndependentScales) {
        if (side === 'v1') values = cfg.valuesV1
        else if (side === 'v2') values = cfg.valuesV2
    } else {
        values = cfg.values
    }

    // auto bounds from scale
    if (!values || !values.length) {
        const d = scale.domain?.()
        if (!d || d.length < 2) return null
        return [Math.min(d[0], d[d.length - 1]), Math.max(d[0], d[d.length - 1])]
    }

    // explicit values → bounds
    const vMin = Math.min(...values)
    const vMax = Math.max(...values)
    return values.length > 1 ? values : [vMax, vMin]
}

function getLabels(cfg, legendValues, hasIndependentScales, side) {
    let labels

    if (hasIndependentScales) {
        if (side === 'v1') labels = cfg.labelsV1
        else if (side === 'v2') labels = cfg.labelsV2
    } else {
        labels = cfg.labels
    }

    return labels && labels.length >= legendValues.length ? labels : null
}

/* ------------------------ Color key ---------------------------------- */

function drawColorKey(out, x, y) {
    const map = out.map
    const colors = map.mushroomColors()
    const [c1, c2] = map.mushroomCodes()

    const labels = out.colorLegend.labels ?? [map.statData(c1)?.label_ || c1, map.statData(c2)?.label_ || c2]

    const g = out.lgg.append('g').attr('class', 'em-mushroom-color-legend').attr('transform', `translate(${x}, ${y})`)

    labels.forEach((lab, i) => {
        const row = g
            .append('g')
            .attr('transform', `translate(0, ${i * out.shapeHeight})`)
            .style('cursor', 'pointer')
            .on('mouseover', () => {
                highlightMushroomSide(map, i)

                // apply to insets as well
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId_, highlightMushroomSide, i)
                }
            })
            .on('mouseout', () => {
                resetMushroomHighlight(map)

                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId_, resetMushroomHighlight)
                }
            })

        row.append('rect').attr('width', out.shapeWidth).attr('height', out.shapeHeight).attr('fill', colors[i]).attr('class', 'em-legend-rect')

        row.append('text')
            .attr('x', out.shapeWidth + out.colorLegend.labelOffsets.x)
            .attr('y', out.shapeHeight / 2 + out.colorLegend.labelOffsets.y)
            .attr('class', 'em-legend-label')
            .text(lab)
    })
}

/* ------------------------ Geometry ----------------------------------- */

function getSizeLegendArc(orientation, sideIndex = null) {
    if (orientation === 'vertical') {
        if (sideIndex === 0) {
            // top
            return { start: -Math.PI / 2, end: Math.PI / 2 }
        }
        if (sideIndex === 1) {
            // bottom
            return { start: Math.PI / 2, end: (3 * Math.PI) / 2 }
        }
        return { start: -Math.PI / 2, end: Math.PI / 2 }
    }

    // HORIZONTAL — vertical flat edges
    if (sideIndex === 0) {
        // v1 — left
        return { start: Math.PI, end: 2 * Math.PI }
    }
    if (sideIndex === 1) {
        // v2 — right
        return { start: 0, end: Math.PI }
    }

    return { start: Math.PI, end: 2 * Math.PI }
}

function highlightMushroomSide(map, sideIndex) {
    map.svg()
        .selectAll('g.em-centroid path[data-mushroom-side]')
        .style('opacity', function () {
            return this.getAttribute('data-mushroom-side') === String(sideIndex) ? 1 : 0
        })
}

function resetMushroomHighlight(map) {
    map.svg().selectAll('g.em-centroid path[data-mushroom-side]').style('opacity', null)
}
