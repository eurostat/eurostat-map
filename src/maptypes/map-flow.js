/**
 * Returns a flow map.
 *
 * @param {*} config
 */
export const map = function (config) {
    let out = {}

    //@override
    out.updateStyle = function () {}

    //@override
    out.updateClassification = function () {}

    //@override
    out.getLegendConstructor = function () {
        return ChoroplethLegend.legend
    }

    return out
}
