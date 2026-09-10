;(async function () {
    const dataFile = document.body.dataset.mapData
    const config = await fetch(`./data/${dataFile}`).then((response) => {
        if (!response.ok) throw new Error(`Could not load map data (${response.status})`)
        return response.json()
    })
    const [lowerThreshold, upperThreshold] = config.thresholds
    const mapWidth = Math.min(Math.floor(document.documentElement.clientWidth), 700)

    eurostatmap
        .map('bivariateChoropleth')
        .svgId('map')
        .width(mapWidth)
        .height(680)
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
            label1: 'Urban-rural',
            label2: config.valueLegendLabel,
            axisArrows: { x: false, y: true },
            showAxisExtremes: { x: false, y: true },
            breaks2: config.thresholds.map((value) => `${value}${config.unitText}`),
            axisExtremes: {
                x: { low: 'Low', high: 'High' },
                y: { low: config.valueClassLabels[0], high: config.valueClassLabels[2] },
            },
            x: 60,
            y: 120,
            squareSize: 100,
            noDataPadding: 0,
            noDataShapeHeight: 16,
            noDataShapeWidth: 16,
        })
        .zoomButtons(true)
        .insets('image')
        .onBuild(function (map) {
            const defaultPosition = map.position()
            map.position({ ...defaultPosition, z: defaultPosition.z * 0.9 })

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
