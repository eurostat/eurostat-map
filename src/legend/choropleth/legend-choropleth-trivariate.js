// legend-choropleth-trivariate.js
import * as Legend from '../legend'
import { select } from 'd3-selection'
import { TricoloreViz } from '../../lib/tricolore/src'
import { executeForAllInsets, getLegendRegionsSelector } from '../../core/utils'

/**
 * Legend for trivariate (ternary) choropleth maps
 * rendered via Tricolore.
 */

let activeLegendIndex = null
let activeLegendColor = null
let activeLegendElement = null

export const legend = function (map, config = {}) {
    const out = Legend.legend(map)

    // --- defaults ---
    out.width = 160
    out.height = 160
    out.padding = { top: 50, right: 50, bottom: 10, left: 50 }
    out.type = 'continuous'
    out.showCenter = true
    out.centerLabel = 'Average'
    out.showLines = false
    out.labels = ['Variable 1', 'Variable 2', 'Variable 3']
    out.labelPosition = 'edge'
    out.colorTarget = 'points'
    out.showData = true
    out.centerAnnotationOffsets = { labelX: 70, labelY: 10, curveX: -20, curveY: -20 }

    Object.assign(out, config)

    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (!out.lgg.node()) return out

        out.makeBackgroundBox()
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        drawTricoloreLegend()

        out.setBoxDimension()
        return out
    }

    function drawTricoloreLegend() {
        const baseY = out.getBaseY()
        const baseX = out.getBaseX()

        const container = out.lgg.append('g').attr('class', 'em-ternary-legend').attr('transform', `translate(${baseX},${baseY})`)

        container.selectAll('*').remove()

        const tricoloreContainer = container
            .append('foreignObject')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', out.width)
            .attr('height', out.height)
            .append('xhtml:div')
            .style('width', `${out.width}px`)
            .style('height', `${out.height}px`)

        const viz = new TricoloreViz(tricoloreContainer.node(), out.width, out.height, out.padding)

        const opts = {
            center: map._ternaryCenter_,
            hue: map.ternarySettings_.hue,
            chroma: map.ternarySettings_.chroma,
            lightness: map.ternarySettings_.lightness,
            contrast: map.ternarySettings_.contrast,
            spread: map.ternarySettings_.spread,
            labels: out.labels,
            labelPosition: out.labelPosition,
            showCenter: out.showCenter,
            centerLabel: out.centerLabel,
            showLines: out.showLines,
            breaks: map.ternarySettings_.breaks,
            colorTarget: out.colorTarget,
            showData: out.showData,
            centerAnnotationOffsets: out.centerAnnotationOffsets,

            // ---- LEGEND INTERACTIONS (RACE SAFE) ----
            dataPointHandlers: {
                mouseover: (e, d) => {
                    const el = select(e.currentTarget)

                    // Reset previous active element safely
                    if (activeLegendElement && activeLegendElement.node() !== el.node()) {
                        activeLegendElement.attr('stroke', null).attr('stroke-width', null).lower()
                    }

                    activeLegendElement = el
                    activeLegendIndex = d.index
                    activeLegendColor = null

                    highlightRegionsByClass(map, d.index)

                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegionsByClass, d.index)
                    }

                    const rg = getRegionByClassIndex(map, d.index)
                    if (rg) {
                        map._tooltip?.mouseover(map.tooltip_.textFunction(rg, map))
                    }

                    el.attr('stroke', 'red').attr('stroke-width', 2).raise()
                },

                mousemove: (e) => {
                    map._tooltip?.mousemove(e)
                },

                mouseout: (e) => {
                    const el = select(e.currentTarget)

                    // Only reset if this is still active
                    if (activeLegendElement && activeLegendElement.node() === el.node()) {
                        el.attr('stroke', null).attr('stroke-width', null).lower()

                        activeLegendElement = null
                        activeLegendIndex = null

                        resetRegions(map)

                        if (map.insetTemplates_) {
                            executeForAllInsets(map.insetTemplates_, map.svgId, resetRegions)
                        }

                        map._tooltip?.mouseout()
                    }
                },
            },

            triangleHandlers: {
                mouseover: (e, color) => {
                    const el = select(e.currentTarget)

                    if (activeLegendElement && activeLegendElement.node() !== el.node()) {
                        activeLegendElement.attr('stroke', null).attr('stroke-width', null).lower()
                    }

                    activeLegendElement = el
                    activeLegendColor = color
                    activeLegendIndex = null

                    highlightRegionsByColor(map, color)

                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegionsByColor, color)
                    }

                    el.attr('stroke', 'red').attr('stroke-width', 2).raise()
                },

                mouseout: (e) => {
                    const el = select(e.currentTarget)

                    if (activeLegendElement && activeLegendElement.node() === el.node()) {
                        el.attr('stroke', null).attr('stroke-width', null).lower()

                        activeLegendElement = null
                        activeLegendColor = null

                        resetRegions(map)

                        if (map.insetTemplates_) {
                            executeForAllInsets(map.insetTemplates_, map.svgId, resetRegions)
                        }
                    }
                },
            },
        }

        if (map.ternarySettings_.breaks < 30) {
            viz.createDiscretePlot(map._ternaryData_, opts)
        } else {
            viz.createContinuousPlot(map._ternaryData_, opts)
        }
    }

    return out
}

// --------------------------------------------------
// Highlight Logic (Non-destructive)
// --------------------------------------------------

function highlightRegionsByClass(map, classIndex) {
    const selector = getLegendRegionsSelector(map)
    const regions = map.svg_.selectAll(selector).selectAll('[ecl]')

    regions.each(function () {
        const sel = select(this)
        const ecl = +sel.attr('ecl')

        sel.style('opacity', ecl === classIndex ? 1 : 0.15)
    })
}

function highlightRegionsByColor(map, color) {
    const selector = getLegendRegionsSelector(map)
    const regions = map.svg_.selectAll(selector).selectAll('[ecl]')

    const target = normalizeColor(color)

    regions.each(function () {
        const sel = select(this)
        const original = normalizeColor(sel.attr('fill___'))

        sel.style('opacity', original === target ? 1 : 0.15)
    })
}

function resetRegions(map) {
    const selector = getLegendRegionsSelector(map)

    map.svg_.selectAll(selector).selectAll('[ecl]').style('opacity', 1)
}

// --------------------------------------------------

function getRegionByClassIndex(map, classIndex) {
    const id = map._ternaryIdByClass_
        ? map._ternaryIdByClass_.get(classIndex)
        : [...map._ternaryClassById_.entries()].find(([, i]) => i === classIndex)?.[0]

    if (!id) return null

    return map.Geometries.getRegionFeatures()?.find((f) => f.properties.id === id) || null
}

function normalizeColor(c) {
    if (!c) return null
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.fillStyle = c
    return ctx.fillStyle.toLowerCase()
}
