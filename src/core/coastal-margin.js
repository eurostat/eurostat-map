export function appendCoastalMargin(out) {
    //update existing
    if (out.svg_) {
        let margin = selectAll('#em-coast-margin')
        let filter = select('#em-coastal-blur')
        let zg = select('#em-zoom-group-' + out.svgId_) || null
        if (margin._groups[0][0] && v == false) {
            // remove existing
            margin.remove()
        } else if (v == true && out._pathFunction && zg) {
            //remove existing graticule
            margin.remove()
            filter.remove()
            //add filter
            out.svg_
                .append('filter')
                .attr('id', 'em-coastal-blur')
                .attr('x', '-200%')
                .attr('y', '-200%')
                .attr('width', '400%')
                .attr('height', '400%')
                .append('feGaussianBlur')
                .attr('in', 'SourceGraphic')
                .attr('stdDeviation', out.coastalMarginStdDev_)

            //draw for main map - geometries are still in memory so no rebuild needed
            const drawNewCoastalMargin = (map) => {
                // zoom group might not be inside main map (out.svg_)
                const zoomGroup = select('#em-zoom-group-' + map.svgId_)
                //draw new coastal margin
                const cg = zoomGroup.append('g').attr('id', 'em-coast-margin')

                //countries bn
                if (map._geom.cntbn)
                    cg.append('g')
                        .attr('id', 'em-coast-margin-cnt')
                        .selectAll('path')
                        .data(map._geom.cntbn)
                        .enter()
                        .filter(function (bn) {
                            return bn.properties.co === 'T'
                        })
                        .append('path')
                        .attr('d', map._pathFunction)
                //nuts bn
                if (map._geom.nutsbn)
                    cg.append('g')
                        .attr('id', 'em-coast-margin-nuts')
                        .selectAll('path')
                        .data(map._geom.nutsbn)
                        .enter()
                        .filter(function (bn) {
                            return bn.properties.co === 'T'
                        })
                        .append('path')
                        .attr('d', map._pathFunction)
                //world bn
                if (map._geom.worldbn)
                    cg.append('g')
                        .attr('id', 'em-coast-margin-nuts')
                        .selectAll('path')
                        .data(map._geom.worldbn)
                        .enter()
                        .filter(function (bn) {
                            return bn.properties.COAS_FLAG === 'T'
                        })
                        .append('path')
                        .attr('d', map._pathFunction)
            }

            //draw for insets - requires geometries so we have to rebuild base template
            if (out.insetTemplates_ && out.drawCoastalMargin_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, drawNewCoastalMargin)
                drawNewCoastalMargin(out)
            }

            // move margin to back (in front of sea)
            selectAll('#em-coast-margin').each(function () {
                out.geo_ == 'WORLD'
                    ? this.parentNode.insertBefore(this, this.parentNode.childNodes[3])
                    : this.parentNode.insertBefore(this, this.parentNode.childNodes[1])
            })
        }
    }
}

export const addCoastalMarginToMap = function (out) {
    const zg = out.svg().select('#em-zoom-group-' + out.svgId_)
    //draw coastal margin
    const cg = zg.append('g').attr('id', 'em-coast-margin').attr('class', 'em-coast-margin')

    //countries bn
    if (out.Geometries.geoJSONs.cntbn) {
        cg.append('g')
            .attr('id', 'em-coast-margin-cnt')
            .attr('class', 'em-coast-margin-cnt')
            .selectAll('path')
            .data(out.Geometries.geoJSONs.cntbn)
            .enter()
            .filter(function (bn) {
                return bn.properties.co === 'T'
            })
            .append('path')
            .attr('d', out._pathFunction)
    }

    //nuts bn
    if (out.Geometries.geoJSONs.nutsbn) {
        cg.append('g')
            .attr('id', 'em-coast-margin-nuts')
            .attr('class', 'em-coast-margin-nuts')
            .selectAll('path')
            .data(out.Geometries.geoJSONs.nutsbn)
            .enter()
            .filter(function (bn) {
                return bn.properties.co === 'T'
            })
            .append('path')
            .attr('d', out._pathFunction)
    }

    //world bn
    if (out.Geometries.geoJSONs.worldbn) {
        cg.append('g')
            .attr('id', 'em-coast-margin-world')
            .attr('class', 'em-coast-margin-world')
            .selectAll('path')
            .data(out.Geometries.geoJSONs.worldbn)
            .enter()
            .filter(function (bn) {
                return bn.properties.COAS_FLAG === 'T'
            })
            .append('path')
            .attr('d', out._pathFunction)
    }
}