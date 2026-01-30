const configs = {
    EMP_PLOC_NR: {
        legendTitle: 'Number of persons',
        colors: ['#FFEB99', '#D0E9B0', '#8AD6B9', '#56C2C0', '#3194B6', '#114891', '#17256B'],
        //thresholds: [10, 20, 30, 40, 50, 60, 70, 80],
        nbClasses: 7,
        unitText: 'people per unit',
    },
    LC_EMP_LOC_TEUR: {
        legendTitle: 'Thousand euro',
        colors: ['#FFEB99', '#DCEAAA', '#B0E2B6', '#77D1BA', '#56C2C0', '#3BA9BF', '#1C69A4', '#133F88', '#17256B'],
        //thresholds: [10, 20, 30, 40, 50, 60, 70, 80],
        nbClasses: 9,
        unitText: 'thousand euro per person',
    },
}
const isMobile = window.innerWidth <= 768

let map
export function initMap(code) {
    const mapWidth = isMobile ? window.innerWidth : 700
    const mapHeight = isMobile
        ? Math.round(window.innerHeight - 160) // 100% of viewport height - header etc
        : 550

    map = eurostatmap
        .map('ch')
        .width(mapWidth)
        .height(mapHeight)
        .dorling(false)
        .scale('60M')
        //.title('Manufacturing sector by region, 2023')

        .position({ x: 4300000, y: 3420000, z: isMobile ? 9000 : 7400 })
        .insetsButton(true)

        //classification
        .colors(configs[code].colors)
        .thresholds(configs[code].thresholds)
        .numberOfClasses(configs[code].nbClasses)
        .classificationMethod(configs[code].thresholds ? 'threshold' : 'jenks') //jenks, quantile, equal, threshold

        //SE settings
        .footer(true)
        .zoomButtons(false)
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
        //end SE settings

        .nutsLevel(2)
        .stat({
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: configs[code].unitText,
            filters: {
                INDIC_SBS: code,
                TIME: '2023',
                nace_r2: ['B', 'D', 'E'], // Array for multiple values
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
            nace_r2: ['B', 'D', 'E'], // Array for multiple values
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
    })

    //update tooltip
    map.tooltip({
        textFunction: getTooltipFunction(code),
    })
}

const getTooltipFunction = (code) => {
    const tooltipText = configs[code].tooltipText
    return function (region, map) {
        const html = []

        // Header with region name and ID
        const regionName = region.properties.na || region.properties.name
        const regionId = region.properties.id
        html.push(`
        <div class="em-tooltip-bar">
            <b>${regionName}</b>${regionId ? ` (${regionId})` : ''}
        </div>
    `)

        // Retrieve region's data value and unit
        const statData = map.statData()
        const sv = statData.get(regionId)
        const unit = statData.unitText() || ''

        // No data case
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

        // Data display
        html.push(`
        <div class="em-tooltip-text">
            <table class="em-tooltip-table">
                <tbody>
                    <tr><td>${spaceAsThousandSeparator(sv.value)} ${tooltipText}</td></tr>
                </tbody>
            </table>
        </div>
    `)
        return html.join('')
    }
}

initMap('EMP_PLOC_NR')
