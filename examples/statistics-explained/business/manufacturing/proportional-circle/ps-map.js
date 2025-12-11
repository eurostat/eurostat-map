export function renderMap(code) {
    // basic barebones proportional circles example
    const mapHeight = 550
    const mapWidth = 750
    const headerPadding = 60

    const legendTitles = {
        LOC_NR: {
            title: 'Number of units',
        },
        EMP_LOC_NR: {
            title: 'Number of persons',
            subtitle: ''
        },
        WAGE_LOC_MEUR: {
            title: 'Million EUR',
        }
    }

    let map = eurostatmap
        .map('ps').width(mapWidth).height(mapHeight)
        .dorling(false)
        .scale('60M')
        .title('Manufacturing sector by region, 2023')
        .subtitle('Absolute values')
        .position({ x: 4800000, y: 3420000, z: 7400 })
        .nutsLevel(2).dorling(true)

        //symbol settings
        .psFill('#005C99')
        .psBrightenFactor(0.8) //background color brightening factor
        .psMaxSize(18)
        .psMinSize(3)

        //SE settings
        .header(true)
        .footer(true)
        .zoomButtons(false)
        .showEstatLogo(true)
        .showEstatRibbon(true)
        .logoPosition([2, mapHeight + headerPadding + 10])
        .ribbonPosition([mapWidth - 180, mapHeight + headerPadding + 6])
        .ribbonWidth(300)
        .ribbonHeight(50)
        .showSourceLink(false)
        .footnote(' <tspan style="font-style: italic;">Source</tspan>: Eurostat <a href="https://ec.europa.eu/eurostat" target="_blank">(sbs_r_nuts2021)</a>')
        .footnoteTooltipText(false)
        .headerPadding(headerPadding)
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
                nace_r2: 'C',
            },
        })

        //legend
        .legend({
            title: legendTitles[code].title,
            subtitle: legendTitles[code].subtitle,
            x: 10,
            y: 210,
            boxOpacity: 0.9
        })


    map.build()
}

renderMap('LOC_NR')
