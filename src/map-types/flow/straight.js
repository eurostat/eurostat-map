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
        const key = sourceId < targetId ? `${sourceId}|${targetId}` : `${targetId}|${sourceId}`

        if (!routeMap.has(key)) {
            routeMap.set(key, {
                idA: sourceId < targetId ? sourceId : targetId,
                idB: sourceId < targetId ? targetId : sourceId,
                coordsA: sourceId < targetId ? origin : dest,
                coordsB: sourceId < targetId ? dest : origin,
                flowAB: 0,
                flowBA: 0,
            })
        }

        const route = routeMap.get(key)
        if (sourceId < targetId) route.flowAB += link.value
        else route.flowBA += link.value
    })

    // Step 2: Draw each direction
    for (const route of routeMap.values()) {
        const { idA, idB, coordsA, coordsB, flowAB, flowBA } = route
        const midX = (coordsA[0] + coordsB[0]) / 2
        const midY = (coordsA[1] + coordsB[1]) / 2

        const abStroke = () => (out.topLocationKeys.has(idB) ? out.locationColorScale(idB) : out.flowColor_)
        const baStroke = () => (out.topLocationKeys.has(idA) ? out.locationColorScale(idA) : out.flowColor_)

        // A → B line
        if (flowAB > 0) {
            const flow = flowAB
            lineGroup
                .append('line')
                .attr('data-nb', flow)
                .attr('x1', midX)
                .attr('y1', midY)
                .attr('x2', coordsB[0])
                .attr('y2', coordsB[1])
                .attr('data-origin', idA)
                .attr('data-dest', idB)
                .attr('stroke', abStroke)
                .attr('stroke-width', out.strokeWidthScale(flow).toFixed(1))
                .attr('stroke-opacity', out.flowOpacity_)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, idA, idB, flow))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, abStroke))
        }

        // B → A line
        if (flowBA > 0) {
            const flow = flowBA
            lineGroup
                .append('line')
                .attr('data-nb', flow)
                .attr('x1', midX)
                .attr('y1', midY)
                .attr('x2', coordsA[0])
                .attr('y2', coordsA[1])
                .attr('data-origin', idB)
                .attr('data-dest', idA)
                .attr('stroke', baStroke)
                .attr('stroke-width', out.strokeWidthScale(flow).toFixed(1))
                .attr('stroke-opacity', out.flowOpacity_)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, idB, idA, flow))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, baStroke))
        }
    }

    // Hover handler
    function onFlowLineMouseOver(out, sourceId, targetId, flow) {
        return function (e) {
            const hoveredColor = out.hoverColor_ || 'black'
            select(this).attr('stroke', hoveredColor)

            if (out._tooltip) {
                const sourceNode = out.flowGraph_.nodes.find((n) => n.id === sourceId)
                const targetNode = out.flowGraph_.nodes.find((n) => n.id === targetId)
                const linkObj = { source: sourceNode, target: targetNode, value: flow }
                out._tooltip.mouseover(out.tooltip_.textFunction(linkObj, out))
            }
        }
    }

    function onFlowLineMouseMove(out) {
        return function (e) {
            if (out._tooltip) out._tooltip.mousemove(e)
        }
    }

    function onFlowLineMouseOut(out, strokeFn) {
        return function () {
            select(this).attr('stroke', strokeFn())
            if (out._tooltip) out._tooltip.mouseout()
        }
    }
}
