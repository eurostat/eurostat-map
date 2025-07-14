import { sum, max } from 'd3-array'
import { scaleSqrt } from 'd3-scale'
import { arc, pie } from 'd3-shape'
import { spaceAsThousandSeparator } from '../../core/utils'
import { select } from 'd3-selection'

export function addDonutsToNodes(out, container, nodes) {
    container.select('.em-flow-donuts')?.remove()
    const group = container.append('g').attr('class', 'em-flow-donuts').attr('id', 'em-flow-donuts')

    const maxValue = max(nodes, (d) => sum(d.donutValues, (v) => v.value))
    const sizeScale = scaleSqrt().domain([0, maxValue]).range([6, 18])
    const colorByLabel = {
        Incoming: '#1f77b4', // blue
        Outgoing: '#ff7f0e', // orange
        Internal: out.internalColor || '#999999', // gray (optional)
    }

    const arcFunction = arc()
        .innerRadius(0)
        .outerRadius((d) => {
            const values = d.data?.parent?.donutValues ?? []
            const total = sum(values, (v) => v.value)
            return sizeScale(total)
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
        .attr('fill', (d) => colorByLabel[d.data.label] || '#ccc')

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

export function computeDonutValues(nodes) {
    for (const node of nodes) {
        const inValue = sum(node.targetLinks, (d) => d.value)
        const outValue = sum(node.sourceLinks, (d) => d.value)
        const selfValue = node.sourceLinks.some((l) => l.target === node)
            ? sum(
                  node.sourceLinks.filter((l) => l.target === node),
                  (d) => d.value
              )
            : 0

        node.donutValues = [
            { label: 'Incoming', value: inValue },
            { label: 'Outgoing', value: outValue },
        ]

        // Include internal/self loops if present
        if (selfValue > 0) {
            node.donutValues.push({ label: 'Internal', value: selfValue })
        }
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
    buf.push(`<div class="estat-vis-tooltip-bar"><b>${name}</b></div>`)

    // Donut breakdown
    buf.push(`<div class='estat-vis-tooltip-text'>
                <table class="nuts-table"><tbody>`)

    for (const segment of node.donutValues) {
        const color =
            {
                Incoming: '#1f77b4',
                Outgoing: '#ff7f0e',
                Internal: out.internalColor || '#999999',
            }[segment.label] || '#ccc'

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
