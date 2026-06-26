import { createSqrtScale, createLinearScale } from "../../core/scale.js";
import { scaleQuantile, scaleQuantize, scaleThreshold } from 'd3-scale'
import { getResponsiveSymbolSize } from '../../core/responsive.js'
import { min, max } from 'd3-array'
import { getCentroidsGroup } from '../../core/geo/centroids.js'

/**
 * @description defines classifier functions (layer.classifierColor and layer.classifierSize) for both symbol size and color
 */
export function defineClassifiers(layer) {
    defineSizeClassifier(layer)

    // colour
    if (getColorData(layer)?.getArray()) {
        defineColorClassifier(layer)
    }
}

function getColorData(layer) {
    return layer.getEncodingStatData?.('color', undefined, 'color') || (layer.map ? layer.map.statData('color') : layer.statData('color'))
}

function getSizeData(layer) {
    const sizeData = layer.map ? layer.map.statData('size') : layer.statData('size')
    const defaultData = layer.map ? layer.map.statData() : layer.statData()
    return layer.getEncodingStatData?.('size', undefined, 'size') || (sizeData?.getArray() ? sizeData : defaultData)
}

function defineColorClassifier(layer) {
    //simply return the array [0,1,2,3,...,nb-1]
    const getA = function (nb) {
        return [...Array(nb).keys()]
    }
    //use suitable classification type for colouring
    if (layer.psClassificationMethod_ === 'quantile') {
        //https://github.com/d3/d3-scale#quantile-scales
        const domain = getColorData(layer).getArray()
        const range = getA(layer.psClasses_)
        layer.classifierColor(scaleQuantile().domain(domain).range(range))
    } else if (layer.psClassificationMethod_ === 'equinter') {
        //https://github.com/d3/d3-scale#quantize-scales
        const domain = getColorData(layer).getArray()
        const range = getA(layer.psClasses_)
        layer.classifierColor(
            scaleQuantize()
                .domain([min(domain), max(domain)])
                .range(range)
        )
        if (layer.makeClassifNice_) layer.classifierColor().nice()
    } else if (layer.psClassificationMethod_ === 'threshold') {
        //https://github.com/d3/d3-scale#threshold-scales
        layer.psClasses(layer.psThresholds().length + 1)
        const range = getA(layer.psClasses_)
        layer.classifierColor(scaleThreshold().domain(layer.psThresholds()).range(range))
    }
}

function defineSizeClassifier(layer) {
    // raw values (size-specific first, fallback)
    let rawData = getSizeData(layer)?.getArray() ?? []

    // Also check custom size legend values
    const legendConfig = layer.legend()
    if (legendConfig && legendConfig.sizeLegend && Array.isArray(legendConfig.sizeLegend.values)) {
        rawData = [...rawData, ...legendConfig.sizeLegend.values]
    }

    // choose scale type based on shape
    const isLinear = layer.psShape_ === 'spike' || layer.psShape_ === 'bar' || layer.psShape_ === 'line'
    const maxSize = getResponsiveSymbolSize(layer.psMaxSize_, 2)
    const minSize = getResponsiveSymbolSize(layer.psMinSize_ || 0, 0)

    const classifier = isLinear
        ? createLinearScale(rawData, maxSize, minSize)
        : createSqrtScale(rawData, maxSize, minSize)

    // expose on layer instance
    layer.classifierSize(classifier)
}

/**
 * @description assigns a color to each symbol, based on their statistical value
 * @param {*} map
 * @param {*} layer
 */
export function applyClassificationToMap(map, layer) {
    if (!map?.svg_) return;

    const activeLayer = layer || map;
    const classifier = activeLayer.classifierColor_;
    if (typeof classifier !== 'function') return;

    const colorData = activeLayer.getEncodingStatData?.('color', undefined, 'color') || map.statData('color');
    if (!colorData) return;

    const group = getCentroidsGroup(activeLayer)
    if (!group || group.empty()) return;

    group.selectAll('g.em-centroid')
        .attr('ecl', function (rg) {
            const sv = colorData.get(rg.properties.id);
            if (!sv) return 'nd';

            const v = sv.value;
            if ((v !== 0 && !v) || v === ':') return 'nd';

            return +classifier(+v);
        });
}
