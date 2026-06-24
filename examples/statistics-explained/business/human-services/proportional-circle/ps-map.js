const compactIntlFormatter = new Intl.NumberFormat('en', {
    notation: 'compact',
    compactDisplay: 'long',
    maximumFractionDigits: 1,
})

const longIntlFormatter = new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
})

const compactFormatter = {
    format(value) {
        return compactIntlFormatter.format(value).replace(/,/g, ' ')
    },
}

const longFormatter = {
    format(value) {
        return longIntlFormatter.format(value).replace(/,/g, ' ')
    },
}

const configs = {
    LOC_NR: {
        title: 'Number of units',
        unitText: 'units',
        multiplier: 1,
    },
    EMP_LOC_NR: {
        title: 'Number of persons',
        unitText: 'persons',
        multiplier: 1,
    },
    WAGE_LOC_MEUR: {
        title: 'Euro',
        unitText: 'euro',
        multiplier: 1000000, // MEUR → EUR
    },
}

const spaceAsThousandSeparator = (number) => {
    return number.toLocaleString('en').replace(/,/g, ' ')
}
let map
const isMobile = window.innerWidth <= 768
export function initMap(unitCode, naceCode) {
    const mapContainer = document.getElementById('map-container')
    const mapWidth = mapContainer ? mapContainer.clientWidth : isMobile ? window.innerWidth : 700
    const containerHeight = mapContainer ? mapContainer.clientHeight : isMobile ? Math.round(window.innerHeight - 250) : 700
    const mapHeight = Math.max(containerHeight - 24, 240)
    const config = configs[unitCode]

    map = eurostatmap
        .map('ps')
        .dorling(true)
        .width(mapWidth)
        .height(mapHeight)
        .scale('60M')
        //.title('Manufacturing sector by region, 2023')
        .position({ x: 4300000, y: 3420000, z: 7000 })
        .nutsLevel(2)

        //symbol settings
        .psFill('#2644A7')
        .psBrightenFactor(0.8) //background color brightening factor
        .psMaxSize(20)
        .psMinSize(2)

        //SE settings
        .footer(true)
        .showEstatLogo(true)
        .showEstatRibbon(true)
        .logoPosition([2, mapHeight - 30])
        .ribbonPosition([mapWidth - 180, mapHeight - 50])
        .ribbonWidth(300)
        .ribbonHeight(50)
        .showSourceLink(false)
        .footnote(
            ' <tspan style="font-style: italic;">Source</tspan>: Eurostat <a href="https://ec.europa.eu/eurostat/databrowser/product/page/sbs_r_nuts2021" target="_blank">(sbs_r_nuts2021)</a>'
        )
        .footnoteTooltipText(false)

        .zoomButtons(true)
        .zoomExtent(isMobile ? [0.7, 10] : [0.9, 10])
        .insets('default')
        .insetsButton(true)
        .insetBoxWidth(190)
        //end SE settings

        //STATS
        .stat('size', {
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: config.unitText,
            filters: {
                INDIC_SBS: unitCode,
                TIME: '2023',
                nace_r2: naceCode, // Array for multiple values
            },
        })

        //legend
        .legend({
            title: config.title,
            x: 10,
            y: 110,
            boxOpacity: 0.9,
            sizeLegend: { labelFormatter: getLegendLabelFormatter(unitCode) },
        })

        //tooltip
        .tooltip({
            textFunction: getTooltipFunction(unitCode),
        })

    map.build()
}

export function updateMap(unitCode, naceCode) {
    map.stat('size', {
        eurostatDatasetCode: 'sbs_r_nuts2021',
        unitText: configs[unitCode].unitText,
        filters: {
            INDIC_SBS: unitCode,
            TIME: '2023',
            nace_r2: naceCode,
        },
    })

    map.updateStatData()

    map.legend({
        title: configs[unitCode].title,
        sizeLegend: { labelFormatter: getLegendLabelFormatter(unitCode) },
    })

    map.tooltip({
        textFunction: getTooltipFunction(unitCode),
    })
}

const getLegendLabelFormatter = (code) => {
    const { multiplier } = configs[code]
    return (value) => compactFormatter.format(value * multiplier)
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

        const statData = map.statData('size')
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

        const displayValue = longFormatter.format(Math.round(sv.value * multiplier))
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

// Initialize the map with a default code - defer until after flex layout is computed
requestAnimationFrame(() => initMap('LOC_NR', 'P'))
