// Aligns a region's name label with its value label on the air flow maps (call it once the map is built).
// regionName: the name as written in regionLabels.js, which is also the flow label's `name`.
// edge: 'start' puts the name's left edge on the value's left edge (the name then sits above or below its value, both
// starting at the same x). The library draws region names centred on their position and flow values from the end of
// their flow, so lining the two up needs the drawn text: the value label's own box gives the x to start from.
function alignRegionNameToValue(svgSelector, regionName, edge = 'start') {
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
    const x = datum.x + (edge === 'start' ? box.x : box.x + box.width)
    // each name is drawn twice: a halo copy at absolute coordinates, and the label itself inside a group that carries the
    // position as a translate (its own x is 0). Both must land on x, so remove the group's offset from each one's x
    names
        .attr('text-anchor', edge === 'start' ? 'start' : 'end')
        .attr('x', function () {
            const offset = this.parentNode.transform?.baseVal?.consolidate?.()?.matrix.e ?? 0
            return x - offset
        })
}
