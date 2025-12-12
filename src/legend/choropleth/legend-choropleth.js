//legend-choropleth.js
import { select } from 'd3-selection'
import { format } from 'd3-format'
import * as Legend from '../legend'
import { getLegendRegionsSelector } from '../../core/utils'
import { appendPatternFillLegend } from '../legend-pattern-fill'
import { createHistogramLegend } from './legend-histogram'
import { createContinuousLegend } from '../legend-continuous'
import { drawDiscreteLegend } from '../legend-discrete'
import { createAlphaLegend } from './legend-value-by-alpha'

/**
 * A legend for choropleth maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object (inherit)
    const out = Legend.legend(map)

    out.labelType = 'thresholds' // thresholds || ranges
    //the separation line length
    out.sepLineLength = out.shapeWidth
    //tick line length in pixels
    out.tickLength = 4
    //the number of decimal for the legend labels
    out.decimals = 0
    //the distance between the legend box elements to the corresponding text label
    out.labelOffsets = { x: 3, y: 0 }

    // manually define labels
    out.labels = null

    // Histogram config as nested object
    out.histogram = null

    //diverging line
    out.pointOfDivergenceLabel = undefined
    out.pointOfDivergence = undefined
    out.pointOfDivergencePadding = 7
    out.divergingLineLength = undefined
    out.divergingArrowLength = undefined

    //continuous legend
    out.lowLabel = 'Low' //'Low'
    out.highLabel = 'High' //'High'
    out.ticks = 0 // Number of tick marks on continuous color legend (set to 0 to disable and just show low/high labels)
    out.tickValues = undefined // Custom tick values for continuous legend (if empty, will use linear interpolation based on domain)
    out.tickLabels = undefined // Custom tick labels for continuous legend (if empty, will use tickValues)
    out.orientation = 'vertical' // or 'vertical'

    // discrete legends
    out.maxMin = false //whether to show min and max labels for discrete legends
    out.maxMinLabels = ['', ''] // Labels for max and min if maxMin is true

    //override attribute values with config values
    if (config) {
        for (let key in config) {
            if (key === 'histogram' && typeof config[key] === 'object') {
                out.histogram = {
                    orientation: 'horizontal',
                    showCounts: false,
                    showPercentages: false,
                    labelRotation: 0,
                    ...config.histogram,
                }
            } else {
                out[key] = config[key]
            }
        }
    }

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (out.lgg.node()) {
            const map = out.map

            // Draw legend background box and title if provided
            out.makeBackgroundBox()
            if (out.title) out.addTitle()
            if (out.subtitle) out.addSubtitle()

            //exit early if no classifier
            if (!map.classToFillStyle()) return

            //set default point of divergence if applicable
            if (out.pointOfDivergenceLabel && !out.pointOfDivergence) out.pointOfDivergence = map.numberOfClasses_ / 2

            // initial x and y positions for the internal legend elements
            const baseY = out.getBaseY()
            const baseX = out.getBaseX()

            if (out.histogram) {
                createHistogramLegend(out, baseX, baseY)
            } else if (map.colorSchemeType_ === 'continuous') {
                createContinuousLegend(out, baseX, baseY)
            } else {
                drawDiscreteLegend(out, baseX, baseY)
            }

            // Draw opacity legend if value-by-alpha is active
            if (map.opacityScale_) {
                const offsetY = out.lgg.node().getBBox().height + 10 // 10px spacing below color legend
                createAlphaLegend(out, baseX, baseY + offsetY)
            }

            // Append pattern fill legend items BELOW the main legend
            if (out.map.patternFill_) {
                const legendHeight = out.lgg.node().getBBox().height
                const patternContainer = out.lgg
                    .append('g')
                    .attr('class', 'pattern-fill-legend')
                    .attr('transform', `translate(${out.getBaseX()}, ${legendHeight + out.boxPadding + 5})`)
                appendPatternFillLegend(out, patternContainer)
            }

            // Set legend box dimensions
            out.setBoxDimension()
        }
    }

    //deprecated
    out.labelDecNb = (v) => (console.warn('labelDecNb is now DEPRECATED. Please use decimals instead.'), out)

    return out
}

export function getThresholds(out) {
    const map = out.map
    const thresholds =
        map.thresholds_.length > 1
            ? map.thresholds_
            : Array.from({ length: map.numberOfClasses_ })
                .map((_, index) => {
                    return map.classifier().invertExtent(index)[out.ascending ? 0 : 1]
                })
                .slice(1) // Remove the first entry and return the rest as an array
    return thresholds
}

export function getChoroplethLabelFormatter(out) {
    if (out.labelType == 'ranges') {
        const thresholds = getThresholds(out)
        const defaultLabeller = (label, i) => {
            const decimalFormatter = format(`.${out.decimals}f`)
            if (i === 0) return `> ${decimalFormatter(thresholds[thresholds.length - 1])}` //top
            if (i === thresholds.length) return `< ${decimalFormatter(thresholds[0])}` //bottom
            return `${decimalFormatter(thresholds[thresholds.length - i - 1])} - < ${decimalFormatter(thresholds[thresholds.length - i])}  ` //in-between
        }
        return out.labelFormatter || defaultLabeller
    } else if (out.labelType == 'thresholds') {
        return out.labelFormatter || format(`.${out.decimals}f`)
    } else {
        return out.labelFormatter || format(`.${out.decimals}f`)
    }
}

// Highlight selected regions on mouseover
export function highlightRegions(map, ecl) {
    const selector = getLegendRegionsSelector(map)
    const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

    // Set all regions to white
    allRegions.style('fill', 'white')

    // Highlight only the selected regions by restoring their original color
    const selectedRegions = allRegions.filter("[ecl='" + ecl + "']")
    selectedRegions.each(function () {
        select(this).style('fill', select(this).attr('fill___')) // Restore original color for selected regions
    })
}

// Reset all regions to their original colors on mouseout
export function unhighlightRegions(map) {
    const selector = getLegendRegionsSelector(map)
    const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

    // Restore each region's original color from the fill___ attribute
    allRegions.each(function () {
        select(this).style('fill', select(this).attr('fill___'))
    })
}


/**
 * Threshold ticks + dataset min/max at the ends.
 * Example: thresholds [10, 20, 30], data in [3, 42]
 *  -> [3, 10, 20, 30, 42]  (or reversed if !ascending)
 */
export function getThresholdTicksWithExtents(out) {
    const thresholds = getThresholds(out)
    const maxVal = out.map.statData().getMax()
    const minVal = out.map.statData().getMin()

    if (!maxVal && !minVal) return thresholds


    // Build [min, ...thresholds, max] and dedupe
    const vals = [minVal, ...thresholds, maxVal]
    const uniq = Array.from(new Set(vals)) // preserve order, avoid dupes

    // Sort according to legend direction
    uniq.sort((a, b) => (out.ascending ? a - b : b - a))

    return uniq
}