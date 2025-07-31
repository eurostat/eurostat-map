import { sum, max } from 'd3-array'
import { scaleSqrt } from 'd3-scale'
import { arc, pie } from 'd3-shape'
import { spaceAsThousandSeparator } from '../../core/utils'
import { select } from 'd3-selection'

export function drawDonuts(out, container) {
    const donutContainer = container.append('g').attr('class', 'donuts').attr('id', 'donuts')
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

        const donutData = [
            {
                key: 'incoming',
                value: out.flowInternal_ ? incoming + internal : incoming,
                color,
                x,
                y,
            },
            ...outgoingBreakdown,
        ]

        const g = donutContainer.append('g').attr('class', 'donut-group').attr('transform', `translate(${x},${y})`).attr('data-total', total)

        // Outer donut ring
        g.selectAll('path')
            .data(pieGen(donutData))
            .join('path')
            .attr('d', arcGen.innerRadius(out.donutSizeScale(total) * 0.4).outerRadius(out.donutSizeScale(total)))
            .attr('fill', (d) => d.data.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)

        // Inner circle
        g.append('circle')
            .attr('r', out.donutSizeScale(total) * 0.4)
            .attr('fill', 'white')
    })
}

export function addDonutsToNodes(out, container) {
    const nodes = out.flowGraph_.nodes
    container.select('.em-flow-donuts')?.remove()
    const group = container.append('g').attr('class', 'em-flow-donuts').attr('id', 'em-flow-donuts')

    const maxValue = max(nodes, (d) => sum(d.donutValues, (v) => v.value))

    const arcFunction = arc()
        .innerRadius(0)
        .outerRadius((d) => {
            const values = d.data?.parent?.donutValues ?? []
            const total = sum(values, (v) => v.value)
            return out.donutSizeScale(total)
        })

    const pieFunction = pie().value((d) => d.value)

    const nodeGroups = group
        .selectAll('g')
        .data(nodes.filter((n) => n.donutValues && sum(n.donutValues, (d) => d.value) > 0))
        .join('g')
        .attr('transform', (d) => `translate(${d.x},${d.y})`)

    nodeGroups
        .selectAll('path')
        .data((d) => {
            const pieData = pieFunction(d.donutValues)
            pieData.forEach((segment) => (segment.data.parent = d))
            return pieData
        })
        .join('path')
        .attr('d', arcFunction)
        .attr('fill', (d) => out.flowDonutColors_[d.data.label.toLowerCase()] || '#ccc')

    if (out._tooltip) {
        nodeGroups
            .selectAll('path')
            .on('mouseover', function (event, d) {
                out._tooltip.mouseover(donutMouseoverFunction(d, out, event))
            })
            .on('mousemove', (event) => out._tooltip.mousemove(event))
            .on('mouseout', (event, d) => {
                out._tooltip.mouseout()
                donutMouseoutFunction(d, out, event)
            })
    }
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

function donutMouseoverFunction(d, out, event) {
    highlightDonut(event, out.svg_)
    const node = d.data.parent
    const label = d.data.label
    const value = d.data.value
    const statData = out.statData?.()
    const unit = statData?.unitText?.() || ''

    const name = node.name || node.id || 'Unknown location'

    const buf = []

    // Header
    buf.push(`<div class="em-tooltip-bar"><b>${name}</b></div>`)

    // Donut breakdown
    buf.push(`<div class='em-tooltip-text'>
                <table class="em-tooltip-table"><tbody>`)

    for (const segment of node.donutValues) {
        const color = out.flowDonutColors_[segment.label.toLowerCase()] || '#ccc'

        buf.push(`
        <tr>
            <td>
                <span style="
                    display:inline-block;
                    width:10px;
                    height:10px;
                    border-radius:50%;
                    background:${color};
                    margin-right:6px;
                "></span>${segment.label}
            </td>
            <td style="text-align:right">${spaceAsThousandSeparator(segment.value)} ${unit}</td>
        </tr>
    `)
    }

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
