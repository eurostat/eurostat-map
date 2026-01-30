const configs = {
    EMP_PLOC_NR: {
        legendTitle: 'Number of persons',
        colors: ['#cacdff', '#a4a8f9', '#7e86e7', '#5966cb', '#3648aa', '#162b87', '#000d60'],
        thresholds: [5, 10, 15, 20, 30, 40],
        nbClasses: 7,
        unitText: 'people per unit',
        multiplier: 1, // no conversion needed
    },
    LC_EMP_LOC_TEUR: {
        legendTitle: 'Euro',
        colors: ['#d9dbff', '#b8bafd', '#969bf3', '#747de0', '#5462c7', '#3447aa', '#152e8b', '#001469'],
        thresholds: [15, 30, 45, 60, 75, 90, 100],
        nbClasses: 9,
        unitText: 'euro per person',
        multiplier: 1000, // convert thousands to actual euros
    },
}

const spaceAsThousandSeparator = (number) => {
    return number.toLocaleString('en').replace(/,/g, ' ')
}

const isMobile = window.innerWidth <= 768

let map
export function initMap(code) {
    const mapWidth = isMobile ? window.innerWidth : 700
    const mapHeight = isMobile ? Math.round(window.innerHeight - 160) : 550

    map = eurostatmap
        .map('ch')
        .width(mapWidth)
        .height(mapHeight)
        .dorling(false)
        .scale('60M')
        .position({ x: 4300000, y: 3420000, z: isMobile ? 9000 : 7400 })
        .insetsButton(true)

        //classification
        .colors(configs[code].colors)
        .thresholds(configs[code].thresholds)
        .numberOfClasses(configs[code].nbClasses)
        .classificationMethod(configs[code].thresholds ? 'threshold' : 'jenks')

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

        .showZoomButtons(true)
        .insets('default')

        .nutsLevel(2)
        .stat({
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: configs[code].unitText,
            filters: {
                INDIC_SBS: code,
                TIME: '2023',
                nace_r2: ['B', 'D', 'E'],
            },
        })
        .legend({
            title: configs[code].legendTitle,
            x: 5,
            y: isMobile ? 10 : 100,
            boxPadding: 4,
            boxOpacity: 0.9,
            tickLength: 8,
            maxMin: true,
            maxMinTickLength: 15,
            maxMinRegionLabels: false,
            maxMinLabels: ['', ''],
            labelFunction: getLegendLabelFunction(code),
        })
        .tooltip({
            textFunction: getTooltipFunction(code),
        })

    map.build()
}

export function updateMap(code) {
    //classification
    map.colors(configs[code].colors)
        .thresholds(configs[code].thresholds)
        .numberOfClasses(configs[code].nbClasses)
        .classificationMethod(configs[code].thresholds ? 'threshold' : 'jenks')

    //stats
    map.stat({
        eurostatDatasetCode: 'sbs_r_nuts2021',
        unitText: configs[code].unitText,
        filters: {
            INDIC_SBS: code,
            TIME: '2023',
            nace_r2: ['B', 'D', 'E'],
        },
    })
    map.updateStatData()

    //update legend
    map.legend({
        title: configs[code].legendTitle,
        x: 5,
        y: isMobile ? 10 : 100,
        boxPadding: 4,
        boxOpacity: 0.9,
        tickLength: 8,
        maxMin: true,
        maxMinTickLength: 15,
        maxMinRegionLabels: false,
        maxMinLabels: ['', ''],
        labelFormatter: getLegendLabelFunction(code),
    })

    //update tooltip
    map.tooltip({
        textFunction: getTooltipFunction(code),
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

initMap('EMP_PLOC_NR')
