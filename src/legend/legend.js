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
        out.lgg = out.svg
            .append('g')
            .attr('id', 'em-legend-' + out.svgId)
            .attr('class', 'em-legend')
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
        const legendSVG = out.svg
        if (legendSVG.attr('id') !== map.legend_.svgId) {
            out.build() // sets new svg and lgg
        }
    }

    out.updateConfig = function () {
        const map = out.map
        // Update legend parameters if necessary
        if (map.legend_) {
            deepMergeExistingKeys(out, map.legend_)
        }

        //ps
        // // update legend parameters if necessary
        // if (m.legend_)
        //     for (let key in m.legend_) {
        //         if (key == 'colorLegend' || key == 'sizeLegend') {
        //             for (let p in out[key]) {
        //                 //override each property in size and color legend m.legend_
        //                 if (m.legend_[key][p] !== undefined) {
        //                     out[key][p] = m.legend_[key][p]
        //                 }
        //             }
        //         } else {
        //             out[key] = m.legend_[key]
        //         }
        //     }
    }

    //It performs a shallow copy — nested objects will be copied by reference, not duplicated.
    //It modifies the target object (out) in place.
    //Useful for merging objects or extending existing ones.
    function deepMergeExistingKeys(target, source, options = {}, seen = new WeakSet(), depth = 0) {
        const MAX_DEPTH = options.maxDepth || 100

        if (seen.has(target)) return target
        seen.add(target)

        if (depth > MAX_DEPTH) {
            console.warn(`Max recursion depth (${MAX_DEPTH}) reached.`)
            return target
        }

        for (const key in source) {
            if (source.hasOwnProperty(key) && target.hasOwnProperty(key)) {
                const sourceVal = source[key]
                const targetVal = target[key]

                // Handle functions: overwrite directly
                if (typeof sourceVal === 'function') {
                    target[key] = sourceVal

                    // Handle nested plain objects
                } else if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
                    deepMergeExistingKeys(targetVal, sourceVal, options, seen, depth + 1)

                    // Handle arrays: overwrite (or merge if option set)
                } else if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
                    target[key] = options.mergeArrays ? [...new Set([...targetVal, ...sourceVal])] : [...sourceVal]

                    // Handle Dates
                } else if (sourceVal instanceof Date) {
                    target[key] = new Date(sourceVal.getTime())

                    // Handle RegExp
                } else if (sourceVal instanceof RegExp) {
                    target[key] = new RegExp(sourceVal)

                    // Handle Map and Set
                } else if (sourceVal instanceof Map) {
                    target[key] = new Map(sourceVal)
                } else if (sourceVal instanceof Set) {
                    target[key] = new Set(sourceVal)

                    // Overwrite primitives and other types
                } else {
                    target[key] = sourceVal
                }
            }
        }

        return target
    }

    // Helper to check for plain objects
    function isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]'
    }

    /** Draw legend background box */
    out.makeBackgroundBox = function () {
        out.lgg.append('rect').attr('id', 'legendBR').attr('class', 'em-legend-background').style('opacity', out.boxOpacity)
    }

    out.addTitle = function () {
        if (out.title) {
            const titlesContainer = out.lgg.append('g').attr('id', 'em-legend-titles')
            let cssFontSize = getFontSizeFromClass('em-legend-title')
            titlesContainer
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', out.boxPadding)
                .attr('y', out.boxPadding + cssFontSize)
                .text(out.title)
        }
    }

    out.addSubtitle = function () {
        if (out.subtitle) {
            const titlesContainer = out.lgg.select('#em-legend-titles')
            let titleFontSize = getFontSizeFromClass('em-legend-title')
            let subtitleFontSize = getFontSizeFromClass('em-legend-subtitle')
            titlesContainer
                .append('text')
                .attr('class', 'em-legend-subtitle')
                .attr('x', out.boxPadding)
                .attr('y', out.boxPadding + titleFontSize + subtitleFontSize + 3) // 3px padding after title
                .text(out.subtitle)
        }
    }

    // get the initial y position for the legend elements within the legend box (boxPadding + titles + padding)
    out.getBaseY = function () {
        return (
            out.boxPadding +
            (out.title ? getFontSizeFromClass('em-legend-title') : 0) +
            (out.subtitle ? getFontSizeFromClass('em-legend-subtitle') : 0) +
            10
        )
    }
    out.getBaseX = function () {
        return out.boxPadding
    }

    /** Set legend box dimensions, ensuring it has suitable dimensions to fit to all legend graphic elements */
    out.setBoxDimension = function () {
        if (out.lgg.node()) {
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
    }

    return out
}
