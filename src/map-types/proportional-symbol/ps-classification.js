import { createSqrtScale, createLinearScale } from "../../core/scale.js";

/**
 * @description defines classifier functions (out.classifierColor and out.classifierSize) for both symbol size and color
 */
export function defineClassifiers(out) {
    defineSizeClassifier(out)

    // colour
    if (out.statData('color').getArray()) {
        defineColorClassifier(out)
    }
}

function defineColorClassifier(out) {
    //simply return the array [0,1,2,3,...,nb-1]
    const getA = function (nb) {
        return [...Array(nb).keys()]
    }
    //use suitable classification type for colouring
    if (out.psClassificationMethod_ === 'quantile') {
        //https://github.com/d3/d3-scale#quantile-scales
        const domain = out.statData('color').getArray()
        const range = getA(out.psClasses_)
        out.classifierColor(scaleQuantile().domain(domain).range(range))
    } else if (out.psClassificationMethod_ === 'equinter') {
        //https://github.com/d3/d3-scale#quantize-scales
        const domain = out.statData('color').getArray()
        const range = getA(out.psClasses_)
        out.classifierColor(
            scaleQuantize()
                .domain([min(domain), max(domain)])
                .range(range)
        )
        if (out.makeClassifNice_) out.classifierColor().nice()
    } else if (out.psClassificationMethod_ === 'threshold') {
        //https://github.com/d3/d3-scale#threshold-scales
        out.psClasses(out.psThresholds().length + 1)
        const range = getA(out.psClasses_)
        out.classifierColor(scaleThreshold().domain(out.psThresholds()).range(range))
    }
}

function defineSizeClassifier(out) {
    // raw values (size-specific first, fallback)
    const rawData = out.statData('size')?.getArray() ?? out.statData()?.getArray() ?? []

    // choose scale type based on shape
    const isLinear = out.psShape_ === 'spike' || out.psShape_ === 'bar' || out.psShape_ === 'line'

    const classifier = isLinear
        ? createLinearScale(rawData, out.psMaxSize_, out.psMinSize_ || 0)
        : createSqrtScale(rawData, out.psMaxSize_, out.psMinSize_ || 0)

    // expose on map instance (unchanged public API)
    out.classifierSize(classifier)
}

/**
 * @description assigns a color to each symbol, based on their statistical value
 * @param {*} map
 */
export function applyClassificationToMap(map) {
    if (map.svg_) {
        if (map.classifierColor_) {
            //assign color class to each symbol, based on their value
            // at this point, the symbol path hasnt been appended. Only the parent g element (.em-centroid)
            const colorData = map.statData('color')
            map.svg_.selectAll('.em-centroid').attr('ecl', function (rg) {
                const sv = colorData.get(rg.properties.id)
                if (!sv) {
                    return 'nd'
                }
                const v = sv.value
                if ((v !== 0 && !v) || v == ':') {
                    return 'nd'
                }
                let c = +map.classifierColor_(+v)
                return c
            })
        }
    }
}
