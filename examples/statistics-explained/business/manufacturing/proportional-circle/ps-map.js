export function renderMap(code) {
    // basic barebones proportional circles example
    const height = 550
    const width = 750
    const legendTitles = {
        LOC_NR: {
            title: 'Number',
        },
        EMP_LOC_NR: {
            title: 'Number',
            subtitle: ''
        },
        WAGE_LOC_MEUR: {
            title: 'Million EUR',
        }
    }

    let map = eurostatmap
        .map('ps').width(width).height(height)
        .dorling(false)
        .scale('60M')
        .title('Manufacturing sector by region, 2023')
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
        .logoPosition([2, height + 32])
        .ribbonPosition([width - 180, height + 27])
        .ribbonWidth(300)
        .ribbonHeight(50)
        .showSourceLink(false)
        .footnote(' <tspan style="font-style: italic;">Source</tspan>: Eurostat <a href="https://ec.europa.eu/eurostat" target="_blank">(sbs_r_nuts2021)</a>')
        .footnoteTooltipText(false)
        .headerPadding(40)
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
            y: 180,
            boxOpacity: 0.9
        })


    map.build()
}

renderMap('LOC_NR')
