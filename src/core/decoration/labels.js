import { select } from 'd3-selection'
import { spaceAsThousandSeparator, executeForAllInsets, ensureGroup, getTextColorForBackground, compactFormatter } from '../utils'

// handles all map labels e.g. stat values, or labels specified in map.labels({labels:[text:'myLabel', x:123, y: 123]})

/** Minimum font size (px) for labels inside proportional symbols.
 *  If the radius-derived size falls below this, the label overflows outside the circle. */
const PS_LABEL_MIN_FONT_SIZE = 9
const PS_LABEL_OVERFLOW_FONT_SIZE = 11 //  when overflowing outside circle

const labelsHaveHalos = (labelsConfig) => !!(labelsConfig?.halos ?? labelsConfig?.shadows)

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * @function addLabelsToMap
 * @param map eurostatmap map instance
 * @param zg zoomgroup (d3 selection of zoomable elements)
 * @description appends text labels to the map. Labels can be countries, country codes, ocean names or statistical values
 */
export const addLabelsToMap = function (map, zg) {
    if (!map.labels_.config) map.labels_.config = DEFAULTLABELS
    if (!map.labels_.statLabelsPositions) map.labels_.statLabelsPositions = DEFAULTSTATLABELPOSITIONS

    map._statLabelFormatter = map.labels_.valuesFormatter ? map.labels_.valuesFormatter : spaceAsThousandSeparator

    let existing = zg.select('#em-labels')
    let labelsContainer = existing.empty() ? zg.append('g').attr('id', 'em-labels').attr('class', 'em-labels') : existing

    if (map.labels_?.values && map._mapType !== 'ps') appendStatLabelCentroidsToMap(map, labelsContainer)

    let labelsArray = map.labels_?.labels || DEFAULTLABELS[`${map.geo}_${map.proj_}.cc`]

    if (labelsArray) {
        const halog = ensureGroup(labelsContainer, 'em-label-halos')
        const labelg = ensureGroup(labelsContainer, 'em-labels')

        if (labelsHaveHalos(map.labels_)) {
            halog
                .selectAll('text')
                .data(labelsArray)
                .enter()
                .append('text')
                .attr('id', (d) => 'em-label-halo-' + d.text.replace(/\s+/g, '-'))
                .attr('class', (d) => 'em-label-halo em-label-halo-' + d.class)
                .attr('x', (d) => (d.rotate ? 0 : map._projection([d.x, d.y])[0]))
                .attr('y', (d) => (d.rotate ? 0 : map._projection([d.x, d.y])[1]))
                .attr('dy', -7)
                .attr('transform', (d) => {
                    if (d.rotate) {
                        const [x, y] = map._projection([d.x, d.y])
                        return `translate(${x},${y}) rotate(${d.rotate})`
                    }
                    return 'rotate(0)'
                })
                .text((d) => d.text)
        }

        labelg
            .selectAll('text')
            .data(labelsArray)
            .enter()
            .append('text')
            .attr('id', (d) => 'em-label-' + d.text.replace(/\s+/g, '-'))
            .attr('class', (d) => 'em-label em-label-' + d.class)
            .attr('x', (d) => (d.rotate ? 0 : map._projection([d.x, d.y])[0]))
            .attr('y', (d) => (d.rotate ? 0 : map._projection([d.x, d.y])[1]))
            .attr('dy', -7)
            .attr('transform', (d) => {
                if (d.rotate) {
                    const [x, y] = map._projection([d.x, d.y])
                    return `translate(${x},${y}) rotate(${d.rotate})`
                }
                return 'rotate(0)'
            })
            .text((d) => d.text)
    }
}

/**
 * @function appendLabelsToSymbols
 * @description Appends stat value labels and/or country-code labels to proportional symbol circles.
 *   Labels are formatted with map._statLabelFormatter (same as choropleth stat labels).
 *   When the radius-derived font size would fall below PS_LABEL_MIN_FONT_SIZE the label
 *   overflows outside the circle rather than becoming illegibly tiny.
 *   Halos are rendered when map.labels_.halos is truthy, consistent with choropleth behaviour.
 */
export const appendLabelsToSymbols = function (map, sizeData, out) {
    // Ensure the formatter is set (mirrors the guard in addLabelsToMap / updateLabels)
    const formatter = out.labels_?.valuesFormatter ? out.labels_.valuesFormatter : compactFormatter.format

    const symbolContainers = map.svg().selectAll('g.em-centroid')
    const hasStatLabels = !!out.labels_?.values
    const hasHalos = labelsHaveHalos(out.labels_)

    // ── helpers ──────────────────────────────────────────────────────────────

    const getRadius = (d) => {
        const datum = sizeData.get(d.properties.id)
        return datum ? out.classifierSize_(+datum.value) : 0
    }

    const validRegions = (sel) =>
        sel.filter((d) => {
            const datum = sizeData.get(d.properties.id)
            return datum?.value !== ':' && datum?.value != null
        })

    const STAT_FACTOR = 0.4
    let CODE_FACTOR = out.psCodeLabels_ ? (hasStatLabels ? 0.8 : 0.9) : null
    if (out.psCodeLabels_ && out.psShape_ === 'square') CODE_FACTOR -= 0.4

    const isOverflowing = (radius, factor) => radius * factor < PS_LABEL_MIN_FONT_SIZE

    // ── country-code labels ───────────────────────────────────────────────────

    if (out.psCodeLabels_) {
        let factor = hasStatLabels ? 0.9 : 0.9
        if (out.psShape_ === 'square') factor -= 0.4

        const appendCodeLabel = (container, isHalo) =>
            validRegions(container)
                .append('text')
                .attr('class', (d) => {
                    const overflow = isOverflowing(getRadius(d), CODE_FACTOR)
                    const base = isHalo ? 'em-circle-code-label-halo' : 'em-circle-code-label'
                    return overflow ? `${base} em-code-overflowing` : base
                })
                .text((d) => {
                    const datum = sizeData.get(d.properties.id)
                    return datum?.value === ':' ? '' : d.properties.id
                })
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-family', 'sans-serif')
                .style('font-size', (d) => {
                    const r = getRadius(d)
                    const computed = r * factor
                    return `${computed < PS_LABEL_MIN_FONT_SIZE ? PS_LABEL_OVERFLOW_FONT_SIZE : computed}px`
                })
                .attr('fill', function (d) {
                    const fill = window.getComputedStyle(this.parentNode.firstChild)?.fill
                    return getTextColorForBackground(fill)
                })
                .attr('paint-order', 'stroke')
                .attr('dominant-baseline', 'auto') // override for overflowing labels so y positions top of text
                .attr('dy', (d) => {
                    //if (isOverflowing(getRadius(d), CODE_FACTOR)) return '0.5em'
                    if (hasStatLabels && sizeData.get(d.properties.id)?.value) return '-0.3em'
                    return '0'
                })
                .style('pointer-events', 'none')

        if (hasHalos) appendCodeLabel(symbolContainers, true)
        appendCodeLabel(symbolContainers, false)
    }

    // ── stat value labels ─────────────────────────────────────────────────────

    if (hasStatLabels) {
        const appendStatLabel = (container, isHalo) =>
            validRegions(container)
                .append('text')
                .attr('class', (d) => {
                    const overflow = isOverflowing(getRadius(d), STAT_FACTOR)
                    const base = isHalo ? 'em-circle-stat-label-halo' : 'em-circle-stat-label'
                    return overflow ? `${base} em-stat-overflowing` : base
                })
                .text((d) => {
                    const datum = sizeData.get(d.properties.id)
                    if (datum?.value == null || datum.value === ':') return ''
                    return formatter(datum.value)
                })
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-family', 'sans-serif')
                .style('font-size', (d) => {
                    const r = getRadius(d)
                    return `${Math.max(r * STAT_FACTOR, PS_LABEL_MIN_FONT_SIZE)}px`
                })
                .attr('fill', function (d) {
                    if (isHalo) return 'none'
                    // const r = getRadius(d)
                    // if (isOverflowing(r, STAT_FACTOR)) return '#333333'
                    const fill = window.getComputedStyle(this.parentNode.firstChild)?.fill || out.psFill_
                    return getTextColorForBackground(fill)
                })
                .attr('stroke', (d) => {
                    if (!isHalo) return 'none'
                    // Only halo overflowing labels — inside labels have contrast already
                    return isOverflowing(getRadius(d), STAT_FACTOR) ? '#3333335e' : 'none'
                })
                .attr('stroke-width', (d) => {
                    if (!isHalo) return 0
                    return isOverflowing(getRadius(d), STAT_FACTOR) ? 3 : 0
                })
                .attr('paint-order', 'stroke')
                .attr('dy', () => (out.psCodeLabels_ ? '0.8em' : '0'))
                // .attr('y', (d) => {
                //     const r = getRadius(d)
                //     if (!isOverflowing(r, STAT_FACTOR)) return null
                //     return out.psCodeLabels_ ? r + PS_LABEL_OVERFLOW_FONT_SIZE : -(r + PS_LABEL_OVERFLOW_FONT_SIZE * 0.5)
                // })
                .style('pointer-events', 'none')

        if (hasHalos) appendStatLabel(symbolContainers, true)
        appendStatLabel(symbolContainers, false)
    }
}

/**
 * Add labels for data points.
 * @param {Object} svg - D3 selection of the SVG element.
 */
export function addFlowValueLabels(out, svg) {
    // use existing or append new container
    let existing = svg.select('#em-labels')
    let labelsContainer = existing.empty() ? svg.append('g').attr('id', 'em-labels') : existing
    // Filter the nodes
    const nodes = out.flowGraph_.nodes
    const filteredNodes = nodes.filter((node) => node.targetLinks && node.sourceLinks.length === 0)
    // create or reuse container
    const container = ensureGroup(labelsContainer, 'em-flow-labels')

    // Add halo effect
    if (labelsHaveHalos(out.labels_)) {
        const labelsHaloGroup = container.append('g').attr('class', 'em-flow-label-halo')
        labelsHaloGroup
            .selectAll('text')
            .data(filteredNodes)
            .join('text')
            .attr('text-anchor', (d) => (d.x > d.targetLinks[0].source.x ? 'start' : 'end'))
            .attr('x', (d) => (d.x > d.targetLinks[0].source.x ? d.x + out.flowLabelOffsets_.x : d.x - out.flowLabelOffsets_.x))
            .attr('y', (d) => d.y + out.flowLabelOffsets_.y)
            .text((d) => out._statLabelFormatter(d.value))
    }

    // Add labels
    const labelsGroup = container.append('g').attr('class', 'em-flow-label')
    //add background
    // Add background rectangles and text
    const labelElements = labelsGroup
        .selectAll('g') // Use a group for each label to combine rect and text
        .data(filteredNodes)
        .join('g') // Append a group for each label
        .attr('transform', (d) => `translate(${d.x}, ${d.y})`) // Position group at the node

    // Add text first to calculate its size
    labelElements
        .append('text')
        .attr('class', 'em-label-text')
        .attr('text-anchor', (d) => (d.x > d.targetLinks[0].source.x ? 'start' : 'end'))
        .attr('x', (d) => (d.x > d.targetLinks[0].source.x ? out.flowLabelOffsets_.x : -out.flowLabelOffsets_.x))
        .attr('y', out.flowLabelOffsets_.y)
        .text((d) => out._statLabelFormatter(d.value))

    // Add background rectangles after text is rendered

    if (out.labels_.backgrounds) {
        labelElements.each(function () {
            const textElement = select(this).select('text')
            const bbox = textElement.node().getBBox() // Get bounding box of the text

            const paddingX = 5 // Horizontal padding
            const paddingY = 2 // Vertical padding

            // Add rectangle centered behind the text
            select(this)
                .insert('rect', 'text') // Insert rect before text in DOM
                .attr('class', 'em-label-background')
                .attr('x', bbox.x - paddingX)
                .attr('y', bbox.y - paddingY)
                .attr('width', bbox.width + 2 * paddingX)
                .attr('height', bbox.height + 2 * paddingY)
        })
    }
}

/**
 * @function updateLabels
 * @description update existing map labels
 */
export const updateLabels = function (map) {
    if (map.svg_) {
        // Clear previous labels
        let prevLabels = map.svg_.selectAll('#em-labels > *')
        if (prevLabels) prevLabels.remove()

        // Main map
        if (map.labels_) {
            const masterConfig = map.labels_
            let zg = map.svg_.select('#em-zoom-group-' + map.svgId_)
            addLabelsToMap(map, zg)
            if (masterConfig.values && map.updateValuesLabels) {
                map.updateValuesLabels(map)
            }

            // Define the callback to apply to each inset
            const applyLabelsCallback = (map) => {
                if (masterConfig) {
                    let zg = map.svg_.select('#em-zoom-group-' + map.svgId_)
                    if (map.labels_) addLabelsToMap(map, zg)
                    if (masterConfig.values && map.updateValuesLabels) {
                        map.updateValuesLabels(map)
                    }
                }
            }

            // Apply labels to all insets using the executeForAllInsets function
            if (map.insetTemplates_) {
                executeForAllInsets(map.insetTemplates_, map.svgId_, applyLabelsCallback)
            }
        }
    }
}

/**
 * @description update the statistical values labels on the map
 * @param {Object} map eurostat-map map instance
 * @return {map} out
 * NOTE: THIS FUNCTION IS NOT CALLED FOR PROPORTIONAL SYMBOL MAPS
 */
export const updateValuesLabels = function (map) {
    if (!map) {
        console.warn('No map specified')
        return
    }

    //clear previous labels
    let prevLabels = map.svg_.selectAll('g.em-stat-label > *')
    prevLabels.remove()
    let prevHalos = map.svg_.selectAll('g.em-stat-label-halo > *')
    prevHalos.remove()
    let statLabels = map.svg_.selectAll('g.em-stat-label')

    // filter stat-label elements to only show those with data
    const filterFunction = map.labels_?.statLabelsFilterFunction ? map.labels_?.statLabelsFilterFunction : defaultStatLabelFilter
    const statData = map.statData()
    statLabels
        .filter((rg) => filterFunction(rg, map))
        // .append('text')
        .each(function (d) {
            const sel = select(this)
            const labelText = statLabelsTextFunction(d, statData, map) // Use 'd' directly for the label text

            // Append rectangle behind label
            if (map.labels_.backgrounds) appendRect(labelText, sel)

            // Append text after the rectangle
            sel.append('text').text(labelText).attr('class', 'em-stat-label-text')
        })

    // Function to append a rectangle behind the label
    function appendRect(labelText, container) {
        const paddingX = 5 // Add some padding around the text
        const paddingY = 2 // Add some padding around the text

        // Create a temporary text element to get the size
        const bbox = container
            .append('text')
            .attr('visibility', 'hidden') // Make the temporary text invisible
            .text(labelText) // Set the label text to get its bounding box
            .node()
            .getBBox() // Get the bounding box of the text

        const labelWidth = bbox.width
        const labelHeight = bbox.height

        // Remove the temporary text element after getting the bounding box
        container.select('text[visibility="hidden"]').remove()

        // Calculate the position of the rectangle to be centered on the text
        const x = -labelWidth / 2 - paddingX // Center the rect horizontally
        const y = -labelHeight / 2 - paddingY // Center the rect vertically

        // Append rectangle with padding
        container
            .append('rect')
            .attr('x', x) // Position rect horizontally
            .attr('y', y) // Position rect vertically
            .attr('width', labelWidth + 2 * paddingX) // Width of the rect with padding
            .attr('height', labelHeight + 2 * paddingY) // Height of the rect with padding
            .attr('class', 'em-label-background')
    }

    //add halos to labels
    if (labelsHaveHalos(map.labels_)) {
        map.svg_
            .selectAll('g.em-stat-label-halo')
            .filter((rg) => filterFunction(rg, map))
            .append('text')
            .text((d) => statLabelsTextFunction(d, statData, map)) // Use 'd' directly for the label text)
    }
    return map
}

/**
 * @description text function for statistical labelling
 * @param {Object} d d3 selection json data element
 * @return {string}
 */
export const statLabelsTextFunction = (d, statData, map) => {
    if (statData && statData?.get) {
        const sv = statData.get(d.properties.id)
        if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
            return ''
        } else {
            if (sv.value !== ':') {
                return map._statLabelFormatter ? map._statLabelFormatter(sv.value) : spaceAsThousandSeparator(sv.value)
            }
        }
    }
}

/**
 * @description function for filtering statistical labels
 * @param {Object} d d3 selection json data element
 * @return {boolean}
 */
const defaultStatLabelFilter = (region, map) => {
    const s = map.statData()
    const sv = s.get(region.properties.id)
    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
        return false
    } else {
        return true
    }
}

const appendStatLabelCentroidsToMap = function (map, labelsContainer) {
    //values label halos parent <g>
    // create or reuse container
    const gsls = ensureGroup(labelsContainer, 'em-stat-labels-halos')

    // values labels parent <g>
    const statLabelsGroup = ensureGroup(labelsContainer, 'em-stat-labels')

    // our features array
    let statLabelRegions = map.Geometries.getAllRegionFeatures()

    //TODO: dont add labels for regions that are not visible? what about panning and zooming though. Only really an issue for mixed NUTS.

    // stats labels
    const filteredRegions = statLabelRegions.filter((d, i, self) => i === self.findIndex((t) => t.properties.id === d.properties.id))
    statLabelsGroup
        .selectAll('g')
        .data(filteredRegions)
        .enter()
        .append('g')
        .attr('transform', function (d) {
            // use predefined label positioning
            if (map.labels_.statLabelsPositions[d.properties.id]) {
                const position = map.labels_.statLabelsPositions[d.properties.id]
                let pos = map._projection([position.x, position.y])
                let x = pos[0].toFixed(3)
                let y = pos[1].toFixed(3)
                return `translate(${x},${y})`
            } else {
                let centroid = map._pathFunction.centroid(d)

                if (map.labels_.processValueLabelCentroids) {
                    centroid = map.labels_.processValueLabelCentroids(d, centroid)
                }
                // otherwise we calculate centroids
                return 'translate(' + centroid + ')'
            }
        })
        .attr('class', 'em-stat-label')

    // stat labels halos
    if (labelsHaveHalos(map.labels_)) {
        gsls.selectAll('g')
            .data(statLabelRegions)
            .enter()
            .append('g')
            .attr('transform', function (d) {
                // use predefined label positioning
                if (map.labels_.statLabelsPositions[d.properties.id]) {
                    let pos = map._projection([
                        map.labels_.statLabelsPositions[d.properties.id].x,
                        map.labels_.statLabelsPositions[d.properties.id].y,
                    ])
                    let x = pos[0].toFixed(3)
                    let y = pos[1].toFixed(3)
                    return `translate(${x},${y})`
                } else {
                    let centroid = map._pathFunction.centroid(d)

                    if (map.labels_.processValueLabelCentroids) {
                        centroid = map.labels_.processValueLabelCentroids(d, centroid)
                    }
                    // otherwise we calculate centroids
                    return 'translate(' + centroid + ')'
                }
            })

            .attr('class', 'em-stat-label-halo')
    }
}

/**
 * Default labels for country / geographical names.
 * Using centroids would clash with proportional symbols, and are generally not ideal placements, so labels are positioned independently
 * Labels are provided for all supported languages: "en","fr" and "de" (defined using map.language())
 */
export const DEFAULTLABELS = {
    EUR_3035: {
        cc: [
            { text: 'AL', x: 5150000, y: 2060000, class: 'cc', size: 7 },
            { text: 'AT', x: 4670000, y: 2690000, class: 'cc', size: 18 },
            { text: 'BE', x: 3930000, y: 3010000, class: 'cc', size: 17 },
            { text: 'BG', x: 5567000, y: 2250000, class: 'cc', size: 22 },
            { text: 'HR', x: 4840000, y: 2480000, class: 'cc', size: 10 },
            { text: 'CY', x: 6426000, y: 1480000, class: 'cc', size: 10 },
            { text: 'CZ', x: 4707000, y: 2920000, class: 'cc', size: 18 },
            { text: 'DK', x: 4316000, y: 3621000, class: 'cc', size: 20 },
            { text: 'EE', x: 5220000, y: 3990000, class: 'cc', size: 12 },
            { text: 'FI', x: 5150000, y: 4424000, class: 'cc', size: 20 },
            { text: 'FR', x: 3767740, y: 2662817, class: 'cc', size: 22 },
            { text: 'DE', x: 4347284, y: 3093276, class: 'cc', size: 22 },
            { text: 'EL', x: 5370000, y: 1750000, class: 'cc', size: 22 },
            { text: 'HU', x: 5020000, y: 2630000, class: 'cc', size: 17 },
            { text: 'IS', x: 3040000, y: 4833000, class: 'cc', size: 10 },
            { text: 'IE', x: 3136000, y: 3394000, class: 'cc', size: 17 },
            { text: 'IT', x: 4469967, y: 2181963, class: 'cc', size: 22 },
            { text: 'LV', x: 5290000, y: 3800000, class: 'cc', size: 12 },
            { text: 'LT', x: 5190000, y: 3630000, class: 'cc', size: 12 },
            { text: 'LU', x: 4120000, y: 2940000, class: 'cc', size: 12 },
            { text: 'MT', x: 4820000, y: 1415000, class: 'cc', size: 10 },
            { text: 'ME', x: 5073000, y: 2185000, class: 'cc', size: 7 },
            { text: 'GE', x: 6942680, y: 2660000, class: 'cc' },
            { text: 'UA', x: 5890000, y: 3050000, class: 'cc' },
            { text: 'BA', x: 4949262, y: 2338688, class: 'cc' },
            { text: 'MD', x: 5740000, y: 2790000, class: 'cc' },

            { text: 'MK', x: 5300000, y: 2080000, class: 'cc', size: 10 },
            { text: 'NL', x: 4020000, y: 3208000, class: 'cc', size: 17 },
            { text: 'NO', x: 4300000, y: 4147000, class: 'cc', size: 20 },
            { text: 'PL', x: 4964000, y: 3200000, class: 'cc', size: 22 },
            { text: 'PT', x: 2770000, y: 1990000, class: 'cc', size: 18 },
            { text: 'RO', x: 5451000, y: 2600000, class: 'cc', size: 22 },
            { text: 'RS', x: 5200000, y: 2350000, class: 'cc', size: 10 },
            { text: 'SK', x: 5040000, y: 2860000, class: 'cc', size: 12 },
            { text: 'SI', x: 4675000, y: 2500000, class: 'cc', size: 10 },
            { text: 'ES', x: 3160096, y: 1900000, class: 'cc', size: 22 },
            { text: 'SE', x: 4630000, y: 4000000, class: 'cc', size: 20 },
            { text: 'CH', x: 4170000, y: 2600000, class: 'cc', size: 16 },
            { text: 'TR', x: 6510000, y: 2100000, class: 'cc', size: 22 },
            { text: 'UK', x: 3558000, y: 3250000, class: 'cc', size: 17 },
            { text: 'BY', x: 5550000, y: 3500000, class: 'cc' },
            { text: 'RU', x: 6500000, y: 3500000, class: 'cc' },
        ],
        en: [
            { text: 'MEDITERRANEAN SEA', x: 3980000, y: 1600000, class: 'seas', size: 12, letterSpacing: 7 },
            { text: 'ATLANTIC OCEAN', x: 2820000, y: 2540000, class: 'seas', size: 12, letterSpacing: 2 },
            { text: 'NORTH SEA', x: 3915000, y: 3700000, class: 'seas', size: 12 },
            { text: 'BALTIC SEA', x: 4900000, y: 3730000, class: 'seas', size: 10, rotate: -50 },
            { text: 'NORWEGIAN SEA', x: 3800000, y: 4500000, class: 'seas', size: 12, letterSpacing: 1 },
            { text: 'BLACK SEA', x: 6300000, y: 2500000, class: 'seas', size: 12, letterSpacing: 4 },
            { text: 'ALBANIA', cc: 'AL', x: 5100000, y: 2030000, class: 'countries', size: 7, rotate: 70 },
            { text: 'AUSTRIA', cc: 'AT', x: 4670000, y: 2690000, class: 'countries', size: 10 },
            { text: 'BELGIUM', cc: 'BE', x: 3900000, y: 3030000, class: 'countries', size: 7, rotate: 30 },
            { text: 'BULGARIA', cc: 'BG', x: 5567000, y: 2256000, class: 'countries', size: 12 },
            { text: 'CROATIA', cc: 'HR', x: 4876000, y: 2470000, class: 'countries', size: 7 },
            { text: 'CYPRUS', cc: 'CY', x: 6426000, y: 1480000, class: 'countries', size: 10 },
            { text: 'CZECHIA', cc: 'CZ', x: 4707000, y: 2920000, class: 'countries', size: 12 },
            { text: 'DENMARK', cc: 'DK', x: 4316000, y: 3621000, class: 'countries', size: 10 },
            { text: 'ESTONIA', cc: 'EE', x: 5220000, y: 3990000, class: 'countries', size: 7 },
            { text: 'FINLAND', cc: 'FI', x: 5150000, y: 4424000, class: 'countries', size: 12 },
            { text: 'FRANCE', cc: 'FR', x: 3767740, y: 2662817, class: 'countries', size: 12 },
            { text: 'GERMANY', cc: 'DE', x: 4347284, y: 3093276, class: 'countries', size: 12 },
            { text: 'GREECE', cc: 'EL', x: 5470000, y: 1860000, class: 'countries', size: 12 },
            { text: 'HUNGARY', cc: 'HU', x: 5020000, y: 2650000, class: 'countries', size: 10 },
            { text: 'ICELAND', cc: 'IS', x: 3040000, y: 4833000, class: 'countries', size: 10 },
            { text: 'IRELAND', cc: 'IE', x: 3136000, y: 3394000, class: 'countries', size: 10 },
            { text: 'ITALY', cc: 'IT', x: 4500000, y: 2181963, class: 'countries', size: 12 },
            { text: 'LATVIA', cc: 'LV', x: 5290000, y: 3800000, class: 'countries', size: 7 },
            { text: 'LITHUANIA', cc: 'LT', x: 5190000, y: 3630000, class: 'countries', size: 7 },
            { text: 'LUX.', cc: 'LU', x: 4160000, y: 2910000, class: 'countries', size: 7 },
            { text: 'MALTA', cc: 'MT', x: 4855000, y: 1400000, class: 'countries', size: 7 },
            { text: 'MONT.', cc: 'ME', x: 5073000, y: 2185000, class: 'countries', size: 7 },
            { text: 'N. MACEDONIA', cc: 'MK', x: 5400000, y: 2082000, class: 'countries', size: 7 },
            { text: 'NETHERLANDS', cc: 'NL', x: 3977000, y: 3208000, class: 'countries', size: 7 },
            { text: 'NORWAY', cc: 'NO', x: 4260000, y: 4147000, class: 'countries', size: 12 },
            { text: 'POLAND', cc: 'PL', x: 4964000, y: 3269000, class: 'countries', size: 12 },
            { text: 'PORTUGAL', cc: 'PT', x: 2830000, y: 1990000, class: 'countries', size: 10, rotate: -75 },
            { text: 'ROMANIA', cc: 'RO', x: 5451000, y: 2600000, class: 'countries', size: 12 },
            { text: 'SERBIA', cc: 'RS', x: 5200000, y: 2370000, class: 'countries', size: 7 },
            { text: 'SLOVAKIA', cc: 'SK', x: 5040000, y: 2835000, class: 'countries', size: 7, rotate: -30 },
            { text: 'SLOVENIA', cc: 'SI', x: 4735000, y: 2522000, class: 'countries', size: 7, rotate: -30 },
            { text: 'SPAIN', cc: 'ES', x: 3200000, y: 2050000, class: 'countries', size: 12 },
            { text: 'SWEDEN', cc: 'SE', x: 4630000, y: 4040000, class: 'countries', size: 12 },
            { text: 'SWITZERLAND', cc: 'CH', x: 4200000, y: 2594000, class: 'countries', size: 7 },
            { text: 'TÜRKIYE', cc: 'TR', x: 6510000, y: 2100000, class: 'countries', size: 12 },
            { text: 'U.K.', cc: 'UK', x: 3558000, y: 3250000, class: 'countries', size: 12 },
            { text: 'UKRAINE', cc: 'UA', x: 5890000, y: 3050000, class: 'countries', size: 12 },
            { text: 'MOLDOVA', class: 'countries', cc: 'MD', x: 5740000, y: 2790000, size: 12 },
            { text: 'GEORGIA', class: 'countries', cc: 'GE', x: 6942680, y: 2660000, size: 12 },
            { text: 'BELARUS', cc: 'BY', x: 5550000, y: 3500000, class: 'countries', size: 12 },
            { text: 'RUSSIAN FEDERATION', cc: 'RU', x: 6500000, y: 3500000, class: 'countries', size: 12 },

            // split Bosnia label
            { text: 'BOSNIA', cc: 'BA', x: 4949262, y: 2348688, class: 'countries', size: 7 },
            { text: '& H.', cc: 'BA', x: 4949262, y: 2280000, class: 'countries', size: 7 },
        ],
    },
    IC_32628: {
        cc: [{ text: 'ES', x: 420468, y: 3180647, class: 'cc', size: 12 }],
        en: [{ text: 'Canary Islands', x: 420468, y: 3180647, class: 'countries', size: 12 }],
    },
    GP_32620: {
        cc: [{ text: 'FR', x: 667000, y: 1740000, class: 'cc', size: 12 }],
        en: [{ text: 'Guadeloupe', x: 700000, y: 1810000, class: 'countries', size: 12 }],
    },
    MQ_32620: {
        cc: [{ text: 'FR', x: 716521, y: 1621322, class: 'cc', size: 12 }],
        en: [{ text: 'Martinique', x: 716521, y: 1621322, class: 'countries', size: 12 }],
    },
    GF_32622: {
        cc: [{ text: 'FR', x: 266852, y: 444074, class: 'cc', size: 12 }],
        en: [{ text: 'Guyane', x: 266852, y: 444074, class: 'countries', size: 12 }],
    },
    RE_32740: {
        cc: [{ text: 'FR', x: 348011, y: 7680000, class: 'cc', size: 10 }],
        en: [{ text: 'Réunion', x: 348011, y: 7680000, class: 'countries', size: 10 }],
    },
    YT_32738: {
        cc: [{ text: 'FR', x: 516549, y: 8593920, class: 'cc', size: 10 }],
        en: [{ text: 'Mayotte', x: 516549, y: 8593920, class: 'countries', size: 10 }],
    },
    MT_3035: {
        cc: [{ text: 'MT', x: 4719755, y: 1410701, class: 'cc', size: 10 }],
        en: [{ text: 'Malta', x: 4719755, y: 1410701, class: 'countries', size: 10 }],
    },
    PT20_32626: {
        cc: [{ text: 'PT', x: 397418, y: 4320000, class: 'cc', size: 10 }],
        en: [{ text: 'Azores', x: 397418, y: 4320000, class: 'countries', size: 10 }],
    },
    PT30_32628: {
        cc: [{ text: 'PT', x: 333586, y: 3624000, class: 'cc', size: 10, rotate: 30 }],
        en: [{ text: 'Madeira', x: 333586, y: 3624000, class: 'countries', size: 10, rotate: 30 }],
    },
    LI_3035: {
        cc: [{ text: 'LI', x: 4287060, y: 2660000, class: 'cc', size: 12 }],
        en: [{ text: 'Liechtenstein', x: 4287060, y: 2679000, class: 'countries', size: 7 }],
    },
    IS_3035: {
        cc: [{ text: 'IS', x: 3011804, y: 4960000, class: 'cc', size: 12 }],
        en: [{ text: 'Iceland', x: 3011804, y: 4960000, class: 'countries', size: 12 }],
    },
    SJ_SV_3035: {
        cc: [{ text: 'NO', x: 4570000, y: 6260000, class: 'cc', size: 10 }],
        en: [{ text: 'Svalbard', x: 4570000, y: 6260000, class: 'countries', size: 10 }],
    },
    SJ_JM_3035: {
        cc: [{ text: 'NO', x: 3647762, y: 5420300, class: 'cc', size: 10 }],
        en: [{ text: 'Jan Mayen', x: 3647762, y: 5420300, class: 'countries', size: 7 }],
    },
    CARIB_32620: {
        cc: [
            { text: 'FR', x: 700000, y: 1810000, class: 'cc', size: 10 },
            { text: 'FR', x: 640000, y: 1590000, class: 'cc', size: 10 },
            { text: 'FR', x: 540000, y: 1962000, class: 'cc', size: 7 },
        ],
        en: [
            { text: 'Guadeloupe', x: 700000, y: 1810000, class: 'countries', size: 10 },
            { text: 'Martinique', x: 570000, y: 1590000, class: 'countries', size: 10 },
            { text: 'Saint Martin', x: 597000, y: 1962000, class: 'countries', size: 7 },
        ],
    },
    // note: WORLD x/y are in EPSG:4326 then reprojected by d3 to EPSG:54030
    WORLD_54030: {
        en: [
            { text: 'NORTH ATLANTIC', x: -45, y: 25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'SOUTH ATLANTIC', x: -15, y: -25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'SOUTH PACIFIC', x: -126, y: -25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'NORTH', x: -136, y: 25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'PACIFIC', x: -134, y: 20, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'INDIAN OCEAN', x: 80, y: -25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'SOUTHERN OCEAN', x: -5, y: -67, class: 'seas', size: 10, letterSpacing: 6 },
        ],
    },
}

const DEFAULTSTATLABELPOSITIONS = {
    AL: { x: 5150000, y: 2000000 },
    AT: { x: 4670000, y: 2740000 },
    BE: { x: 3930000, y: 3060000 },
    BG: { x: 5567000, y: 2300000 },
    HR: { x: 4657718, y: 2400243 },
    CY: { x: 6426000, y: 1570000 },
    CH: { x: 4170000, y: 2600000 },
    CZ: { x: 4707000, y: 2950000 },
    DK: { x: 4316000, y: 3621000 },
    EE: { x: 5220000, y: 4050000 },
    FI: { x: 5150000, y: 4424000 },
    FR: { x: 3767740, y: 2662817 },
    DE: { x: 4347284, y: 3093276 },
    EL: { x: 5370000, y: 1750000 },
    HU: { x: 5020000, y: 2670000 },
    IS: { x: 3040000, y: 4833000 },
    IE: { x: 3136000, y: 3394000 },
    IT: { x: 4500000, y: 2181963 },
    LV: { x: 5290000, y: 3840000 },
    LT: { x: 5190000, y: 3670000 },
    LU: { x: 4120000, y: 2940000 },
    MT: { x: 4880000, y: 1480000 },
    GE: { x: 6912680, y: 2696554 },
    UA: { x: 5865507, y: 3130158 },
    BA: { x: 4959262, y: 2368688 },
    MD: { x: 5736016, y: 2835957 },
    ME: { x: 5073000, y: 2230000 },
    MK: { x: 5300000, y: 2130000 },
    NL: { x: 4020000, y: 3208000 },
    NO: { x: 4300000, y: 4147000 },
    PL: { x: 4964000, y: 3200000 },
    PT: { x: 2760000, y: 1990000 },
    RO: { x: 5451000, y: 2600000 },
    RS: { x: 5200000, y: 2370000 },
    SK: { x: 5040000, y: 2890000 },
    SI: { x: 4660000, y: 2550000 },
    ES: { x: 3200000, y: 2000000 },
    SE: { x: 4630000, y: 4000000 },
    TR: { x: 6510000, y: 2100000 },
    UK: { x: 3558000, y: 3250000 },
    BY: { x: 5550000, y: 3500000 },
    RU: { x: 6842086, y: 3230517 },
}
