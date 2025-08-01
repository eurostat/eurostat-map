import { sum, max } from 'd3-array'
import { scaleSqrt } from 'd3-scale'
import { arc, pie } from 'd3-shape'
import { spaceAsThousandSeparator } from '../../core/utils'
import { select, selectAll } from 'd3-selection'
import { format } from 'd3'

export function drawDonuts(out, container) {
    const donutContainer = container.append('g').attr('class', 'donuts').attr('id', 'donuts')
    const nodes = out.flowGraph_.nodes
    const maxValue = max(nodes, (d) => sum(d.donutValues, (v) => v.value))
    out.donutSizeScale = out.flowDonutSizeScale_ || scaleSqrt().domain([0, maxValue]).range([3, 10])
    const arcGen = arc().innerRadius(5)
    const pieGen = pie()
        .value((d) => d.value)
        .sort(null)

    Object.entries(out.locationStats).forEach(([locKey, stats]) => {
        const { x, y, incoming, outgoing, internal } = stats
        const total = out.flowInternal_ ? incoming + outgoing + internal : incoming + outgoing
        if (total === 0) return

        const incomingBreakdown = getIncomingBreakdownByOrigin(locKey, out)
        const outgoingBreakdown = getOutgoingBreakdownByDestination(locKey, out)

        // Combine for grouping by color
        const allBreakdown = [...incomingBreakdown, ...outgoingBreakdown]

        // Group by color
        const valuesByColor = new Map()
        allBreakdown.forEach((d) => {
            const key = d.color
            valuesByColor.set(key, (valuesByColor.get(key) || 0) + d.value)
        })

        // Create final donut values for the pie
        const donutValues = Array.from(valuesByColor, ([color, value]) => ({
            label: color, // color key (tooltip still uses full breakdown)
            value,
            color,
        }))

        // 🔹 Generate pie segments and attach parent reference
        const pieData = pieGen(donutValues)
        pieData.forEach((segment) => {
            segment.data.parent = {
                id: locKey,
                name: out.nodeNameMap.get(locKey) || locKey,
                donutValues, // full breakdown for tooltip
            }
        })

        const g = donutContainer.append('g').attr('class', 'donut-group').attr('transform', `translate(${x},${y})`).attr('data-total', total)

        // Outer donut ring
        g.selectAll('path')
            .data(pieData)
            .join('path')
            .attr('d', arcGen.innerRadius(out.donutSizeScale(total) * 0.4).outerRadius(out.donutSizeScale(total)))
            .attr('fill', (d) => d.data.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                if (out._tooltip) out._tooltip.mouseover(donutMouseoverFunction(d, out))
                highlightDonut(event, out.svg_)
                highlightLines(event, d)
            })
            .on('mousemove', function (event, d) {
                if (out._tooltip) out._tooltip.mousemove(event)
            })
            .on('mouseout', function (event, d) {
                if (out._tooltip) out._tooltip.mouseout()
                unhighlightDonut(event, out.svg_)
                unhighlightLines(event)
            })

        // Inner circle
        g.append('circle')
            .attr('r', out.donutSizeScale(total) * 0.4)
            .attr('fill', 'white')
            .style('cursor', 'pointer')
            .on('mouseover', function (event) {
                // Reuse the first arc's data for tooltip content
                const firstArcDatum = pieData[0]
                if (out._tooltip) out._tooltip.mouseover(donutMouseoverFunction(firstArcDatum, out))
                highlightDonut(event, out.svg_)
                highlightLines(event, firstArcDatum)
            })
            .on('mousemove', function (event) {
                if (out._tooltip) out._tooltip.mousemove(event)
            })
            .on('mouseout', function (event) {
                if (out._tooltip) out._tooltip.mouseout()
                unhighlightDonut(event, out.svg_)
                unhighlightLines(event)
            })
    })
}

function highlightLines(event, d) {
    const node = d.data.parent // donut's parent info
    const nodeId = node.id

    selectAll('g.em-flow-container line')
        .classed('highlighted', function () {
            return this.getAttribute('data-origin') === nodeId || this.getAttribute('data-dest') === nodeId
        })
        .classed('dimmed', function () {
            return this.getAttribute('data-origin') !== nodeId && this.getAttribute('data-dest') !== nodeId
        })
}

function unhighlightLines(event) {
    selectAll('g.em-flow-container line').classed('highlighted', false).classed('dimmed', false)
}

function donutMouseoverFunction(d, out) {
    const percentFormat = format('.0%')
    const node = d.data.parent
    const total = sum(node.donutValues, (v) => v.value)
    const statData = out.statData?.()
    const unit = statData?.unitText?.() || ''

    const buf = []

    // --- Header ---
    buf.push(`
        <div class="em-tooltip-bar">
            <b>${node.name || node.id || 'Unknown location'}</b>
        </div>
    `)

    buf.push(`<div class="em-tooltip-text"><table class="em-tooltip-table"><tbody>`)

    // === INCOMING BREAKDOWN ===
    const incomingBreakdown = getIncomingBreakdownByOrigin(node.id, out)
    const totalIncoming = sum(incomingBreakdown, (v) => v.value)
    if (totalIncoming > 0) {
        const incomingPercent = percentFormat(totalIncoming / total)
        buf.push(`
            <tr><td style="padding-top:3px;">Incoming:</td>
                <td>${spaceAsThousandSeparator(totalIncoming)} (${incomingPercent})</td>
            </tr>
        `)

        incomingBreakdown.forEach((segment) => {
            const percent = percentFormat(segment.value / total)
            buf.push(`
                <tr>
                    <td style="padding-left:1.5em;">
                        <span style="
                            display:inline-block;
                            width:10px;
                            height:10px;
                            border-radius:50%;
                            background:${segment.color};
                            margin-right:6px;
                        "></span> ${segment.name || segment.key}
                    </td>
                    <td style="text-align:right">
                        ${spaceAsThousandSeparator(segment.value)} (${percent})
                    </td>
                </tr>
            `)
        })
    }

    // === OUTGOING BREAKDOWN ===
    const outgoingBreakdown = getOutgoingBreakdownByDestination(node.id, out)
    const totalOutgoing = sum(outgoingBreakdown, (v) => v.value)
    if (totalOutgoing > 0) {
        const outgoingPercent = percentFormat(totalOutgoing / total)
        buf.push(`
            <tr><td style="padding-top:3px;">Outgoing:</td>
                <td>${spaceAsThousandSeparator(totalOutgoing)} (${outgoingPercent})</td>
            </tr>
        `)

        outgoingBreakdown.forEach((segment) => {
            const percent = percentFormat(segment.value / total)
            buf.push(`
                <tr>
                    <td style="padding-left:1.5em;">
                        <span style="
                            display:inline-block;
                            width:10px;
                            height:10px;
                            border-radius:50%;
                            background:${segment.color};
                            margin-right:6px;
                        "></span> ${segment.name || segment.key}
                    </td>
                    <td style="text-align:right">
                        ${spaceAsThousandSeparator(segment.value)} (${percent})
                    </td>
                </tr>
            `)
        })
    }

    // === TOTAL ROW ===
    buf.push(`
        <tr class="em-tooltip-total">
            <td colspan="2" style="padding-top:4px; font-weight:bold;">
                Total: ${spaceAsThousandSeparator(total)} ${unit}
            </td>
        </tr>
    `)

    buf.push(`</tbody></table></div>`)

    return buf.join('')
}

const highlightDonut = (event, svg) => {
    const currentZoom = +svg.attr('data-zoom') || 1

    select(event.target.parentNode) // the <g> group around the donut arcs
        .selectAll('path')
        .each(function () {
            const el = select(this)
            const current = +el.attr('stroke-width') || 0
            el.attr('data-stroke-width', current) // store original value
        })
        .attr('stroke', 'black')
        .attr('stroke-width', 2 / currentZoom) // scale line width to zoom
}

const unhighlightDonut = (event, svg) => {
    const currentZoom = +svg.attr('data-zoom') || 1

    select(event.target.parentNode)
        .selectAll('path')
        .attr('stroke', 'white')
        .attr('stroke-width', function () {
            const el = select(this)
            const original = +el.attr('data-stroke-width') || 0
            return original / currentZoom
        })
}

// === Incoming Breakdown ===
function getIncomingBreakdownByOrigin(nodeId, out) {
    const topKeys = out.topLocationKeys
    const type = out.flowTopLocationsType_
    const includeInternal = out.flowInternal_

    const breakdown = {}

    // === Loop all links ===
    for (const link of out.flowGraph_.links) {
        const srcKey = link.source.id
        const tgtKey = link.target.id

        // We only care about links where this node is the TARGET (incoming flow)
        if (tgtKey !== nodeId) continue

        // Handle internal flow
        if (srcKey === tgtKey) {
            if (includeInternal) {
                breakdown['Internal'] = (breakdown['Internal'] || 0) + link.value
            }
            continue // don't double-count self-link for origin/destination
        }

        let key

        if (type === 'destination') {
            // In destination mode: all incoming flows collapse into 1 slice for the node
            key = nodeId
        } else if (type === 'origin') {
            // Show breakdown by origin
            key = topKeys.has(srcKey) ? srcKey : 'Other'
        } else {
            // 'sum' mode: color by origin if it's a top location; otherwise fall back to this node
            key = topKeys.has(srcKey) || topKeys.has(nodeId) ? (topKeys.has(srcKey) ? srcKey : nodeId) : 'Other'
        }

        breakdown[key] = (breakdown[key] || 0) + link.value
    }

    // Convert breakdown to array with colors
    return sortBreakdown(
        Object.entries(breakdown).map(([key, value]) => ({
            key,
            name: out.nodeNameMap?.get(key) || key, //  Human-readable name
            value,
            color: getSegmentColor(key, nodeId, out),
        }))
    )
}

// === Outgoing Breakdown ===
function getOutgoingBreakdownByDestination(nodeId, out) {
    const topKeys = out.topLocationKeys
    const color = (key) => out.locationColorScale(key)
    const type = out.flowTopLocationsType_
    const includeInternal = out.flowInternal_

    const breakdown = {}

    for (const link of out.flowGraph_.links) {
        const srcKey = link.source.id
        const tgtKey = link.target.id

        // Only consider links where this node is the SOURCE (outgoing flow)
        if (srcKey !== nodeId) continue

        // Handle internal flow
        if (srcKey === tgtKey) {
            if (includeInternal) {
                breakdown['Internal'] = (breakdown['Internal'] || 0) + link.value
            }
            continue
        }

        let key

        if (type === 'origin') {
            // In origin mode: all outgoing flows collapse into 1 slice
            key = nodeId
        } else if (type === 'destination') {
            // Show breakdown by destination if in topKeys
            key = topKeys.has(tgtKey) ? tgtKey : 'Other'
        } else {
            // 'sum' mode: color by destination if top; otherwise fall back to this node
            key = topKeys.has(tgtKey) || topKeys.has(nodeId) ? (topKeys.has(tgtKey) ? tgtKey : nodeId) : 'Other'
        }

        breakdown[key] = (breakdown[key] || 0) + link.value
    }

    // Convert to array with colors and sort
    return sortBreakdown(
        Object.entries(breakdown).map(([key, value]) => ({
            key,
            name: out.nodeNameMap?.get(key) || key, //  Human-readable name
            value,
            color: getSegmentColor(key, nodeId, out),
        }))
    )
}

// Keep your 'Other last' sorting
function sortBreakdown(arr) {
    return arr.sort((a, b) => {
        // Always keep "Other" last
        if (a.key === 'Other') return 1
        if (b.key === 'Other') return -1

        // Sort by numeric value descending
        return b.value - a.value
    })
}

function getSegmentColor(key, nodeId, out) {
    const topKeys = out.topLocationKeys || new Set()
    const colorScale = out.locationColorScale

    if (key === 'Other') return '#666'
    if (key === 'Internal') return topKeys.has(nodeId) ? colorScale(nodeId) : '#999'
    return topKeys.has(key) ? colorScale(key) : '#666'
}

export function computeDonutLocationStats(out) {
    const statsByLoc = {}

    for (const node of out.flowGraph_.nodes) {
        statsByLoc[node.id] = {
            x: node.x,
            y: node.y,
            incoming: 0,
            outgoing: 0,
            internal: 0,
        }
    }

    for (const link of out.flowGraph_.links) {
        const srcKey = link.source.id
        const tgtKey = link.target.id

        // Outgoing for source
        if (statsByLoc[srcKey]) statsByLoc[srcKey].outgoing += link.value
        // Incoming for target
        if (statsByLoc[tgtKey]) statsByLoc[tgtKey].incoming += link.value
        // Internal if same node
        if (srcKey === tgtKey) statsByLoc[srcKey].internal += link.value
    }

    out.locationStats = statsByLoc
}
export function computeDonutValues(out) {
    const nodes = out.flowGraph_.nodes
    const topKeys = out.topLocationKeys || new Set()
    const colorScale = out.locationColorScale
    const type = out.flowTopLocationsType_

    for (const node of nodes) {
        const valuesMap = new Map()
        let internalFlowTotal = 0

        // === Incoming flows (from others to this node)
        for (const link of node.targetLinks) {
            const sourceKey = link.source.id

            if (sourceKey === node.id) {
                // self-flow (internal)
                if (out.flowInternal_) internalFlowTotal += link.value
                continue
            }

            let key
            if (type === 'origin') {
                key = topKeys.has(sourceKey) ? sourceKey : 'Other'
            } else if (type === 'destination') {
                key = topKeys.has(node.id) ? node.id : 'Other' // target = this node
            } else {
                // sum: check both
                key = topKeys.has(sourceKey) || topKeys.has(node.id) ? (topKeys.has(node.id) ? node.id : sourceKey) : 'Other'
            }

            valuesMap.set(key, (valuesMap.get(key) || 0) + link.value)
        }

        // === Outgoing flows (from this node to others)
        for (const link of node.sourceLinks) {
            const targetKey = link.target.id

            if (targetKey === node.id) {
                // self-flow (internal)
                if (out.flowInternal_) internalFlowTotal += link.value
                continue
            }

            let key
            if (type === 'origin') {
                key = topKeys.has(node.id) ? node.id : 'Other' // origin = this node
            } else if (type === 'destination') {
                key = topKeys.has(targetKey) ? targetKey : 'Other'
            } else {
                // sum: prefer destination if top
                key = topKeys.has(targetKey) || topKeys.has(node.id) ? (topKeys.has(targetKey) ? targetKey : node.id) : 'Other'
            }

            valuesMap.set(key, (valuesMap.get(key) || 0) + link.value)
        }

        // === Convert to donutValues array with colors
        node.donutValues = Array.from(valuesMap.entries()).map(([key, value]) => ({
            label: key,
            value,
            color: getSegmentColor(key, node.id, out),
        }))

        // === Add internal flow slice if applicable
        if (out.flowInternal_ && internalFlowTotal > 0) {
            node.donutValues.push({
                label: 'Internal',
                value: internalFlowTotal,
                color: '#999', // gray for internal flows
            })
        }
    }
}
