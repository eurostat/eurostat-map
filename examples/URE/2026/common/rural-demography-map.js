;(async function () {
    const dataFile = document.body.dataset.mapData
    const config = await fetch(`./data/${dataFile}`).then((response) => {
        if (!response.ok) throw new Error(`Could not load map data (${response.status})`)
        return response.json()
    })
    const [lowerThreshold, upperThreshold] = config.thresholds
    const mapWidth = Math.min(Math.floor(document.documentElement.clientWidth), 700)
    // Match the RYB report's map aspect ratio (CH11 etc.: 900/1080) so maps from both
    // reports render at the same size when placed side by side.
    const mapHeight = Math.round(mapWidth * (900 / 1080))
    // Explicit position, matching RYB's convention (see CH11M04.html/dropdown-choropleth.js)
    // of hardcoding x/y/z rather than relying on the library's auto-fit-to-box default. x/y are
    // exactly the auto-fit's own center point for this geometry (verified via map.position()),
    // so this is a deterministic equivalent, not a different framing. z is tuned for mapWidth
    // 700 (auto-fit's z there, further zoomed in ~5% - see the old onBuild comment this
    // replaced) and scaled proportionally so narrower responsive widths keep the same
    // geographic extent rather than zooming in as the canvas shrinks.
    const BASE_Z_AT_700 = 7489
    const position = { x: 4790000, y: 3420000, z: BASE_Z_AT_700 * (700 / mapWidth) }

    eurostatmap
        .map('bivariateChoropleth')
        .svgId('map')
        .width(mapWidth)
        .height(mapHeight)
        .position(position)
        .header(true)
        .footer(true)
        .scale(config.scale)
        .nutsLevel(config.nutsLevel)
        .nutsYear(config.nutsYear)
        .title(config.title)
        .subtitle(config.subtitle)
        .hoverColor('#ffff33')
        .showSourceLink(false)
        .footnote([config.footnote, config.source].filter(Boolean).join('<br>'))
        .footnoteWrap(55)
        .stat('value', { customData: config.stats.value, unitText: config.unitText })
        .encoding('y', { stat: 'value' })
        .stat('urbanRuralType', { customData: config.stats.urbanRuralType })
        .encoding('x', { stat: 'urbanRuralType' })
        .numberOfClasses(3)
        .classifier1((regionType) => regionType - 1)
        .classifier2((value) => (value >= upperThreshold ? 2 : value >= lowerThreshold ? 1 : 0))
        .classToFillStyle((regionClass, valueClass) => {
            const classId = config.classMatrix[regionClass]?.[valueClass]
            return config.colorsByClass[classId] || config.colorsByClass[':']
        })
        .tooltip({
            textFunction(region, map) {
                if (region.properties.id === 'UK') return ' '
                const regionName = region.properties.na || region.properties.name
                const regionId = region.properties.id
                const regionType = map.statData('urbanRuralType').get(regionId)
                const value = map.statData('value').get(regionId)
                const typeText = regionType && regionType.value !== ':' ? config.urbanRuralLabels[regionType.value] : map.noDataText_
                const valueText = value && value.value !== ':' ? `${Number(value.value).toFixed(1)}${config.unitText}` : map.noDataText_

                return `<div class="em-tooltip-bar"><b>${regionName}</b>${regionId ? ` (${regionId})` : ''}</div>
                    <div class="em-tooltip-text no-data"><table class="em-tooltip-table"><tbody>
                    <tr><td>${typeText}<br>${valueText}</td></tr></tbody></table></div>`
            },
        })
        .legend({
            label1: 'Urban-Int.-Rural',
            label2: config.valueLegendLabel,
            axisArrows: { x: false, y: true },
            axisArrowsBidirectional: { y: !!config.bidirectionalYAxis },
            showAxisExtremes: { x: false, y: true },
            breaks2: config.thresholds.map((value) => `${value}${config.unitText}`),
            axisExtremes: {
                x: { low: 'Low', high: 'High' },
                y: { low: config.valueClassLabels[0], high: config.valueClassLabels[2] },
            },
            x: 60,
            y: 120,
            squareSize: 100,
            noData: false,
            noDataPadding: 0,
            noDataShapeHeight: 16,
            noDataShapeWidth: 16,
        })
        .zoomButtons(true)
        .insets('image')
        // Right margin matches the RYB report's convention (CH11 etc.: MAPWIDTH - insetWidth - 20).
        // 243 is the 'image' preset's fixed panel width (OVERSEAS_BOX_WIDTH in src/core/insets.js).
        .insetBoxPosition([mapWidth - 243 - 20, 10])
        .onBuild(function (map) {
            const footer = document.getElementById('em-footer-map')
            if (!footer) return
            footer.querySelector('#em-footnote-boundaries')?.remove()
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            text.setAttribute('id', 'em-footnote-boundaries')
            text.setAttribute('class', 'em-footnote')
            text.setAttribute('x', mapWidth - 5)
            text.setAttribute('y', 10)
            text.setAttribute('text-anchor', 'end')
            text.innerHTML = 'Cartography: GISCO. Boundaries: ©EuroGeographics ©OSM'
            footer.appendChild(text)
        })
        .build()
})().catch((error) => console.error(error))
