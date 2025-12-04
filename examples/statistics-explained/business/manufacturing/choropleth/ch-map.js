export function renderMap(code) {
    // basic barebones proportional circles example
    const height = 550
    const width = 750
    const legendTitles = {
        EMP_PLOC_NR: {
            title: 'Persons employed ',
            subtitle: 'per local unit'
        },
        LC_EMP_LOC_TEUR: {
            title: 'Thousand euro',
            subtitle: ''
        }
    }
    let map = eurostatmap
        .map('ch')
        .width(width)
        .height(height)
        .dorling(false)
        .scale('60M')
        .title('Manufacturing sector by region, 2023')

        .position({ x: 4700000, y: 3420000, z: 7400 })


        //classification
        .colors(['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'])
        .classificationMethod('quantile')


        //SE settings
        .header(true)
        .footer(true)
        .zoomButtons(false)
        .showEstatLogo(true)
        .showEstatRibbon(true)
        .logoPosition([2, height + 65])
        .ribbonPosition([width - 180, height + 60])
        .ribbonWidth(300)
        .ribbonHeight(50)
        .showSourceLink(false)
        .footnote(' <tspan style="font-style: italic;">Source</tspan>: Eurostat <a href="https://ec.europa.eu/eurostat" target="_blank">(sbs_r_nuts2021)</a>')
        .footnoteTooltipText(false)
        .headerPadding(75)
        .showZoomButtons(true)
        .insets('default')
        //end SE settings
        .nutsLevel(2)

        .stat({
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: '',
            filters: { INDIC_SBS: code, TIME: '2023' },
        })
        .legend({ title: legendTitles[code].title, subtitle: legendTitles[code].subtitle, x: 5, y: 200, boxPadding: 4 })


    map.build()

    //setTimeout(() => console.log(map.position()), 1000)
}

renderMap('EMP_PLOC_NR')
