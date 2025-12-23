export function renderMap(code) {
    const isMobile = window.innerWidth <= 768;

    const mapWidth  = isMobile
      ? window.innerWidth
      : 700;
    
    const mapHeight = isMobile
      ? Math.round(window.innerHeight - 160) // 100% of viewport height - header etc
      : 550;

    const configs = {
        EMP_PLOC_NR: {
            legendTitle: 'Number of persons',
            colors: ["#FFEB99", "#D0E9B0", "#8AD6B9", "#56C2C0", "#3194B6", "#114891", "#17256B"],
            //thresholds: [10, 20, 30, 40, 50, 60, 70, 80],
            nbClasses: 7
        },
        LC_EMP_LOC_TEUR: {
            legendTitle: 'Thousand euro',
            colors: ["#FFEB99", "#DCEAAA", "#B0E2B6", "#77D1BA", "#56C2C0", "#3BA9BF", "#1C69A4", "#133F88", "#17256B"],
            //thresholds: [10, 20, 30, 40, 50, 60, 70, 80],
            nbClasses: 9
        }
    }
    let map = eurostatmap
        .map('ch')
        .width(mapWidth)
        .height(mapHeight)
        .dorling(false)
        .scale('60M')
        //.title('Manufacturing sector by region, 2023')

        .position({ x: 4300000, y: 3420000, z: isMobile ? 9000: 7400 })
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
        .logoPosition([2, mapHeight - 30 ])
        .ribbonPosition([mapWidth - 180, mapHeight - 30 ])
        .ribbonWidth(300)
        .ribbonHeight(50)
        .showSourceLink(false)
        .footnote(' <tspan style="font-style: italic;">Source</tspan>: Eurostat <a href="https://ec.europa.eu/eurostat" target="_blank">(sbs_r_nuts2021)</a>')
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
                nace_r2: 'C',
                TIME: '2023'
            },
        })
        .legend({
            title: configs[code].legendTitle,
            x: 5,
            y:  isMobile ? 10: 100,
            boxPadding: 4,
            boxOpacity: 0.9,
            tickLength:8,
            maxMin: true,
            maxMinTickLength:15,
            maxMinRegionLabels: false,
            maxMinLabels: ['',''],

        })


    map.build()

    //setTimeout(() => console.log(map.position()), 1000)
}

renderMap('EMP_PLOC_NR')
