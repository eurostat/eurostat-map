import { sum, max } from 'd3-array'
import { scaleSqrt } from 'd3-scale'
import { arc, pie } from 'd3-shape'
import { spaceAsThousandSeparator } from '../../core/utils'
import { select } from 'd3-selection'
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

        const outgoingBreakdown = getOutgoingBreakdownByDestination(locKey, out)
        const color = out.topLocationKeys.has(locKey) ? out.locationColorScale(locKey) : '#666'

        const donutValues = [
            {
                label: 'Incoming', // ✅ match tooltip
                value: out.flowInternal_ ? incoming + internal : incoming,
                color,
            },
            ...outgoingBreakdown.map((d) => ({
                label: d.key, // ✅ unify key→label
                value: d.value,
                color: d.color,
            })),
        ]

        // 🔹 Generate pie segments and attach parent reference
        const pieData = pieGen(donutValues)
        pieData.forEach((segment) => {
            segment.data.parent = {
                id: locKey,
                name: locKey,
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
            })
            .on('mousemove', function (event, d) {
                if (out._tooltip) out._tooltip.mousemove(event)
            })
            .on('mouseout', function (event, d) {
                if (out._tooltip) out._tooltip.mouseout()
                unhighlightDonut(event, out.svg_)
            })

        // Inner circle
        g.append('circle')
            .attr('r', out.donutSizeScale(total) * 0.4)
            .attr('fill', 'white')
    })
}

function donutMouseoverFunction(d, out) {
    const percentFormat = format('.0%')
    const includeInternal = out.flowInternal_

    const node = d.data.parent
    const donutValues = node.donutValues
    const total = sum(donutValues, (v) => v.value)
    const statData = out.statData?.()
    const unit = statData?.unitText?.() || ''

    // Prepare breakdown segments
    const incomingSegment = donutValues.find((v) => v.label === 'Incoming')
    const internalSegment = donutValues.find((v) => v.label === 'Internal')
    const outgoingSegments = donutValues.filter((v) => v.label !== 'Incoming' && v.label !== 'Internal')

    const buf = []

    // --- Header ---
    buf.push(`
        <div class="em-tooltip-bar">
            <b>${node.name || node.id || 'Unknown location'}</b>
        </div>
    `)

    // --- Content wrapper ---
    buf.push(`<div class="em-tooltip-text"><table class="em-tooltip-table"><tbody>`)

    // Incoming row
    if (incomingSegment) {
        const percent = percentFormat(incomingSegment.value / total)
        buf.push(`
            <tr>
                <td>
                    <span style="
                        display:inline-block;
                        width:10px;
                        height:10px;
                        border-radius:50%;
                        background:${incomingSegment.color};
                        margin-right:6px;
                    "></span> Incoming
                </td>
                <td style="text-align:right">
                    ${spaceAsThousandSeparator(incomingSegment.value)} (${percent})
                </td>
            </tr>
        `)
    }

    // Internal row (optional)
    if (includeInternal && internalSegment && internalSegment.value > 0) {
        const percent = percentFormat(internalSegment.value / total)
        buf.push(`
            <tr>
                <td>
                    <span style="
                        display:inline-block;
                        width:10px;
                        height:10px;
                        border-radius:50%;
                        background:${internalSegment.color};
                        margin-right:6px;
                    "></span> Internal
                </td>
                <td style="text-align:right">
                    ${spaceAsThousandSeparator(internalSegment.value)} (${percent})
                </td>
            </tr>
        `)
    }

    // Outgoing breakdown
    const totalOutgoing = sum(outgoingSegments, (v) => v.value)
    const outgoingPercent = percentFormat(totalOutgoing / total)

    // Outgoing header
    buf.push(`
        <tr>
            <td style="padding-top:3px;">
                Outgoing: 
            </td><td>${spaceAsThousandSeparator(totalOutgoing)} (${outgoingPercent})</td>
        </tr>
    `)

    outgoingSegments.forEach((segment) => {
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
                    "></span> ${segment.label}
                </td>
                <td style="text-align:right">
                    ${spaceAsThousandSeparator(segment.value)} (${percent})
                </td>
            </tr>
        `)
    })

    // Total row
    buf.push(`
        <tr class="em-tooltip-total">
            <td colspan="2" style="padding-top:4px; font-weight:bold;">
                Total: ${spaceAsThousandSeparator(total)} ${unit}
            </td>
        </tr>
    `)

    // Close table and wrapper
    buf.push(`</tbody></table></div>`)

    return buf.join('')
}

function donutMouseoutFunction(d, out, event) {
    unhighlightDonut(event, out.svg_)
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

function getOutgoingBreakdownByDestination(locationKey, out) {
    const topKeys = out.topLocationKeys
    const color = (key) => out.locationColorScale(key)

    const breakdown = {}

    for (const link of out.flowGraph_.links) {
        const srcKey = link.source.id
        const tgtKey = link.target.id

        if (srcKey === locationKey && srcKey !== tgtKey) {
            const key = topKeys.has(tgtKey) ? tgtKey : 'Other'
            breakdown[key] = (breakdown[key] || 0) + link.value
        }
    }

    return Object.entries(breakdown).map(([key, value]) => ({
        key,
        value,
        color: key === 'Other' ? '#666' : color(key),
    }))
}

export function computeDonutValues(out) {
    const nodes = out.flowGraph_.nodes
    const topKeys = out.topLocationKeys || new Set()
    const colorScale = out.locationColorScale

    for (const node of nodes) {
        const valuesMap = new Map()

        // Incoming flows
        for (const link of node.targetLinks) {
            const sourceKey = link.source.id
            const key = topKeys.has(sourceKey) ? sourceKey : 'Other'
            valuesMap.set(key, (valuesMap.get(key) || 0) + link.value)
        }

        // Outgoing flows
        for (const link of node.sourceLinks) {
            const targetKey = link.target.id
            const key = topKeys.has(targetKey) ? targetKey : 'Other'
            valuesMap.set(key, (valuesMap.get(key) || 0) + link.value)
        }

        // Convert map to donutValues array with color
        node.donutValues = Array.from(valuesMap.entries()).map(([key, value]) => ({
            label: key,
            value,
            color: key === 'Other' ? '#ccc' : colorScale(key),
        }))
    }
}
