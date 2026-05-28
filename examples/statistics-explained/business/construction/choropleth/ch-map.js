export function renderMap(code) {
    const isMobile = window.innerWidth <= 768
    const mapWidth = isMobile ? window.innerWidth : 700
    const mapHeight = isMobile
        ? Math.round(window.innerHeight - 160) // 100% of viewport height - header etc
        : 550

    const configs = {
        EMP_PLOC_NR: {
            legendTitle: 'Persons per unit',
            colors: ['#FFEB99', '#E0EAA8', '#BDE6B5', '#8AD6B9', '#62C8BD', '#4ABBC2', '#3194B6', '#155A9E', '#133C85', '#17256B'],
            thresholds: [2, 3, 4, 5, 6, 7, 8, 9, 10],
            nbClasses: 7,
        },
        LC_EMP_LOC_TEUR: {
            legendTitle: 'Euro',
            colors: ['#FFEB99', '#D7EAAC', '#A0DDB7', '#65CABC', '#47B9C3', '#257BAB', '#12438C', '#17256B'],
            thresholds: [8000, 16000, 24000, 32000, 40000, 48000, 56000],
            nbClasses: 9,
            transform: (value) => Number((value * 1000).toFixed(0)), // convert from thousand euro to euro
        },
    }
    const map = eurostatmap
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
        // .header(true)
        .footer(true)
        //.headerPadding(headerPadding)
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
            unitText: '',
            filters: {
                INDIC_SBS: code,
                nace_r2: 'F',
                TIME: '2023',
            },
            transform: configs[code].transform, // optional function to transform values (e.g. convert to thousands)
        })
        .legend({
            title: configs[code].legendTitle,
            titlePadding: -10,
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

    //setTimeout(() => console.log(map.position()), 1000)
}

renderMap('EMP_PLOC_NR')
