const s = 210 // inset size in pixels
const insetBoxPadding = 8 // inset box padding
const p = 3 // inset padding

const firstColumnItemWidth = 0.35 * s
const firstColumnItemHeight = 0.45 * s

const secondColumnItemWidth = 0.375 * s
const GPheight = 0.36 * s
const GFheight = 0.45 * s

const finalColumnX = insetBoxPadding + firstColumnItemWidth + p + secondColumnItemWidth + p * 3.5
const finalColumnItemWidth = 0.3 * s
const finalColumnItemHeight = 0.295 * s

const finalRowItemY = finalColumnItemHeight * 3 + p + insetBoxPadding
const finalRowItemWidth = 0.254 * s
const finalRowItemHeight = 0.29 * s

let currentConfig = null

const insetsConfig = () => {
    let config = [
        {
            geo: 'IC',
            x: insetBoxPadding,
            y: insetBoxPadding,
            width: firstColumnItemWidth - p,
            height: firstColumnItemHeight - 0.12 * s,
            svgId: 'inset0',
            title: 'Canarias (ES)',
            pixSize: 6800,
            geoCenter: [399000, 3150000],
            scalebarPosition: [1, 55],
        },
        {
            geo: 'GP',
            x: insetBoxPadding + firstColumnItemWidth + p,
            y: insetBoxPadding,
            width: secondColumnItemWidth,
            height: GPheight,
            svgId: 'inset1',
            title: 'Guadeloupe (FR)',
            pixSize: 1900,
            geoCenter: [669498, 1804552],
            scalebarPosition: [51, 55],
        },
        {
            geo: 'MQ',
            x: finalColumnX,
            y: insetBoxPadding,
            width: finalColumnItemWidth,
            height: finalColumnItemHeight,
            svgId: 'inset2',
            title: 'Martinique (FR)',
            pixSize: 1800,
            geoCenter: [716521, 1625000],
            scalebarPosition: [0, 35],
        },
        {
            geo: 'MT',
            x: insetBoxPadding,
            y: firstColumnItemHeight + p + insetBoxPadding,
            width: firstColumnItemWidth,
            height: firstColumnItemHeight,
            svgId: 'inset3',
            title: 'Malta',
            pixSize: 900,
            geoCenter: [4721000, 1440000],
            scalebarPosition: [1, 60],
        },
        {
            geo: 'GF',
            x: insetBoxPadding + firstColumnItemWidth + p * 3,
            y: GPheight + p + p + p + insetBoxPadding,
            width: secondColumnItemWidth - p,
            height: GFheight,
            svgId: 'inset4',
            title: 'Guyane (FR)',
            pixSize: 6500,
            geoCenter: [269852, 470000],
            titlePosition: [0, 10],
            scalebarPosition: [52, 75],
        },
        {
            geo: 'RE',
            x: finalColumnX,
            y: finalColumnItemHeight + p + insetBoxPadding,
            width: finalColumnItemWidth,
            height: finalColumnItemHeight,
            svgId: 'inset5',
            title: 'Réunion (FR)',
            pixSize: 2000,
            geoCenter: [340011, 7671627],
            scalebarPosition: [1, 40],
        },
        {
            geo: 'YT',
            x: finalColumnX,
            y: finalColumnItemHeight * 2 + p * 2 + insetBoxPadding,
            width: finalColumnItemWidth,
            height: finalColumnItemHeight,
            svgId: 'inset6',
            title: 'Mayotte (FR)',
            pixSize: 1200,
            scalebarPosition: [1, 30],
        },
        {
            geo: 'PT20',
            x: insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            svgId: 'inset7',
            title: 'Açores (PT)',
            pixSize: 4900,
            scalebarPosition: [1, 40],
        },
        {
            geo: 'PT30',
            x: finalRowItemWidth + p + insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            svgId: 'inset8',
            title: 'Madeira (PT)',
            pixSize: 2400,
            scalebarPosition: [1, 40],
        },
        {
            geo: 'LI',
            x: finalRowItemWidth * 2 + p * 2 + insetBoxPadding + 2.5,
            y: finalRowItemY + 17,
            width: finalRowItemWidth - 5,
            height: finalRowItemHeight - 20,
            svgId: 'inset9',
            // title: 'Liechtenstein',
            // titleFill: 'white',
            // titleStroke: 'white',
            // titleStrokeWidth: '2px',
            // titleFontWeight: 'normal',
            // subtitle: 'Liechtenstein',
            // titlePosition: [0, 11],
            // subtitlePosition: [0, 11],
            // subtitleFill: 'black',
            // subtitleFontWeight: 'normal',
            // subtitleFontSize: 9,
            pixSize: 900,
            geoCenter: [4280060, 2669000],
            scalebarPosition: [5, 25],
        },
        {
            geo: 'SJ_SV',
            x: finalRowItemWidth * 3 + p * 3 + insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            svgId: 'inset10',
            title: 'Svalbard (NO)',
            geoCenter: [4570000, 6240000],
            pixSize: 12000,
            scalebarPosition: [33, 45],
        },
    ]

    config.forEach((inset, i) => {
        inset.titleFontSize = 9
        inset.fontFamily = 'Myriad-Pro, Arial, Helvetica, sans-serif'
        if (!inset.titlePosition) inset.titlePosition = [2, 11]
        inset.titleFontWeight = 100
        inset.frameStroke = '#aaaaaa'
        inset.frameStrokeWidth = 0
        inset.labelling = false

        if (inset.scalebar !== false) {
            inset.showScalebar = true
            inset.scalebarTickHeight = 6
            inset.scalebarSegmentHeight = 6
            inset.scalebarFontSize = 7
            inset.scalebarUnits = ''
            inset.scalebarTextOffset = [0, 8]
            if (!inset.scalebarMaxWidth) {
                inset.scalebarMaxWidth = 15
            }
        }

        // generate unique identifiers for batch map-making
        // inset.svgId = 'inset-' + i + '-' + Math.random().toString(16).slice(2)
    })

    currentConfig = config
    return config
}

// export { insetsConfig, currentConfig }
