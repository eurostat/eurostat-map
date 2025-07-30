import { scaleOrdinal } from 'd3-scale'
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
    const uniqueLocations = Array.from(nodes).sort((a, b) => b.value - a.value)
    const topLocationsN = 10 // Number of top locations to show
    const topLocations = [...uniqueLocations].slice(0, topLocationsN)
    const topLocationKeys = new Set(topLocations.map((loc) => `${loc.x},${loc.y}`))
    const locationColor = scaleOrdinal()
        .domain([...topLocations].map((d) => `${d.x},${d.y}`))
        //.range(d3.schemeCategory10) // Or any custom palette of 4 colors
        .range([
            '#00B3E3', // bright turquoise
            '#FBBA00', // golden yellow
            '#2BA966', // medium green
            '#D23142', // red pink
            '#005289', // deep blue
            '#93397F', // deep mauve
            '#E73E11', // bright red orange
            '#4E4084', // muted purple
            '#056731', // dark green
            '#00667E', // teal blue
            '#B5B900', // light green
        ])

    // Build a quick lookup for node coordinates
    const nodeMap = new Map(nodes.map((n) => [n.id, [n.x, n.y]]))

    // Step 1: Group flows by unordered route key but track direction separately
    const routeMap = new Map()

    links.forEach((link) => {
        const origin = nodeMap.get(link.source)
        const dest = nodeMap.get(link.target)
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
        const aProj = out._projection(coordsA)
        const bProj = out._projection(coordsB)
        const midX = (aProj[0] + bProj[0]) / 2
        const midY = (aProj[1] + bProj[1]) / 2

        const abStroke = () => {
            const locKey = `${coordsB[0]},${coordsB[1]}`
            return topLocationKeys.has(locKey) ? locationColor(locKey) : out.flowColor_
        }
        const baStroke = () => {
            const locKey = `${coordsA[0]},${coordsA[1]}`
            return topLocationKeys.has(locKey) ? locationColor(locKey) : out.flowColor_
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
                .attr('x2', bProj[0])
                .attr('y2', bProj[1])
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
                .attr('x2', aProj[0])
                .attr('y2', aProj[1])
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
