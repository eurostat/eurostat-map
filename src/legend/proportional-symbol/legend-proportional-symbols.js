import { select } from 'd3-selection'
import * as Legend from '../legend'
import { formatDefaultLocale } from 'd3-format'
import { appendPatternFillLegend } from '../legend-pattern-fill'
import { buildSizeLegend } from './legend-symbol-size'
import { buildColorLegend } from './legend-symbol-color'

//set legend labels locale
formatDefaultLocale({
    decimal: '.',
    thousands: ' ',
    grouping: [3],
    currency: ['', '€'],
})

/**
 * A legend for proportional symbol map
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    out.ascending = false //the order of the legend elements. Set to false to invert.
    out.legendSpacing = 35 //spacing between color & size legends (if applicable)
    out.labelFontSize = 12 //the font size of the legend labels

    out.noDataShapeWidth = 25
    out.noDataShapeHeight = 20

    //size legend config (legend illustrating the values of different symbol sizes)
    out.sizeLegend = {
        title: null,
        titleFontSize: 12,
        titlePadding: 10, //padding between title and legend body
        values: undefined, //manually define raw data values
        cellNb: 3, //number of elements in the legend
        shapePadding: 5, //the y distance between consecutive legend shape elements
        shapeOffset: { x: 0, y: 0 },
        shapeFill: 'white',
        shapeStroke: null,
        labelOffset: { x: 10, y: 0 }, //the distance between the legend box elements to the corresponding text label
        decimals: 0, //the number of decimal for the legend labels
        labelFormatter: undefined,
        noData: false, // show no data legend item
        noDataText: 'No data', //no data text label
        _totalBarsHeight: 0,
        _totalD3SymbolsHeight: 0,
    }

    // color legend config (legend illustrating the data-driven colour classes)
    out.colorLegend = {
        title: null,
        titleFontSize: 12,
        titlePadding: 10, //padding between title and legend body
        marginTop: 33, // margin top (distance between color and size legend)
        shapeWidth: 25, //the width of the legend box elements
        shapeHeight: 20, //the height of the legend box elements
        shapePadding: 1, //the distance between consecutive legend shape elements in the color legend
        labelOffset: { x: 5, y: 0 }, //distance (x) between label text and its corresponding shape element
        decimals: 0, //the number of decimal for the legend labels
        labelFormatter: undefined, // user-defined d3 format function
        labelType: 'thresholds', // type of labels to show: thresholds or ranges
        labels: null, // user-defined labels for each class
        noData: true, //show no data
        noDataText: 'No data', //no data text label
        sepLineLength: 24, // //the separation line length
        sepLineStroke: 'black', //the separation line color
        sepLineStrokeWidth: 1, //the separation line width
        tickLength: 5, // threshold ticks length in px
    }

    //override attribute values with config values
    if (config)
        for (let key in config) {
            if (key == 'colorLegend' || key == 'sizeLegend') {
                for (let p in out[key]) {
                    //override each property in size and color legend configs
                    if (config[key][p] !== undefined) {
                        out[key][p] = config[key][p]
                    }
                }
                if (config.colorLegend == false) out.colorLegend = false
            } else {
                out[key] = config[key]
            }
        }

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (out.lgg.node()) {
            const lgg = out.lgg

            //remove previous content
            lgg.selectAll('*').remove()

            //draw legend background box
            out.makeBackgroundBox()
            if (out.title) out.addTitle()
            if (out.subtitle) out.addSubtitle()

            // reset height counters
            out.sizeLegend._totalBarsHeight = 0
            out.sizeLegend._totalD3SymbolsHeight = 0

            // initial x and y positions for the internal legend elements
            const baseY = out.getBaseY()
            const baseX = out.getBaseX()

            // legend for size
            if (map.classifierSize_) {
                buildSizeLegend(out, baseX, baseY)
            }
            if (map.classifierColor_ && out.colorLegend) {
                buildColorLegend(out, baseX, baseY)
            }

            // Append pattern fill legend items BELOW the main legend
            const legendHeight = out.lgg.node().getBBox().height
            const patternContainer = out.lgg
                .append('g')
                .attr('class', 'pattern-fill-legend')
                .attr('transform', `translate(${out.getBaseX()}, ${legendHeight + out.boxPadding + 5})`)
            appendPatternFillLegend(out, patternContainer)

            //set legend box dimensions
            out.setBoxDimension()
        }
    }

    return out
}

// Highlight selected regions on mouseover
export function highlightRegions(map, ecl) {
    //for ps, the symbols are the children of each em-prop-symbols element
    const allSymbols = map.svg_.selectAll('#em-prop-symbols').selectAll('[ecl]')

    // Set all symbols to white
    allSymbols.each(function (d, i) {
        let symbol = select(this.childNodes[0])
        symbol.style('fill', 'white')
    })

    // Highlight only the selected regions by restoring their original color
    const selectedSymbols = allSymbols.filter("[ecl='" + ecl + "']")
    selectedSymbols.each(function (d, i) {
        let symbol = select(this.childNodes[0])
        symbol.style('fill', symbol.attr('fill___')) // Restore original color for selected regions
    })
}

// Reset all regions to their original colors on mouseout
export function unhighlightRegions(map) {
    //for ps, the symbols are the children of each em-prop-symbols element
    const allSymbols = map.svg_.selectAll('#em-prop-symbols').selectAll('[ecl]')

    // Restore each region's original color from the fill___ attribute
    allSymbols.each(function (d, i) {
        let symbol = select(this.childNodes[0])
        symbol.style('fill', symbol.attr('fill___')) // Restore original color for selected regions
    })
}
