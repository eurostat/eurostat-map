// options.preferred: { PARTNER_ID: [dx, dy] or [[dx, dy], ...] }, the sides of the flow end to try first, in order,
// e.g. { MA: [[-1, 1], [-1, 0]] } tries below-left of Morocco, then left, before the usual order. dx, dy are -1, 0 or 1.
// options.positions: { PARTNER_ID: [x, y] }, the centre of the label's first line in map pixels, used as it is (no search) for
// the few labels the automatic placement cannot put well.
// options.leftAligned: ['ID', ...], partners whose label lines start at the same x (their position's x is the left edge) instead of
// being centred on it; use it with positions.
function labelMaritimePartners(map, graph, options = {}) {
    const svg = map.svg()
    const zoomGroup = svg.select('#em-zoom-group-' + map.svgId())
    zoomGroup.selectAll('.maritime-partner-labels').remove()
    const labels = zoomGroup.append('g').attr('class', 'maritime-partner-labels').attr('pointer-events', 'none')
    const toMap = zoomGroup.node().getScreenCTM().inverse()
    const width = map.width()
    const height = map.height()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.ceil(height)
    const mask = canvas.getContext('2d')

    // Reserve the painted ribbon and symbol shapes, including the route outlines.
    zoomGroup.selectAll('.em-flow-link, .em-flow-link-outline, .em-flow-node-stems rect, .em-node-circle').each(function () {
        mask.setTransform(toMap.multiply(this.getScreenCTM()))
        if (this.tagName === 'path') {
            mask.fill(new Path2D(this.getAttribute('d')))
        } else {
            const { x, y, width, height } = this.getBBox()
            mask.fillRect(x, y, width, height)
        }
    })
    const pixels = mask.getImageData(0, 0, canvas.width, canvas.height).data
    const occupied = svg
        .selectAll('.em-title, .em-subtitle, .em-legend, .annotation-note')
        .nodes()
        .map((element) => {
            const box = element.getBoundingClientRect()
            const start = new DOMPoint(box.left, box.top).matrixTransform(toMap)
            const end = new DOMPoint(box.right, box.bottom).matrixTransform(toMap)
            return { left: start.x, top: start.y, right: end.x, bottom: end.y }
        })

    function fits(box) {
        const { left, right, top, bottom } = box
        if (left < 4 || right >= width - 4 || top < 4 || bottom >= height - 4) return false
        if (occupied.some((other) => left < other.right && right > other.left && top < other.bottom && bottom > other.top)) return false
        for (let y = top; y <= bottom; y++) {
            for (let x = left; x <= right; x++) {
                if (pixels[(y * canvas.width + x) * 4 + 3]) return false
            }
        }
        return true
    }

    const directions = ['Inwards', 'Outwards']
    const linksByPartner = d3.group(graph.links, (link) => {
        const partner = link.meta.direction === 'Inwards' ? link.source : link.target
        return partner.id ?? partner
    })
    const partners = [...graph.nodes].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    for (const partner of partners) {
        const links = linksByPartner.get(partner.id) ?? []
        const label = labels
            .append('text')
            .attr('data-partner', partner.id)
            .attr('text-anchor', options.leftAligned?.includes(partner.id) ? 'start' : 'middle')
            .attr('font-family', 'Arial, sans-serif')
            .attr('font-size', 13)
            .attr('fill', '#292929')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('paint-order', 'stroke')
        label.append('tspan').attr('x', 0).text(partner.name)
        if (links.length) {
            const values = label.append('tspan').attr('x', 0).attr('dy', 15).attr('font-weight', 700)
            const sorted = [...links].sort((a, b) => directions.indexOf(a.meta.direction) - directions.indexOf(b.meta.direction))
            for (const [index, link] of sorted.entries()) {
                if (index) values.append('tspan').text(' / ')
                const direction = directions.indexOf(link.meta.direction)
                values
                    .append('tspan')
                    .attr('fill', map.flowRegionColors_[direction])
                    .text((link.value / 1e6).toFixed(1) + ' Mt')
            }
        }

        const box = label.node().getBBox()
        let placement
        const fixed = options.positions?.[partner.id]
        if (fixed) {
            placement = { x: fixed[0], y: fixed[1] }
            occupied.push({ left: placement.x + box.x - 2, right: placement.x + box.x + box.width + 2, top: placement.y + box.y - 2, bottom: placement.y + box.y + box.height + 2 })
        }
        for (let distance = 16; distance <= 140 && !placement; distance += 4) {
            const outward = partner.x < width / 2 ? -1 : 1
            const preferred = options.preferred?.[partner.id] ?? []
            for (const [dx, dy] of [
                ...(typeof preferred[0] === 'number' ? [preferred] : preferred),
                [outward, 0],
                [0, -1],
                [0, 1],
                [outward, -1],
                [outward, 1],
                [-outward, -1],
                [-outward, 1],
                [-outward, 0],
            ]) {
                const x = partner.x + dx * (distance + box.width / 2)
                const y = partner.y + dy * (distance + box.height / 2) - box.y - box.height / 2
                const bounds = {
                    left: Math.floor(x + box.x - 2),
                    right: Math.ceil(x + box.x + box.width + 2),
                    top: Math.floor(y + box.y - 2),
                    bottom: Math.ceil(y + box.y + box.height + 2),
                }
                if (fits(bounds)) {
                    placement = { x, y }
                    occupied.push(bounds)
                    break
                }
            }
        }
        if (placement) label.attr('transform', `translate(${placement.x},${placement.y})`)
        else label.remove()
    }
}
