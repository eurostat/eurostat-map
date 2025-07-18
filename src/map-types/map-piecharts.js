import { scaleSqrt } from 'd3-scale'
import { select, selectAll } from 'd3-selection'
import { arc, pie } from 'd3-shape'
import { extent, sum } from 'd3-array'
import { interpolateOrRd, schemeCategory10 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import * as PiechartLegend from '../legend/legend-piecharts'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../core/utils'

/**
 * Returns a proportional pie chart map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true, 'pie')

    // pie charts
    out.pieMinRadius_ = 5
    out.pieMaxRadius_ = 15
    out.pieChartInnerRadius_ = 0
    out.pieStrokeFill_ = 'white'
    out.pieStrokeWidth_ = 0.3

    //tooltip pie chart
    out.tooltipPieRadius_ = 40
    out.tooltipPieInnerRadius_ = 0

    //colors - indexed by category code
    out.catColors_ = undefined
    //labels - indexed by category code
    out.catLabels_ = undefined

    // 'other' section of the pie chart for when 'out.totalCode_' is defined with statPie()
    out.pieOtherColor_ = '#FFCC80'
    out.pieOtherText_ = 'Other'

    //show piecharts only when data for all categories is complete.
    //Otherwise, consider the regions as being with no data at all.
    out.showOnlyWhenComplete_ = false

    out.sizeClassifier_ = null //d3 scale for scaling pie sizes
    out.statPie_ = null

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;[
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'pieMaxRadius_',
        'pieMinRadius_',
        'pieChartInnerRadius_',
        'pieOtherColor_',
        'pieOtherText_',
        'pieStrokeFill_',
        'pieStrokeWidth_',
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config)
        [
            'catColors',
            'catLabels',
            'showOnlyWhenComplete',
            'noDataFillStyle',
            'pieMaxRadius',
            'pieMinRadius',
            'pieChartInnerRadius',
            'pieOtherColor',
            'pieOtherText',
            'pieStrokeFill',
            'pieStrokeWidth',
        ].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

    /** The codes of the categories to consider for the composition. */
    out.statCodes_ = undefined
    /** The code of the "total" category in the eurostat database */
    out.totalCode__ = undefined

    /**
     * A function to define a pie chart map easily, without repetition of information.
     * Only for eurobase data sources.
     *
     * @param {*} stat A pattern for the stat data source
     * @param {String} dim The dimension (defined in eurostat REST API) of the composition.
     * @param {Array} codes The category codes of the composition
     * @param {Array} labels Optional: The labels for the category codes
     * @param {Array} colors Optional: The colors for the category
     * @param {string} tCode Optional: The category code of the total (used to calculate total & "other" values if codes array dont represent all possible categories)
     */
    out.statPie = function (stat, dim, codes, labels, colors, tCode) {
        //add one dataset (stat) config for each category (code)
        stat.filters = stat.filters || {}
        for (let i = 0; i < codes.length; i++) {
            //category code
            const code = codes[i]
            stat.filters[dim] = code
            const sc_ = {}
            for (let key in stat) {
                sc_[key] = stat[key]
            }
            sc_.filters = {}
            for (let key in stat.filters) {
                sc_.filters[key] = stat.filters[key]
            }
            out.stat(code, sc_)

            //if specified, retrieve and assign color
            if (colors) {
                out.catColors_ = out.catColors_ || {}
                out.catColors_[code] = colors[i]
            }
            //if specified, retrieve and assign label
            if (labels) {
                out.catLabels_ = out.catLabels_ || {}
                out.catLabels_[code] = labels[i]
            }
        }

        //set out.statCodes_
        out.statCodes_ = codes

        //set out.totalCode_
        if (tCode) {
            out.totalCode_ = tCode
            stat.filters[dim] = tCode
            const sc_ = {}
            for (let key in stat) sc_[key] = stat[key]
            sc_.filters = {}
            for (let key in stat.filters) sc_.filters[key] = stat.filters[key]
            out.stat(tCode, sc_)

            //when total code is used, an 'other' section is added to the pie
            out.catColors_['other'] = out.pieOtherColor_
            out.catLabels_['other'] = out.pieOtherText_
        }

        return out
    }

    //@override
    out.updateClassification = function () {
        // apply classification to all insets that are outside of the main map's SVG
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
        }

        // apply to main map
        applyClassificationToMap(out)

        return out
    }

    const applyClassificationToMap = function (map) {
        //if not provided, get list of stat codes from the map stat data
        if (!out.statCodes_) {
            //get list of stat codes.
            out.statCodes_ = Object.keys(out.statData_)
            //remove "default", if present
            const index = out.statCodes_.indexOf('default')
            if (index > -1) out.statCodes_.splice(index, 1)
        }

        //define size scaling function
        let domain = getDatasetMaxMin()
        if (!isNaN(domain[0])) {
            out.sizeClassifier_ = scaleSqrt().domain(domain).range([out.pieMinRadius_, out.pieMaxRadius_])
        }

        return out
    }

    //@override
    out.updateStyle = function () {
        //if not specified, build default color ramp
        if (!out.catColors_) {
            out.catColors({})
            for (let i = 0; i < out.statCodes_.length; i++) out.catColors_[out.statCodes_[i]] = schemeCategory10[i % 10]
        }

        //if not specified, initialise category labels
        out.catLabels_ = out.catLabels_ || {}

        //build and assign pie charts to the regions
        //collect nuts ids from g elements. TODO: find better way of sharing regions with pies
        let regionFeatures = []
        if (out.svg_) {
            let s = out.svg_.selectAll('#em-prop-symbols')
            if (s) {
                let sym = s.selectAll('g.em-centroid')
                sym.append('g')
                    .attr('class', 'em-pie')
                    .attr('id', (rg) => {
                        regionFeatures.push(rg)
                        return 'pie_' + rg.properties.id
                    })

                // set region hover function
                const selector = getRegionsSelector(out)
                let regions = out.svg().selectAll(selector)
                regions
                    .on('mouseover', function (e, rg) {
                        const sel = select(this)
                        sel.attr('fill___', sel.style('fill'))
                        sel.style('fill', out.hoverColor_)
                        if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                    })
                    .on('mousemove', function (e, rg) {
                        if (out._tooltip) out._tooltip.mousemove(e)
                    })
                    .on('mouseout', function () {
                        const sel = select(this)
                        let newFill = sel.attr('fill___')
                        if (newFill) {
                            sel.style('fill', sel.attr('fill___'))
                            if (out._tooltip) out._tooltip.mouseout()
                        }
                    })

                addPieChartsToMap(regionFeatures)
            }
        }
        return out
    }

    /**
     * Function to compute composition for region id, for each category.
     * Return an object with, for each category, the share [0,1] of the category.
     * @param {*} id
     */
    const getComposition = function (id) {
        let comp = {},
            sum = 0
        //get stat value for each category. Compute the sum.
        for (let i = 0; i < out.statCodes_.length; i++) {
            //retrieve code and stat value
            const sc = out.statCodes_[i]
            const s = out.statData(sc).get(id)

            //case when some data is missing
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                else continue
            }

            comp[sc] = s.value
            sum += s.value
        }

        // when out.totalCode_ is specified, use it as the sum instead of the sum of the specified categories.
        if (out.totalCode_) {
            let s = out.statData(out.totalCode_).get(id)
            if (s) {
                sum = s.value
            } else {
                sum == 0
            }
        }

        //case when no data
        if (sum == 0) return undefined

        //compute ratios
        for (let i = 0; i < out.statCodes_.length; i++) {
            comp[out.statCodes_[i]] /= sum
        }

        //add "other" category when out.totalCode_ is used
        if (out.totalCode_) {
            let totalPerc = 0
            for (let key in comp) {
                totalPerc = totalPerc + comp[key]
            }
            comp['other'] = 1 - totalPerc
        }

        return comp
    }

    /**
     * @function getDatasetMaxMin
     * @description gets the maximum and minimum total of all dimensions combined for each region. Used to define the domain of the pie size scaling function.
     * @returns [min,max]
     */
    function getDatasetMaxMin() {
        let totals = []
        let sel = out.svg().selectAll('#em-prop-symbols').selectAll('g.em-centroid').data()

        sel.forEach((rg) => {
            let id = rg.properties.id
            let total = getRegionTotal(id)
            if (total) {
                totals.push(total)
            }
        })

        let minmax = extent(totals)
        return minmax
    }

    /**
     * Get absolute total value of combined statistical values for a specific region. E.g total livestock
     * @param {*} id nuts region id
     */
    const getRegionTotal = function (id) {
        let sum = 0
        let s
        if (out.totalCode_) {
            //when total is a stat code
            s = out.statData(out.totalCode_).get(id)
            //case when some data is missing
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) {
                    sum = undefined
                }
            } else {
                sum = s.value
            }
        } else {
            //get stat value for each category. Compute the sum.
            for (let i = 0; i < out.statCodes_.length; i++) {
                //retrieve code and stat value
                const sc = out.statCodes_[i]
                s = out.statData(sc).get(id)
                //case when some data is missing
                if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                    if (out.showOnlyWhenComplete()) return undefined
                    else continue
                }
                sum += s.value
            }
        }

        //case when no data
        if (sum == 0) return undefined
        return sum
    }

    function addPieChartsToMap(regionFeatures) {
        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            //prepare data for pie chart
            const data = []
            const comp = getComposition(regionId)
            for (const key in comp) data.push({ code: key, value: comp[key] })

            //case of regions with no data
            if (!data || data.length == 0) {
                return
            }

            //create svg for pie chart
            // can be more than one center point for each nuts ID (e.g. Malta when included in insets)
            let nodes = out.svg().selectAll('#pie_' + regionId)

            // define radius
            const r = out.sizeClassifier_(getRegionTotal(regionId))
            const ir = out.pieChartInnerRadius_

            //make pie chart. See https://observablehq.com/@d3/pie-chart
            const pie_ = pie()
                .sort(null)
                .value((d) => d.value)
            nodes
                .append('g')
                .attr('stroke', out.pieStrokeFill_)
                .attr('stroke-width', out.pieStrokeWidth_ + 'px')
                .attr('class', 'piechart')
                .selectAll('path')
                .data(pie_(data))
                .join('path')
                .style('fill', (d) => {
                    return out.catColors_[d.data.code] || 'lightgray'
                })
                .attr('fill___', (d) => {
                    return out.catColors_[d.data.code] || 'lightgray'
                })
                .attr('code', (d) => d.data.code) //for mouseover legend highlighting function
                .attr('d', arc().innerRadius(ir).outerRadius(r))
                .on('mouseover', function (e, rg) {
                    const sel = select(this)
                    // Apply a thick stroke width to the parent element
                    const parent = select(sel.node().parentNode)
                    parent.style('stroke-width', '1px').style('stroke', 'black') // Set stroke
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(region, out))
                })
                .on('mousemove', function (e, rg) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    const sel = select(this)
                    // Reset stroke
                    const parent = select(sel.node().parentNode)
                    parent.style('stroke-width', out.pieStrokeWidth_).style('stroke', out.pieStrokeFill_) // Set stroke
                    if (out._tooltip) out._tooltip.mouseout()
                })
        })
    }

    //@override
    out.getLegendConstructor = function () {
        return PiechartLegend.legend
    }

    //specific tooltip text function
    // tooltip chart dimensions
    const width = 150
    const height = 120
    const margin = 10
    const radius = Math.min(width, height) / 2 - margin

    // Generate pie and arcs
    const pie_ = pie()
        .sort(null)
        .value((d) => d.value)
    const innerArc = arc()
        .innerRadius(0)
        .outerRadius(radius * 0.8)
    const outerArc = arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9)
    // Tooltip function for pie charts
    const pieChartTooltipFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const comp = getComposition(regionId)

        const data = []
        for (const key in comp) data.push({ code: key, value: comp[key] })

        let html = ''

        // Header
        html += `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        if (!data || data.length === 0) {
            html += `<div>${out.noDataText()}</div>`
            return html
        }

        const pieData = pie_(data)

        let paths = ''
        let polylines = ''
        let labels = ''

        for (const d of pieData) {
            const fill = out.catColors()[d.data.code] || 'lightgray'
            const dPath = innerArc(d)
            paths += `<path d="${dPath}" fill="${fill}" stroke="white" stroke-width="1" opacity="0.7"></path>`

            if (d.data.value > 0.1) {
                const posA = innerArc.centroid(d)
                const posB = outerArc.centroid(d)
                const posC = outerArc.centroid(d)
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
                posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1)

                polylines += `<polyline points="${posA.join(',')} ${posB.join(',')} ${posC.join(',')}"
                stroke="black" fill="none" stroke-width="1" />`

                const labelPos = outerArc.centroid(d)
                labelPos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1)
                const anchor = midangle < Math.PI ? 'start' : 'end'
                const percent = (d.data.value * 100).toFixed()
                if (!isNaN(percent)) {
                    labels += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="${anchor}" font-size="12px">
                    ${percent}%
                </text>`
                }
            }
        }

        const svg = `
        <div class='em-tooltip-piechart-container'>
            <svg viewBox="${-width / 2} ${-height / 2} ${width} ${height}" width="${width}" height="${height - margin / 2}">
                <g transform="translate(0,0)">
                    ${paths}
                    ${polylines}
                    ${labels}
                </g>
            </svg>
        </div>
    `
        html += svg

        // Breakdown
        // Breakdown (sorted by value)
        // Breakdown (sorted by value, with percentages)
        html += `<div class="em-tooltip-piechart-breakdown">`

        // Collect all values, compute total, and sort descending
        const breakdownData = out.statCodes_
            .map((sc) => {
                const s = out.statData(sc).get(regionId)
                return s && s.value !== undefined && s.value !== null
                    ? { code: sc, label: out.catLabels_[sc], value: s.value, color: out.catColors()[sc] || '#666' }
                    : null
            })
            .filter(Boolean)
            .sort((a, b) => b.value - a.value)

        const total = getRegionTotal(regionId) || breakdownData.reduce((sum, d) => sum + d.value, 0)

        // Render each category
        for (const item of breakdownData) {
            const percent = total ? ((item.value / total) * 100).toFixed(0) : 0
            html += `
        <div class="em-breakdown-item">
            <span class="em-breakdown-color" style="background:${item.color}"></span>
            <span class="em-breakdown-label">${item.label}</span>
            <span class="em-breakdown-value">${item.value.toFixed()} (${percent}%)</span>
        </div>
    `
        }

        // Total (always last, no percentage)
        if (total !== undefined && total !== null) {
            const unit = out.statData(out.statCodes_[0]).unitText() || ''
            html += `
        <div class="em-breakdown-item em-total">
            <span class="em-breakdown-label">Total</span>
            <span class="em-breakdown-value">${total.toFixed()} ${unit}</span>
        </div>
    `
        }

        html += `</div>`

        return html
    }

    out.tooltip_.textFunction = pieChartTooltipFunction

    return out
}
