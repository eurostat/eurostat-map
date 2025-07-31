import { select } from 'd3-selection'

/**
     * Function to create a flow map with straight lines.
     * exampleGraph = {
                nodes: [
                    { id: 'FR', x: 681.1851800759263, y: 230.31124763648583 },
                    { id: 'DE', x: 824.5437782154489, y: 123.70302649032199 },
                ],
                links: [
                    { source: 'FR', target: 'DE', value: 82018369.72 },
                ],
            }
     */
export function createFlowMap(out, flowMapContainer) {
    drawStraightLinesByFlow(out, flowMapContainer)
}

function drawStraightLinesByFlow(out, container) {
    const lineGroup = container.append('g').attr('class', 'em-flow-lines').attr('id', 'em-flow-lines')

    const { nodes, links } = out.flowGraph_

    // Build a quick lookup for node coordinates
    const nodeMap = new Map(nodes.map((n) => [n.id, [n.x, n.y]]))

    // Step 1: Group flows by unordered route key but track direction separately
    const routeMap = new Map()

    links.forEach((link) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target

        const origin = nodeMap.get(sourceId)
        const dest = nodeMap.get(targetId)
        if (!origin || !dest) return // skip invalid links

        // Use a consistent key for grouping regardless of direction
        const originKey = `${origin[0]},${origin[1]}`
        const destKey = `${dest[0]},${dest[1]}`
        const key = originKey < destKey ? `${originKey}|${destKey}` : `${destKey}|${originKey}`

        if (!routeMap.has(key)) {
            routeMap.set(key, {
                coordsA: originKey < destKey ? origin : dest,
                coordsB: originKey < destKey ? dest : origin,
                flowAB: 0,
                flowBA: 0,
            })
        }

        const route = routeMap.get(key)
        if (originKey < destKey) route.flowAB += link.value
        else route.flowBA += link.value
    })

    // Step 2: Draw each direction (halfway from origin to destination)
    // Step 2: Draw each direction (halfway from origin to destination)
    for (const route of routeMap.values()) {
        const { coordsA, coordsB, flowAB, flowBA } = route
        const midX = (coordsA[0] + coordsB[0]) / 2
        const midY = (coordsA[1] + coordsB[1]) / 2

        const abStroke = () => {
            const locKey = `${coordsB[0]},${coordsB[1]}`
            return out.topLocationKeys.has(locKey) ? out.locationColorScale(locKey) : out.flowColor_
        }
        const baStroke = () => {
            const locKey = `${coordsA[0]},${coordsA[1]}`
            return out.topLocationKeys.has(locKey) ? out.locationColorScale(locKey) : out.flowColor_
        }

        // A → B line
        if (flowAB > 0) {
            const flow = flowAB
            const origin = coordsA
            const dest = coordsB

            lineGroup
                .append('line')
                .attr('data-nb', flow)
                .attr('x1', midX)
                .attr('y1', midY)
                .attr('x2', coordsB[0])
                .attr('y2', coordsB[1])
                .attr('data-origin', `${origin[0]},${origin[1]}`)
                .attr('data-dest', `${dest[0]},${dest[1]}`)
                .attr('stroke', abStroke)
                .attr('stroke-width', out.strokeWidthScale(flow).toFixed(1))
                .attr('stroke-opacity', out.flowOpacity_)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, origin, dest, flow))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, abStroke))
        }

        // B → A line
        if (flowBA > 0) {
            const flow = flowBA
            const origin = coordsB
            const dest = coordsA

            lineGroup
                .append('line')
                .attr('data-nb', flow)
                .attr('x1', midX)
                .attr('y1', midY)
                .attr('x2', coordsA[0])
                .attr('y2', coordsA[1])
                .attr('data-origin', `${origin[0]},${origin[1]}`)
                .attr('data-dest', `${dest[0]},${dest[1]}`)
                .attr('stroke', baStroke)
                .attr('stroke-width', out.strokeWidthScale(flow).toFixed(1))
                .attr('stroke-opacity', out.flowOpacity_)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, origin, dest, flow))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, baStroke))
        }
    }

    // Hover handler
    function onFlowLineMouseOver(out, origin, dest, flow) {
        return function (e) {
            const hoveredColor = out.hoverColor_ || 'black'
            select(this).attr('stroke', hoveredColor)

            if (out._tooltip) {
                // Find node objects by coords
                const sourceNode = out.flowGraph_.nodes.find((n) => n.x === origin[0] && n.y === origin[1]) || { id: `${origin[0]},${origin[1]}` }
                const targetNode = out.flowGraph_.nodes.find((n) => n.x === dest[0] && n.y === dest[1]) || { id: `${dest[0]},${dest[1]}` }

                // Build the proper link object for your tooltip
                const linkObj = { source: sourceNode, target: targetNode, value: flow }

                out._tooltip.mouseover(out.tooltip_.textFunction(linkObj, out))
            }
        }
    }

    // Move handler
    function onFlowLineMouseMove(out) {
        return function (e) {
            if (out._tooltip) out._tooltip.mousemove(e)
        }
    }

    // Out handler
    function onFlowLineMouseOut(out, strokeFn) {
        return function () {
            // Revert to the data-driven color
            select(this).attr('stroke', strokeFn())

            if (out._tooltip) out._tooltip.mouseout()
        }
    }
}
