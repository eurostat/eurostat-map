import { max } from "d3-array"
import { scaleSqrt } from "d3-scale"
import { spaceAsThousandSeparator } from "../../core/utils"
import { create, select, selectAll } from 'd3-selection'
import { createSqrtScale } from "../../core/scale"

function computeCircleLocationStats(out) {
    const statsByLoc = {}

    for (const node of out.flowGraph_.nodes) {
        statsByLoc[node.id] = {
            x: node.x,
            y: node.y,
            incoming: 0,
            outgoing: 0,
            internal: 0
        }
    }

    for (const link of out.flowGraph_.links) {
        const src = link.source.id
        const tgt = link.target.id
        const v = link.value || 0

        // regular flows
        if (statsByLoc[src]) statsByLoc[src].outgoing += v
        if (statsByLoc[tgt]) statsByLoc[tgt].incoming += v

        // internal flow (self-loop)
        if (src === tgt) {
            statsByLoc[src].internal += v
        }
    }

    out.locationStats = statsByLoc
}


export function drawNodeCircles(out, container) {
    // make sure stats exist
    if (!out.locationStats) computeCircleLocationStats(out)

    const stats = out.locationStats
    const includeInternal = out.flowInternal_

    // compute totals per node
    const totals = Object.values(stats).map(s =>
        includeInternal
            ? s.incoming + s.outgoing + s.internal
            : s.incoming + s.outgoing
    )

    const maxValue = max(totals.length ? totals : [0])

    // size scale
    out._nodeSizeScale =
        out.flowNodeSizeScale_ ||
        createSqrtScale(totals, out.flowMaxNodeSize_ || 20, out.flowMinNodeSize_ || 0)

    const circlesContainer = container
        .append("g")
        .attr("class", "em-node-circles")

    // simple tooltip
    function makeTooltip(locKey) {
        const s = stats[locKey]
        const incoming = s.incoming
        const outgoing = s.outgoing
        const internal = s.internal
        const total = includeInternal ? incoming + outgoing + internal : incoming + outgoing

        const unit = out.statData?.()?.unitText?.() || ""

        return `
            <div class="em-tooltip-bar"><b>${out.nodeNameMap?.get(locKey) || locKey}</b></div>
            <div class="em-tooltip-text">
                <table class="em-tooltip-table"><tbody>
                    <tr><td>Incoming:</td><td style="text-align:right">${spaceAsThousandSeparator(incoming)}</td></tr>
                    <tr><td>Outgoing:</td><td style="text-align:right">${spaceAsThousandSeparator(outgoing)}</td></tr>
                    ${includeInternal
                ? `<tr><td>Internal:</td><td style="text-align:right">${spaceAsThousandSeparator(internal)}</td></tr>`
                : ""
            }
                    <tr class="em-tooltip-total">
                        <td colspan="2" style="padding-top:4px;font-weight:bold;">
                            Total: ${spaceAsThousandSeparator(total)} ${unit}
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
        if (typeof out.flowColor_ === "string") return out.flowColor_
        return "#2d50a0"
    }

    // draw circles
    Object.entries(stats).forEach(([locKey, s]) => {
        const total = includeInternal
            ? s.incoming + s.outgoing + s.internal
            : s.incoming + s.outgoing

        if (!total) return

        const g = circlesContainer
            .append("g")
            .attr("class", "em-node-circle-group")
            .attr("transform", `translate(${s.x},${s.y})`)
            .attr("data-id", locKey)

        const r = out._nodeSizeScale(total)

        // main circle
        g.append("circle")
            .attr("r", r).attr("class", "em-node-circle")
            .attr("fill", nodeFill(locKey))
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mouseover", function (event) {
                select(this).attr("stroke-width", 1.5)
                if (out._tooltip) out._tooltip.mouseover(makeTooltip(locKey))
                highlightLines(locKey)
            })
            .on("mouseout", function(event)  {
                select(this).attr("stroke-width", 0.5)
                if (out._tooltip) out._tooltip.mouseout(event)
                unhighlightLines()
            })
            .on("mousemove", event => {
                if (out._tooltip) out._tooltip.mousemove(event)
            })

    })
}

function highlightLines(nodeId) {
  if (!nodeId) return;

  selectAll('.em-flow-link, .em-flow-link-bundled')
    .classed('highlighted', function () {
      const o = this.getAttribute('data-origin');
      const d = this.getAttribute('data-dest');
      return o === nodeId || d === nodeId;
    })
    .classed('dimmed', function () {
      const o = this.getAttribute('data-origin');
      const d = this.getAttribute('data-dest');
      return !(o === nodeId || d === nodeId);
    });
}

function unhighlightLines() {
  selectAll('.em-flow-link, .em-flow-link-bundled')
    .classed('highlighted', false)
    .classed('dimmed', false);
}