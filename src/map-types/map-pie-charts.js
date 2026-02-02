import { scaleSqrt } from 'd3-scale'
import { select, selectAll } from 'd3-selection'
import { arc, pie } from 'd3-shape'
import { extent, sum } from 'd3-array'
import { interpolateOrRd, schemeCategory10 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import * as PiechartLegend from '../legend/legend-pie-chart'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../core/utils'
import { runDorlingSimulation, stopDorlingSimulation } from '../core/dorling/dorling'
import { interpolate } from 'd3-interpolate'
import { adjustGridCartogramTextLabels } from '../core/cartograms'

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

    /** The codes of the categories to consider for the composition. */
    out.statCodes_ = undefined

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
        'statCodes_',
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
            'statCodes',
        ].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

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
        let domain = getDatasetMaxMin(map)
        if (!isNaN(domain[0])) {
            out.classifierSize_ = scaleSqrt().domain(domain).range([out.pieMinRadius_, out.pieMaxRadius_])
        }

        return out
    }

    //@override
    out.updateStyle = function () {
        try {
            if (!out.classifierSize_) return //cannot style without classifier

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

            // apply style to insets
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }

            // apply to main map
            applyStyleToMap(out)

            //dorling cartograms (not applicable for grid cartograms)
            if (out.dorling_ && !out.gridCartogram_) {
                runDorlingSimulation(out, (d) => {
                    const total = getRegionTotal(d.properties.id) || 0
                    return out.classifierSize_(total) || 0
                })
            } else {
                stopDorlingSimulation(out)
            }

            return out
        } catch (e) {
            console.error('Error in pie symbols styling: ' + e.message)
            console.error(e)
        }
    }

    /**
     * Get the appropriate anchor elements for pie charts
     * For grid cartograms: grid cells
     * For geographic maps: centroid groups
     */
    function getPieAnchors(map) {
        if (map.gridCartogram_) {
            return map.svg().selectAll('#em-grid-container .em-grid-cell')
        }
        return map.getCentroidsGroup(map).selectAll('g.em-centroid')
    }

    function applyStyleToMap(map) {
        if (out.svg_) {
            if (map.gridCartogram_) {
                // Grid cartogram mode
                applyStyleToGridCartogram(map)
            } else {
                // Geographic map mode
                //build and assign pie charts to the regions
                //collect nuts ids from g elements. TODO: find better way of sharing regions with pies
                let regionFeatures = []
                let s = map.getCentroidsGroup(map)
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
                        }
                    }
                    addPieChartsToMap(regionFeatures)

                    // Set up mouse events
                    addMouseEventsToRegions(map, regions)
                }
            }
        }
    }

    function applyStyleToGridCartogram(map) {
        // Collect region IDs from grid cells
        const regionIds = []
        const anchors = getPieAnchors(map)

        anchors.attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'pie_' + rg.properties.id
        })

        // Add pie charts to grid cells
        addPieChartsToGridCartogram(regionIds, map)

        // Add mouse events to grid shapes and charts
        addMouseEventsToGridCartogram(map)
    }

    function addPieChartsToGridCartogram(regionIds, map) {
        regionIds.forEach((regionId) => {
            const node = out.svg().select('#pie_' + regionId)
            if (node.empty()) return

            // Prepare data for pie chart
            const comp = getComposition(regionId)
            if (!comp) return

            const data = []
            for (const key in comp) data.push({ code: key, value: comp[key] })
            if (!data || data.length === 0) return

            // Clear previous chart
            node.selectAll('.em-pie').remove()

            // Get cell dimensions for positioning
            const bbox = node.node().getBBox()
            const anchorX = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.width / 2
            const anchorY = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.height / 2

            // Define radius
            const r = out.classifierSize_(getRegionTotal(regionId))
            const ir = out.pieChartInnerRadius_

            // Create chart container
            const g = node
                .append('g')
                .attr('id', 'piechart_' + regionId)
                .attr('class', 'em-pie')
                .attr('transform', `translate(${anchorX}, ${anchorY})`)

            // Make pie chart
            const pie_ = pie()
                .sort(null)
                .value((d) => d.value)
            const arcFunction = arc().innerRadius(ir).outerRadius(r)

            const chartNode = g
                .append('g')
                .attr('class', 'piechart')
                .attr('stroke', out.pieStrokeFill_)
                .attr('stroke-width', out.pieStrokeWidth_ + 'px')

            // Draw pie segments
            const pieData = pie_(data)

            chartNode
                .selectAll('path')
                .data(pieData)
                .join('path')
                .attr('fill', (d) => out.catColors_[d.data.code] || 'lightgray')
                .attr('code', (d) => d.data.code)
                .each(function (d) {
                    this._current = { startAngle: d.startAngle, endAngle: d.startAngle }
                })
                .transition()
                .delay((d, i) => i * 150)
                .duration(out.transitionDuration_)
                .attrTween('d', function (d) {
                    const interpolater = interpolate(this._current, d)
                    this._current = interpolater(1)
                    return function (t) {
                        return arcFunction(interpolater(t))
                    }
                })

            // Move chart after the shape element for proper z-ordering
            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl && shapeEl.nextSibling) {
                node.node().insertBefore(g.node(), shapeEl.nextSibling)
            }
        })

        adjustGridCartogramTextLabels({
            map,
            getAnchors: getPieAnchors,
            getRadius: (regionId) => {
                const total = getRegionTotal(regionId)
                return total ? out.classifierSize_(total) : 0
            },
        })
    }

    function addMouseEventsToGridCartogram(map) {
        const shapes = out.svg().selectAll('#em-grid-container .em-grid-cell .em-grid-shape')
        const charts = out.svg().selectAll('#em-grid-container .em-grid-cell .em-pie')

        // Helper to get region data from cell
        const getRegionData = (element) => {
            const cell = select(element.closest('.em-grid-cell'))
            return cell.datum()
        }

        // Helper to get the shape element for a cell
        const getShapeForCell = (cell) => {
            return cell.select('.em-grid-shape')
        }

        // Helper to get the chart element for a cell
        const getChartForCell = (cell) => {
            return cell.select('.piechart')
        }

        // Shared mouseover logic
        const handleMouseOver = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return

            const cell = select(this.closest('.em-grid-cell'))
            const shape = getShapeForCell(cell)
            const chart = getChartForCell(cell)

            // Highlight shape
            shape.attr('fill___', shape.style('fill'))
            shape.style('fill', out.hoverColor_)

            // Highlight chart
            if (!chart.empty()) {
                chart.style('stroke-width', out.pieStrokeWidth_ + 1).style('stroke', 'black')
            }

            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
        }

        // Shared mousemove logic
        const handleMouseMove = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return
            if (out._tooltip) out._tooltip.mousemove(e)
        }

        // Shared mouseout logic
        const handleMouseOut = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return

            const cell = select(this.closest('.em-grid-cell'))
            const shape = getShapeForCell(cell)
            const chart = getChartForCell(cell)

            // Restore shape fill
            shape.style('fill', shape.attr('fill___') || '')
            shape.attr('fill___', null)

            // Restore chart
            if (!chart.empty()) {
                chart.style('stroke-width', out.pieStrokeWidth_).style('stroke', out.pieStrokeFill_)
            }

            if (out._tooltip) out._tooltip.mouseout()
        }

        // Attach events to shapes
        shapes.on('mouseover', handleMouseOver).on('mousemove', handleMouseMove).on('mouseout', handleMouseOut)

        // Attach events to charts
        charts.style('pointer-events', 'all').on('mouseover', handleMouseOver).on('mousemove', handleMouseMove).on('mouseout', handleMouseOut)
    }

    function addMouseEventsToRegions(map, regions) {
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

            // create svg for pie chart
            // can be more than one center point for each nuts ID (e.g. Malta when included in insets)
            let nodes = out.svg().selectAll('#pie_' + regionId)

            // define radius
            const r = out.classifierSize_(getRegionTotal(regionId))
            const ir = out.pieChartInnerRadius_

            //make pie chart. See https://observablehq.com/@d3/pie-chart
            const pie_ = pie()
                .sort(null)
                .value((d) => d.value)
            const arcFunction = arc().innerRadius(ir).outerRadius(r)

            const chartsnodes = nodes
                .append('g')
                .attr('class', 'piechart')
                .attr('stroke', out.pieStrokeFill_)
                .attr('stroke-width', out.pieStrokeWidth_ + 'px')
                .style('pointer-events', 'none') // optional: block during transition

            // Draw pie segments
            const pieData = pie_(data)

            const paths = chartsnodes
                .selectAll('path')
                .data(pieData)
                .join('path')
                .attr('fill', (d) => out.catColors_[d.data.code] || 'lightgray')
                .attr('code', (d) => d.data.code)

                .each(function (d) {
                    this._current = { startAngle: d.startAngle, endAngle: d.startAngle }
                }) // start collapsed
                .transition()
                .delay((d, i) => i * 150) // progressive segment delay
                .duration(out.transitionDuration_)
                .attrTween('d', function (d) {
                    const interpolater = interpolate(this._current, d)
                    this._current = interpolater(1)
                    return function (t) {
                        return arcFunction(interpolater(t))
                    }
                })
                .on('end', function () {
                    select(chartsnodes.node()).style('pointer-events', null) // enable interaction after last slice
                })

            // add mouse events to pies
            chartsnodes
                .on('mouseover', function (e, rg) {
                    const parent = select(this)
                    parent.style('stroke-width', out.pieStrokeWidth_ + 1).style('stroke', 'black')
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                })
                .on('mousemove', function (e) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    const parent = select(this)
                    parent.style('stroke-width', out.pieStrokeWidth_).style('stroke', out.pieStrokeFill_)
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
    function getDatasetMaxMin(map) {
        let totals = []
        let sel

        if (map && map.gridCartogram_) {
            // For grid cartograms, get data from grid cells
            sel = getPieAnchors(map).data()
        } else {
            // For geographic maps, get data from centroids
            sel = out.getCentroidsGroup(out).selectAll('g.em-centroid').data()
        }

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
            <span class="em-breakdown-value">${item.value?.toFixed ? spaceAsThousandSeparator(item.value) : 0} (${isNaN(percent) ? 0 : percent}%)</span>
        </div>
    `
        }

        // Total (always last, no percentage)
        if (total !== undefined && total !== null) {
            const unit = out.statData(out.statCodes_[0]).unitText() || ''
            html += `
        <div class="em-breakdown-item em-total">
            <span class="em-breakdown-label">Total</span>
            <span class="em-breakdown-value">${spaceAsThousandSeparator(total)} ${unit}</span>
        </div>
    `
        }

        html += `</div>`

        return html
    }

    out.tooltip_.textFunction = pieChartTooltipFunction

    return out
}
