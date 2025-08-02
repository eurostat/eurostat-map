import { scaleSqrt } from 'd3-scale'
import { select, selectAll } from 'd3-selection'
import { arc, pie } from 'd3-shape'
import { extent, sum } from 'd3-array'
import { interpolateOrRd, schemeCategory10 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import * as PiechartLegend from '../legend/legend-piecharts'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../core/utils'
import { runDorlingSimulation, stopDorlingSimulation } from '../core/dorling/dorling'

/**
 * Returns a proportional pie chart map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true, 'pie')

    out.dorling_ = config?.dorling || false
    out.animateDorling_ = true

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

    // 'other' section of the pie chart for when 'out.pieTotalCode_' is defined
    out.pieOtherColor_ = '#FFCC80'
    out.pieOtherText_ = 'Other'

    //show piecharts only when data for all categories is complete.
    //Otherwise, consider the regions as being with no data at all.
    out.showOnlyWhenComplete_ = false

    out.classifierSize_ = null //d3 scale for scaling pie sizes
    out.statPie_ = null
    /** The code of the "total" category in the eurostat database */
    out.pieTotalCode_ = undefined

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
        'dorling_',
        'animateDorling_',
        'pieTotalCode_',
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

        //set out.pieTotalCode_
        if (tCode) {
            out.pieTotalCode_ = tCode
            stat.filters[dim] = tCode
            const sc_ = {}
            for (let key in stat) sc_[key] = stat[key]
            sc_.filters = {}
            for (let key in stat.filters) sc_.filters[key] = stat.filters[key]
            out.stat(tCode, sc_)
        } else {
            out.pieTotalCode_ = undefined
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
            out.classifierSize_ = scaleSqrt().domain(domain).range([out.pieMinRadius_, out.pieMaxRadius_])
        }

        return out
    }

    //@override
    out.updateStyle = function () {
        try {
            //if not specified, build default color ramp
            if (!out.catColors_) {
                out.catColors({})
                for (let i = 0; i < out.statCodes_.length; i++) out.catColors_[out.statCodes_[i]] = schemeCategory10[i % 10]
            }
            if (out.pieTotalCode_) {
                //when total code is used, an 'other' section is added to the pie
                out.catColors_['other'] = out.pieOtherColor_
                out.catLabels_['other'] = out.pieOtherText_
            }

            //if not specified, initialise category labels
            out.catLabels_ = out.catLabels_ || {}
            // apply to main map
            applyStyleToMap(out)

            // apply style to insets
            // apply classification to all insets
            if (out.insetTemplates_) {
                for (const geo in out.insetTemplates_) {
                    if (Array.isArray(out.insetTemplates_[geo])) {
                        for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
                            // insets with same geo that do not share the same parent inset
                            if (Array.isArray(out.insetTemplates_[geo][i])) {
                                // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
                                for (var c = 0; c < out.insetTemplates_[geo][i].length; c++) {
                                    if (out.insetTemplates_[geo][i][c].svgId_ !== out.svgId_) applyStyleToMap(out.insetTemplates_[geo][i][c])
                                }
                            } else {
                                if (out.insetTemplates_[geo][i].svgId_ !== out.svgId_) applyStyleToMap(out.insetTemplates_[geo][i])
                            }
                        }
                    } else {
                        // unique inset geo_
                        if (out.insetTemplates_[geo].svgId_ !== out.svgId_) applyStyleToMap(out.insetTemplates_[geo])
                    }
                }
            }

            return out
        } catch (e) {
            console.error('Error in pie symbols styling: ' + e.message)
            console.error(e)
        }
    }

    function applyStyleToMap(map) {
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

                if (map.geo_ !== 'WORLD') {
                    if (map.nutsLevel_ == 'mixed') {
                        styleMixedNUTSRegions(map, regions)
                        // Build centroidFeatures so Dorling has something to simulate
                        const centroids = []
                        map.svg()
                            .selectAll('g.em-centroid')
                            .each(function (d) {
                                if (!d.properties?.centroid) return
                                centroids.push(d) // d already has properties and id
                            })
                        out.Geometries.centroidsFeatures = centroids
                    }
                }
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

        if (out.dorling_) {
            // Build centroidsFeatures so Dorling has something to simulate
            const centroids = []
            out.svg()
                .selectAll('g.em-centroid')
                .each(function (d) {
                    if (d?.properties?.centroid) centroids.push(d)
                })
            out.Geometries.centroidsFeatures = centroids

            runDorlingSimulation(out, (d) => {
                const total = getRegionTotal(d.properties.id) || 0
                return out.classifierSize_(total) || 0
            })
        } else {
            stopDorlingSimulation(out)
        }
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
            const r = out.classifierSize_(getRegionTotal(regionId))
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

    function styleMixedNUTSRegions(map, regions) {
        regions.each(function (rg) {
            const sel = select(this)

            if (this.parentNode.classList.contains('em-cntrg')) return // Skip country regions

            const lvl = sel.attr('lvl')
            //const total = getRegionTotal(rg.properties.id)
            const comp = getComposition(rg.properties.id)

            // Determine if region has data
            const hasData = comp //|| (total && (total.value || total.value === 0 || total === 0))

            // Compute styles
            let display = hasData ? (map.geo_ === 'WORLD' ? 'block' : null) : 'none'
            let stroke = null
            let strokeWidth = null

            if (hasData) {
                if (lvl !== '0') {
                    stroke = sel.style('stroke') || '#777'
                    if (map.geo_ === 'WORLD') {
                        strokeWidth = sel.style('stroke-width') || '#777'
                    }
                }
            }

            // Apply all styles at once
            sel.style('display', display).style('stroke', stroke).style('stroke-width', strokeWidth)
        })
    }

    /**
     * Function to compute composition for region id, for each category.
     * Return an object with, for each category, the share [0,1] of the category.
     * @param {*} id
     */
    const getComposition = function (id) {
        const comp = {}
        let sum = 0
        const codes = out.statCodes_

        // Compute category values and sum
        for (let i = 0; i < codes.length; i++) {
            const sc = codes[i]
            const s = out.statData(sc).get(id)
            const val = s?.value

            // Skip invalid or NaN values
            if (val === null || val === undefined || isNaN(val)) {
                if (out.showOnlyWhenComplete()) return undefined
                continue
            }

            comp[sc] = val
            sum += val
        }

        // Override sum if a total stat is specified
        if (out.pieTotalCode_) {
            const totalData = out.statData(out.pieTotalCode_)
            const totalEntry = totalData.get(id)
            const totalVal = totalEntry?.value

            if (totalVal === null || totalVal === undefined || isNaN(totalVal)) {
                // No valid total => treat as zero
                sum = 0
            } else {
                sum = totalVal
            }
        }

        // Return undefined if no data or sum is zero
        if (!sum || isNaN(sum)) return undefined

        // Compute ratios
        for (const sc of codes) {
            if (comp[sc] !== undefined) {
                comp[sc] /= sum
            }
        }

        // Compute "other" if using total
        if (out.pieTotalCode_) {
            const totalPerc = Object.values(comp).reduce((a, b) => a + b, 0)
            comp['other'] = Math.max(0, 1 - totalPerc) // protect against floating-point drift
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
        if (out.pieTotalCode_) {
            //when total is a stat code
            const totalData = out.statData(out.pieTotalCode_)
            s = totalData.get(id)
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
        html += `<div class="em-tooltip-breakdown">`

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
            <span class="em-breakdown-value">${item.value?.toFixed ? item.value.toFixed() : 0} (${isNaN(percent) ? 0 : percent}%)</span>
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
