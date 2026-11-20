import { spaceAsThousandSeparator } from '../../core/utils'
import { select } from 'd3-selection'
import { createSqrtScale } from '../../core/scale'
import { getResponsiveSymbolSize } from '../../core/responsive'

export function prepareCircleNodes(out) {
    const statsByLoc = new Map()

    for (const node of out.flowGraph_.nodes) {
        statsByLoc.set(node.id, {
            x: node.x,
            y: node.y,
            incoming: 0,
            outgoing: 0,
            internal: 0,
        })
    }

    for (const link of out.flowGraph_.links) {
        const src = link.source.id
        const tgt = link.target.id
        const v = Number(link.value) || 0

        if (src === tgt) {
            statsByLoc.get(src).internal += v
        } else {
            statsByLoc.get(src).outgoing += v
            statsByLoc.get(tgt).incoming += v
        }
    }

    const internalOnly = out.flowNodeSizeBy_ === 'internal'
    for (const stats of statsByLoc.values()) {
        stats.total = stats.incoming + stats.outgoing + (out.flowInternal_ ? stats.internal : 0)
        stats.size = internalOnly ? stats.internal : stats.total
    }

    // size scale
    out._nodeSizeScale =
        out.flowNodeSizeScale_ ||
        createSqrtScale(
            Array.from(statsByLoc.values(), (stats) => stats.size),
            getResponsiveSymbolSize(out.flowMaxNodeSize_ || 20, 3),
            getResponsiveSymbolSize(out.flowMinNodeSize_ || 0, 0)
        )

    for (const stats of statsByLoc.values()) {
        stats.radius = stats.size > 0 ? out._nodeSizeScale(stats.size) : 0
    }
    return statsByLoc
}

export function drawNodeCircles(out, container, stats) {
    const includeInternal = out.flowInternal_ || out.flowNodeSizeBy_ === 'internal'
    const circlesContainer = container.append('g').attr('class', 'em-node-circles')

    // simple tooltip
    function makeTooltip(locKey) {
        const s = stats.get(locKey)
        const incoming = s.incoming
        const outgoing = s.outgoing
        const internal = s.internal

        const unit = out.statData?.()?.unitText?.() || ''

        return `
            <div class="em-tooltip-bar"><b>${out.nodeNameMap?.get(locKey) || locKey}</b></div>
            <div class="em-tooltip-text">
                <table class="em-tooltip-table"><tbody>
                    <tr><td>Incoming:</td><td style="text-align:right">${spaceAsThousandSeparator(incoming)}</td></tr>
                    <tr><td>Outgoing:</td><td style="text-align:right">${spaceAsThousandSeparator(outgoing)}</td></tr>
                    ${includeInternal ? `<tr><td>Internal:</td><td style="text-align:right">${spaceAsThousandSeparator(internal)}</td></tr>` : ''}
                    <tr class="em-tooltip-total">
                        <td colspan="2" style="padding-top:4px;font-weight:bold;">
                            Total: ${spaceAsThousandSeparator(s.incoming + s.outgoing + (includeInternal ? s.internal : 0))} ${unit}
                        </td>
                    </tr>
                </tbody></table>
            </div>
        `
    }

    function nodeFill(id) {
        // color by topLocations if present
        if (out.topLocationKeys?.has(id)) {
            return out.topLocationColorScale(id)
        }
        // fallback: global flow color or blue
        if (typeof out.flowColor_ === 'string') return out.flowColor_
        return '#2d50a0'
    }

    // draw circles
    stats.forEach((s, locKey) => {
        if (!(s.radius > 0)) return

        const g = circlesContainer
            .append('g')
            .attr('class', 'em-node-circle-group')
            .attr('transform', `translate(${s.x},${s.y})`)
            .attr('data-id', locKey)

        // main circle
        g.append('circle')
            .attr('r', s.radius)
            .attr('class', 'em-node-circle')
            .attr('fill', nodeFill(locKey))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .on('mouseover', function (event) {
                select(this).attr('stroke-width', 1.5)
                if (out.map._tooltip) out.map._tooltip.mouseover(makeTooltip(locKey))
                highlightLines(container, locKey)
            })
            .on('mouseout', function (event) {
                select(this).attr('stroke-width', 0.5)
                if (out.map._tooltip) out.map._tooltip.mouseout(event)
                container.selectAll('.em-flow-link, .em-flow-link-bundled').classed('highlighted dimmed', false)
            })
            .on('mousemove', (event) => {
                if (out.map._tooltip) out.map._tooltip.mousemove(event)
            })
    })
}

function highlightLines(container, nodeId) {
    if (!nodeId) return

    container
        .selectAll('.em-flow-link, .em-flow-link-bundled')
        .classed('highlighted', function () {
            const o = this.getAttribute('data-origin')
            const d = this.getAttribute('data-dest')
            return o === nodeId || d === nodeId
        })
        .classed('dimmed', function () {
            const o = this.getAttribute('data-origin')
            const d = this.getAttribute('data-dest')
            return !(o === nodeId || d === nodeId)
        })
}
