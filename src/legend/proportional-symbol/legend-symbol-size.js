import { getFontSizeFromClass } from '../../core/utils'
import { symbolsLibrary } from '../../map-types/proportional-symbol/map-proportional-symbols.js'
import { symbol } from 'd3-shape'
import { spaceAsThousandSeparator } from '../../core/utils'

import { select } from 'd3-selection'
import { drawCircleSizeLegend } from '../legend-circle-size'


/**
 * Builds a legend which illustrates the statistical values of different symbol sizes
 *
 * @param {*} map map instance
 * @param {*} container parent legend object from core/legend.js
 */
export function drawSizeLegend(out, baseX, baseY) {
    const map = out.map;

    // container for size legend
    out._sizeLegendContainer = out.lgg
        .append('g')
        .attr('class', 'em-size-legend-container')
        .attr('id', 'em-size-legend-container')
        .attr('transform', `translate(${baseX},${baseY})`);

    // reset per-draw cursors/accumulators
    out.sizeLegend._cursorY = null;

    // draw legend
    if (!map.psCustomSVG_ && map.psShape_ === 'circle') {
        // circle size legend
        drawCircleSizeLegend(
            out,
            out._sizeLegendContainer,
            out.sizeLegend.values,
            map.classifierSize_,
            out.sizeLegend.title,
            out.sizeLegend.titlePadding
        );
        // DO NOT return; we want No Data appended after everything
    } else if (map.psShape_ === 'spike') {
        buildSpikeLegend(out);
    } else {
        // bars, other d3 shapes, custom SVG paths
        // define format for labels
        const labelFormatter = out.sizeLegend?.labelFormatter || spaceAsThousandSeparator;
        const domain = map.classifierSize_.domain();

        // for custom paths
        map.customSymbols = { nodeHeights: 0 }; // save some custom settings for buildCustomSVGItem

        // if user doesnt define values for legend manually
        if (!out.sizeLegend.values) {
            out.sizeLegend.values = [domain[1], domain[0]]; // default to min and max values
        }

        let length = out.sizeLegend.values.length;
        if (!length || length < 2) {
            console.warn('eurostat-map: sizeLegend.values length must be at least 2');
            length = 2
        }
        for (let i = 1; i < length + 1; i++) {
            // define class number
            // define raw value
            const val = out.sizeLegend.values[i - 1]
            // calculate shape size
            const symbolSize = map.classifierSize_(val);

            if (map.psShape_ === 'bar') {
                buildBarsItem(out, val, symbolSize, i, labelFormatter);
            } else if (map.psShape_ === 'custom' || map.psCustomSVG_) {
                buildCustomSVGItem(out, val, symbolSize, i, labelFormatter);
            } else {
                buildD3SymbolItem(out, val, symbolSize, i, labelFormatter);
            }
        }
    }

    // append No Data after all size-legend content is in the container
    if (out.sizeLegend.noData) addNoDataLegend(out);
}


function addNoDataLegend(out) {
    const bbox = out._sizeLegendContainer.node().getBBox();
    const paddings = {
        default: 20,
        bar: 35,
        spike: 30,
        circle: 1,
        square: 20
    }; // add some extra padding for bars and spikes
    const padding = paddings[out.map.psShape_] || paddings['default'];
    const noDataHeight = out.noDataShapeHeight
    const y = bbox.height + padding + (noDataHeight / 2); // padding after the size legend
    const x = 0;
    const container = out._sizeLegendContainer
        .append('g')
        .attr('class', 'em-no-data-legend')
        .attr('transform', `translate(${x},${y})`);
    out.appendNoDataLegend(container, out.sizeLegend.noDataText, highlightPsRegions, unhighlightPsRegions);
}

function buildSpikeLegend(out) {
    const map = out.map
    const spike = (length, width = map.psSpikeWidth_) => `M${-width / 2},0L0,${-length}L${width / 2},0`
    const labelFormatter = out.sizeLegend?.labelFormatter || spaceAsThousandSeparator;

    const maxStat = map.classifierSize_.domain()[1]
    const minStat = map.classifierSize_.domain()[0]
    const maxSize = map.classifierSize_(maxStat)

    // Determine values for the legend
    const legendValues = out.sizeLegend.values || [maxStat, minStat] // Use user-defined values or default ticks

    const fontSize = getFontSizeFromClass('em-legend-label') // Adjust font size
    const labelSpacing = fontSize - 2 // Ensure labels are just below the spikes

    const container = out._sizeLegendContainer
        .append('g')
        .attr('id', 'em-spike-legend')
        .attr('transform', `translate(${out.boxPadding},${out.sizeLegend.titlePadding})`)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .style('font-size', `${fontSize}px`)
        .selectAll()
        .data(legendValues) // Now uses user-defined values if provided
        .join('g')
        .attr('transform', (d, i) => `translate(${40 * i + out.boxPadding},${maxSize + 5})`) // Increase spacing

    // Append spikes
    container
        .append('path')
        .attr('fill', map.psFill_)
        .attr('fill-opacity', map.psFillOpacity_)
        .attr('stroke', map.psStroke_)
        .attr('stroke-width', map.psStrokeWidth_)
        .attr('d', (d) => spike(map.classifierSize_(d))) // Correctly maps values to spike size

    // Append labels directly below each spike
    container
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', labelSpacing) // Ensure text is right below spikes
        .text((d) => labelFormatter(d))

}

/**
 * @description builds a size legend item for proportional D3 shapes (e.g. square, triangle, star)
 * @param {number} symbolSize the size of the symbol item
 */
function buildD3SymbolItem(out, value, symbolSize, index, labelFormatter) {
    const map = out.map

    // Initialize running Y cursor for stacking
    if (out.sizeLegend._cursorY == null) {
        out.sizeLegend._cursorY =
            out.boxPadding +
            (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0)
    }

    const maxSize = map.classifierSize_(map.classifierSize_.domain()[1])
    const x = maxSize
    const y = out.sizeLegend._cursorY + out.sizeLegend.shapePadding

    // Container for symbol + label
    const itemContainer = out._sizeLegendContainer
        .append('g')
        .attr('transform', `translate(${x},${y})`)
        .attr('class', 'em-size-legend-item')

    // Draw D3 symbol
    const shape = getShape(out)
    const d = shape.size(symbolSize * symbolSize)()

    itemContainer
        .append('g')
        .style('fill', (d) => (map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_))
        .style('fill-opacity', map.psFillOpacity())
        .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : map.psStroke())
        .style('stroke-width', map.psStrokeWidth())
        .append('path')
        .attr('d', d)
        .attr('transform', () => `translate(${out.sizeLegend.shapeOffsets.x},${out.sizeLegend.shapeOffsets.y})`)

    // Label position
    const labelX = maxSize / 2 + out.sizeLegend.labelOffsets.x + out.boxPadding

    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', '0.35em') // ~vertical centering
        .attr('x', labelX)
        .attr('y', 0)
        .text(labelFormatter(value))

    // Measure actual height and advance the stacking cursor
    const hb = itemContainer.node().getBBox().height
    out.sizeLegend._cursorY += hb + out.sizeLegend.shapePadding
}


/**
 * @description
 * @param {*} m
 * @param {*} value
 * @param {*} symbolSize
 * @param {*} index
 * @param {*} labelFormatter
 */
function buildCustomSVGItem(out, value, symbolSize, index, labelFormatter) {
    const map = out.map
    let x = out.boxPadding //set X offset
    let y

    //first item
    if (!map.customSymbols.prevSymb) {
        y = out.boxPadding + (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0) + 20
        map.customSymbols.initialTranslateY = y
        map.customSymbols.prevScale = symbolSize
    }

    //following items
    if (map.customSymbols.prevSymb) {
        let prevNode = map.customSymbols.prevSymb.node()
        let bbox = prevNode.getBBox()
        map.customSymbols.nodeHeights = map.customSymbols.nodeHeights + bbox.height * map.customSymbols.prevScale
        y = map.customSymbols.initialTranslateY + map.customSymbols.nodeHeights + out.sizeLegend.shapePadding * (index - 1)
        map.customSymbols.prevScale = symbolSize
    }

    //container for symbol and label
    let itemContainer = out._sizeLegendContainer.append('g').attr('transform', `translate(${x},${y})`).attr('class', 'em-size-legend-item')

    // draw standard symbol
    map.customSymbols.prevSymb = itemContainer
        .append('g')
        .attr('class', 'em-size-legend-symbol')
        .style('fill', (d) => {
            // if secondary stat variable is used for symbol colouring, then dont colour the legend symbols using psFill()
            return map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_
        })
        .style('fill-opacity', map.psFillOpacity())
        .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : map.psStroke())
        .style('stroke-width', map.psStrokeWidth())
        .attr('stroke', 'black')
        .attr('stroke-width', 0.5)
        .append('g')
        .html(map.psCustomSVG_)
        .attr('transform', () => {
            if (map.psCustomSVG_) return `translate(${out.sizeLegend.shapeOffsets.x},${out.sizeLegend.shapeOffsets.y}) scale(${symbolSize})`
            else return `translate(${out.sizeLegend.shapeOffsets.x},${out.sizeLegend.shapeOffsets.y})`
        })

    //label position
    let labelX = x + map.classifierSize_(map.classifierSize_.domain()[0]) + out.sizeLegend.labelOffsets.x
    let labelY = out.sizeLegend.shapeOffsets.y / 2 + 1 //y + out.sizeLegend.labelOffsets.y

    //append label
    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', '0.35em') // ~vertical centering
        .attr('x', labelX)
        .attr('y', labelY)
        .text(labelFormatter(value))
}

/**
 * @description
 * @param {*} m
 * @param {*} symbolSize
 */
function buildBarsItem(out, value, symbolSize, index, labelFormatter) {
    const map = out.map;

    // init stacking cursor
    if (out.sizeLegend._cursorY == null) {
        out.sizeLegend._cursorY =
            out.boxPadding +
            (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0);
    }

    const x = out.boxPadding;                           // bars start from the left
    const y = out.sizeLegend._cursorY + out.sizeLegend.shapePadding;

    // make bar path (height ≈ symbolSize because size() gets area = symbolSize^2)
    const shape = getShape(out);
    const d = shape.size(symbolSize * symbolSize)();

    // container for one bar + label
    const itemContainer = out._sizeLegendContainer
        .append('g')
        .attr('class', 'em-size-legend-item')
        .attr('transform', `translate(${x},${y})`);

    // draw bar
    itemContainer
        .append('g')
        .style('fill', map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_)
        .style('fill-opacity', map.psFillOpacity())
        .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : map.psStroke())
        .style('stroke-width', map.psStrokeWidth())
        .append('path')
        .attr('d', d)
        .attr('transform', () =>
            map.psCustomSVG_
                ? `translate(${out.sizeLegend.shapeOffsets.x},${out.sizeLegend.shapeOffsets.y}) scale(${symbolSize})`
                : `translate(${out.sizeLegend.shapeOffsets.x},${out.sizeLegend.shapeOffsets.y})`
        );

    // label (to the right, vertically centered)
    const labelX = x + map.psBarWidth_ + out.sizeLegend.labelOffsets.x;
    const labelY = symbolSize / 2 + out.sizeLegend.labelOffsets.y;

    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', '0.35em')
        .attr('x', labelX)
        .attr('y', labelY)
        .text(labelFormatter(value));

    // advance stacking cursor by actual rendered height
    const hb = itemContainer.node().getBBox().height;
    out.sizeLegend._cursorY += hb + out.sizeLegend.shapePadding;
}

/**
 * @description returns the d3.symbol object chosen by the user
 * @return {d3.shape || SVG}
 */
function getShape(out) {
    const map = out.map
    let shape
    if (map.psCustomSVG_) {
        shape = map.psCustomSVG_
    } else if (map.psCustomShape_) {
        shape = map.psCustomShape_
    } else if (map.psShape_ == 'bar') {
        //for rectangles, we use a custom d3 symbol
        let drawRectangle = (context, size) => {
            let height = Math.sqrt(size)
            context.moveTo(0, 0)
            context.lineTo(0, height)
            context.lineTo(map.psBarWidth_, height)
            context.lineTo(map.psBarWidth_, 0)
            context.lineTo(0, 0)
            context.closePath()
        }
        shape = symbol().type({ draw: drawRectangle })
    } else {
        let symbolType = symbolsLibrary[map.psShape_] || symbolsLibrary['circle']
        shape = symbol().type(symbolType)
    }
    return shape
}

function highlightPsRegions(map, ecl) {
    const allSymbols = map.getCentroidsGroup(map).selectAll('[ecl]')

    // Set all symbols to visible
    allSymbols.each(function (d, i) {
        let symbol = select(this)
        symbol.style('opacity', '0')
    })

    // Highlight only the selected regions by restoring their original opacity
    const selectedSymbols = allSymbols.filter("[ecl='" + ecl + "']")
    selectedSymbols.each(function (d, i) {
        let symbol = select(this)
        symbol.style('opacity', map.psFillOpacity_) // Restore original opacity for selected regions
    })
}

// Reset all regions to their original opacitys on mouseout
function unhighlightPsRegions(map) {
    const allSymbols = map.getCentroidsGroup(map).selectAll('[ecl]')

    // Restore each region's original opacity from the fill___ attribute
    allSymbols.each(function (d, i) {
        let symbol = select(this)
        symbol.style('opacity', map.psFillOpacity_) // Restore original opacity for selected regions
    })
}
