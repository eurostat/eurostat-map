import { forceSimulation, forceManyBody, forceLink } from 'd3-force'
import { curveBundle, line } from 'd3-shape'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { applyArrow } from './arrows.js'
import { select } from 'd3-selection'
import { getFlowStroke, computeColorKey, onFlowLineMouseOver, onFlowLineMouseOut } from './straight.js' // reuse your helpers

export function drawEdgeBundleLines(out, lineGroup) {
    const width = out.width_ || out.innerWidth_ || 1000
    const height = out.height_ || out.innerHeight_ || 800
    const hypotenuse = Math.sqrt(width * width + height * height)

    const scales = {
        segments: scaleLinear().domain([0, hypotenuse]).range([1, 10]),
        nodes: out._nodeSizeScale || scaleSqrt().range([4, 18]),
    }

    // Build the bundled network
    const bundle = generateSegments(out.flowGraph_.nodes, out.flowGraph_.links, scales)

    // --- Style setup: compute stroke, width, and colors for each path ---
    const arrowIds = out.flowArrows_
        ? out._arrowIds || {} // reuse markers if already built
        : null

    const lineFunction = line()
        .curve(curveBundle.beta(0.85))
        .x((d) => d.x)
        .y((d) => d.y)

    const paths = lineGroup
        .selectAll('path.em-flow-link')
        .data(bundle.paths)
        .enter()
        .append('path')
        .attr('d', lineFunction)
        .attr('class', 'em-flow-link')
        .attr('fill', 'none')
        .style('cursor', 'pointer')
        .style('pointer-events', 'auto')
        .attr('stroke-linecap', 'butt')
        .attr('stroke-opacity', out.flowOpacity_ ?? 1)
        .each(function (d, i) {
            // find source/target IDs for metadata
            const source = d[0]
            const target = d[d.length - 1]
            const originId = source.id || source.code || source.iata
            const destId = target.id || target.code || target.iata
            const val = out.flowGraph_.links?.[i]?.value ?? 1

            const baseColor = getFlowStroke(out, originId, destId, null, val)
            const colorKey = computeColorKey(out, originId, destId)
            const paint = baseColor
            const strokeW = out.strokeWidthScale(val)

            select(this)
                .attr('data-nb', val)
                .attr('data-origin', originId)
                .attr('data-dest', destId)
                .attr('data-color', baseColor)
                .attr('data-color-key', colorKey)
                .attr('stroke', paint)
                .attr('stroke-width', strokeW)
                .attr('stroke-dasharray', out.flowArrows_ ? '5 5' : null)

            if (out.flowArrows_) applyArrow(select(this), arrowIds, 'normal')
        })

    //mouse events
    paths
        .on('mouseover', function (event, d) {
            const src = d[0]
            const dst = d[d.length - 1]
            const originId = src.id || src.code || src.iata
            const destId = dst.id || dst.code || dst.iata
            const val =
                out.flowGraph_.links?.find((l) => (l.source.id || l.source.code) === originId && (l.target.id || l.target.code) === destId)?.value ??
                1

            // Call imported hover handler
            onFlowLineMouseOver(out, originId, destId, val, arrowIds).call(this, event)
        })
        .on('mousemove', function (event) {
            if (out._tooltip) out._tooltip.mousemove(event)
        })
        .on('mouseout', function (event, d) {
            const baseColor = select(this).attr('data-color')
            onFlowLineMouseOut(out, baseColor, arrowIds).call(this, event)
        })

    // --- Animate (edge bundling simulation) ---
    const layout = forceSimulation()
        .alphaDecay(out.flowBundleSettings_.alphaDecay)
        .force(
            'charge',
            forceManyBody()
                .strength(out.flowBundleSettings_.chargeStrength)
                .distanceMax(out.flowBundleSettings_.distanceMax ? out.flowBundleSettings_.distanceMax : scales.nodes.range()[1] * 2)
        )
        .force('link', forceLink().strength(out.flowBundleSettings_.linkStrength).distance(0).iterations(out.flowBundleSettings_.linkIterations))
        .on('tick', () => paths.attr('d', lineFunction))
        .on('end', () => console.log('layout complete'))

    layout.nodes(bundle.nodes)
    layout.force('link').links(bundle.links)
}

// --- same segment generator as before ---
function generateSegments(nodes, links, scales) {
    const bundle = { nodes: [], links: [], paths: [] }

    bundle.nodes = nodes.map((d) => {
        d.fx = d.x
        d.fy = d.y
        return d
    })

    links.forEach((d) => {
        const len = distance(d.source, d.target)
        const total = Math.round(scales.segments(len))
        const xscale = scaleLinear()
            .domain([0, total + 1])
            .range([d.source.x, d.target.x])
        const yscale = scaleLinear()
            .domain([0, total + 1])
            .range([d.source.y, d.target.y])

        let src = d.source
        const local = [src]
        for (let j = 1; j <= total; j++) {
            const tgt = { x: xscale(j), y: yscale(j) }
            local.push(tgt)
            bundle.nodes.push(tgt)
            bundle.links.push({ source: src, target: tgt })
            src = tgt
        }
        local.push(d.target)
        bundle.links.push({ source: src, target: d.target })
        bundle.paths.push(local)
    })

    return bundle
}

function distance(a, b) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
}
