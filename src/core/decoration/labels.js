import { select } from 'd3-selection'
import { applyZoomToLabels } from '../zoom'
import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'
import { spaceAsThousandSeparator, executeForAllInsets, ensureGroup, getTextColorForBackground, compactFormatter } from '../utils'
import { flowNodeLabelPlacement, hideCollidingLabels } from './label-layout'
import { DEFAULTLABELS, DEFAULTSTATLABELPOSITIONS } from './default-labels'

export { DEFAULTLABELS }

// handles all map labels e.g. stat values, or labels specified in map.labels({labels:[text:'myLabel', x:123, y: 123]})

/** Minimum font size (px) for labels inside proportional symbols.
 *  If the radius-derived size falls below this, the label overflows outside the circle. */
const PS_LABEL_MIN_FONT_SIZE = 9
const PS_LABEL_OVERFLOW_FONT_SIZE = 11 //  when overflowing outside circle

// Backgrounds and halos are alternative readability treatments. When both legacy
// booleans are supplied, backgrounds take precedence.
const labelsHaveHalos = (labelsConfig) => !labelsConfig?.backgrounds && !!(labelsConfig?.halos ?? labelsConfig?.shadows)

// Geographic labels (country names, country codes, seas) each have their own independent colour
// field - deliberately distinct from statLabelTextColor, which is for statistical value labels
// only. Returns only the [class, color] pairs that are actually configured.
const geographicLabelColorsByClass = (map) =>
    [
        ['countries', map.labels_.countryLabelTextColor],
        ['cc', map.labels_.countryCodeLabelTextColor],
        ['seas', map.labels_.seaLabelTextColor],
    ].filter(([, color]) => !!color)

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

        // Seas labels don't clash with anything else on the map, so they always keep their
        // default halo regardless of the configured decoration (even under 'backgrounds').
        const haloLabels = labelsHaveHalos(map.labels_)
            ? labelsArray
            : labelsArray.filter((d) => d.class === 'seas')

        if (haloLabels.length) {
            halog
                .selectAll('text')
                .data(haloLabels)
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

            // Keep the halo legible against a custom label colour, same reasoning as the stat
            // label halo fix - a light label colour needs a dark halo and vice versa. Must be
            // .style(), not .attr(): .em-label-halo's own CSS rule sets `stroke: white`, and a
            // CSS class rule always beats a presentation attribute (though not an inline style).
            for (const [cls, color] of geographicLabelColorsByClass(map)) {
                halog.selectAll('text').filter((d) => d.class === cls).style('stroke', getTextColorForBackground(color))
            }
        }

        const labelItems = labelg
            .selectAll('g.em-geographic-label')
            .data(labelsArray)
            .enter()
            .append('g')
            .attr('class', 'em-geographic-label')
            .attr('transform', (d) => {
                const [x, y] = map._projection([d.x, d.y])
                return `translate(${x},${y})${d.rotate ? ` rotate(${d.rotate})` : ''}`
            })

        const labelTexts = labelItems
            .append('text')
            .attr('id', (d) => 'em-label-' + d.text.replace(/\s+/g, '-'))
            .attr('class', (d) => 'em-label em-label-' + d.class)
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', -7)
            .text((d) => d.text)

        // Each geographic label class (country names/codes/seas) has its own independent colour
        // field - statLabelTextColor is for statistical value labels only (see its name), and
        // must not leak into these. Must be .style(), not .attr(): classes like
        // .em-label-countries/.em-label-seas set their own `fill` in CSS, and a CSS class rule
        // always beats a presentation attribute (though not an inline style) - .attr('fill', ...)
        // here would be silently overridden for those classes.
        for (const [cls, color] of geographicLabelColorsByClass(map)) {
            labelTexts.filter((d) => d.class === cls).style('fill', color)
        }

        if (map.labels_.backgrounds) {
            // Seas labels don't clash with anything else on the map, so they keep their
            // default halo only and never get a background treatment.
            labelTexts
                .filter((d) => d.class !== 'seas')
                .each(function () {
                    const text = this
                    const bbox = text.getBBox()
                    const paddingX = 4
                    const paddingY = 2
                    select(text.parentNode)
                        .insert('rect', () => text)
                        .attr('class', 'em-label-background em-geographic-label-background')
                        .attr('x', bbox.x - paddingX)
                        .attr('y', bbox.y - paddingY)
                        .attr('width', bbox.width + paddingX * 2)
                        .attr('height', bbox.height + paddingY * 2)
                        .attr('fill', map.labels_.backgroundFill || '#ffffff')
                })
        }

        if (map.labels_.preventOverlap) {
            applyLabelOverlapPrevention(labelItems, labelTexts)
        }

        // Labels rebuilt while the map is zoomed must match the zoom scale straight away
        applyZoomToLabels(map)
    }

    hideCollidingLabels(map)
}

/**
 * @function applyLabelOverlapPrevention
 * @description Nudges geographic label positions apart using a d3-force collision simulation,
 *   so that neighbouring labels (e.g. small/densely-labelled countries) don't overlap each other.
 *   Runs synchronously (not animated) - same approach as the Dorling cartogram simulation.
 *
 *   Simulation state is kept on separate wrapper nodes, never on the label datum `d` itself:
 *   `d.x`/`d.y` are that label's actual geographic coordinates (read elsewhere via
 *   `map._projection([d.x, d.y])` every time labels are rebuilt). Earlier this wrote the
 *   simulation's own nudged *screen-pixel* x/y straight onto `d.x`/`d.y` - labelsArray is a
 *   shared/reused array, so those geographic coordinates got permanently overwritten with pixel
 *   values on the first run. Any subsequent rebuild (e.g. toggling this setting off then on)
 *   then reprojected those already-pixel values as if they were still geographic coordinates,
 *   sending labels to nonsensical positions that never recovered.
 * @param {Object} labelItems d3 selection of 'g.em-geographic-label' (one per label, holds the transform)
 * @param {Object} labelTexts d3 selection of the label '<text>' elements (used to measure bbox)
 */
function applyLabelOverlapPrevention(labelItems, labelTexts) {
    const nodeByDatum = new Map()
    labelItems.each(function (d) {
        const transform = this.getAttribute('transform') || ''
        const match = /translate\(([^,]+),([^)]+)\)/.exec(transform)
        if (!match) return
        const x0 = parseFloat(match[1])
        const y0 = parseFloat(match[2])
        nodeByDatum.set(d, { x0, y0, x: x0, y: y0 })
    })
    if (!nodeByDatum.size) return
    const nodes = [...nodeByDatum.values()]

    const radii = new Map()
    labelTexts.each(function (d) {
        const node = nodeByDatum.get(d)
        if (!node) return
        const bbox = this.getBBox()
        // radius of the circle that encloses the label's bounding box, plus a little breathing room
        radii.set(node, Math.hypot(bbox.width, bbox.height) / 2 + 2)
    })

    const sim = forceSimulation(nodes)
        .force('x', forceX((n) => n.x0).strength(0.3))
        .force('y', forceY((n) => n.y0).strength(0.3))
        .force(
            'collide',
            forceCollide((n) => radii.get(n) ?? 8).iterations(3)
        )
        .stop()

    const nTicks = Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay()))
    for (let i = 0; i < nTicks; i++) sim.tick()

    labelItems.attr('transform', (d) => {
        const node = nodeByDatum.get(d)
        if (!node) return null
        const rotate = d.rotate ? ` rotate(${d.rotate})` : ''
        return `translate(${node.x},${node.y})${rotate}`
    })
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
        const appendStatLabel = (container, isHalo) => {
            const selection = validRegions(container)
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
                    // A user-configured font colour always wins over the auto-computed contrast
                    // colour, matching choropleth/geographic label behaviour (statLabelTextColor).
                    if (out.labels_?.statLabelTextColor) return out.labels_.statLabelTextColor
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

            // Background decoration (map.labels_.backgrounds), matching choropleth's stat labels -
            // only for the real (non-halo) label, appended once text exists so its bbox is known.
            if (!isHalo && out.labels_?.backgrounds) {
                selection.each(function (d) {
                    const datum = sizeData.get(d.properties.id)
                    if (datum?.value == null || datum.value === ':') return
                    const text = this
                    const bbox = text.getBBox()
                    if (!bbox.width || !bbox.height) return
                    const paddingX = 3
                    const paddingY = 1
                    select(text.parentNode)
                        .insert('rect', () => text)
                        .attr('class', 'em-label-background')
                        .attr('x', bbox.x - paddingX)
                        .attr('y', bbox.y - paddingY)
                        .attr('width', bbox.width + paddingX * 2)
                        .attr('height', bbox.height + paddingY * 2)
                        .attr('fill', out.labels_.backgroundFill || '#ffffff')
                        .style('pointer-events', 'none')
                })
            }

            return selection
        }

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

    // out is the flow layer; _statLabelFormatter is set on the map itself (during render),
    // so read it off out.map rather than out (see addLabelsToMap).
    const statLabelFormatter = out.map?._statLabelFormatter || out._statLabelFormatter || spaceAsThousandSeparator

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
            .text((d) => statLabelFormatter(d.value))
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
        .text((d) => statLabelFormatter(d.value))

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
                .attr('fill', out.labels_.backgroundFill || '#ffffff')
        })
    }
}

/**
 * Add a label to each circle node of a flow map, named after the node (`node.name`, else its id).
 * Labels sit in `#em-labels`, so they get the same constant-screen-size zoom scaling as the other labels, and
 * `labels({ hideOverlapping: true })` can hide the ones that collide. Bigger nodes come first, so they win.
 * @param {Object} out flow layer
 * @param {Map<string, {x: number, y: number, radius: number}>} stats screen position and radius of each drawn node
 */
export function addFlowNodeLabels(out, stats) {
    const zoomGroup = out.svg_.select('#em-zoom-group-' + out.svgId_)
    let labelsContainer = zoomGroup.select('#em-labels')
    if (labelsContainer.empty()) labelsContainer = zoomGroup.append('g').attr('id', 'em-labels').attr('class', 'em-labels')
    const container = ensureGroup(labelsContainer, 'em-flow-node-labels')

    const nodeById = out._nodeById || new Map()
    const labelled = [...stats]
        .filter(([, s]) => s.radius > 0)
        .sort(([, a], [, b]) => b.radius - a.radius)
        .map(([id, s]) => ({ id, s, text: nodeById.get(id)?.name || id, position: nodeById.get(id)?.labelPosition || out.flowNodeLabelPosition_ }))

    const groups = container
        .selectAll('g')
        .data(labelled)
        .join('g')
        .attr('class', 'em-flow-node-label')
        .attr('data-id', (d) => d.id)
        .attr('transform', (d) => `translate(${d.s.x},${d.s.y})`)

    groups.each(function (d) {
        const place = flowNodeLabelPlacement(d.position, d.s.radius)
        select(this)
            .append('text')
            .attr('class', 'em-flow-node-label-text')
            .attr('x', place.x)
            .attr('y', place.y)
            .attr('dx', place.dx) // in em, so it follows the font size when labels are rescaled on zoom
            .attr('dy', place.dy)
            .attr('text-anchor', place.anchor)
            .text(d.text)
    })

    // Nodes drawn while the map is zoomed must match the zoom scale straight away
    applyZoomToLabels(out)
    hideCollidingLabels(out)
}

/**
 * @function updateLabels
 * @description update existing map labels
 */
export const updateLabels = function (map) {
    if (map.svg_) {
        // Clear previous labels (flow node labels belong to the flow layer, which redraws them)
        let prevLabels = map.svg_.selectAll('#em-labels > *:not(.em-flow-node-labels)')
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
    const statData = getStatLabelsData(map)
    const filterFunction = map.labels_?.statLabelsFilterFunction
        ? map.labels_.statLabelsFilterFunction
        : (region) => defaultStatLabelFilter(region, statData)
    statLabels
        .filter((rg) => filterFunction(rg, map))
        // .append('text')
        .each(function (d) {
            const sel = select(this)
            const labelText = statLabelsTextFunction(d, statData, map) // Use 'd' directly for the label text

            // Append a background shape (only when there's actually a label - e.g. not for
            // 'data not available' regions, whose text function returns nothing)
            if (map.labels_.backgrounds && labelText) appendBackground(labelText, sel)

            // Append text after the background so it remains on top. Set fill/stroke via
            // .style(), not .attr(): the default .em-stat-label CSS rule defines both, and a
            // CSS class rule always beats a presentation attribute (though not an inline style).
            // When a background shape is drawn behind the text, the halo-style stroke is not
            // needed for contrast and just makes the text look too thick, so force it off.
            const text = sel.append('text').text(labelText).attr('class', 'em-stat-label-text')
            if (map.labels_.statLabelTextColor) {
                text.style('fill', map.labels_.statLabelTextColor)
            }
            text.style('stroke', map.labels_.backgrounds ? 'none' : map.labels_.statLabelTextColor || null)
        })

    // Append the configured background shape behind a statistical label.
    function appendBackground(labelText, container) {
        const padding = map.labels_.backgroundPadding
        const paddingX = typeof padding === 'number' ? padding : (padding?.x ?? 5)
        const paddingY = typeof padding === 'number' ? padding : (padding?.y ?? 2)

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

        const width = labelWidth + 2 * paddingX
        const height = labelHeight + 2 * paddingY
        const shape = map.labels_.backgroundShape === 'circle' ? 'circle' : 'rect'
        const background = container
            .append(shape)
            .attr('class', 'em-label-background')
            .attr('fill', map.labels_.backgroundFill || '#ffffff')

        if (shape === 'circle') {
            background
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', Math.max(width, height) / 2)
        } else {
            const radius = map.labels_.backgroundBorderRadius ?? 0
            background
                .attr('x', -width / 2)
                .attr('y', -height / 2)
                .attr('width', width)
                .attr('height', height)
                .attr('rx', radius)
                .attr('ry', radius)
        }
    }

    //add halos to labels
    if (labelsHaveHalos(map.labels_)) {
        const halos = map.svg_
            .selectAll('g.em-stat-label-halo')
            .filter((rg) => filterFunction(rg, map))
            .append('text')
            .text((d) => statLabelsTextFunction(d, statData, map)) // Use 'd' directly for the label text)

        // The halo's job is to keep the label legible against the map behind it, so its stroke
        // must contrast with the label's own text color - the CSS default (white) only works
        // for the default dark text color. Override it inline whenever a custom font color is
        // set, picking whichever of black/white contrasts with that color (e.g. a white font
        // color gets a black halo instead of an invisible white-on-white one). Must be .style(),
        // not .attr(): .em-stat-label-halo's own CSS rule sets `stroke: white`, which always
        // beats a presentation attribute (though not an inline style).
        if (map.labels_.statLabelTextColor) {
            halos.style('stroke', getTextColorForBackground(map.labels_.statLabelTextColor))
        }
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
 * @description the statistical data whose values are labelled: the one encoded by the fill (or size) channel, which
 *   is not the default dataset when the map is configured with a named stat, e.g. stat('value', {...}).encoding('fill', { stat: 'value' }).
 * @param {Object} map eurostat-map map instance
 * @return {Object} the statData
 */
const getStatLabelsData = (map) => {
    // the facade map has no encodings of its own: they belong to its (active) layer
    const layer = (typeof map.activeLayer === 'function' && map.activeLayer()) || map
    for (const channel of ['fill', 'size']) {
        const sd = layer.getEncodingStatData?.(channel)
        if (sd?.get && sd._data_ && Object.keys(sd._data_).length) return sd
    }
    return map.statData()
}

/**
 * @description function for filtering statistical labels
 * @param {Object} d d3 selection json data element
 * @return {boolean}
 */
const defaultStatLabelFilter = (region, statData) => {
    const sv = statData.get(region.properties.id)
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
            // Use the same deduplicated features as the value-label layer. Mixed-level maps
            // can contain the same region in multiple geometry collections; binding the raw
            // array here creates extra halos at different centroids (notably for RS).
            .data(filteredRegions)
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
