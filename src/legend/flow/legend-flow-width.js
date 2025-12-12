import { select } from "d3-selection";
import { format as d3format } from "d3-format";
import { spaceAsThousandSeparator } from "../../core/utils";

const fmt = d3format ? d3format(".2s") : (v => String(v));
const comma = d3format ? d3format(",") : (v => String(v));

export function drawHorizontalFlowWidthLegend(out, baseX, baseY) {
    if (!out) return null;
    const map = out.map || out;
    if (!map || !map.strokeWidthScale) return null;

    // remove previous container if any
    if (out._flowWidthContainer) out._flowWidthContainer.remove();

    //config
    const cfg = out.flowWidthLegend
    out._flowWidthContainer = out.lgg
        .append("g")
        .attr("class", "em-flow-width-legend-horizontal")
        .attr("transform", `translate(${baseX}, ${baseY})`);

    if (cfg.title) {
        out._flowWidthContainer
            .append('text')
            .attr('class', 'em-width-legend-title')
            .text(cfg.title || 'Flow width')
    }

    // keep same defaults as your notebook
    const x = cfg.x ?? 0;
    const totalWidth = cfg.width || out.width;
    const segments = cfg.segments ?? 5;
    const labelOffset = cfg.labelOffset ?? 12;
    const pad = cfg.pad ?? 0;

    // baseline inner coordinates (moved *after* values calculation)
    const innerStart = x + pad;
    const innerEnd = x + totalWidth - pad;
    const innerWidth = Math.max(0, innerEnd - innerStart);

    // sample values (linear interpolation across domain)
    const sampleVals = [];
    const max = out.map.maxFlowCount;
    const min = out.map.minFlowCount;
    for (let i = 0; i < segments; i++) {
        const t = segments === 1 ? 0.5 : i / (segments - 1);
        sampleVals.push(min + t * (max - min));
    }
    const values = cfg.values || sampleVals;

    const n = Math.max(1, values.length - 1);
    const slabWidth = innerWidth / n;

    // compute stroke widths using the map scale (force visible floor)
    const strokeWidths = values.map((v) => Math.max(0.5, map.strokeWidthScale(v)));
    const maxStroke = Math.max(...strokeWidths);

    // vertical placement: match previous notebook spacing
    const lineY = map.strokeWidthScale(max) + cfg.titlePadding

    const texts = out._flowWidthContainer.append("g").attr("class", "em-flow-legend-texts");
    const lines = out._flowWidthContainer.append("g").attr("class", "em-flow-legend-lines");

    // baseline (visual guide)
    lines.append("line")
        .attr('class', 'em-flow-legend-baseline')
        .attr("x1", innerStart)
        .attr("x2", innerEnd)
        .attr("y1", lineY)
        .attr("y2", lineY)
        .attr("stroke", "#eee")
        .attr("stroke-width", 1);

    for (let i = 0; i < n; i++) {
        const s = innerStart + i * slabWidth;
        const e = i === n - 1 ? innerEnd : innerStart + (i + 1) * slabWidth;
        const sw = strokeWidths[i];
        const val = values[i];

        lines.append("line")
            .style("stroke-width", sw)
            .attr("x1", s)
            .attr("x2", e)
            .attr("y1", lineY)
            .attr("y2", lineY)
            .style("stroke", cfg.color ?? "#000")
            .style("stroke-opacity", cfg.strokeOpacity ?? 1);

        // label centered on the slab
        const cx = (s + e) / 2;
        texts.append("text")
            .attr("x", cx)
            .attr("y", lineY - labelOffset)
            .attr("dy", "-0.35em")
            .attr("class", "em-legend-label em-flow-legend-label em-flow-width-horizontal-label")
            .text(fmt(val));
    }

    // captions for min/max aligned with baseline ends
    if (!cfg.maxMin) return;
    texts.append("text")
        .attr("x", innerStart)
        .attr("y", lineY + maxStroke + 6)
        .attr("class", "em-legend-label em-flow-legend-min-label")
        .attr('dy', '0.5em')
        .text(comma(Math.round(min)));

    texts.append("text")
        .attr("x", innerEnd)
        .attr("y", lineY + maxStroke + 6)
        .attr("class", "em-legend-label em-flow-legend-max-label")
        .attr('dy', '0.5em')
        .text(comma(Math.round(max)));

}


export function drawVerticalFlowWidthLegend(out, baseX, baseY) {
    const map = out.map
    if (!map.strokeWidthScale) return
    out._flowWidthContainer = out.lgg.append('g').attr('class', 'em-flow-width-legend').attr('transform', `translate(${baseX}, ${baseY})`)

    //config
    const cfg = out.flowWidthLegend
    const segments = cfg.segments ?? 5;

    if (cfg.title) {
        out._flowWidthContainer
            .append('text')
            .attr('class', 'em-width-legend-title')
            .text(cfg.title || 'Flow width')
    }

    // Representative values (min, mid, max or user-defined)
    const sampleVals = [];
    const max = out.map.maxFlowCount
    const min = out.map.minFlowCount
    for (let i = 0; i < segments; i++) {
        const t = segments === 1 ? 0.5 : i / (segments - 1);
        sampleVals.push(min + t * (max - min));
    }
    const values = cfg.values || sampleVals

    let currentY = cfg.titlePadding || 10
    const padding = 7 // extra spacing between items
    let x = 0

    const scale = map.strokeWidthScale
    values.forEach((val, i) => {
        const strokeWidth = scale(val)

        // Space relative to previous line (half previous + half current + padding)
        if (i > 0) {
            const prevStrokeWidth = scale(values[i - 1])
            currentY += prevStrokeWidth / 2 + strokeWidth / i + padding
        }

        let label = cfg.labelFormatter ? cfg.labelFormatter(val) : spaceAsThousandSeparator(val)
        if (cfg.labels && cfg.labels[i]) label = cfg.labels[i];//manual override

        out._flowWidthContainer
            .append('line')
            .attr('x1', x)
            .attr('x2', x + 40)
            .attr('y1', currentY)
            .attr('y2', currentY)
            .attr('stroke', cfg.color ? cfg.color : '#6b6b6b')
            .attr('stroke-width', strokeWidth)

        out._flowWidthContainer
            .append('text')
            .attr('x', x + 50)
            .attr('y', currentY)
            .attr('dy', '0.35em')
            .attr('class', 'em-legend-label')
            .text(label)
    })
}
