const configs = {
    EMP_PLOC_NR: {
        legendTitle: 'Persons per unit',
        colors: {
            H: ['#cacdff', '#a4a8f9', '#7e86e7', '#5966cb', '#3648aa', '#162b87', '#000d60'],
            I:['#cacdff', '#a4a8f9', '#7e86e7', '#5966cb', '#3648aa', '#162b87', '#000d60'],
            J: ['#cacdff', '#a4a8f9', '#7e86e7', '#5966cb', '#3648aa', '#162b87', '#000d60'],
            L:  ['#e4e6ff', '#b7b9fc', '#898fec', '#5d68ce', '#3145a7', '#00237d'],
            M: ['#cacdff', '#a4a8f9', '#7e86e7', '#5966cb', '#3648aa', '#162b87', '#000d60'],
            N: ['#cacdff', '#a4a8f9', '#7e86e7', '#5966cb', '#3648aa', '#162b87', '#000d60'],
        },
        thresholds: {},
        unitText: 'people per unit',
        multiplier: 1, // no conversion needed
    },
    LC_EMP_LOC_TEUR: {
        legendTitle: 'Euro',
        colors: {
            H: ['#d9dbff', '#b8bafd', '#969bf3', '#747de0', '#5462c7', '#3447aa', '#152e8b', '#001469'],
            I: ['#e4e6ff', '#b7b9fc', '#898fec', '#5d68ce', '#3145a7', '#00237d'],
            J: ['#d9dbff', '#b8bafd', '#969bf3', '#747de0', '#5462c7', '#3447aa', '#152e8b', '#001469'],
            L: ['#d9dbff', '#b8bafd', '#969bf3', '#747de0', '#5462c7', '#3447aa', '#152e8b', '#001469'],
            M: ['#d9dbff', '#b8bafd', '#969bf3', '#747de0', '#5462c7', '#3447aa', '#152e8b', '#001469'],
            N: ['#d9dbff', '#b8bafd', '#969bf3', '#747de0', '#5462c7', '#3447aa', '#152e8b', '#001469'],
        },
        thresholds: {},
        unitText: 'euro per person',
        multiplier: 1000, // convert thousands to actual euros
    },
}

const getClassificationConfig = (config, naceCode) => {
    const fallbackColors = Object.values(config.colors)[0] || []
    const colors = config.colors[naceCode] || fallbackColors
    const thresholds = config.thresholds?.[naceCode]
    return { colors, thresholds }
}

const spaceAsThousandSeparator = (number) => {
    return number.toLocaleString('en').replace(/,/g, ' ')
}

const isMobile = window.innerWidth <= 768

let map
export function initMap(unitCode, naceCode) {
    const mapContainer = document.getElementById('map-container')
    const mapWidth = mapContainer ? mapContainer.clientWidth : (isMobile ? window.innerWidth : 700)
    const containerHeight = mapContainer ? mapContainer.clientHeight : (isMobile ? Math.round(window.innerHeight - 230) : 550)
    const mapHeight = Math.max(containerHeight - 24, 240)
    const config = configs[unitCode]
    const { colors, thresholds } = getClassificationConfig(config, naceCode)
    const classificationMethod = thresholds?.length ? 'threshold' : 'jenks'

    map = eurostatmap
        .map('ch')
        .width(mapWidth)
        .height(mapHeight)
        .dorling(false)
        .scale('60M')
        .position({ x: 4300000, y: 3420000, z: isMobile ? 9000 : 7400 })
        .insetsButton(true)

        //classification
    .colors(colors)
    .numberOfClasses(colors.length)
    .classificationMethod(classificationMethod)

        //SE settings
        .footer(true)
        .showEstatLogo(true)
        .showEstatRibbon(true)
        .logoPosition([2, mapHeight - 30])
        .ribbonPosition([mapWidth - 180, mapHeight - 30])
        .ribbonWidth(300)
        .ribbonHeight(50)
        .showSourceLink(false)
        .footnote(
            ' <tspan style="font-style: italic;">Source</tspan>: Eurostat <a href="https://ec.europa.eu/eurostat" target="_blank">(sbs_r_nuts2021)</a>'
        )
        .footnoteTooltipText(false)

        .zoomButtons(true)
        .zoomExtent(isMobile ? [0.7, 10] : [1, 10])
        .insets('default')
        .insetBoxWidth(190)

        .nutsLevel(2)
        .stat({
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: config.unitText,
            filters: {
                INDIC_SBS: unitCode,
                TIME: '2023',
                nace_r2: naceCode,
            },
        })

        .legendButton(true)
        .legend({
            title: config.legendTitle,
            x: 5,
            y: isMobile ? 10 : 100,
            boxPadding: 4,
            boxOpacity: 0.9,
            tickLength: 8,
            maxMin: true,
            maxMinTickLength: 15,
            maxMinRegionLabels: false,
            labelFunction: getLegendLabelFunction(unitCode),
        })
        .tooltip({
            textFunction: getTooltipFunction(unitCode),
        })

    if (thresholds?.length) {
        map.thresholds(thresholds)
    }

    map.build()
}

export function updateMap(unitCode, naceCode) {
    const config = configs[unitCode]
    const { colors, thresholds } = getClassificationConfig(config, naceCode)
    const classificationMethod = thresholds?.length ? 'threshold' : 'quantile'
    //classification
    map.colors(colors).numberOfClasses(colors.length).classificationMethod(classificationMethod)
    if (thresholds?.length) {
        map.thresholds(thresholds)
    }

    //stats
    map.stat({
        eurostatDatasetCode: 'sbs_r_nuts2021',
        unitText: config.unitText,
        filters: {
            INDIC_SBS: unitCode,
            TIME: '2023',
            nace_r2: naceCode,
        },
    })
    map.updateStatData()

    //update legend
    map.legend({
        title: config.legendTitle,
        x: 5,
        y: isMobile ? 10 : 100,
        boxPadding: 4,
        boxOpacity: 0.9,
        tickLength: 8,
        maxMin: true,
        maxMinTickLength: 15,
        maxMinRegionLabels: false,
        labelFormatter: getLegendLabelFunction(unitCode),
    })

    //update tooltip
    map.tooltip({
        textFunction: getTooltipFunction(unitCode),
    })
}

const getLegendLabelFunction = (code) => {
    const multiplier = configs[code].multiplier
    return function (value) {
        return spaceAsThousandSeparator(Math.round(value * multiplier))
    }
}

const getTooltipFunction = (code) => {
    const multiplier = configs[code].multiplier

    return function (region, map) {
        const html = []

        const regionName = region.properties.na || region.properties.name
        const regionId = region.properties.id
        html.push(`
        <div class="em-tooltip-bar">
            <b>${regionName}</b>${regionId ? ` (${regionId})` : ''}
        </div>
        `)

        const statData = map.statData()
        const tooltipText = statData.unitText()
        const sv = statData.get(regionId)

        if (!sv || (sv.value !== 0 && !sv.value) || sv.value === ':') {
            html.push(`
            <div class="em-tooltip-text no-data">
                <table class="em-tooltip-table">
                    <tbody>
                        <tr><td>${map.noDataText_}</td></tr>
                    </tbody>
                </table>
            </div>
            `)
            return html.join('')
        }

        const displayValue = spaceAsThousandSeparator(Math.round(sv.value * multiplier))
        html.push(`
        <div class="em-tooltip-text">
            <table class="em-tooltip-table">
                <tbody>
                    <tr><td>${displayValue} ${tooltipText}</td></tr>
                </tbody>
            </table>
        </div>
        `)
        return html.join('')
    }
}

// Initialize the map with defaults - defer until after flex layout is computed
requestAnimationFrame(() => initMap('EMP_PLOC_NR', 'H'))
