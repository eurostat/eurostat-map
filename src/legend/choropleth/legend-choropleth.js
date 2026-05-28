//legend-choropleth.js
import { select } from 'd3-selection'
import * as Legend from '../legend'
import { appendPatternFillLegend } from '../legend-pattern-fill'
import { createHistogramLegend } from './legend-histogram'
import { createContinuousLegend } from '../legend-continuous'
import { drawDiscreteLegend, buildDiscreteLabelFormatter, resolveDecimals } from '../legend-discrete'
import { createAlphaLegend } from './legend-value-by-alpha'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/legend/choropleth/ChoroplethLegendConfig').ChoroplethLegendConfig} ChoroplethLegendConfig */

/**
 * A legend for choropleth maps
 *
 * @param {MapInstance} map
 * @param {ChoroplethLegendConfig} [config]
 */
export const legend = function (map, config = {}) {
    //build generic legend object (inherit)
    const out = Legend.legend(map)

    out.labelType = 'thresholds' // thresholds || ranges
    //the separation line length
    out.sepLineLength = out.sepLineLength ?? out.shapeWidth
    //tick line length in pixels
    out.tickLength = 4
    //the number of decimal for the legend labels
    out.decimals = undefined
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
    out.highlightTolerance = 10 // tolerance in pixels for highlighting nearby symbols in continuous legends

    //override attribute values with config values
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

            //exit early if stat data not yet available
            if (!map.statData()?.getArray()?.length) return

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
    const stat = out.getColorStats(out)

    // If stat data isn't ready yet, return a no-op formatter — legend will re-render when data arrives
    if (!stat?.getArray?.()?.length) return () => ''

    const decimals = resolveDecimals(out, stat)
    out._resolvedDecimals = decimals

    return buildDiscreteLabelFormatter(out, () => getThresholds(out), stat, out.labelType, out.labelFormatter)
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
