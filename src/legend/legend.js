import { select } from 'd3-selection'
import { formatDefaultLocale } from 'd3-format'
import { executeForAllInsets, getFontSizeFromClass, getLegendRegionsSelector } from '../core/utils'
import { getChoroplethLabelFormatter } from './choropleth/legend-choropleth'
import { getPropSymbolColorLabelFormatter, highlightPsSymbols, unhighlightPsSymbols } from './proportional-symbol/legend-proportional-symbols'
//types
/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */

/**
 * A eurostat-map legend. This is an abstract method.
 */
export const legend = function (map) {
    //build legend object
    const out = {}

    //link map to legend
    out.map = map

    //the SVG where to make the legend
    out.svgId = 'em-legend-container-' + Math.round(10e4 * Math.random())
    out.svg = undefined
    out.lgg = undefined

    //the legend element position, in case it is embeded within the map SVG
    out.x = undefined
    out.y = undefined
    out.position = undefined

    //the legend box
    out.boxPadding = 7
    out.boxOpacity = 0.7

    //legend title
    out.title = ''
    //legend subtitle
    out.subtitle = ''
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
    //the separator line length for discrete legend swatches
    out.sepLineLength = out.shapeWidth

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
    out.decimals = undefined // number of decimals for legend labels, undefined for automatically determine based on data

    out.maxMin = true // show max/min values in legends where applicable
    out.maxMinLabels = ['', ''] // Labels for max and min if maxMin is true

    /** Build legend. */
    out.build = function () {
        //set SVG element and add main drawing group
        out.svg = select('#' + out.svgId)
        // clear previous legend(s)
        out.svg.selectAll('*').remove()
        // append new legend group
        out.lgg = out.svg.attr('class', 'em-legend')
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
        const legendSVG = out.svg
        // Remove previous content
        container.selectAll('*').remove()

        //check if provided external svgId has changed or if legend SVG is not yet created, then build legend
        const needsLegendBuild = map && container && (!legendSVG || legendSVG.attr('id') !== map.legend_.svgId)
        if (needsLegendBuild) {
            out.build()
        }

        out.applyPosition()
    }

    out.applyPosition = function () {
        const map = out.map
        const container = out.lgg
        if (!map || !container || !container.node()) return

        const hasManualX = out.x != null
        const hasManualY = out.y != null
        const cornerPosition = getCornerPosition(out.position)
        if (!hasManualX && !hasManualY && !cornerPosition) return

        const bbox = getLegendBBox(container, out)
        const cornerCoords = cornerPosition ? getCornerCoords(cornerPosition, bbox, map, out.boxPadding) : null

        const x = hasManualX ? out.x : cornerCoords ? cornerCoords.x : map.width() - out.width - out.boxPadding
        const y = hasManualY ? out.y : cornerCoords ? cornerCoords.y : out.boxPadding

        container.attr('transform', `translate(${x},${y})`)
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
        out.lgg.append('rect').attr('id', 'em-legend-background').attr('class', 'em-legend-background').style('opacity', out.boxOpacity)
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
                .html(out.subtitle)
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
                .select('#em-legend-background')
                .attr('x', bb.x - p)
                .attr('y', bb.y - p)
                .attr('width', bb.width + 2 * p)
                .attr('height', bb.height + 2 * p)
            out.applyPosition()
        }
    }

    //'no data' legend box
    out.appendNoDataLegend = function (container, noDataText, highlightFunction, unhighlightFunction) {
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
                highlightFunction(map, 'nd')
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightFunction, 'nd')
                }
            })
            .on('mouseout', function () {
                unhighlightFunction(map, 'nd')
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightFunction, 'nd')
                }
            })

        //'no data' label
        container
            .append('text')
            .attr('class', 'em-legend-label em-legend-label-no-data')
            .attr('dy', '0.35em')
            .attr('x', out.noDataShapeWidth + 5)
            .attr('y', out.noDataShapeHeight / 2 + out.noDataPadding)
            .style('pointer-events', 'all')
            .style('cursor', 'pointer')
            .on('mouseover', function () {
                highlightFunction(map, 'nd')
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightFunction, 'nd')
                }
            })
            .on('mouseout', function () {
                unhighlightFunction(map, 'nd')
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightFunction, 'nd')
                }
            })
            .text(noDataText)
    }

    out.getNumberOfClasses = function (out) {
        const map = out.map
        const mapType = map._mapType
        const numberOfClasses = mapType === 'ps' ? map.psClasses_ : map.numberOfClasses_ //prop symbols or choropleth
        return numberOfClasses
    }

    /**
     * Dispatch to the correct label formatter based on map type.
     * - Choropleth: getChoroplethLabelFormatter (legend-choropleth.js)
     * - Prop symbols: getPropSymbolColorLabelFormatter (legend-proportional-symbols.js)
     * Both ultimately delegate to buildDiscreteLabelFormatter (legend-discrete.js).
     */
    out.getLabelFormatter = function (out) {
        const map = out.map
        const mapType = map._mapType
        if (mapType === 'ps') return getPropSymbolColorLabelFormatter(out)
        return getChoroplethLabelFormatter(out)
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

    out.getColorStats = function (out) {
        const map = out.map
        const mapType = map._mapType
        const stats = mapType === 'ps' ? map.statData('color') : map.statData()
        return stats
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

    function getCornerPosition(position) {
        if (typeof position !== 'string') return null
        const normalized = position.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
        const supported = ['top right', 'bottom right', 'top left', 'bottom left']
        return supported.includes(normalized) ? normalized : null
    }

    function getLegendBBox(container, legend) {
        const node = container.node()
        try {
            const bbox = node.getBBox({ stroke: true })
            if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && (bbox.width || bbox.height)) return bbox
        } catch (e) {
            // Fall back below when the browser cannot provide a rendered bbox yet.
        }
        return { x: 0, y: 0, width: legend.width || 0, height: legend.height || 0 }
    }

    function getCornerCoords(position, bbox, map, padding) {
        const [vertical, horizontal] = position.split(' ')
        const extent = getMapDrawingExtent(map)
        const buttonReserve = getLegendButtonReserve(map, position)
        const maxX = Math.max(extent.x + padding, extent.x + extent.width - bbox.width - padding)
        const minY = extent.y + padding
        const maxY = Math.max(minY, extent.y + extent.height - bbox.height - padding)
        const left = horizontal === 'right' ? maxX : extent.x + padding
        const top =
            vertical === 'bottom'
                ? Math.max(minY, Math.min(maxY, maxY - buttonReserve))
                : Math.max(minY, Math.min(maxY, minY + buttonReserve))

        return {
            x: left - bbox.x,
            y: top - bbox.y,
        }
    }

    function getLegendButtonReserve(map, position) {
        if (!map.legendButton_ || map.legendButtonPosition_) return 0

        const buttonPosition = getCornerPosition(map.legendObj_?.position) || 'top left'
        if (buttonPosition !== position) return 0

        const svg = map.svg?.()
        const button = svg?.select?.('#em-legend-button')
        if (!button || button.empty()) return 0

        try {
            const bbox = button.node().getBBox({ stroke: true })
            return bbox.height + 8
        } catch (e) {
            return 38
        }
    }

    function getMapDrawingExtent(map) {
        const fallback = { x: 0, y: 0, width: map.width(), height: map.height() }
        const svg = map.svg?.()
        if (!svg) return fallback

        const drawing = svg.select?.('#em-drawing-' + map.svgId_)
        if (!drawing || drawing.empty()) return fallback

        const transform = drawing.attr('transform') || ''
        const match = transform.match(/translate\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/)
        return {
            x: match ? Number(match[1]) || 0 : 0,
            y: match ? Number(match[2]) || 0 : 0,
            width: map.width(),
            height: map.height(),
        }
    }

    return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared region highlight / unhighlight (filter-based, works for all map types)
// ─────────────────────────────────────────────────────────────────────────────

let currentHighlight = null

/**
 * Reads the computed fill colour for a default (no-data) region from the DOM,
 * so the dimmed highlight colour always matches the map type's CSS.
 * Falls back to '#e1e1e1' if nothing is found.
 */
export function getDimmedFill(map) {
    const selector = getLegendRegionsSelector(map)
    // Find the first region that has no ecl (i.e. a background/no-input region)
    const candidate = map.svg_.selectAll(selector).selectAll('[ecl="ni"], .em-cntrg, .em-nutsrg').node()
    if (candidate) {
        const fill = window.getComputedStyle(candidate).fill
        if (fill && fill !== 'none') return fill
    }
    return '#e1e1e1'
}

export function highlightRegions(map, eclOrValue, options = {}) {
    const { tolerance = 0, continuous = false } = options && typeof options === 'object' && !Array.isArray(options) ? options : {}
    currentHighlight = eclOrValue
    const dimmedFill = getDimmedFill(map)
    const selector = getLegendRegionsSelector(map)
    const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

    if (allRegions.empty()) return

    // Bail out if the map hasn't finished rendering yet
    const isReady = allRegions.filter(function () {
        return !!this.getAttribute('fill___')
    })
    if (isReady.empty()) return

    // First pass: sync data-fill from fill___ for ALL regions before any fill changes
    allRegions.each(function () {
        const authoritative = this.getAttribute('fill___')
        if (authoritative) select(this).attr('data-fill', authoritative)
    })

    // Second pass: apply highlight/dim
    allRegions.each(function () {
        const sel = select(this)
        if (!sel.attr('data-fill')) return

        const ecl = sel.attr('ecl')
        if (!ecl || ecl === 'nd') {
            sel.style('fill', eclOrValue === 'nd' ? sel.attr('data-fill') : dimmedFill)
            return
        }

        const match = continuous ? +ecl >= eclOrValue - tolerance && +ecl <= eclOrValue + tolerance : ecl === String(eclOrValue)

        sel.style('fill', match ? sel.attr('data-fill') : dimmedFill)
    })
}

export function unhighlightRegions(map, eclOrValue) {
    currentHighlight = null
    const selector = getLegendRegionsSelector(map)
    map.svg_
        .selectAll(selector)
        .selectAll('[ecl]')
        .each(function () {
            const sel = select(this)
            const original = sel.attr('data-fill') || this.getAttribute('fill___')
            if (original) sel.style('fill', original)
        })
}

export function clearLegendHighlight(map) {
    currentHighlight = null
    const selector = getLegendRegionsSelector(map)
    map.svg_
        .selectAll(selector)
        .selectAll('[ecl]')
        .each(function () {
            const sel = select(this)
            const original = sel.attr('data-fill') || this.getAttribute('fill___')
            if (original) sel.style('fill', original)
        })
}
