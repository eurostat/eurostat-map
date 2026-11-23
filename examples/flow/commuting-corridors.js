function renderCommutingMap({ towns, links, view, title, subtitle, overview = false, maxFlowWidth = 8, scaleMaxFlow, scaleMaxLocal }) {
    const map = eurostatmap
        .map('flow')
        .height((m) => m.width() * 0.78)
        .responsive(true)
        .nutsLevel(overview ? 2 : 3)
        .insets(false)
        .scale('03M')

    // Town, country and region positions are given as lon/lat; the map works in its own CRS.
    const nodes = towns.map(({ id, name, country = 'FR', lon, lat, labelPosition }) => {
        const [x, y] = eurostatmap.projectToMap(map, lon, lat)
        return { id, name, country, x, y, labelPosition }
    })
    const placeLabels = [...(view?.countries || []), ...(view?.regions || [])].map(([text, lon, lat]) => {
        const [x, y] = eurostatmap.projectToMap(map, lon, lat)
        return { text, x, y, class: 'countries' }
    })

    const domestic = '#256982'
    const crossBorder = '#a14927'
    const largestFlow = Math.max(...links.filter(({ source, target }) => source !== target).map(({ value }) => value))
    const flowValues = [0.25, 0.5].map((share) => Math.round((largestFlow * share) / 10) * 10).concat(largestFlow)
    const largestLocalFlow = scaleMaxLocal ?? Math.max(...links.filter(({ source, target }) => source === target).map(({ value }) => value))
    const nodeSizeScale = (value) => (overview ? 2.3 : 15) * Math.sqrt(value / largestLocalFlow)
    nodeSizeScale.domain = () => [0, largestLocalFlow]
    const counts = new Intl.NumberFormat('en')

    const eastings = nodes.map(({ x }) => x)
    const northings = nodes.map(({ y }) => y)
    const [minX, maxX] = [Math.min(...eastings), Math.max(...eastings)]
    const [minY, maxY] = [Math.min(...northings), Math.max(...northings)]
    const [x, y] = view ? eurostatmap.projectToMap(map, ...view.center) : [(minX + maxX) / 2, (minY + maxY) / 2]
    const z = view?.z || Math.max((maxX - minX) / 475, (maxY - minY) / 330)

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
            nodeLabels: true,
        })
        .labels({ labels: placeLabels, halos: true, hideOverlapping: true })
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

    map.statData().unitText('commuters')
    map.build()
}
