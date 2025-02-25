import { select } from 'd3-selection'
import { getFontSizeFromClass } from '../core/utils'

/**
 * A eurostat-map legend. This is an abstract method.
 */
export const legend = function (map) {
    //build legend object
    const out = {}

    //link map to legend
    out.map = map

    //the SVG where to make the legend
    out.svgId = 'legend_' + Math.round(10e15 * Math.random())
    out.svg = undefined
    out.lgg = undefined

    //the legend element position, in case it is embeded within the map SVG
    out.x = undefined
    out.y = undefined

    //the legend box
    out.boxPadding = 7
    out.boxOpacity = 0.7

    //legend title
    out.title = ''
    // we now use CSS instead of inline styles
    out.titleFontSize = getFontSizeFromClass('em-legend-title')
    // we now use CSS instead of inline styles
    out.labelFontSize = getFontSizeFromClass('em-legend-label')

    /** Build legend. */
    out.build = function () {
        //set SVG element and add main drawing group
        out.svg = select('#' + out.svgId)
        // clear previous legend(s)
        out.svg.selectAll('#em-legend-' + out.svgId).remove()
        // append new legend group
        out.lgg = out.svg.append('g').attr('id', 'em-legend-' + out.svgId)
    }

    /**
     * Update the legend element.
     * This is an abstract method to be defined for each specific legend.
     */
    out.update = function () {
        console.log('Legend update function not implemented')
        return out
    }

    out.updateContainer = function () {
        const map = out.map
        const container = out.lgg
        // Remove previous content
        container.selectAll('*').remove()

        //check if provided external svgId has changed
        if (container.attr('id') !== map.legend_.svgId) {
            out.build() // sets new svg and lgg
        }
    }

    out.updateConfig = function () {
        const map = out.map
        // Update legend parameters if necessary
        if (map.legend_) {
            console.log(out, map.legend_)
            deepMergeExistingKeys(out, map.legend_)
            console.log(out)
        }
    }

    //It performs a shallow copy — nested objects will be copied by reference, not duplicated.
    //It modifies the target object (out) in place.
    //Useful for merging objects or extending existing ones.
    function deepMergeExistingKeys(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key) && target.hasOwnProperty(key)) {
                if (typeof target[key] === 'object' && typeof source[key] === 'object' && !Array.isArray(target[key])) {
                    // Recursively merge for nested objects
                    deepMergeExistingKeys(target[key], source[key])
                } else {
                    // Overwrite value
                    target[key] = source[key]
                }
            }
        }
        return target
    }

    /** Draw legend background box */
    out.makeBackgroundBox = function () {
        out.lgg.append('rect').attr('id', 'legendBR').attr('class', 'em-legend-background').style('opacity', out.boxOpacity)
    }

    /** Set legend box dimensions, ensuring it has suitable dimensions to fit to all legend graphic elements */
    out.setBoxDimension = function () {
        //get legend elements bounding box
        const bb = out.lgg.node().getBBox({ stroke: true })
        //apply to legend box dimensions
        const p = out.boxPadding
        out.svg
            .select('#legendBR')
            .attr('x', bb.x - p)
            .attr('y', bb.y - p)
            .attr('width', bb.width + 2 * p)
            .attr('height', bb.height + 2 * p)
    }

    return out
}
