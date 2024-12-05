const h = 81.26
const w = 71.81
const s = 70 // inset size
const p = 4 // inset padding
const insetsConfig = [
    {
        geo: 'IC',
        x: 0,
        y: 0,
        width: w,
        height: h,
        pixelSize: 7500,
        title: 'Canarias (ES)',
        geoCenter: [410000, 3180000],
        scalebarPosition: [1, 65],
    },
    {
        geo: 'GP',
        x: w + p,
        y: 0,
        width: w,
        height: h,
        title: 'Guadeloupe (FR)',
        geoCenter: [660000, 1800000],
        scalebarPosition: [1, 65],
    },
    {
        geo: 'GP',
        x: w + p + 5,
        y: 15,
        width: 23,
        height: 15,
        pixelSize: 1500,
        geoCenter: [493000, 1999000],
        scalebarPosition: [1, 65],
    },
    {
        geo: 'GF',
        x: w * 2 + p * 2,
        y: 0,
        width: w,
        height: h,
        pixelSize: 7000,
        title: 'Guyane (FR)',
        geoCenter: [295852, 484074],
        scalebarPosition: [45, 65],
    },
    {
        geo: 'MQ',
        x: 0,
        y: h + p,
        width: w,
        height: h,
        title: 'Martinique (FR)',
        pixelSize: 1000,
        geoCenter: [716521, 1621322],
        scalebarPosition: [1, 65],
    },
    {
        geo: 'YT',
        x: w + p,
        y: h + p,
        width: w,
        height: h,
        title: 'Mayotte (FR)',
        scalebarPosition: [1, 65],
    },
    {
        geo: 'RE',
        x: w * 2 + p * 2,
        y: h + p,
        width: w,
        height: h,
        title: 'Réunion (FR)',
        scalebarPosition: [1, 65],
    },

    {
        geo: 'MT',
        x: 0,
        y: 2 * h + 2 * p,
        width: w,
        height: h,
        title: 'Malta',
        scalebarPosition: [1, 65],
    },
    {
        geo: 'PT20',
        x: w + p,
        y: 2 * h + 2 * p,
        width: w,
        height: h,
        pixelSize: 4000,
        title: 'Açores (PT)',
        geoCenter: [440000, 4360000],
        scalebarPosition: [48, 65],
    },
    {
        geo: 'PT20',
        x: w + p + 40,
        y: 2 * h + 2 * p + 17,
        width: 23,
        height: 30,
        pixelSize: 5000,
        geoCenter: [650000, 4150000],
        scalebarPosition: [1, 65],
    },
    {
        geo: 'PT20',
        x: w + p + 5,
        y: 2 * h + 2 * p + 17,
        width: 15,
        height: 20,
        pixelSize: 3500,
        geoCenter: [140000, 4390000],
        scalebarPosition: [1, 65],
    },
    {
        geo: 'PT30',
        x: 2 * w + 2 * p,
        y: 2 * h + 2 * p,
        width: w,
        height: h,
        title: 'Madeira (PT)',
        scalebarPosition: [1, 65],
    },
    {
        geo: 'LI',
        x: w + p,
        y: 3 * h + 3 * p,
        width: w,
        height: h,
        title: 'Liechtenstein',
        titleFill: 'white',
        titleStroke: 'white',
        titleStrokeWidth: '2px',
        titleFontSize: 8.78,
        titleFontWeight: 'normal',
        subtitle: 'Liechtenstein',
        subtitlePosition: [2, 11],
        subtitleFill: 'black',
        subtitleFontWeight: 'normal',
        subtitleFontSize: 8.78,
        geoCenter: [4285060, 2674000],
        scale: '01M',
        scalebarPosition: [1, 65],
    },
    {
        geo: 'SJ_SV',
        x: w * 2 + p * 2,
        y: 3 * h + 3 * p,
        width: w,
        height: h,
        title: 'Svalbard (NO)',
        geoCenter: [4540000, 6210156],
        pixelSize: 8000,
        scale: '10M',
        scalebarPosition: [1, 65],
    },
]

insetsConfig.forEach((c) => {
    c.labelling = false
    c.frameStroke = 'grey'
    c.frameStrokeWidth = 1
    if (!c.titleFontSize) c.titleFontSize = 8.78
    c.fontFamily = 'Arial'
    if (!c.titlePosition) c.titlePosition = [2, 11]
    if (!c.titleFontWeight) c.titleFontWeight = 100

    c.showScalebar = true
    c.scalebarTickHeight = 6
    c.scalebarSegmentHeight = 6
    c.scalebarFontSize = 7
    c.scalebarTicks = 2
    c.scalebarUnits = ''
    c.scalebarTextOffset = [0, 8]
    c.scalebarMaxWidth = 14
})
