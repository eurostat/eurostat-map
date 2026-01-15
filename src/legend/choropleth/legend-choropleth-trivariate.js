// legend-choropleth-trivariate.js
import * as Legend from '../legend'

// Tricolore
import { TricoloreViz, CompositionUtils } from '../../lib/tricolore/src'

/**
 * Legend for trivariate (ternary) choropleth maps
 * rendered via Tricolore.
 */
export const legend = function (map, config = {}) {
    const out = Legend.legend(map)

    // --- defaults ---
    out.width = 160
    out.height = 160
    out.padding = { top: 10, right: 50, bottom: 10, left: 50 }
    out.type = 'continuous' // 'continuous' | 'discrete'
    out.showCenter = true
    out.showLines = false
    out.labels = ['Variable 1', 'Variable 2', 'Variable 3']
    out.labelPosition = 'corner'

    // allow overrides
    Object.assign(out, config)

    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (!out.lgg.node()) return out

        // background + titles
        out.makeBackgroundBox()
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        drawTricoloreLegend()

        out.setBoxDimension()
        return out
    }

    function drawTricoloreLegend() {
        const lgg = out.lgg

        // clear previous content
        lgg.selectAll('*').remove()

        // container div for Tricolore
        const container = lgg
            .append('foreignObject')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', out.width)
            .attr('height', out.height)
            .append('xhtml:div')
            .style('width', `${out.width}px`)
            .style('height', `${out.height}px`)

        // build dummy data for legend (simple barycentric grid)
        const data = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1 / 3, 1 / 3, 1 / 3],
        ]

        const center = map.ternarySettings_.meanCentering ? CompositionUtils.centre(data) : [1 / 3, 1 / 3, 1 / 3]

        const viz = new TricoloreViz(container.node(), out.width, out.height, out.padding)

        const opts = {
            center,
            hue: map.ternarySettings_.hue,
            chroma: map.ternarySettings_.chroma,
            lightness: map.ternarySettings_.lightness,
            contrast: map.ternarySettings_.contrast,
            spread: map.ternarySettings_.spread,
            labels: out.labels,
            labelPosition: out.labelPosition,
            showCenter: out.showCenter,
            showLines: out.showLines,
        }

        if (out.type === 'discrete') {
            viz.createDiscretePlot(data, {
                ...opts,
                breaks: map.ternarySettings_.breaks,
            })
        } else {
            viz.createContinuousPlot(data, opts)
        }
    }

    return out
}
