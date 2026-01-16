// legend-choropleth-trivariate.js
import * as Legend from '../legend'
import { select } from 'd3-selection'
// Tricolore
import { TricoloreViz, CompositionUtils } from '../../lib/tricolore/src'
import { executeForAllInsets, getLegendRegionsSelector } from '../../core/utils'

/**
 * Legend for trivariate (ternary) choropleth maps
 * rendered via Tricolore.
 */
export const legend = function (map, config = {}) {
    const out = Legend.legend(map)

    // --- defaults ---
    out.width = 160
    out.height = 160
    out.padding = { top: 50, right: 50, bottom: 10, left: 50 }
    out.type = 'continuous' // 'continuous' | 'discrete'
    out.showCenter = true
    out.centerLabel = 'Average'
    out.showLines = false
    out.labels = ['Variable 1', 'Variable 2', 'Variable 3']
    out.labelPosition = 'edge' // 'corner' | 'edge'
    out.colorTarget = 'points' // 'triangles' | 'points'
    out.showData = true
    out.centerAnnotationOffsets = { labelX: 70, labelY: 10, curveX: -20, curveY: -20 }

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
        const baseY = out.getBaseY()
        const baseX = out.getBaseX()
        const container = out.lgg.append('g').attr('class', 'em-ternary-legend').attr('transform', `translate(${baseX},${baseY})`)

        // clear previous content
        container.selectAll('*').remove()

        // container div for Tricolore
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
            //legend event handlers
            dataPointHandlers: {
                mouseover: (e, d) => {
                    const sel = select(e.currentTarget)

                    // store original styles once
                    if (!sel.attr('fill___')) sel.attr('fill___', sel.attr('fill'))
                    if (!sel.attr('opacity___')) sel.attr('opacity___', sel.attr('opacity'))

                    sel.attr('fill', 'red').attr('opacity', 1).raise()

                    //  highlight corresponding map regions
                    highlightRegionsByClass(map, d.index)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegionsByClass, d.index)
                    }

                    //  get region by class index
                    const rg = getRegionByClassIndex(map, d.index)

                    if (rg) {
                        map._tooltip?.mouseover(map.tooltip_.textFunction(rg, map))
                    }
                },

                mousemove: (e) => {
                    map._tooltip?.mousemove(e)
                },

                mouseout: (e, d) => {
                    const sel = select(e.currentTarget)

                    sel.attr('fill', sel.attr('fill___')).attr('opacity', sel.attr('opacity___')).lower()

                    unhighlightRegionsByClass(map)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegionsByClass)
                    }

                    map._tooltip?.mouseout()
                },
            },
            triangleHandlers: {
                mouseover: (_, color) => {
                    const sel = select(_.currentTarget)
                    sel.attr('stroke-width', 2).attr('stroke', 'red').raise()
                    highlightRegionsByColor(map, color)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegionsByColor, color)
                    }
                },
                mouseout: (_) => {
                    select(_.currentTarget).attr('stroke', 'none').lower()
                    unhighlightRegions(map)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions)
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

// Highlight selected regions on mouseover
function highlightRegionsByColor(map, color) {
    const selector = getLegendRegionsSelector(map)
    const regions = map.svg_.selectAll(selector).selectAll('[ecl]')

    // Normalize color once (browser-safe)
    const target = normalizeColor(color)

    regions.each(function () {
        const sel = select(this)
        const original = normalizeColor(sel.attr('fill___'))

        if (original === target) {
            sel.style('fill', sel.attr('fill___'))
        } else {
            sel.style('fill', '#fff')
        }
    })
}

function getRegionByClassIndex(map, classIndex) {
    const id = map._ternaryIdByClass_
        ? map._ternaryIdByClass_.get(classIndex)
        : [...map._ternaryClassById_.entries()].find(([, i]) => i === classIndex)?.[0]

    if (!id) return null

    const feature = map.Geometries.getRegionFeatures()?.find((f) => f.properties.id === id)

    return feature || null
}

function normalizeColor(c) {
    if (!c) return null
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.fillStyle = c
    return ctx.fillStyle.toLowerCase()
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

function highlightRegionsByClass(map, classIndex) {
    const selector = getLegendRegionsSelector(map)
    const regions = map.svg_.selectAll(selector).selectAll('[ecl]')

    regions.each(function () {
        const sel = select(this)
        const ecl = +sel.attr('ecl')

        if (ecl === classIndex) {
            sel.style('fill', sel.attr('fill___'))
        } else {
            sel.style('fill', '#fff')
        }
    })
}

function unhighlightRegionsByClass(map) {
    const selector = getLegendRegionsSelector(map)
    map.svg_
        .selectAll(selector)
        .selectAll('[ecl]')
        .each(function () {
            const sel = select(this)
            sel.style('fill', sel.attr('fill___'))
        })
}
