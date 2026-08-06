;(function () {
    const COUNTRY_TO_ISO2 = {
        Austria: 'AT',
        Belgium: 'BE',
        Bulgaria: 'BG',
        Croatia: 'HR',
        Cyprus: 'CY',
        Czechia: 'CZ',
        Denmark: 'DK',
        Estonia: 'EE',
        Finland: 'FI',
        France: 'FR',
        Germany: 'DE',
        Greece: 'EL',
        Hungary: 'HU',
        Ireland: 'IE',
        Italy: 'IT',
        Latvia: 'LV',
        Lithuania: 'LT',
        Luxembourg: 'LU',
        Malta: 'MT',
        Netherlands: 'NL',
        Norway: 'NO',
        Poland: 'PL',
        Portugal: 'PT',
        Romania: 'RO',
        Slovakia: 'SK',
        Slovenia: 'SI',
        Spain: 'ES',
        Sweden: 'SE',
        Switzerland: 'CH',
        EU: 'EU27_2020',
    }

    const DEFAULT_CATEGORY_COLORS = {
        DEG1: '#33A033',
        DEG2: '#8F741A',
        DEG3: '#E04040',
    }

    const GRID_POSITIONS = `
                ,IS,  ,  ,NO,SE,FI,  ,  ,  ,  ,  ,
                ,  ,  ,  ,  ,  ,  ,EE,  ,  ,  ,  ,
                ,  ,  ,  ,  ,  ,  ,LV,  ,  ,  ,  ,
                ,IE,  ,  ,  ,DK,  ,LT,  ,  ,  ,  ,
                ,  ,  ,  ,NL,DE,PL,  ,  ,  ,  ,  ,
                ,  ,  ,BE,LU,CZ,SK,UA,  ,  ,  ,  ,
                ,  ,FR,CH,LI,AT,HU,RO,MD,  ,  ,  ,
                ,PT,ES,  ,IT,SI,HR,RS,BG,  ,  ,  ,
                ,  ,  ,  ,  ,  ,BA,ME,MK,  ,  ,  ,
                ,  ,  ,  ,  ,  ,  ,AL,EL,TR,GE,  ,
                ,  ,  ,  ,MT,  ,  ,  ,  ,CY,  ,  ,  `

    function clearMapSvg(svgId) {
        const svg = document.getElementById(svgId)
        if (svg) svg.innerHTML = ''
    }

    function normalizeSimpleData(rawData) {
        const out = {}
        for (const entry of rawData.data || []) {
            const iso2 = COUNTRY_TO_ISO2[entry.country]
            if (!iso2 || iso2 === 'EU27_2020') continue
            out[iso2] = {
                DEG1: entry.cities,
                DEG2: entry.towns_suburbs,
                DEG3: entry.rural,
            }
        }
        return out
    }

    function normalizeDimensionData(rawData, dimension) {
        const out = {}
        const normalizeValue = (value) => {
            if (value === null || value === undefined || value === '') return ':'
            return Number.isNaN(value) ? ':' : value
        }

        for (const entry of rawData.data || []) {
            const iso2 = COUNTRY_TO_ISO2[entry.country]
            const values = entry[dimension]
            if (!iso2 || iso2 === 'EU27_2020' || !values) continue
            out[iso2] = {
                DEG1: normalizeValue(values.cities),
                DEG2: normalizeValue(values.towns_suburbs),
                DEG3: normalizeValue(values.rural),
            }
        }
        return out
    }

    function createBarMapBuilder(opts) {
        const {
            data,
            populationData,
            config,
            title,
            subtitle,
            useCartogram,
            useTotalPopWidth,
            widthStat,
            categoryColors = DEFAULT_CATEGORY_COLORS,
            groupMaxHeight,
        } = opts

        let mapBuilder = eurostatmap
            .map('bar')
            .dorling(true)
            .hoverColor('#ffffbf')
            .dorling(!useCartogram)
            .gridCartogram(useCartogram)
            .gridCartogramSettings({
                spacing: 0,
                cellPadding: 12,
                margins: { top: 5, right: 100, bottom: 0, left: 0 },
                positions: GRID_POSITIONS,
                countryLabels: 'name',
                countryLabelPadding: { x: 2, y: -3 },
                countryLabelFontSize: 11,
            })
            .svgId('bar')
            .scale('60M')
            .nutsLevel(0)
            .stat('degurbaRate', {
                customData: data,
                categoryCodes: ['DEG1', 'DEG2', 'DEG3'],
                unitText: config.unitText,
            })
            .stat(widthStat, {
                customData: populationData,
                categoryCodes: ['DEG1', 'DEG2', 'DEG3'],
                unitText: 'inhabitants',
            })
            .encoding('height', {
                stat: 'degurbaRate',
                scale: 'linear',
                range: [2, groupMaxHeight],
            })
            .encoding('color', {
                stat: 'degurbaRate',
                by: 'category',
                values: categoryColors,
                labels: {
                    DEG1: 'Cities',
                    DEG2: 'Towns and suburbs',
                    DEG3: 'Rural areas',
                },
            })
            .barSettings({
                groupMaxHeight,
            })
            .title(title)
            .header(true)
            .footer(true)
            .subtitle(subtitle)
            .legend({
                position: 'top right',
                boxOpacity: 0.8,
                boxFill: 'white',
                sizeLegend: {
                    title: config.sizeLegendTitle,
                    titlePadding: 10,
                },
                widthLegend: {
                    title: 'Population',
                    values: [4000000, 10000000, 35000000],
                },
                colorLegend: {
                    title: config.legendTitle,
                    noData: false,
                },
            })
            .patternFill({
                pattern: 'hatching',
                color: '#000000',
                strokeWidth: 0.2,
                spacing: 15,
                regionIds: config.noDataRegions,
                legendLabel: 'Data unavailable',
            })
            .noDataFillStyle('#ffffff')
            .zoomButtons(false)

        if (useTotalPopWidth) {
            mapBuilder = mapBuilder.encoding('width', {
                stat: widthStat,
                scale: 'linear',
                range: [useCartogram ? 3 : 2, useCartogram ? 16 : 9],
            })
        }

        return mapBuilder
    }

    window.URECommon = {
        COUNTRY_TO_ISO2,
        DEFAULT_CATEGORY_COLORS,
        clearMapSvg,
        normalizeSimpleData,
        normalizeDimensionData,
        createBarMapBuilder,
    }
})()
