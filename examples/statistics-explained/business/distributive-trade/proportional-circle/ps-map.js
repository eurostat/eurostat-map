export function renderMap(code) {
    const isMobile = window.innerWidth <= 768
    const mapContainer = document.getElementById('map-container')
    const mapWidth = mapContainer ? mapContainer.clientWidth : isMobile ? window.innerWidth : 700
    const containerHeight = mapContainer ? mapContainer.clientHeight : isMobile ? Math.round(window.innerHeight - 250) : 700
    const mapHeight = Math.max(containerHeight - 24, 240)

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

    let map = eurostatmap
        .map('ps')
        .dorling(true)
        .width(mapWidth)
        .height(mapHeight)
        .scale('60M')
        //.title('Distributive trade sector by region, 2023')
        .position({ x: 4300000, y: 3420000, z: 7400 })
        .nutsLevel(2)

        //symbol settings
        .psSettings({
            fill: '#005C99',
            brightenFactor: 0.8
        }) //background color brightening factor
        .psSettings({
            maxSize: 18,
            minSize: 3
        })

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
            ' <tspan style="font-style: italic;">Source</tspan>: Eurostat <a href="https://ec.europa.eu/eurostat/databrowser/product/page/sbs_r_nuts2021" target="_blank">(sbs_r_nuts2021)</a>'
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
                nace_r2: 'G',
            },
        })

        //legend
        .legend({
            title: legendTitles[code].title,
            subtitle: legendTitles[code].subtitle,
            x: 10,
            y: 110,
            boxOpacity: 0.9,
        })

    map.build()
}

requestAnimationFrame(() => renderMap('LOC_NR'))
