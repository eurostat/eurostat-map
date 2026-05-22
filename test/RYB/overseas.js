const deepClone = function (obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }
    if (Array.isArray(obj)) {
        return obj.map(deepClone)
    }
    const cloned = {}
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key])
        }
    }
    return cloned
}

const s = 210 // inset size in pixels
const insetBoxPadding = 8 // inset box padding
const p = 3 // inset padding
const titleFontSize = 8
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

let outermostInsetsConfig = null

const createOutermostInsetsConfig = () => {
    let config = [
        {
            geo: 'IC',
            x: insetBoxPadding,
            y: insetBoxPadding,
            width: firstColumnItemWidth - p,
            height: firstColumnItemHeight - 0.12 * s,
            svgId: 'inset0',
            title: 'Canarias (ES)',
            position: { x: 420000, y: 3150000, z: 6800 },
            scalebarPosition: [1, 55],
            showScalebar: true,
            //scalebarUnits: ' km'
        },
        {
            geo: 'GP',
            x: insetBoxPadding + firstColumnItemWidth + p * 3,
            y: insetBoxPadding,
            width: secondColumnItemWidth,
            height: GPheight,
            svgId: 'inset1',
            title: 'Guadeloupe (FR)',
            position: { x: 680000, y: 1810000, z: 1820 },
            titlePosition: [0, 10],
            showScalebar: true,
            scalebarPosition: [48, 55],
        },
        {
            geo: 'GP',
            x: insetBoxPadding + firstColumnItemWidth + p * 3,
            y: insetBoxPadding + 18,
            width: 23,
            height: 15,
            position: { x: 493000, y: 1998000, z: 1200 },
            frameStrokeWidth: 0.8,
        },
        {
            geo: 'MQ',
            x: finalColumnX,
            y: insetBoxPadding,
            width: finalColumnItemWidth,
            height: finalColumnItemHeight,
            svgId: 'inset2',
            title: 'Martinique (FR)',
            position: { x: 716521, y: 1625000, z: 1800 },
            showScalebar: true,
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
            position: { x: 4721000, y: 1440000, z: 900 },
            showScalebar: true,
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
            position: { x: 269852, y: 470000, z: 6500 },
            titlePosition: [0, 10],
            showScalebar: true,
            scalebarPosition: [48, 75],
            scalebarMaxWidth: 17,
        },
        {
            geo: 'RE',
            x: finalColumnX,
            y: finalColumnItemHeight + p + insetBoxPadding,
            width: finalColumnItemWidth,
            height: finalColumnItemHeight,
            svgId: 'inset5',
            title: 'Réunion (FR)',
            position: { x: 340011, y: 7671627, z: 2000 },
            showScalebar: true,
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
            position: { z: 1200 },
            showScalebar: true,
            scalebarPosition: [1, 30],
        },
        {
            geo: 'PT20',
            x: insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            svgId: 'inset7a',
            title: 'Açores (PT)',
            position: { x: 470000, y: 4370000, z: 5000 },
            processCentroids: (centroidFeatures) => {
                //adjust centroids
                return centroidFeatures.map((feature) => {
                    if (feature.properties.id == 'PT2' || feature.properties.id == 'PT20' || feature.properties.id == 'PT200') {
                        feature.geometry.coordinates[0] = 454540
                        feature.geometry.coordinates[1] = 4279765
                    }
                    return feature
                })
            },
            showScalebar: true,
            scalebarPosition: [34, 41],
        },
        {
            geo: 'PT20',
            x: insetBoxPadding + 3,
            y: finalRowItemY + titleFontSize + 8,
            width: 20,
            height: 20,
            svgId: 'inset7b',
            position: { x: 140000, y: 4385000, z: 2800 },

            frameStrokeWidth: 0.8,
        },
        {
            geo: 'PT20',
            x: insetBoxPadding + 30,
            y: finalRowItemY + titleFontSize + 8,
            width: 20,
            height: 22,
            svgId: 'inset7c',
            position: { x: 650000, y: 4140000, z: 6000 },
            processCentroids: (centroidFeatures) => {
                //adjust centroids
                return centroidFeatures.map((feature) => {
                    if (feature.properties.id == 'PT2' || feature.properties.id == 'PT20' || feature.properties.id == 'PT200') {
                        feature.geometry.coordinates[0] = 454540
                        feature.geometry.coordinates[1] = 4279765
                    }
                    return feature
                })
            },
            frameStrokeWidth: 0.8,
        },
        {
            geo: 'PT30',
            x: finalRowItemWidth + p + insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            svgId: 'inset8',
            title: 'Madeira (PT)',
            position: { x: 323586, y: 3632706, z: 2600 },
            titlePosition: [4, 11],
            showScalebar: true,
            scalebarPosition: [4, 41],
            scalebarMaxWidth: 25,
        },
        {
            geo: 'LI',
            x: finalRowItemWidth * 2 + p * 2 + insetBoxPadding + 2.5,
            y: finalRowItemY + 17,
            width: finalRowItemWidth - 5,
            height: finalRowItemHeight - 20,
            svgId: 'inset9',
            // title added manually in template html
            position: { x: 4280060, y: 2669000, z: 900 },
            showScalebar: true,
            scalebarPosition: [4, 24],
        },
        {
            geo: 'SJ_SV',
            x: finalRowItemWidth * 3 + p * 3 + insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            svgId: 'inset10',
            title: 'Svalbard (NO)',
            position: { x: 4570000, y: 6240000, z: 12000 },
            showScalebar: true,
            scalebarPosition: [33, 41],
            scalebarMaxWidth: 17,
        },
    ]

    config.forEach((inset, i) => {
        if (!inset.titlePosition) inset.titlePosition = [2, 11]
        if (inset.showScalebar) {
            inset.scalebarTickHeight = 6
            inset.scalebarSegmentHeight = 6
            inset.scalebarFontSize = 7
            if (!inset.scalebarUnits) inset.scalebarUnits = ''
            inset.scalebarTextOffset = [0, 8]
            if (!inset.scalebarMaxWidth) {
                inset.scalebarMaxWidth = 15
            }
        }

        // generate unique identifiers for batch map-making
        inset.svgId = 'inset-' + i + '-' + Math.random().toString(16).slice(2)
    })

    outermostInsetsConfig = config // for when we dont want to regenerate the svg ids and just want to reference the last made config

    // Clone the config to avoid mutation
    return deepClone(config)
}

// Create DOM elements for insets dynamically based on config
function createInsetDOMElements(insetsGroup, insetsCfg, insetBoxPosition) {
    if (!insetsGroup) return
    insetsGroup.innerHTML = '' // Clear previous

    const ns = 'http://www.w3.org/2000/svg'
    const bx = insetBoxPosition[0]
    const by = insetBoxPosition[1]

    // Background rect
    const rect = document.createElementNS(ns, 'rect')
    rect.setAttribute('id', 'image-insets-background-rect')
    rect.setAttribute('x', bx)
    rect.setAttribute('y', by)
    rect.setAttribute('width', '243')
    rect.setAttribute('height', '265')
    rect.setAttribute('fill', 'white')
    insetsGroup.appendChild(rect)

    // Create <g> elements for each inset
    insetsCfg.forEach((inset, i) => {
        const g = document.createElementNS(ns, 'g')
        g.id = inset.svgId
        g.setAttribute('index', i)
        g.setAttribute('transform', `translate(${inset.x + bx}, ${inset.y + by})`)
        insetsGroup.appendChild(g)
    })

    // Separator lines group
    const separatorLines = document.createElementNS(ns, 'g')
    separatorLines.setAttribute('id', 'insets-separator-lines')
    separatorLines.setAttribute('height', '265px')
    separatorLines.setAttribute('width', '243px')
    separatorLines.setAttribute('transform', `translate(${bx}, ${by})`)

    // French inset separators (thin)
    const thinLines = [
        [160, 18, 170, 60],
        [170, 60, 152, 92],
        [152, 92, 90, 83],
        [152, 92, 172, 131],
        [172, 131, 171, 184],
        [172, 131, 235, 139],
        [170, 60, 235, 70],
        [66, 213, 66, 254],
    ]
    thinLines.forEach(([x1, y1, x2, y2]) => {
        const line = document.createElementNS(ns, 'line')
        line.setAttribute('x1', x1)
        line.setAttribute('y1', y1)
        line.setAttribute('x2', x2)
        line.setAttribute('y2', y2)
        line.setAttribute('style', 'stroke: black; stroke-width: 0.1')
        separatorLines.appendChild(line)
    })

    // Thick separators
    const thickLines = [
        [91, 192, 235, 192],
        [10, 192, 78, 192],
        [84, 25, 84, 185],
        [10, 92, 78, 92],
        [117, 213, 117, 254],
        [178, 213, 178, 254],
    ]
    thickLines.forEach(([x1, y1, x2, y2]) => {
        const line = document.createElementNS(ns, 'line')
        line.setAttribute('x1', x1)
        line.setAttribute('y1', y1)
        line.setAttribute('x2', x2)
        line.setAttribute('y2', y2)
        line.setAttribute('style', 'stroke: black; stroke-width: 0.3')
        separatorLines.appendChild(line)
    })

    insetsGroup.appendChild(separatorLines)

    // Blurs group
    const blursGroup = document.createElementNS(ns, 'g')
    blursGroup.setAttribute('id', 'insets-blurs')
    blursGroup.setAttribute('height', '265px')
    blursGroup.setAttribute('width', '243px')
    blursGroup.setAttribute('transform', `translate(${bx}, ${by})`)

    const defs = document.createElementNS(ns, 'defs')
    const gradients = [
        { id: 'gradL', x1: '100%', y1: '100%', x2: '0%', y2: '100%' },
        { id: 'gradR', x1: '0%', y1: '100%', x2: '100%', y2: '100%' },
        { id: 'gradB', x1: '100%', y1: '0%', x2: '100%', y2: '100%' },
        { id: 'gradT', x1: '100%', y1: '100%', x2: '100%', y2: '0%' },
    ]

    gradients.forEach(({ id, x1, y1, x2, y2 }) => {
        const gradient = document.createElementNS(ns, 'linearGradient')
        gradient.setAttribute('id', id)
        gradient.setAttribute('x1', x1)
        gradient.setAttribute('y1', y1)
        gradient.setAttribute('x2', x2)
        gradient.setAttribute('y2', y2)
        gradient.setAttribute('gradientUnits', 'objectBoundingBox')

        const stop1 = document.createElementNS(ns, 'stop')
        stop1.setAttribute('offset', '0')
        stop1.setAttribute('stop-opacity', '0.1')
        stop1.setAttribute('stop-color', 'rgb(255, 255, 255)')
        gradient.appendChild(stop1)

        const stop2 = document.createElementNS(ns, 'stop')
        stop2.setAttribute('offset', '1')
        stop2.setAttribute('stop-color', 'rgb(255, 255, 255)')
        gradient.appendChild(stop2)

        defs.appendChild(gradient)
    })

    blursGroup.appendChild(defs)

    const blurRects = [
        { x: 92, y: 180, height: 10, width: 75, fill: 'url(#gradB)' },
        { x: 90, y: 106, height: 79, width: 10, fill: 'url(#gradL)' },
        { x: 123, y: 213, height: 42, width: 5, fill: 'url(#gradL)' },
        { x: 167, y: 213, height: 42, width: 5, fill: 'url(#gradR)' },
        { x: 123, y: 251, height: 5, width: 50, fill: 'url(#gradB)' },
        { x: 123, y: 213, height: 5, width: 50, fill: 'url(#gradT)' },
    ]

    blurRects.forEach(({ x, y, height, width, fill }) => {
        const blurRect = document.createElementNS(ns, 'rect')
        blurRect.setAttribute('x', x)
        blurRect.setAttribute('y', y)
        blurRect.setAttribute('height', height)
        blurRect.setAttribute('width', width)
        blurRect.setAttribute('fill', fill)
        blursGroup.appendChild(blurRect)
    })

    insetsGroup.appendChild(blursGroup)

    // LI title group
    const liTitleGroup = document.createElementNS(ns, 'g')
    liTitleGroup.setAttribute('id', 'insets-LI-title')
    liTitleGroup.setAttribute('height', '265px')
    liTitleGroup.setAttribute('width', '243px')
    liTitleGroup.setAttribute('transform', `translate(${bx}, ${by})`)

    const subtitleLI = document.createElementNS(ns, 'text')
    subtitleLI.setAttribute('id', 'subtitleLI')
    subtitleLI.setAttribute('class', 'em-inset-title')
    subtitleLI.setAttribute('x', '122')
    subtitleLI.setAttribute('y', '207.85')
    subtitleLI.textContent = 'Liechtenstein'
    liTitleGroup.appendChild(subtitleLI)

    insetsGroup.appendChild(liTitleGroup)
}
