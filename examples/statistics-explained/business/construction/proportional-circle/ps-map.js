export function renderMap(code) {
    const isMobile = window.innerWidth <= 768
    const mapWidth = isMobile ? window.innerWidth : 700
    const mapHeight = isMobile
        ? Math.round(window.innerHeight - 160) // 100% of viewport height - header etc
        : 550

    const legendTitles = {
        LOC_NR: {
            title: 'Number of units',
        },
        EMP_LOC_NR: {
            title: 'Number of persons',
            subtitle: '',
        },
        WAGE_LOC_MEUR: {
            title: 'Million EUR',
        },
    }

    const map = eurostatmap
        .map('ps')
        .dorling(true)
        .width(mapWidth)
        .height(mapHeight)
        .scale('60M')
        //.title('Manufacturing sector by region, 2023')
        .position({ x: 4300000, y: 3420000, z: isMobile ? 9000 : 7400 })
        .nutsLevel(2)

        //symbol settings
        .psSettings({ fill: '#005C99' })
        .psSettings({ brightenFactor: 0.8 }) //background color brightening factor
        .psSettings({ maxSize: 18 })
        .psSettings({ minSize: 3 })

        //SE settings
        //.header(true)
        //.headerPadding(headerPadding)
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
        .insetsButton(true)
        //end SE settings

        //STATS
        .stat('size', {
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: '',
            filters: {
                INDIC_SBS: code,
                TIME: '2023',
                nace_r2: 'F',
            },
        })

        //legend
        .legend({
            title: legendTitles[code].title,
            titlePadding: -10,
            subtitle: legendTitles[code].subtitle,
            x: 10,
            y: 110,
            boxOpacity: 0.9,
        })

    map.build()
}

renderMap('LOC_NR')
