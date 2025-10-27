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

// straight lines that can be bidirectional. If flow is bidirectional, draw two half-lines from midpoint to each node.
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

    // Step 2: Draw each route
    for (const route of routeMap.values()) {
        const { idA, idB, coordsA, coordsB, flowAB, flowBA } = route
        const midX = (coordsA[0] + coordsB[0]) / 2
        const midY = (coordsA[1] + coordsB[1]) / 2

        const abStroke = () => getFlowStroke(out, idA, idB, route)
        const baStroke = () => getFlowStroke(out, idB, idA, route)

        // --- CASE 1: bidirectional (draw two half-lines)
        if (flowAB > 0 && flowBA > 0) {
            // A → B half-line
            lineGroup
                .append('line')
                .attr('data-nb', flowAB)
                .attr('x1', midX)
                .attr('y1', midY)
                .attr('x2', coordsB[0])
                .attr('y2', coordsB[1])
                .attr('data-origin', idA)
                .attr('data-dest', idB)
                .attr('stroke', abStroke)
                .attr('stroke-width', out.strokeWidthScale(flowAB).toFixed(1))
                .attr('stroke-opacity', out.flowOpacity_)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, idA, idB, flowAB))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, abStroke))

            // B → A half-line
            lineGroup
                .append('line')
                .attr('data-nb', flowBA)
                .attr('x1', midX)
                .attr('y1', midY)
                .attr('x2', coordsA[0])
                .attr('y2', coordsA[1])
                .attr('data-origin', idB)
                .attr('data-dest', idA)
                .attr('stroke', baStroke)
                .attr('stroke-width', out.strokeWidthScale(flowBA).toFixed(1))
                .attr('stroke-opacity', out.flowOpacity_)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, idB, idA, flowBA))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, baStroke))
        }

        // --- CASE 2: unidirectional A → B
        else if (flowAB > 0 && flowBA === 0) {
            lineGroup
                .append('line')
                .attr('data-nb', flowAB)
                .attr('x1', coordsA[0])
                .attr('y1', coordsA[1])
                .attr('x2', coordsB[0])
                .attr('y2', coordsB[1])
                .attr('data-origin', idA)
                .attr('data-dest', idB)
                .attr('stroke', abStroke)
                .attr('stroke-width', out.strokeWidthScale(flowAB).toFixed(1))
                .attr('stroke-opacity', out.flowOpacity_)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, idA, idB, flowAB))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, abStroke))
        }

        // --- CASE 3: unidirectional B → A
        else if (flowBA > 0 && flowAB === 0) {
            lineGroup
                .append('line')
                .attr('data-nb', flowBA)
                .attr('x1', coordsB[0])
                .attr('y1', coordsB[1])
                .attr('x2', coordsA[0])
                .attr('y2', coordsA[1])
                .attr('data-origin', idB)
                .attr('data-dest', idA)
                .attr('stroke', baStroke)
                .attr('stroke-width', out.strokeWidthScale(flowBA).toFixed(1))
                .attr('stroke-opacity', out.flowOpacity_)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, idB, idA, flowBA))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, baStroke))
        }
    }

    function getFlowStroke(out, originId, destId, d) {
        if (typeof out.flowColor_ === 'function') {
            return out.flowColor_(d)
        }
        if (!out.topLocationKeys || !out.flowTopLocations_ || !out.flowDonuts_) return out.flowColor_

        // Determine coloring based on top N locations setting
        const type = out.flowTopLocationsType_ || 'sum'
        if (type === 'origin') {
            // Color by origin
            return out.topLocationKeys.has(originId) ? out.topLocationColorScale(originId) : out.flowColor_
        } else if (type === 'destination') {
            // Color by destination
            return out.topLocationKeys.has(destId) ? out.topLocationColorScale(destId) : out.flowColor_
        } else {
            // Default: color by whichever is in top set
            return out.topLocationKeys.has(destId)
                ? out.topLocationColorScale(destId)
                : out.topLocationKeys.has(originId)
                    ? out.topLocationColorScale(originId)
                    : out.flowColor_
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
