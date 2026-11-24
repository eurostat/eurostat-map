// Aligns a region's name label with its value label on the air flow maps (call it once the map is built and after any
// repositioning of the value label).
// regionName: the name as written in regionLabels.js, which is also the flow label's `name`.
// edge: where the name lines up with the value: 'start' (left edges), 'middle' (centres) or 'end' (right edges).
// placement: 'below' or 'above' also moves the name to sit right under / over the value; omit it to leave the name's
// height alone (it already sits above or below its value).
// The library draws region names centred on their position and flow values from the end of their flow, so lining the two
// up needs the drawn text: the value label's own box gives the x (and y) to line up with.
function alignRegionNameToValue(svgSelector, regionName, edge = 'start', placement = null) {
    const names = d3.selectAll(`${svgSelector} #em-labels text`).filter(function () {
        return this.textContent.trim() === regionName && !this.closest('.em-flow-label') && !this.closest('.em-flow-label-halo')
    })
    const value = d3
        .selectAll(`${svgSelector} .em-flow-label g`)
        .filter((d) => d.name === regionName)
        .select('text')
    if (names.empty() || value.empty()) return
    const datum = value.datum()
    const box = value.node().getBBox()
    const x = datum.x + (edge === 'start' ? box.x : edge === 'middle' ? box.x + box.width / 2 : box.x + box.width)
    // the baseline the name sits on when it goes under or over the value
    const baseline = placement === 'below' ? datum.y + box.y + box.height + 10 : placement === 'above' ? datum.y + box.y - 5 : null
    // each name is drawn twice: a halo copy at absolute coordinates, and the label itself inside a group that carries the
    // position as a translate (its own x and y are 0). Both must land on the same spot, so remove the group's offset from
    // each one's coordinates. The labels are lifted by their `dy`, which the baseline has to allow for.
    names
        .attr('text-anchor', edge === 'start' ? 'start' : edge === 'middle' ? 'middle' : 'end')
        .attr('x', function () {
            const offset = this.parentNode.transform?.baseVal?.consolidate?.()?.matrix.e ?? 0
            return x - offset
        })
    if (baseline === null) return
    names.attr('y', function () {
        const offset = this.parentNode.transform?.baseVal?.consolidate?.()?.matrix.f ?? 0
        const lift = Number(this.getAttribute('dy')) || 0
        return baseline - lift - offset
    })
}
