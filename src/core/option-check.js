// Spelling checks for options the library would otherwise ignore without a word.

/** Every option a legend() config accepts, whatever the map type. test/unit/core/option-check.test.mjs keeps it in step with src/types/legend. */
export const LEGEND_OPTIONS = [
    'addSubtitle',
    'addTitle',
    'annotationLineEndOffsets',
    'annotationLineLength',
    'annotationOffsets',
    'annotations',
    'appendCategoryLegend',
    'appendNoDataLegend',
    'applyPosition',
    'arrowHeight',
    'arrowPadding',
    'arrowWidth',
    'ascending',
    'axisArrows',
    'axisArrowsBidirectional',
    'axisExtremes',
    'axisTitleFontSize',
    'barHeight',
    'bottom',
    'bottomLeft',
    'bottomRight',
    'boxOpacity',
    'boxPadding',
    'breaks1',
    'breaks2',
    'build',
    'cellNb',
    'cellPadding',
    'centerAnnotationOffsets',
    'centerLabel',
    'color',
    'colorLegend',
    'colorTarget',
    'curveX',
    'curveY',
    'decimals',
    'decorate',
    'divergingArrowLength',
    'divergingLineLength',
    'divergingLinePadding',
    'exampleData',
    'flowColorLegend',
    'flowWidthLegend',
    'gap',
    'getBaseX',
    'getBaseY',
    'getClassToFillStyle',
    'getColorClassifier',
    'getColorStats',
    'getHighlightFunction',
    'getLabelFormatter',
    'getNumberOfClasses',
    'getSizeStats',
    'getUnHighlightFunction',
    'gridBreaks',
    'gridSize',
    'height',
    'high',
    'highLabel',
    'highlightTolerance',
    'histogram',
    'itemGap',
    'items',
    'key',
    'label',
    'label1',
    'label2',
    'labelDecNb',
    'labelDy',
    'labelFontSize',
    'labelFormatter',
    'labelOffset',
    'labelOffsetX',
    'labelOffsets',
    'labelPosition',
    'labelRotation',
    'labelType',
    'labelX',
    'labelY',
    'labels',
    'labelsV1',
    'labelsV2',
    'layer',
    'left',
    'legendBackground',
    'legendLabel',
    'lgg',
    'lineOpacity',
    'lineStrokeWidth',
    'low',
    'lowLabel',
    'makeBackgroundBox',
    'map',
    'margin',
    'marginTop',
    'maxDepth',
    'maxMin',
    'maxMinLabels',
    'maxMinRegionLabels',
    'maxMinTickLength',
    'mergeArrays',
    'minorSubdivisions',
    'noData',
    'noDataLegend',
    'noDataPadding',
    'noDataShapeHeight',
    'noDataShapeWidth',
    'noDataText',
    'noDataYOffset',
    'nodeSizeLegend',
    'offsetX',
    'onlyApplyOpacityWhileZoomed',
    'order',
    'orientation',
    'pad',
    'padding',
    'pattern',
    'patternId',
    'pointOfDivergence',
    'pointOfDivergenceLabel',
    'pointOfDivergenceLabelsAtExtremes',
    'pointOfDivergenceLabelsStacked',
    'pointOfDivergencePadding',
    'position',
    'radius',
    'regionColorLegend',
    'right',
    'ringLabel',
    'signKey',
    'positiveText',
    'negativeText',
    'rotation',
    'rowClass',
    'scaleLegend',
    'segments',
    'sepLineLength',
    'sepLineStroke',
    'sepLineStrokeWidth',
    'setBoxDimension',
    'shapeFill',
    'shapeHeight',
    'shapeOffsets',
    'shapePadding',
    'shapeStroke',
    'shapeStrokeWidth',
    'shapeWidth',
    'show',
    'showAxisExtremes',
    'showCenter',
    'showCounts',
    'showData',
    'showDivergingLine',
    'showExampleChart',
    'showLines',
    'showMaxRegion',
    'showPercentages',
    'showXAxis',
    'sizeLegend',
    'squareSize',
    'startY',
    'strokeOpacity',
    'subtitle',
    'svg',
    'svgId',
    'swatchHeight',
    'swatchWidth',
    'text',
    'tickCount',
    'tickFormat',
    'tickLabels',
    'tickLength',
    'tickValues',
    'ticks',
    'timeLegend',
    'title',
    'titleFontSize',
    'titlePadding',
    'top',
    'topLeft',
    'topRight',
    'type',
    'update',
    'updateBackgroundBoxOpacity',
    'updateConfig',
    'updateContainer',
    'values',
    'valuesV1',
    'valuesV2',
    'vennRadius',
    'width',
    'widthLegend',
    'x',
    'xAxisLabelsOffset',
    'xAxisRotation',
    'xAxisTickStep',
    'xAxisTitleOffset',
    'y',
    'yAxisLabelsOffset',
    'yAxisTitleOffset',
]

/** True when `a` becomes `b` by one insertion, deletion, substitution or swap of neighbouring letters. */
export const isOneEditAway = function (a, b) {
    if (a === b || Math.abs(a.length - b.length) > 1) return false
    let i = 0
    while (i < a.length && a[i] === b[i]) i++
    if (a.length === b.length) {
        const swapped = a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)
        return swapped || a.slice(i + 1) === b.slice(i + 1)
    }
    const [long, short] = a.length > b.length ? [a, b] : [b, a]
    return long.slice(i + 1) === short.slice(i)
}

/** The known option a name is most likely a misspelling of, or undefined. Short names are too alike to judge. */
export const suggestOption = function (name, known) {
    if (name.length < 5 || known.includes(name)) return undefined
    const lower = name.toLowerCase()
    return known.find((option) => option.toLowerCase() === lower) || known.find((option) => isOneEditAway(lower, option.toLowerCase()))
}

const warned = new Set()

/**
 * Warns once about each option of a config (and of its sub-objects, e.g. sizeLegend) that looks misspelt.
 * @param {object} config
 * @param {string[]} known
 * @param {string} context e.g. 'legend'
 */
export const warnMisspelledOptions = function (config, known = LEGEND_OPTIONS, context = 'legend') {
    if (!config || typeof config !== 'object') return
    Object.keys(config).forEach((key) => {
        const value = config[key]
        const suggestion = suggestOption(key, known)
        const path = context + '.' + key
        if (suggestion) {
            if (!warned.has(path)) console.warn(`[eurostat-map] Unknown option "${path}": did you mean "${suggestion}"?`)
            warned.add(path)
        } else if (/Legend$/.test(key) && Object.prototype.toString.call(value) === '[object Object]') {
            warnMisspelledOptions(value, known, path)
        }
    })
}

/**
 * A width or height as a number of pixels: 800, '800' or '800px'. Anything else (e.g. '50%') gives undefined, with a
 * warning, so that the map takes its default size.
 * @param {*} value
 * @param {string} name 'width' or 'height'
 * @returns {number|undefined}
 */
export const parsePixelSize = function (value, name) {
    if (value === undefined || value === null) return undefined
    const text = typeof value === 'string' ? value.trim().replace(/px$/i, '') : value
    const size = text === '' ? NaN : Number(text)
    if (Number.isFinite(size) && size > 0) return size
    console.warn(`[eurostat-map] ${name}(${JSON.stringify(value)}) is not a size in pixels: the default ${name} is used.`)
    return undefined
}

/** @param {string} method @param {string[]} valid */
export const warnUnknownClassification = function (method, valid) {
    console.warn(`[eurostat-map] Unknown classification method "${method}": using "quantile". Valid methods: ${valid.join(', ')}.`)
}
