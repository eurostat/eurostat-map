function renderCommutingMap({ towns, links, view, title, subtitle, overview = false, maxFlowWidth = 8, scaleMaxFlow, scaleMaxLocal }) {
    const map = eurostatmap
        .map('flow')
        .width(795)
        .height(620)
        .responsive(true)
        .nutsLevel(overview ? 2 : 3)
        .insets(false)
        .scale('03M')
    const nodes = towns.map(({ id, name, country = 'FR', lon, lat }) => {
        const [x, y] = eurostatmap.projectToMap(map, lon, lat)
        return { id, name, country, x, y }
    })

    const domestic = '#256982'
    const crossBorder = '#a14927'
    const largestFlow = Math.max(...links.filter(({ source, target }) => source !== target).map(({ value }) => value))
    const flowValues = [0.25, 0.5].map((share) => Math.round((largestFlow * share) / 10) * 10).concat(largestFlow)
    const largestLocalFlow = scaleMaxLocal ?? Math.max(...links.filter(({ source, target }) => source === target).map(({ value }) => value))
    const nodeSizeScale = (value) => (overview ? 2.3 : 15) * Math.sqrt(value / largestLocalFlow)
    nodeSizeScale.domain = () => [0, largestLocalFlow]
    const counts = new Intl.NumberFormat('en')
    const countries = view?.countries || []
    const regions = view?.regions || []
    const eastings = nodes.map(({ x }) => x)
    const northings = nodes.map(({ y }) => y)
    const [minX, maxX] = [Math.min(...eastings), Math.max(...eastings)]
    const [minY, maxY] = [Math.min(...northings), Math.max(...northings)]
    const [x, y] = view ? eurostatmap.projectToMap(map, ...view.center) : [(minX + maxX) / 2, (minY + maxY) / 2]
    const z = view?.z || Math.max((maxX - minX) / 475, (maxY - minY) / 330)

    // The labels live inside the zoom group, so they would grow with the map. Divide their font size by the zoom
    // factor to keep them at a constant size on screen (the library already rescales their halo stroke width).
    function keepLabelsConstantSize() {
        const k = map.__lastTransform?.k || 1
        map.svg()
            .selectAll('.town-label, .country-label, .region-label')
            .each(function () {
                if (!this.dataset.fs) this.dataset.fs = parseFloat(window.getComputedStyle(this).fontSize)
                this.style.fontSize = `${this.dataset.fs / k}px`
            })
    }

    function avoidLabelCollisions() {
        keepLabelsConstantSize()
        const svg = map.svg().node()
        const frame = svg.getBoundingClientRect()
        const occupied = [...svg.querySelectorAll('.em-legend, [id^="title"], [id^="subtitle"]')]
            .map((element) => element.getBoundingClientRect())
            .filter(({ width, height }) => width && height)
        const labels = [...svg.querySelectorAll('.town-label'), ...svg.querySelectorAll('.country-label'), ...svg.querySelectorAll('.region-label')]
        for (const label of labels) {
            const box = label.getBoundingClientRect()
            const outside = box.left < frame.left || box.right > frame.right || box.top < frame.top || box.bottom > frame.bottom
            const overlaps = occupied.some(
                (other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
            )
            label.style.visibility = outside || overlaps ? 'hidden' : 'visible'
            if (!outside && !overlaps) occupied.push(box)
        }
    }
    map.title(title)
        .subtitle(subtitle)
        .position({ x, y, z })
        .drawCoastalMargin(false)
        .flowGraph({ nodes, links })
        .flowSettings({
            lineType: 'straight',
            bidirectionalLayout: 'parallel',
            arrows: true,
            color: ({ source, target }) => (source.country === target.country ? domestic : crossBorder),
            opacity: 1,
            maxWidth: (maxFlowWidth * largestFlow) / (scaleMaxFlow ?? largestFlow),
            minWidth: overview ? 0.35 : 1,
            nodes: true,
            nodeType: 'circle',
            nodeSizeBy: 'internal',
            nodeSizeScale,
        })
        .legend({
            position: 'top right',
            flowWidthLegend: {
                title: 'Between towns',
                titlePadding: 40,
                values: flowValues,
                labels: flowValues.map((value) => counts.format(value)),
            },
            nodeSizeLegend: {
                title: 'Within each town',
                values: overview ? [largestLocalFlow] : [largestLocalFlow, Math.round(largestLocalFlow / 1000) * 100],
            },
            flowColorLegend: {
                title: 'Corridor type',
                marginTop: 30,
                items: [
                    { label: 'Domestic', color: domestic },
                    { label: 'Cross-border', color: crossBorder },
                ],
            },
        })
        .onZoom(avoidLabelCollisions)
        .onBuild((map) => {
            const geographicLabels = map.svg().select('#em-zoom-group-map').append('g')
            for (const [places, className] of [
                [countries, 'country-label'],
                [regions, 'region-label'],
            ]) {
                geographicLabels
                    .selectAll(`.${className}`)
                    .data(places)
                    .join('text')
                    .attr('class', className)
                    .attr('text-anchor', 'middle')
                    .attr('transform', ([, lon, lat]) => `translate(${map._projection(eurostatmap.projectToMap(map, lon, lat))})`)
                    .text(([name]) => name)
            }

            const townById = new Map(towns.map((town) => [town.id, town]))
            map.svg()
                .selectAll('.em-node-circle-group')
                .each(function () {
                    const { name, label } = townById.get(this.getAttribute('data-id'))
                    const radius = Number(this.querySelector('circle').getAttribute('r'))
                    const x = label === 'left' ? -radius - 5 : 0
                    const y = label === 'below' ? radius + 14 : label === 'left' ? 4 : -radius - 5
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
                    text.setAttribute('class', 'town-label')
                    text.setAttribute('text-anchor', label === 'left' ? 'end' : 'middle')
                    text.setAttribute('x', x)
                    text.setAttribute('y', y)
                    text.textContent = name
                    this.append(text)
                })
            avoidLabelCollisions()
        })

    map.statData().unitText('commuters')
    map.build()
}
