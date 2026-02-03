const configs = {
    EMP_PLOC_NR: {
        legendTitle: 'Number of persons',
        colors: ['#cacdff', '#a4a8f9', '#7e86e7', '#5966cb', '#3648aa', '#162b87', '#000d60'],
        thresholds: {
            B: [10, 15, 30, 60, 130, 209],
            D: [5, 10, 15, 20, 30, 55],
            E: [5, 10, 15, 20, 30, 60],
        },
        legendMaxLabel: {
            B: ' (Śląskie)',
            D: ' (Malta)',
            E: ' (Ceuta)',
        },
        unitText: 'people per unit',
        multiplier: 1, // no conversion needed
    },
    LC_EMP_LOC_TEUR: {
        legendTitle: 'Euro',
        colors: ['#d9dbff', '#b8bafd', '#969bf3', '#747de0', '#5462c7', '#3447aa', '#152e8b', '#001469'],
        thresholds: {
            B: [20, 30, 40, 50, 70, 95, 157],
            D: [15, 25, 40, 50, 60, 80, 117],
            E: [15, 20, 30, 35, 40, 45, 55],
        },
        legendMaxLabel: {
            E: '',
        },
        unitText: 'euro per person',
        multiplier: 1000, // convert thousands to actual euros
    },
}

const spaceAsThousandSeparator = (number) => {
    return number.toLocaleString('en').replace(/,/g, ' ')
}

const isMobile = window.innerWidth <= 768

let map
export function initMap(unitCode, naceCode) {
    const mapWidth = isMobile ? window.innerWidth : 700
    const mapHeight = isMobile ? Math.round(window.innerHeight - 160) : 550
    const config = configs[unitCode]

    map = eurostatmap
        .map('ch')
        .width(mapWidth)
        .height(mapHeight)
        .dorling(false)
        .scale('60M')
        .position({ x: 4300000, y: 3420000, z: isMobile ? 9000 : 7400 })
        .insetsButton(true)

        //classification
        .colors(config.colors)
        .thresholds(config.thresholds[naceCode])
        .numberOfClasses(config.colors.length)
        .classificationMethod(config.thresholds ? 'threshold' : 'jenks')

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
            maxMinLabels: config.legendMaxLabel[naceCode] ? ['', config.legendMaxLabel[naceCode] || ''] : ['', ''],
            labelFunction: getLegendLabelFunction(unitCode),
        })
        .tooltip({
            textFunction: getTooltipFunction(unitCode),
        })

    map.build()
}

export function updateMap(unitCode, naceCode) {
    const config = configs[unitCode]
    //classification
    map.colors(config.colors)
        .thresholds(config.thresholds[naceCode])
        .numberOfClasses(config.colors.length)
        .classificationMethod(config.thresholds ? 'threshold' : 'jenks')

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
        maxMinLabels: config.legendMaxLabel[naceCode] ? ['', config.legendMaxLabel[naceCode] || ''] : ['', ''],
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

initMap('EMP_PLOC_NR', 'B')
