/**
 * @description Appends <rect> elements containing bars for each region in the map SVG
 * @param {*} map map instance
 * @param {*} sizeData e.g. map.statData('size')
 * @return {*}
 */
export function appendBarsToMap(map, sizeData, out) {
    return (
        map
            .getCentroidsGroup(map)
            .selectAll('g.em-centroid')
            .append('rect')
            .filter((rg) => {
                const sv = sizeData.get(rg.properties.id)
                if (sv && sv.value !== ':') return rg
            })
            .attr('width', out.psBarWidth_)
            //for vertical bars we scale the height attribute using the classifier
            .attr('height', function (rg) {
                const sv = sizeData.get(rg.properties.id)
                if (!sv || !sv.value) {
                    return 0
                }
                let v = out.classifierSize_(+sv.value)
                return v
            })
            .attr('transform', function () {
                let bRect = this.getBoundingClientRect()
                return `translate(${-this.getAttribute('width') / 2}` + `, -${this.getAttribute('height')})`
            })
    )
}
