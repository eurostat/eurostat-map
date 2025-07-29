import { select } from 'd3-selection'
import { executeForAllInsets, getFontSizeFromClass, getLegendRegionsSelector } from '../core/utils'
import { formatDefaultLocale } from 'd3'
import { getChoroplethLabelFormatter, highlightRegions, unhighlightRegions } from './choropleth/legend-choropleth'
import { getPropSymbolLabelFormatter, highlightPsSymbols, unhighlightPsSymbols } from './proportional-symbol/legend-proportional-symbols'

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
    // width
    out.width = 150
    //padding between title and body
    out.titlePadding = 5
    //the width of the legend box elements
    out.shapeWidth = 25
    //the height of the legend box elements
    out.shapeHeight = 20
    //the distance between consecutive legend shape elements
    out.shapePadding = 5

    // we now use CSS instead of inline styles
    out.labelFontSize = getFontSizeFromClass('em-legend-label')
    //the distance between the legend box elements to the corresponding text label
    out.labelOffsets = { x: 5, y: 5 }
    //labelFormatter function
    out.labelFormatter = null
    //set legend labels locale
    formatDefaultLocale({
        decimal: '.',
        thousands: ' ',
        grouping: [3],
        currency: ['', '€'],
    })

    //show no data
    out.noData = true
    //no data label text
    out.noDataText = 'No data'
    //gap between legend and 'no data' legend
    out.noDataPadding = 5
    out.noDataShapeWidth = 25
    out.noDataShapeHeight = 20

    //the order of the legend elements where applicable. Set to false to invert.
    out.ascending = true
    out.decimals = 0

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
                .attr('y', bb.y - p) // -2 to account for the title height
                .attr('width', bb.width + 2 * p)
                .attr('height', bb.height + 2 * p)
        }
    }

    //'no data' legend box
    out.appendNoDataLegend = function (container, noDataText, highlightRegions, unhighlightRegions) {
        const map = out.map

        //append symbol & style
        container
            .append('rect')
            .attr('class', 'em-legend-rect')
            .style('fill', map.noDataFillStyle())
            .attr('y', out.noDataPadding)
            .attr('width', out.noDataShapeWidth)
            .attr('height', out.noDataShapeHeight)
            .on('mouseover', function () {
                highlightRegions(map, 'nd')
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, 'nd')
                }
            })
            .on('mouseout', function () {
                unhighlightRegions(map)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions, 'nd')
                }
            })

        //'no data' label
        container
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('dy', '0.35em') // ~vertical centering
            .attr('x', out.noDataShapeWidth + 5)
            .attr('y', out.noDataShapeHeight / 2 + out.noDataPadding)
            .text(noDataText)
    }

    out.getNumberOfClasses = function (out) {
        const map = out.map
        const mapType = map._mapType
        const numberOfClasses = mapType === 'ps' ? map.psClasses_ : map.numberOfClasses_ //prop symbols or choropleth
        return numberOfClasses
    }

    out.getLabelFormatter = function (out) {
        const map = out.map
        const mapType = map._mapType
        const labelFormatter = mapType === 'ps' ? getPropSymbolLabelFormatter(out) : getChoroplethLabelFormatter(out)
        return labelFormatter
    }

    out.getClassToFillStyle = function (out) {
        const map = out.map
        const mapType = map._mapType
        const classToFillStyle = mapType === 'ps' ? map.psClassToFillStyle_ : map.classToFillStyle_
        return classToFillStyle
    }

    out.getColorClassifier = function (out) {
        const map = out.map
        const mapType = map._mapType
        const colorClassifier = mapType === 'ps' ? map.classifierColor_ : map.classifier_
        return colorClassifier
    }

    out.getHighlightFunction = function (map) {
        if (map._mapType == 'ps') return highlightPsSymbols
        return highlightRegions
    }

    out.getUnHighlightFunction = function (map) {
        if (map._mapType == 'ps') return unhighlightPsSymbols
        return unhighlightRegions
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

    return out
}
