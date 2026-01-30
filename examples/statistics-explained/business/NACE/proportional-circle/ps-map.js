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
        title: 'Million EUR',
        unitText: 'euro',
        multiplier: 1000000, // MEUR → EUR
    },
}
const compactFormatter = new Intl.NumberFormat('en', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
})
const longFormatter = new Intl.NumberFormat('en', {
    notation: 'compact',
    compactDisplay: 'long',
    maximumFractionDigits: 1,
})
const spaceAsThousandSeparator = (number) => {
    return number.toLocaleString('en').replace(/,/g, ' ')
}
let map
const isMobile = window.innerWidth <= 768
export function initMap(code) {
    const mapWidth = isMobile ? window.innerWidth : 700
    const mapHeight = isMobile ? Math.round(window.innerHeight - 160) : 550

    map = eurostatmap
        .map('ps')
        .dorling(true)
        .width(mapWidth)
        .height(mapHeight)
        .scale('60M')
        //.title('Manufacturing sector by region, 2023')
        .position({ x: 4300000, y: 3420000, z: 7400 })
        .nutsLevel(2)

        //symbol settings
        .psFill('#2644A7')
        .psBrightenFactor(0.8) //background color brightening factor
        .psMaxSize(18)
        .psMinSize(3)

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
        .insetsButton(true)
        //end SE settings

        //STATS
        .stat('size', {
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: configs[code].unitText,
            filters: {
                INDIC_SBS: code,
                TIME: '2023',
                nace_r2: ['B', 'D', 'E'], // Array for multiple values
            },
        })

        //legend
        .legend({
            title: configs[code].title,
            x: 10,
            y: 110,
            boxOpacity: 0.9,
            sizeLegend: { labelFormatter: getLegendLabelFormatter(code) },
        })

        //tooltip
        .tooltip({
            textFunction: getTooltipFunction(code),
        })

    map.build()
}

export function updateMap(code) {
    map.stat('size', {
        eurostatDatasetCode: 'sbs_r_nuts2021',
        unitText: configs[code].unitText,
        filters: {
            INDIC_SBS: code,
            TIME: '2023',
            nace_r2: ['B', 'D', 'E'],
        },
    })

    map.updateStatData()

    map.legend({
        title: configs[code].title,
        sizeLegend: { labelFormatter: getLegendLabelFormatter(code) },
    })

    map.tooltip({
        textFunction: getTooltipFunction(code),
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

// Initialize the map with a default code
initMap('LOC_NR')
