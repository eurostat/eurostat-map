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
        shapePadding: 24, // vertical spacing
        labelOffsets: { x: 12, y: 0 },
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
        const baseY = out.getBaseY()

        drawMushroomSizeLegend(out, baseX, baseY)

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

    const colors = map.mushroomColors()
    const orient = map.mushroomOrientation()

    const arcGen = arc().innerRadius(0)
    const arcs = getMushroomArcs(orient)

    const g = out.lgg.append('g').attr('class', 'em-mushroom-size-legend').attr('transform', `translate(${x},${y})`)

    values.forEach((v, i) => {
        const r = scale(v)

        const row = g.append('g').attr('transform', `translate(0, ${i * cfg.shapePadding})`)

        // v1 half
        row.append('path')
            .attr(
                'd',
                arcGen({
                    startAngle: arcs[0].start,
                    endAngle: arcs[0].end,
                    outerRadius: r,
                })
            )
            .attr('fill', colors[0])

        // v2 half
        row.append('path')
            .attr(
                'd',
                arcGen({
                    startAngle: arcs[1].start,
                    endAngle: arcs[1].end,
                    outerRadius: r,
                })
            )
            .attr('fill', colors[1])

        // label
        const label = cfg.labels?.[i] ?? v
        row.append('text')
            .attr('x', r + cfg.labelOffsets.x)
            .attr('y', 4)
            .attr('class', 'em-legend-label')
            .text(label)
    })

    // color key (v1 / v2)
    drawColorKey(out, g, values.length * cfg.shapePadding + 6)
}

/* ------------------------ Color key ---------------------------------- */

function drawColorKey(out, container, y) {
    const map = out.map
    const colors = map.mushroomColors()
    const [c1, c2] = map.mushroomCodes()

    const labels = [map.statData(c1)?.label_ || c1, map.statData(c2)?.label_ || c2]

    const g = container.append('g').attr('class', 'em-mushroom-color-key').attr('transform', `translate(0, ${y})`)

    labels.forEach((lab, i) => {
        const row = g.append('g').attr('transform', `translate(0, ${i * 14})`)

        row.append('rect').attr('width', 10).attr('height', 10).attr('fill', colors[i])

        row.append('text').attr('x', 14).attr('y', 9).attr('class', 'em-legend-label').text(lab)
    })
}

/* ------------------------ Geometry ----------------------------------- */

function getMushroomArcs(orientation) {
    if (orientation === 'vertical') {
        return [
            { start: Math.PI, end: 2 * Math.PI }, // top
            { start: 0, end: Math.PI }, // bottom
        ]
    }

    // horizontal (default)
    return [
        { start: -Math.PI / 2, end: Math.PI / 2 }, // left
        { start: Math.PI / 2, end: (3 * Math.PI) / 2 }, // right
    ]
}
