export function renderMap(code) {
    // basic barebones proportional circles example
    const height = 550
    const width = 750
    const legendTitles = {
        LOC_NR: {
            title: 'Local units',
        },
        EMP_LOC_NR: {
            title: 'Persons employed',
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
        .title('Manufacturing')
        .position({ x: 4800000, y: 3420000, z: 7400 })
        //.subtitle(code)

        .psMaxSize(18)
        .psMinSize(2)

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
        //end SE settings



        .nutsLevel(2)

        .stat('size', {
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: '',
            filters: { INDIC_SBS: code, TIME: '2023' },
        })
        .legend({ title: legendTitles[code].title, subtitle: legendTitles[code].subtitle, x: 30, y: 200 })


    map.build()
}

renderMap('LOC_NR')
