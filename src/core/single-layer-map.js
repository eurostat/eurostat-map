import { createStatMap } from './stat-map'
import { forwardFieldsToActiveLayer, forwardChainableMethod } from './layer'
import { getRole } from './layer-registry'

/**
 * Builds a single-layer map instance for a given type and config.
 * Handles creating the frame, adding the layer, and forwarding legacy properties.
 *
 * @param {string} type
 * @param {object} config
 * @returns {MapInstance}
 */
export const buildSingleLayerMap = function (type, config) {
    const role = getRole(type)
    const withCenterPoints = role === 'overlay' || type === 'bar' || type === 'barComposition'
    const CANONICAL_MAP_TYPES = {
        choropleth: 'ch',
        ch: 'ch',
        categorical: 'ct',
        ct: 'ct',
        proportionalSymbol: 'ps',
        proportionalSymbols: 'ps',
        ps: 'ps',
        bivariateChoropleth: 'chbi',
        chbi: 'chbi',
        trivariateChoropleth: 'chtri',
        ternary: 'chtri',
        chtri: 'chtri',
        stripeComposition: 'scomp',
        stripe: 'scomp',
        scomp: 'scomp',
        pieChart: 'pie',
        pie: 'pie',
        composition: 'pie',
        sparkline: 'spark',
        spark: 'spark',
        sparklines: 'spark',
        flow: 'flow',
        flowmap: 'flow',
        coxcomb: 'coxcomb',
        polar: 'coxcomb',
    }
    const canonicalType = CANONICAL_MAP_TYPES[type] || type
    const out = createStatMap(config, withCenterPoints, canonicalType)

    // Remove the self-facade layer so the real layer becomes layer 0.
    out.layers_ = []

    const layer = out.addLayer(type, config)
    out.activeLayerIndex(0)

    if (!layer || layer === out) return out

    // Forwarding accessors for backwards compatibility
    const baseFields = [
        'encodings_',
        'catColors_',
        'catLabels_',
        'statCodes_',
        'legend_',
        'legendObj_',
        'rankedBarChart_',
        'rankedBarChartObj_',
        'tooltip_',
    ]
    const baseMethods = [
        'encoding',
        'updateClassification',
        'updateStyle',
        'getLegendConstructor',
        'legend',
        'getRankedBarChartConstructor',
        'rankedBarChart',
    ]

    let typeFields = []
    let typeMethods = []

    if (type === 'choropleth' || type === 'ch') {
        typeFields = [
            'numberOfClasses_',
            'classificationMethod_',
            'thresholds_',
            'makeClassifNice_',
            'colorFunction_',
            'classToFillStyle_',
            'noDataFillStyle_',
            'categoryFillStyle_',
            'categoryText_',
            'classifier_',
            'colors_',
            'colorSchemeType_',
            'valueTransform_',
            'valueUntransform_',
            'colorStretch_',
            'pointOfDivergence_',
            'skipNormalization_',
            'filtersDefinitionFunction_',
            'domain_',
        ]
        typeMethods = [
            'numberOfClasses',
            'classificationMethod',
            'thresholds',
            'makeClassifNice',
            'colorFunction',
            'classToFillStyle',
            'noDataFillStyle',
            'categoryFillStyle',
            'categoryText',
            'classifier',
            'colors',
            'colorSchemeType',
            'valueTransform',
            'valueUntransform',
            'colorStretch',
            'pointOfDivergence',
            'skipNormalization',
            'threshold',
            'filtersDefinitionFunction',
            'highlightRegion',
            'clearHighlight',
        ]
    } else if (type === 'proportionalSymbol' || type === 'proportionalSymbols' || type === 'ps') {
        typeFields = [
            'psMaxSize_',
            'psMinSize_',
            'psMaxValue_',
            'psMinValue_',
            'psFill_',
            'psFillOpacity_',
            'psStrokeOpacity_',
            'psStroke_',
            'psStrokeWidth_',
            'classifierSize_',
            'classifierColor_',
            'psShape_',
            'psCustomShape_',
            'psBarWidth_',
            'psClassToFillStyle_',
            'psColorFun_',
            'psSizeScale_',
            'noDataFillStyle_',
            'psThresholds_',
            'psColors_',
            'psCustomSVG_',
            'psOffset_',
            'psClassificationMethod_',
            'psClasses_',
            'dorling_',
            'psSpikeWidth_',
            'psCodeLabels_',
            'psBrightenFactor_',
            'dorlingSettings_',
        ]
        typeMethods = [
            'psMaxSize',
            'psMinSize',
            'psMaxValue',
            'psMinValue',
            'psFill',
            'psFillOpacity',
            'psStrokeOpacity',
            'psStroke',
            'psStrokeWidth',
            'classifierSize',
            'classifierColor',
            'psShape',
            'psCustomShape',
            'psBarWidth',
            'psClassToFillStyle',
            'psColorFun',
            'psSizeScale',
            'psThresholds',
            'psColors',
            'psCustomSVG',
            'psOffset',
            'psClassificationMethod',
            'psClasses',
            'psSpikeWidth',
            'psCodeLabels',
            'psBrightenFactor',
            'psSettings',
            'dorling',
            'dorlingSettings',
            'dorlingWorker',
            'dorlingWorkerD3URL',
        ]
    }

    // Every registered decorator may add its own fluent API. Discover it here so
    // standalone maps retain the historical map.foo() facade without maintaining
    // a second per-type list every time a layer is migrated.
    // 'stat'/'statData' are skipped: attachThematicApi() already defines them on the
    // layer as backwards-compat forwarders TO the map (layer.stat calls map.stat).
    // The map's own 'stat'/'statData' are its real, authoritative implementations -
    // wrapping them here to forward back to the layer would make map.stat() call
    // layer.stat() call map.stat() forever.
    Object.keys(layer).forEach((key) => {
        if (key === 'map' || key === 'id' || key === 'type' || key === 'role' || key === 'isLayer') return
        if (key === 'stat' || key === 'statData') return
        if (key.endsWith('_')) typeFields.push(key)
        else if (typeof layer[key] === 'function') typeMethods.push(key)
    })

    typeFields = [...new Set(typeFields)]
    typeMethods = [...new Set(typeMethods)]

    forwardFieldsToActiveLayer(out, [...baseFields, ...typeFields])

    const allMethods = [...baseMethods, ...typeMethods]
    for (const method of allMethods) {
        forwardChainableMethod(out, method)
    }

    return out
}
