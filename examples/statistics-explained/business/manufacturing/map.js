export function renderMap(code) {
    // basic barebones proportional circles example
    let map = eurostatmap
        .map('ps')
        .dorling(false)
        .scale('60M')
        .title('Manufacturing')
        .subtitle(code)
        .nutsLevel(2)
        .width(800)
        .stat('size', {
            eurostatDatasetCode: 'sbs_r_nuts2021',
            unitText: '',
            filters: { INDIC_SBS: code, TIME:'2023' },
        })
        .legend({ title: 'Total', x:680, y :10 })
        .insets(false)
        .psMaxSize(20)
        .psMinSize(1)

    map.build()
}

renderMap('LOC_NR')
