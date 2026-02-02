import { scaleSqrt } from 'd3-scale'
import { select } from 'd3-selection'
import { schemeCategory10 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import * as WaffleChartLegend from '../legend/legend-waffle-chart'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../core/utils'
import { runDorlingSimulation, stopDorlingSimulation } from '../core/dorling/dorling'
import { adjustGridCartogramTextLabels } from '../core/cartograms'

/**
 * Returns a proportional waffle chart map.
 * Waffle charts display composition as a grid of small squares,
 * where each square represents a portion of the whole.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true, 'waffle')

    out.dorling_ = config?.dorling || false
    out.animateDorling_ = true

    // waffle chart sizing
    out.waffleMinSize_ = 10 // minimum waffle chart size (width/height)
    out.waffleMaxSize_ = 30 // maximum waffle chart size (width/height)
    out.waffleGridSize_ = 10 // number of cells per row/column (10x10 = 100 cells = percentages)
    out.waffleCellPadding_ = 0.5 // padding between cells in pixels
    out.waffleStrokeFill_ = 'white'
    out.waffleStrokeWidth_ = 0.2
    out.waffleRoundedCorners_ = 1 // corner radius for cells

    // tooltip waffle chart
    out.waffleTooltipSize_ = 80

    //colors - indexed by category code
    out.catColors_ = undefined
    //labels - indexed by category code
    out.catLabels_ = undefined

    // 'other' section for when 'out.waffleTotalCode_' is defined
    out.waffleOtherColor_ = '#FFCC80'
    out.waffleOtherText_ = 'Other'

    //show waffle charts only when data for all categories is complete.
    out.showOnlyWhenComplete_ = false

    out.classifierSize_ = null //d3 scale for scaling waffle sizes
    out.statWaffle_ = null
    /** The code of the "total" category in the eurostat database */
    out.waffleTotalCode_ = undefined

    /** The codes of the categories to consider for the composition. */
    out.statCodes_ = undefined

    /**
     * Definition of getters/setters for all previously defined attributes.
     */
    ;[
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'waffleMaxSize_',
        'waffleMinSize_',
        'waffleGridSize_',
        'waffleCellPadding_',
        'waffleOtherColor_',
        'waffleOtherText_',
        'waffleStrokeFill_',
        'waffleStrokeWidth_',
        'waffleRoundedCorners_',
        'waffleTooltipSize_',
        'dorling_',
        'animateDorling_',
        'waffleTotalCode_',
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
            'waffleMaxSize',
            'waffleMinSize',
            'waffleGridSize',
            'waffleCellPadding',
            'waffleOtherColor',
            'waffleOtherText',
            'waffleStrokeFill',
            'waffleStrokeWidth',
            'waffleRoundedCorners',
            'statCodes',
        ].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

    /**
     * A function to define a waffle chart map easily, without repetition of information.
     * Only for eurobase data sources.
     *
     * @param {Object} config Configuration object with the following properties:
     * @param {String} config.eurostatDatasetCode - The Eurostat dataset code
     * @param {Object} config.filters - Filters for the Eurostat API query
     * @param {String} [config.unitText] - Optional unit text for display
     * @param {String} config.categoryParameter - The dimension/parameter for the composition categories
     * @param {Array} config.categoryCodes - The category codes of the composition
     * @param {Array} [config.categoryLabels] - Optional labels for the category codes
     * @param {Array} [config.categoryColors] - Optional colors for the categories
     * @param {String} [config.totalCode] - Optional category code of the total (for calculating "other")
     *
     * @example
     * .statWaffle({
     *     eurostatDatasetCode: 'demo_pjan',
     *     filters: { sex: 'T' },
     *     unitText: 'Population',
     *     categoryParameter: 'age',
     *     categoryCodes: ['Y_LT15', 'Y15-64', 'Y_GE65'],
     *     categoryLabels: ['Under 15', '15-64', '65+'],
     *     categoryColors: ['#4daf4a', '#377eb8', '#e41a1c'],
     *     totalCode: 'TOTAL',
     * })
     */
    out.statWaffle = function (config) {
        const { eurostatDatasetCode, filters, unitText, categoryParameter, categoryCodes, categoryLabels, categoryColors, totalCode } = config

        // Validate required parameters
        if (!eurostatDatasetCode) {
            console.error('statWaffle: eurostatDatasetCode is required')
            return out
        }
        if (!categoryParameter) {
            console.error('statWaffle: categoryParameter is required')
            return out
        }
        if (!categoryCodes || !categoryCodes.length) {
            console.error('statWaffle: categoryCodes array is required')
            return out
        }

        // Base filters (clone to avoid mutation)
        const baseFilters = filters ? { ...filters } : {}

        // Add one dataset (stat) config for each category code
        for (let i = 0; i < categoryCodes.length; i++) {
            const code = categoryCodes[i]

            // Build stat config for this category
            const statConfig = {
                eurostatDatasetCode,
                unitText,
                filters: {
                    ...baseFilters,
                    [categoryParameter]: code,
                },
            }

            // Register the stat
            out.stat(code, statConfig)

            // Assign color if specified
            if (categoryColors && categoryColors[i]) {
                out.catColors_ = out.catColors_ || {}
                out.catColors_[code] = categoryColors[i]
            }

            // Assign label if specified
            if (categoryLabels && categoryLabels[i]) {
                out.catLabels_ = out.catLabels_ || {}
                out.catLabels_[code] = categoryLabels[i]
            }
        }

        // Set statCodes
        out.statCodes_ = categoryCodes

        // Set total code if provided
        if (totalCode) {
            out.waffleTotalCode_ = totalCode

            // Build stat config for total
            const totalStatConfig = {
                eurostatDatasetCode,
                unitText,
                filters: {
                    ...baseFilters,
                    [categoryParameter]: totalCode,
                },
            }

            out.stat(totalCode, totalStatConfig)
        } else {
            out.waffleTotalCode_ = undefined
        }

        return out
    }

    //@override
    out.updateClassification = function () {
        // apply classification to all insets
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
            out.statCodes_ = Object.keys(out.statData_)
            const index = out.statCodes_.indexOf('default')
            if (index > -1) out.statCodes_.splice(index, 1)
        }

        //define size scaling function
        let domain = getDatasetMaxMin(map)
        if (!isNaN(domain[0])) {
            out.classifierSize_ = scaleSqrt().domain(domain).range([out.waffleMinSize_, out.waffleMaxSize_])
        }

        return out
    }

    //@override
    out.updateStyle = function () {
        try {
            if (!out.classifierSize_) return

            //if not specified, build default color ramp
            if (!out.catColors_) {
                out.catColors({})
                for (let i = 0; i < out.statCodes_.length; i++) {
                    out.catColors_[out.statCodes_[i]] = schemeCategory10[i % 10]
                }
            }
            if (out.waffleTotalCode_) {
                out.catColors_['other'] = out.waffleOtherColor_
                out.catLabels_['other'] = out.waffleOtherText_
            }

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
                    return out.classifierSize_(total) / 2 || 0 // use half of waffle size as "radius"
                })
            } else {
                stopDorlingSimulation(out)
            }

            return out
        } catch (e) {
            console.error('Error in waffle chart styling: ' + e.message)
            console.error(e)
        }
    }

    /**
     * Get the appropriate anchor elements for waffle charts
     */
    function getWaffleAnchors(map) {
        if (map.gridCartogram_) {
            return map.svg().selectAll('#em-grid-container .em-grid-cell')
        }
        return map.getCentroidsGroup(map).selectAll('g.em-centroid')
    }

    function applyStyleToMap(map) {
        if (out.svg_) {
            if (map.gridCartogram_) {
                applyStyleToGridCartogram(map)
            } else {
                // Geographic map mode
                let regionFeatures = []
                let s = map.getCentroidsGroup(map)
                if (s) {
                    let sym = s.selectAll('g.em-centroid')
                    sym.append('g')
                        .attr('class', 'em-waffle')
                        .attr('id', (rg) => {
                            regionFeatures.push(rg)
                            return 'waffle_' + rg.properties.id
                        })

                    const selector = getRegionsSelector(out)
                    let regions = out.svg().selectAll(selector)

                    if (map.geo_ !== 'WORLD') {
                        if (map.nutsLevel_ == 'mixed') {
                            styleMixedNUTSRegions(map, regions)
                        }
                    }
                    addWaffleChartsToMap(regionFeatures)

                    addMouseEventsToRegions(map, regions)
                }
            }
        }
    }

    function applyStyleToGridCartogram(map) {
        const regionIds = []
        const anchors = getWaffleAnchors(map)

        anchors.attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'waffle_' + rg.properties.id
        })

        addWaffleChartsToGridCartogram(regionIds, map)
        addMouseEventsToGridCartogram(map)
    }

    /**
     * Generate waffle chart cell data from composition
     * Returns array of {row, col, code, color} for each cell
     */
    function generateWaffleCells(comp, gridSize) {
        const totalCells = gridSize * gridSize
        const cells = []

        // Convert composition to cell counts
        const cellCounts = []
        let assignedCells = 0

        const codes = Object.keys(comp)
        for (let i = 0; i < codes.length; i++) {
            const code = codes[i]
            const proportion = comp[code]
            // Round to nearest cell count, ensuring we don't exceed total
            let count = Math.round(proportion * totalCells)
            if (i === codes.length - 1) {
                // Last category gets remaining cells to ensure we fill the grid
                count = totalCells - assignedCells
            }
            count = Math.max(0, Math.min(count, totalCells - assignedCells))
            cellCounts.push({ code, count })
            assignedCells += count
        }

        // Fill cells row by row (bottom to top, left to right for traditional waffle look)
        let cellIndex = 0
        for (const { code, count } of cellCounts) {
            for (let i = 0; i < count && cellIndex < totalCells; i++) {
                const row = Math.floor(cellIndex / gridSize)
                const col = cellIndex % gridSize
                cells.push({
                    row: gridSize - 1 - row, // flip so fill goes bottom-up
                    col,
                    code,
                    color: out.catColors_[code] || 'lightgray',
                })
                cellIndex++
            }
        }

        return cells
    }

    function addWaffleChartsToGridCartogram(regionIds, map) {
        const gridSize = out.waffleGridSize_
        const padding = out.waffleCellPadding_

        regionIds.forEach((regionId) => {
            const node = out.svg().select('#waffle_' + regionId)
            if (node.empty()) return

            const comp = getComposition(regionId)
            if (!comp) return

            // Clear previous chart
            node.selectAll('.em-waffle').remove()

            // Get cell dimensions for positioning
            const bbox = node.node().getBBox()
            const anchorX = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.width / 2
            const anchorY = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.height / 2

            // Calculate waffle size based on data
            const total = getRegionTotal(regionId)
            const waffleSize = out.classifierSize_(total)
            const cellSize = (waffleSize - padding * (gridSize - 1)) / gridSize

            // Generate cell data
            const cells = generateWaffleCells(comp, gridSize)

            // Create chart container
            const g = node
                .append('g')
                .attr('id', 'wafflechart_' + regionId)
                .attr('class', 'em-waffle')
                .attr('transform', `translate(${anchorX - waffleSize / 2}, ${anchorY - waffleSize / 2})`)

            const chartNode = g
                .append('g')
                .attr('class', 'wafflechart')
                .attr('stroke', out.waffleStrokeFill_)
                .attr('stroke-width', out.waffleStrokeWidth_ + 'px')

            // Draw cells with animation
            chartNode
                .selectAll('rect')
                .data(cells)
                .join('rect')
                .attr('x', (d) => d.col * (cellSize + padding))
                .attr('y', (d) => d.row * (cellSize + padding))
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('rx', out.waffleRoundedCorners_)
                .attr('ry', out.waffleRoundedCorners_)
                .attr('fill', (d) => d.color)
                .attr('code', (d) => d.code)
                .attr('opacity', 0)
                .transition()
                .delay((d, i) => i * 5) // staggered animation
                .duration(out.transitionDuration_ / 2)
                .attr('opacity', 1)

            // Move chart after the shape element for proper z-ordering
            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl && shapeEl.nextSibling) {
                node.node().insertBefore(g.node(), shapeEl.nextSibling)
            }
        })

        // adjustGridCartogramTextLabels({
        //     map,
        //     getAnchors: getWaffleAnchors,
        //     getRadius: (regionId) => {
        //         const total = getRegionTotal(regionId)
        //         return total ? out.classifierSize_(total) / 2 : 0
        //     },
        // })
    }

    function addMouseEventsToGridCartogram(map) {
        const shapes = out.svg().selectAll('#em-grid-container .em-grid-cell .em-grid-shape')
        const charts = out.svg().selectAll('#em-grid-container .em-grid-cell .em-waffle')

        const getRegionData = (element) => {
            const cell = select(element.closest('.em-grid-cell'))
            return cell.datum()
        }

        const getShapeForCell = (cell) => cell.select('.em-grid-shape')
        const getChartForCell = (cell) => cell.select('.wafflechart')

        const handleMouseOver = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return

            const cell = select(this.closest('.em-grid-cell'))
            const shape = getShapeForCell(cell)
            const chart = getChartForCell(cell)

            shape.attr('fill___', shape.style('fill'))
            shape.style('fill', out.hoverColor_)

            if (!chart.empty()) {
                chart.style('stroke-width', out.waffleStrokeWidth_ + 0.5).style('stroke', 'black')
            }

            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
        }

        const handleMouseMove = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return
            if (out._tooltip) out._tooltip.mousemove(e)
        }

        const handleMouseOut = function (e) {
            const rg = getRegionData(this)
            if (!rg) return
            const regionId = rg.properties.id
            if (!getRegionTotal(regionId)) return

            const cell = select(this.closest('.em-grid-cell'))
            const shape = getShapeForCell(cell)
            const chart = getChartForCell(cell)

            shape.style('fill', shape.attr('fill___') || '')
            shape.attr('fill___', null)

            if (!chart.empty()) {
                chart.style('stroke-width', out.waffleStrokeWidth_).style('stroke', out.waffleStrokeFill_)
            }

            if (out._tooltip) out._tooltip.mouseout()
        }

        shapes.on('mouseover', handleMouseOver).on('mousemove', handleMouseMove).on('mouseout', handleMouseOut)
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

    function addWaffleChartsToMap(regionFeatures) {
        const gridSize = out.waffleGridSize_
        const padding = out.waffleCellPadding_

        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            const comp = getComposition(regionId)

            if (!comp) return

            let nodes = out.svg().selectAll('#waffle_' + regionId)

            const total = getRegionTotal(regionId)
            const waffleSize = out.classifierSize_(total)
            const cellSize = (waffleSize - padding * (gridSize - 1)) / gridSize

            const cells = generateWaffleCells(comp, gridSize)

            const chartsnodes = nodes
                .append('g')
                .attr('class', 'wafflechart')
                .attr('transform', `translate(${-waffleSize / 2}, ${-waffleSize / 2})`)
                .attr('stroke', out.waffleStrokeFill_)
                .attr('stroke-width', out.waffleStrokeWidth_ + 'px')
                .style('pointer-events', 'none')

            chartsnodes
                .selectAll('rect')
                .data(cells)
                .join('rect')
                .attr('x', (d) => d.col * (cellSize + padding))
                .attr('y', (d) => d.row * (cellSize + padding))
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('rx', out.waffleRoundedCorners_)
                .attr('ry', out.waffleRoundedCorners_)
                .attr('fill', (d) => d.color)
                .attr('code', (d) => d.code)
                .attr('opacity', 0)
                .transition()
                .delay((d, i) => i * 5)
                .duration(out.transitionDuration_ / 2)
                .attr('opacity', 1)
                .on('end', function () {
                    select(chartsnodes.node()).style('pointer-events', null)
                })

            // Mouse events for waffle charts
            chartsnodes
                .on('mouseover', function (e, rg) {
                    const parent = select(this)
                    parent.style('stroke-width', out.waffleStrokeWidth_ + 0.5).style('stroke', 'black')
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                })
                .on('mousemove', function (e) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    const parent = select(this)
                    parent.style('stroke-width', out.waffleStrokeWidth_).style('stroke', out.waffleStrokeFill_)
                    if (out._tooltip) out._tooltip.mouseout()
                })
        })
    }

    function styleMixedNUTSRegions(map, regions) {
        regions.each(function (rg) {
            const sel = select(this)

            if (this.parentNode.classList.contains('em-cntrg')) return

            const comp = getComposition(rg.properties.id)
            const hasData = comp

            let display = hasData ? (map.geo_ === 'WORLD' ? 'block' : null) : 'none'
            let stroke = null
            let strokeWidth = null

            if (hasData) {
                const lvl = sel.attr('lvl')
                if (lvl !== '0') {
                    stroke = sel.style('stroke') || '#777'
                    if (map.geo_ === 'WORLD') {
                        strokeWidth = sel.style('stroke-width') || '#777'
                    }
                }
            }

            sel.style('display', display).style('stroke', stroke).style('stroke-width', strokeWidth)
        })
    }

    /**
     * Compute composition for region id
     */
    const getComposition = function (id) {
        const comp = {}
        let sum = 0
        const codes = out.statCodes_

        for (let i = 0; i < codes.length; i++) {
            const sc = codes[i]
            const s = out.statData(sc).get(id)
            const val = s?.value

            if (val === null || val === undefined || isNaN(val)) {
                if (out.showOnlyWhenComplete()) return undefined
                continue
            }

            comp[sc] = val
            sum += val
        }

        if (out.waffleTotalCode_) {
            const totalData = out.statData(out.waffleTotalCode_)
            const totalEntry = totalData.get(id)
            const totalVal = totalEntry?.value

            if (totalVal === null || totalVal === undefined || isNaN(totalVal)) {
                sum = 0
            } else {
                sum = totalVal
            }
        }

        if (!sum || isNaN(sum)) return undefined

        for (const sc of codes) {
            if (comp[sc] !== undefined) {
                comp[sc] /= sum
            }
        }

        if (out.waffleTotalCode_) {
            const totalPerc = Object.values(comp).reduce((a, b) => a + b, 0)
            comp['other'] = Math.max(0, 1 - totalPerc)
        }

        return comp
    }

    /**
     * Get dataset max/min for sizing
     */
    function getDatasetMaxMin(map) {
        let totals = []
        let sel

        if (map && map.gridCartogram_) {
            sel = getWaffleAnchors(map).data()
        } else {
            sel = out.getCentroidsGroup(out).selectAll('g.em-centroid').data()
        }

        sel.forEach((rg) => {
            let id = rg.properties.id
            let total = getRegionTotal(id)
            if (total) {
                totals.push(total)
            }
        })

        let minmax = [Math.min(...totals), Math.max(...totals)]
        return minmax
    }

    /**
     * Get total value for a region
     */
    const getRegionTotal = function (id) {
        let sum = 0
        let s
        if (out.waffleTotalCode_) {
            const totalData = out.statData(out.waffleTotalCode_)
            s = totalData.get(id)
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) {
                    sum = undefined
                }
            } else {
                sum = s.value
            }
        } else {
            for (let i = 0; i < out.statCodes_.length; i++) {
                const sc = out.statCodes_[i]
                s = out.statData(sc).get(id)
                if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                    if (out.showOnlyWhenComplete()) return undefined
                    else continue
                }
                sum += s.value
            }
        }

        if (sum == 0) return undefined
        return sum
    }

    //@override
    out.getLegendConstructor = function () {
        return WaffleChartLegend.legend
    }

    // Tooltip function for waffle charts
    const waffleChartTooltipFunction = function (rg, map) {
        const tooltipGridSize = 10
        const tooltipPadding = 1
        const chartSize = out.waffleTooltipSize_ || 100
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const comp = getComposition(regionId)

        let html = ''
        html += `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        if (!comp) {
            html += `<div>${out.noDataText()}</div>`
            return html
        }

        // Generate tooltip waffle
        const cells = generateWaffleCells(comp, tooltipGridSize)
        const cellSize = (chartSize - tooltipPadding * (tooltipGridSize - 1)) / tooltipGridSize

        // Padding inside the container
        const containerPadding = 10

        let rects = ''
        for (const cell of cells) {
            const x = containerPadding + cell.col * (cellSize + tooltipPadding)
            const y = containerPadding + cell.row * (cellSize + tooltipPadding)
            rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" 
                      fill="${cell.color}" stroke="white" stroke-width="0.5" rx="1" ry="1"/>`
        }

        // Total SVG size including padding
        const svgSize = chartSize + containerPadding * 2

        const svg = `
        <div class='em-tooltip-wafflechart-container'>
            <svg viewBox="0 0 ${svgSize} ${svgSize}" width="${chartSize}" style="display:block;">
                ${rects}
            </svg>
        </div>
        `
        html += svg

        // Breakdown
        html += `<div class="em-tooltip-breakdown">`

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

        for (const item of breakdownData) {
            const percent = total ? ((item.value / total) * 100).toFixed(0) : 0
            html += `
            <div class="em-breakdown-item">
                <span class="em-breakdown-color" style="background:${item.color}"></span>
                <span class="em-breakdown-label">${item.label}</span>
                <span class="em-breakdown-value">${spaceAsThousandSeparator(item.value)} (${isNaN(percent) ? 0 : percent}%)</span>
            </div>
            `
        }

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

    out.tooltip_.textFunction = waffleChartTooltipFunction

    return out
}
