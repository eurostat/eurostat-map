import { select } from 'd3-selection'
import { arc } from 'd3-shape'
import * as Legend from './legend'

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
        values: undefined, // raw data values
        labels: null, // optional labels
        shapePadding: 2, // vertical spacing
        labelOffsets: { x: 5, y: 0 },
    }

    out.colorLegend = {
        marginTop: 12,
        labelOffsets: { x: 5, y: 5 },
    }

    // override via config
    if (config?.sizeLegend) {
        Object.assign(out.sizeLegend, config.sizeLegend)
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
        let cursorY = out.getBaseY()
        const legendSpacing = 8

        // -----------------------------
        // SIZE LEGEND
        // -----------------------------
        drawMushroomSizeLegend(out, baseX, cursorY)

        const sizeG = out.lgg.select('.em-mushroom-size-legend').node()
        if (sizeG) {
            const bbox = sizeG.getBBox()
            cursorY += bbox.height + legendSpacing
        }

        // -----------------------------
        // COLOR KEY
        // -----------------------------
        drawColorKey(out, baseX, cursorY + out.colorLegend.marginTop)

        out.setBoxDimension()
    }

    return out
}

/* ===================================================================== */
/* ======================= Drawing helpers ============================== */
/* ===================================================================== */

function drawMushroomSizeLegend(out, x, y) {
    const map = out.map
    const cfg = out.sizeLegend
    const values = cfg.values
    if (!values || !values.length) return

    const scale = map._mushroomScale_
    if (!scale) return

    const orient = map.mushroomOrientation()
    const arcGen = arc().innerRadius(0)
    const arcDef = getSizeLegendArc(orient)

    const rowPadding = cfg.shapePadding ?? 6
    const labelOffsetX = cfg.labelOffsets?.x ?? 5

    // neutral legend style
    const fill = cfg.shapeFill || '#d0d0d0'
    const stroke = cfg.shapeStroke || '#666'
    const strokeWidth = cfg.shapeStrokeWidth ?? 0.5

    // prevent overlap with title
    const maxR = Math.max(...values.map((v) => scale(v) || 0))

    const g = out.lgg.append('g').attr('class', 'em-mushroom-size-legend').attr('transform', `translate(${x},${y})`)

    let cursorY = maxR

    values.forEach((v, i) => {
        const r = scale(v)
        if (!r || r <= 0) return

        const row = g
            .append('g')
            // shift right so left semi-circle stays inside legend
            .attr('transform', `translate(${r}, ${cursorY})`)

        // semicircle
        row.append('path')
            .attr(
                'd',
                arcGen({
                    startAngle: arcDef.start,
                    endAngle: arcDef.end,
                    outerRadius: r,
                })
            )
            .attr('fill', fill)
            .attr('stroke', stroke)
            .attr('stroke-width', strokeWidth)

        // label
        const label = cfg.labels?.[i] ?? v
        row.append('text')
            .attr('x', r / 2 + labelOffsetX)
            .attr('y', 4)
            .attr('class', 'em-legend-label')
            .text(label)

        // spacing
        const rowHeight = orient === 'vertical' ? 2 * r : r * 1.25

        cursorY += rowHeight + rowPadding
    })
}

/* ------------------------ Color key ---------------------------------- */

function drawColorKey(out, x, y) {
    const map = out.map
    const colors = map.mushroomColors()
    const [c1, c2] = map.mushroomCodes()

    const labels = [map.statData(c1)?.label_ || c1, map.statData(c2)?.label_ || c2]

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

function getSizeLegendArc(orientation) {
    if (orientation === 'vertical') {
        // top semi-circle
        return { start: Math.PI, end: 2 * Math.PI }
    }

    // horizontal (default): left semi-circle
    return { start: -Math.PI / 2, end: Math.PI / 2 }
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
