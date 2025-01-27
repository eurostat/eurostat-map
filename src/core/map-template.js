import { zoom, zoomIdentity } from 'd3-zoom'
import { select, selectAll } from 'd3-selection'
import { formatDefaultLocale } from 'd3-format'
import { geoIdentity, geoPath, geoCentroid } from 'd3-geo'
import { geoRobinson } from 'd3-geo-projection'
import { getBBOXAsGeoJSON, executeForAllInsets, getFontSizeFromClass, getParameterByName, convertRectanglesToPaths } from './utils'
import { appendAnnotations } from './annotations'
import { addLabelsToMap, updateValuesLabels } from './labels'
import { defineDeprecatedFunctions } from './deprecated'
import { Geometries } from './geometries'
import { buildInsets, removeInsets } from './insets'
import { appendStamp } from './stamps'

// set default d3 locale
formatDefaultLocale({
    decimal: '.',
    thousands: ' ',
    grouping: [3],
    currency: ['', '€'],
})

/**
 * The map template: only the geometrical part.
 * To be used as a base map for a statistical map.
 *
 * @param {*} withCenterPoints Set to true (or 1) to add regions center points to the map template, to be used for proportional symbols maps for example.
 */
export const mapTemplate = function (config, withCenterPoints) {
    //build map template object
    const out = {}

    // expose imported function to other modules
    out.updateValuesLabels = updateValuesLabels

    //map
    out.svgId_ = 'map'
    out.svg_ = undefined
    out.width_ = Math.min(800, window.innerWidth)
    out.height_ = 0
    out.containerId_ = undefined

    //geographical focus
    out.nutsLevel_ = 3 // 0,1,2,3, or 'mixed'
    out.nutsYear_ = 2024
    out.geo_ = 'EUR'
    out.proj_ = '3035'
    out.projectionFunction_ = undefined // e.g. d3.geoRobinson()
    out.filterGeometriesFunction_ = undefined // user defined filter function
    out.scale_ = '20M' //TODO choose automatically, depending on pixelSize ?
    out.zoomExtent_ = undefined
    out.maxBounds_ = { xMin: -Infinity, yMin: -Infinity, xMax: Infinity, yMax: Infinity }
    out.geometries_ = undefined // [{id:String, data:geojson, class:function}] user-defined geometries
    out.processCentroids_ = undefined // runs over symbol centroids
    out.position_ = { x: undefined, y: undefined, z: undefined } // map view

    //map title
    out.title_ = ''
    out.titlePosition_ = undefined

    //map subtitle
    out.subtitle_ = ''
    out.subtitlePosition_ = undefined

    //scalebar
    out.showScalebar_ = false
    out.scalebarPosition_ = []
    out.scalebarUnits_ = ' km' //label
    out.scalebarTextOffset_ = [0, 12]
    out.scalebarMaxWidth_ = 150 //px
    out.scalebarHeight_ = 90 //px
    out.scalebarStrokeWidth_ = 1 //px
    out.scalebarSegmentHeight_ = 6
    out.scalebarTickHeight_ = 8

    // stamp annotation
    out.stamp_ = undefined //e.g {x,y,text,size}

    //tooltip
    out.tooltip_ = {
        fontSize: '14px',
        transitionDuration: 200,
        xOffset: 0,
        yOffset: 0,
        textFunction: null,
        showFlags: false,
    } //  See tooltip.js for more details

    // region mouseover color
    out.hoverColor_ = 'red'

    //coastal margin
    out.drawCoastalMargin_ = false
    out.coastalMarginStdDev_ = 3

    //graticule
    out.drawGraticule_ = false

    //labelling (country names and geographical features)
    // {config, statLabelsPositions, labelsToShow, labelShadows, labelFilterFunction}
    out.labels_ = undefined

    // all these settings now go into labels object for cleaner API
    // out.labelsConfig_ = DEFAULTLABELS // allow user to override map labels | see ./labels.js for example config
    // out.statLabelsPositions = STATLABELPOSITIONS // allow user to override positions of statistical labels
    // out.labelsToShow_ = ['countries', 'seas'] //accepted: "countries", "cc","seas", "values"
    // out.labelShadowsToShow_ = ['countries', 'seas']

    //annotations
    out.annotations_ = undefined
    out.annotationsAdded = false //simple flag to know when annotations have already been added

    //dataset source link
    out.showSourceLink_ = true

    //default copyright and disclaimer text
    out.footnote_ = 'Administrative boundaries: \u00A9EuroGeographics \u00A9UN-FAO \u00A9INSTAT \u00A9Turkstat' //"(C)EuroGeographics (C)UN-FAO (C)Turkstat";
    out.footnoteTooltipText_ =
        'The designations employed and the presentation of material on this map do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence.'

    out.nuts2jsonBaseURL_ = window.location.hostname.includes('ec.europa.eu')
        ? 'https://ec.europa.eu/assets/estat/E/E4/gisco/pub/nuts2json/v2/'
        : 'https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/'

    //style for no data regions
    out.noDataFillStyle_ = '#bcbcbc'

    /**
     * Insets.
     * The map template has a recursive structure.
     */

    //insets to show, as a list of map template configs. Ex.: [{geo:"MT"},{geo:"LI"},{geo:"PT20"}]
    out.insets_ = []
    //inset templates - each inset is a map-template instance.
    out.insetTemplates_ = {}

    out.insetBoxPosition_ = undefined
    out.insetBoxPadding_ = 5
    out.insetBoxWidth_ = 210
    //out.insetZoomExtent_ = [1, 3];
    out.insetZoomExtent_ = null //zoom disabled as default
    out.insetScale_ = '03M'

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    for (const att in out) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    }

    // warn existing users of functions that have been banished to the shadow realm.
    defineDeprecatedFunctions(out)

    //special ones which affect also the insets
    ;['tooltip_', 'nuts2jsonBaseURL_'].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]

            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                //override default properties
                for (const p in v) {
                    out[att][p] = v[p]
                }
            } else {
                out[att] = v
            }

            //recursive call to inset components
            if (out.insetTemplates_) {
                executeForAllInsets(
                    out.insetTemplates_,
                    out.svgId_,
                    (inset, value) => {
                        const fnName = att.substring(0, att.length - 1)
                        inset[fnName](value)
                    },
                    v
                )
            }
            return out
        }
    })

    //title getter and setter
    out.title = function (v) {
        if (!arguments.length) return out.title_
        out.title_ = v
        if (out.svg())
            out.svg()
                .select('#title' + out.geo())
                .text(v)
        return out
    }

    //subtitle getter and setter
    out.subtitle = function (v) {
        if (!arguments.length) return out.subtitle_
        out.subtitle_ = v
        if (out.svg())
            out.svg()
                .select('#subtitle' + out.geo())
                .text(v)
        return out
    }

    //insets getter/setter
    out.insets = function () {
        if (!arguments.length) return out.insets_
        if (arguments.length == 1 && arguments[0] === 'default') out.insets_ = 'default'
        else if (arguments.length == 1 && arguments[0] === false) out.insets_ = false
        else if (arguments.length == 1 && Array.isArray(arguments[0])) out.insets_ = arguments[0]
        else out.insets_ = arguments
        return out
    }

    // dynamic draw graticule
    out.drawGraticule = function (v) {
        if (!arguments.length) return out.drawGraticule_
        out.drawGraticule_ = v

        //update graticule
        let graticule = out.svg_ ? out.svg().select('#em-graticule') : null
        let zg = out.svg_ ? out.svg_.select('#em-zoom-group-' + out.svgId_) : null

        // if existing and argument is false
        if (graticule) {
            if (graticule._groups[0][0] && v == false) {
                //remove graticule
                graticule.remove()

                // if map already created and argument is true
            } else if (out.Geometries.geoJSONs.graticule && out._pathFunction && zg && v == true) {
                //remove existing graticule
                graticule.remove()
                // add new graticule
                zg.append('g')
                    .attr('id', 'em-graticule')
                    .selectAll('path')
                    .data(out.Geometries.geoJSONs.graticule)
                    .enter()
                    .append('path')
                    .attr('d', out._pathFunction)
                    .attr('class', 'em-graticule')

                out.svg()
                    .select('#em-graticule')
                    .each(function () {
                        // move graticule behind land mass
                        out.geo_ == 'WORLD'
                            ? this.parentNode.insertBefore(this, this.parentNode.childNodes[3])
                            : this.parentNode.insertBefore(this, this.parentNode.childNodes[1])
                    })
            }
        }
        return out
    }

    //coastal margin override
    out.drawCoastalMargin = function (v) {
        if (!arguments.length) return out.drawCoastalMargin_
        out.drawCoastalMargin_ = v

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
        return out
    }

    //annotations override (update after first call)
    out.annotations = function (v) {
        //get
        if (!arguments.length) return out.annotations_
        //set
        out.annotations_ = v
        //update
        if (out.annotationsAdded) {
            const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
            appendAnnotations(zoomGroup, out.annotations_)
        }
        return out
    }

    // initiate Geometries class
    out.Geometries = Geometries(out, withCenterPoints)

    /**
     * Requests geographic data and then builds the map template
     */
    out.updateGeoMapTemplate = function (callback) {
        // Erase previous data
        out.Geometries.defaultGeoData = null
        out.Geometries.allNUTSGeoData = null
        out.Geometries.centroidsData = null

        if (out.geometries_) {
            out.Geometries.setUserGeometries(out.geometries_)
            // use custom user-defined geometries
            out.buildMapTemplate()

            // Execute callback if defined
            if (callback) callback()
        } else {
            // use default
            out.Geometries.getDefaultGeoData(out.geo_, out.filterGeometriesFunction_, out.nutsLevel_).then(() => {
                out.buildMapTemplate()

                // Execute callback if defined
                if (callback) callback()
            })
        }

        // Use executeForAllInsets for recursive inset updates
        executeForAllInsets(out.insetTemplates_, out.svgId_, (inset) => {
            inset.updateGeoMapTemplate(callback)
        })

        return out
    }

    /**
     * Build a map object, including container, frame, map svg, insets and d3 zoom
     */
    out.buildMapTemplateBase = function () {
        //get svg element. Create it if it does not exists
        let svg = select('#' + out.svgId())
        if (svg.size() == 0) {
            svg = select('body').append('svg').attr('id', out.svgId())
        }
        svg.attr('class', 'em-map')
        out.svg_ = svg

        //set container for cases where container contains various maps
        if (!out.containerId_) out.containerId_ = out.svgId_
        //tooltip needs to know container to prevent overflow
        if (!out.tooltip_.containerId) {
            out.tooltip_.containerId = out.containerId_
        }

        //clear SVG (to avoid building multiple svgs on top of each other during multiple build() calls)
        selectAll('#' + out.svgId() + ' > *').remove()

        //set SVG dimensions
        if (out.geo_.toUpperCase() == 'WORLD') {
            //if no height was specified, use 45% of the width.
            if (!out.height()) out.height(0.55 * out.width())
            svg.attr('width', out.width()).attr('height', out.height())

            //WORLD geo only accepts proj 54030 (robinson) at the moment
            out.proj_ = 54030
        }
        //if no height was specified, use 85% of the width.
        if (!out.height()) out.height(0.85 * out.width())
        svg.attr('width', out.width()).attr('height', out.height())

        // each map template needs a clipPath to avoid overflow. See GISCO-2707
        svg.append('defs')
            .attr('class', 'em-defs')
            .append('clipPath')
            .attr('id', out.svgId_ + '-clip-path')
            .append('path')
            .attr('d', convertRectanglesToPaths(0, 0, out.width_, out.height_))

        if (out.drawCoastalMargin_) {
            //define filter for coastal margin
            svg.append('filter')
                .attr('id', 'em-coastal-blur')
                .attr('x', '-200%')
                .attr('y', '-200%')
                .attr('width', '400%')
                .attr('height', '400%')
                .append('feGaussianBlur')
                .attr('in', 'SourceGraphic')
                .attr('stdDeviation', out.coastalMarginStdDev_)
        }

        //create drawing group, as first child
        const dg = svg
            .insert('g', ':first-child')
            .attr('id', 'em-drawing-' + out.svgId_)
            .attr('class', 'em-drawing-group')
            .attr('clip-path', 'url(#' + out.svgId_ + '-clip-path' + ')')

        //create main zoom group
        const zg = dg
            .append('g')
            .attr('id', 'em-zoom-group-' + out.svgId_)
            .attr('class', 'em-zoom-group') //out.geo changed to out.svgId in order to be unique

        //insets
        removeInsets(out) //remove existing
        buildInsets(out, withCenterPoints) //build new

        //draw frame
        dg.append('rect')
            .attr('id', 'em-frame-' + out.geo_)
            .attr('class', 'em-frame')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', out.width_)
            .attr('height', out.height_)

        if (out.stamp_) {
            appendStamp(out.stamp_, out)
        }

        return out
    }

    /**
     * Buid an empty map template, based on the geometries only.
     */
    out.buildMapTemplate = function () {
        //geo center and extent: if not specified, use the default one, or the compute one from the topojson bbox
        if (!out.position_.x || !out.position_.y) {
            defineDefaultPosition()
        }
        out.position_.z = out.position_.z || getDefaultZ()

        // d3 projection functions
        defineProjection()
        definePathFunction()
        // d3 zoom
        if (out.zoomExtent()) {
            defineMapZoom()
        }

        //prepare drawing group
        const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
        zoomGroup.selectAll('*').remove()

        //draw background rectangle
        zoomGroup
            .append('rect')
            .attr('id', 'sea')
            .attr('class', 'em-sea')
            .attr('x', -5 * out.width_)
            .attr('y', -5 * out.height_)
            .attr('width', 11 * out.width_)
            .attr('height', 11 * out.height_)

        //sphere for world map
        if (out.geo_ == 'WORLD') {
            zoomGroup.append('path').datum({ type: 'Sphere' }).attr('id', 'sphere').attr('d', out._pathFunction).attr('class', 'em-graticule')
        }

        if (out.drawCoastalMargin_) {
            addCoastalMarginToMap()
        }

        if (out.geometries_) {
            out.Geometries.addUserGeometriesToMap(out.geometries_, zoomGroup, out._pathFunction)
        } else {
            out.Geometries.addDefaultGeometriesToMap(
                zoomGroup,
                out.drawGraticule_,
                out._pathFunction,
                out.nutsLevel_,
                out.nutsYear_,
                out.geo_,
                out.proj_,
                out.scale_
            )
        }

        //prepare group for proportional symbols, with centroids
        if (withCenterPoints) {
            addCentroidsToMap(out)
        }

        // add geographical labels to map
        if (out.labels_) {
            addLabelsToMap(out, zoomGroup)
        }

        if (out.annotations_) {
            appendAnnotations(zoomGroup, out.annotations_)
            out.annotationsAdded = true
        }

        //title
        if (out.title()) {
            //define default position
            let cssClass = out.isInset ? 'em-inset-title' : 'em-title'
            if (!out.titlePosition()) out.titlePosition([10, getFontSizeFromClass(cssClass) + (out.isInset ? 0 : 10)])
            //draw title
            out.svg()
                .append('text')
                .attr('id', 'title' + out.geo_)
                .attr('class', cssClass)
                .attr('x', out.titlePosition()[0])
                .attr('y', out.titlePosition()[1])
                .html(out.title())
        }

        if (out.subtitle()) {
            let cssSubtitleClass = out.isInset ? 'em-inset-subtitle' : 'em-subtitle'
            let cssTitleClass = out.isInset ? 'em-inset-title' : 'em-title'
            //define default position
            if (!out.subtitlePosition()) out.subtitlePosition([10, getFontSizeFromClass(cssTitleClass) + getFontSizeFromClass(cssSubtitleClass) + 15])
            //draw subtitle
            out.svg()
                .append('text')
                .attr('id', 'subtitle' + out.geo_)
                .attr('class', cssSubtitleClass)
                .attr('x', out.subtitlePosition()[0])
                .attr('y', out.subtitlePosition()[1])
                .html(out.subtitle())
        }

        //bottom text
        if (out.footnote_) {
            addFootnote()
        }

        //source dataset URL
        if (out.showSourceLink_) {
            let stat
            if (withCenterPoints) {
                stat = out.stat('size')
            } else {
                stat = out.stat()
            }
            if (stat) {
                if (stat.eurostatDatasetCode) {
                    //dataset link
                    let code = stat.eurostatDatasetCode
                    let url = `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`
                    let link = out
                        .svg()
                        .append('a')
                        .attr('class', 'em-source-dataset-link')
                        .attr('href', url)
                        .attr('target', '_blank')
                        .append('text')
                        .attr('class', 'em-source-dataset-link-text')
                        .attr('x', out.width_)
                        .attr('y', out.height_)
                        .text('EUROSTAT')
                        .attr('text-anchor', 'end')

                    //pretext "Source:"
                    let linkW = link.node().getComputedTextLength()
                    out.svg()
                        .append('text')
                        .attr('class', 'em-source-pretext')
                        .attr('x', out.width_ - linkW - 2)
                        .attr('y', out.height_)
                        .text('Source:')
                        .attr('text-anchor', 'end')
                }
            }
        }

        //add scalebar
        if (out.showScalebar_) {
            if (out.scalebarPosition_.length !== 2) {
                out.scalebarPosition_[0] = 15
                out.scalebarPosition_[1] = out.height_ - 50
            }
            addScalebarToMap()
        }

        return out
    }

    const defineDefaultPosition = function () {
        const defaultPosition = _defaultPosition[out.geo_ + '_' + out.proj_]
        if (defaultPosition) {
            out.position_.x = out.position_.x || defaultPosition.geoCenter[0]
            out.position_.y = out.position_.y || defaultPosition.geoCenter[1]
        } else if (out.Geometries.defaultGeoData?.bbox) {
            // default to center of geoData bbox
            out.position_.x = out.position_.x || 0.5 * (out.Geometries.defaultGeoData.bbox[0] + out.Geometries.defaultGeoData.bbox[2])
            out.position_.y = out.position_.y || 0.5 * (out.Geometries.defaultGeoData.bbox[1] + out.Geometries.defaultGeoData.bbox[3])
        } else {
            //TODO: auto-define user=defined geometries geoCenter
            // out.position_.x = Geometries.userGeometries
            // out.position_.y = Geometries.userGeometries
        }

        // optional: set from URL
        setViewFromURL()
    }

    const getDefaultZ = function () {
        const defaultPosition = _defaultPosition[out.geo_ + '_' + out.proj_]
        if (defaultPosition) {
            return (defaultPosition.pixelSize * 800) / out.width_
        } else if (out.Geometries.defaultGeoData?.bbox) {
            return Math.min(
                (out.Geometries.defaultGeoData.bbox[2] - out.Geometries.defaultGeoData.bbox[0]) / out.width_,
                (out.Geometries.defaultGeoData.bbox[3] - out.Geometries.defaultGeoData.bbox[1]) / out.height_
            )
        } else {
            return 100
        }
    }

    const defineProjection = function () {
        // Define projection based on the geographical context

        if (out.geo_ === 'WORLD') {
            // Use Robinson projection for the world with optional custom projection function
            out._projection =
                out.projectionFunction_ ||
                geoRobinson()
                    .translate([out.width_ / 2, out.height_ / 2])
                    .scale((out.width_ - 20) / (2 * Math.PI))
        } else {
            // For non-WORLD geo, use custom or default identity projection with calculated bounding box
            out._projection =
                out.projectionFunction_ || geoIdentity().reflectY(true).fitSize([out.width_, out.height_], getBBOXAsGeoJSON(getCurrentBbox()))
        }
    }

    // Helper function to calculate current view as bbox
    const getCurrentBbox = function () {
        const halfWidth = 0.5 * out.position_.z * out.width_
        const halfHeight = 0.5 * out.position_.z * out.height_
        const bbox = [out.position_.x - halfWidth, out.position_.y - halfHeight, out.position_.x + halfWidth, out.position_.y + halfHeight]
        return bbox
    }

    const definePathFunction = function () {
        out._pathFunction = geoPath().projection(out._projection)
    }

    const defineMapZoom = function () {
        let svg = select('#' + out.svgId())
        let previousT = zoomIdentity
        const xoo = zoom()
            .scaleExtent(out.zoomExtent())
            .on('zoom', function (e) {
                const t = e.transform
                if (t.k !== previousT.k) {
                    zoomHandler(e, previousT)
                } else {
                    panHandler(e)
                }

                // apply default transform to map
                const zoomGroup = out.svg_.select('#em-zoom-group-' + out.svgId_)
                zoomGroup.attr('transform', t)

                console.log('Position:', out.position_)
                previousT = t
            })

        svg.call(xoo)
    }

    // Zoom handler function
    const zoomHandler = function (event, previousT) {
        const transform = event.transform
        // Compute the projected center
        const centerX = (out.width_ / 2 - transform.x) / transform.k
        const centerY = (out.height_ / 2 - transform.y) / transform.k

        // Use the projection to get the projected center in EPSG:3035
        const [projectedX, projectedY] = out._projection.invert([centerX, centerY])

        // set new position
        out.position_.x = projectedX
        out.position_.y = projectedY
        out.position_.z = getMetresPerPixel(transform.k / previousT.k)

        // adjust stroke dynamically according to zoom
        scaleStrokeWidths(transform)

        // adjust stroke dynamically according to zoom
        if (out.labels_?.values) scaleLabelTexts(transform)

        // adjust stroke dynamically according to zoom
        if (out.labels_?.backgrounds) scaleLabelBackgrounds(transform)
    }

    /**
     * @description adjusts text elements dynamically according to zoom
     * @param {*} transform
     */
    const scaleLabelBackgrounds = function (transform) {
        const zoomGroup = out.svg_.select('#em-zoom-group-' + out.svgId_)
        const elements = zoomGroup.selectAll('.em-label-background')
        const zoomFactor = transform.k
        const updates = []

        elements.each(function () {
            const element = select(this)
            // Get the original width, height, x, and y from data attributes or current attributes
            const originalWidth = parseFloat(element.attr('data-width')) || parseFloat(element.attr('width'))
            const originalHeight = parseFloat(element.attr('data-height')) || parseFloat(element.attr('height'))
            const originalX = parseFloat(element.attr('data-x')) || parseFloat(element.attr('x'))
            const originalY = parseFloat(element.attr('data-y')) || parseFloat(element.attr('y'))

            // Only process elements that have valid width, height, x, and y
            if (originalWidth > 0 && originalHeight > 0 && !isNaN(originalX) && !isNaN(originalY)) {
                // Store the original width, height, x, and y for the first time if not already stored
                if (!element.attr('data-width')) {
                    element.attr('data-width', originalWidth)
                    element.attr('data-height', originalHeight)
                    element.attr('data-x', originalX)
                    element.attr('data-y', originalY)
                }

                // Calculate the target width, height, x, and y based on zoom factor (inverse scaling)
                const targetWidth = originalWidth * (1 / zoomFactor) // Inverse scaling
                const targetHeight = originalHeight * (1 / zoomFactor) // Inverse scaling
                const targetX = originalX * (1 / zoomFactor) // Adjust x position
                const targetY = originalY * (1 / zoomFactor) // Adjust y position

                // Add the style change to a batch array
                updates.push({ element, targetWidth, targetHeight, targetX, targetY })
            }
        })

        // Apply all style changes at once
        updates.forEach(({ element, targetWidth, targetHeight, targetX, targetY }) => {
            element.attr('width', targetWidth).attr('height', targetHeight).attr('x', targetX).attr('y', targetY)
        })
    }
    /**
     * @description adjusts text elements dynamically according to zoom
     * @param {*} transform
     */
    const scaleLabelTexts = function (transform) {
        const zoomGroup = out.svg_.select('#em-zoom-group-' + out.svgId_)
        const labels = zoomGroup.select('#em-labels')
        const elements = labels.selectAll('*') // Select all labels
        const zoomFactor = transform.k
        const updates = []

        elements.each(function () {
            const element = select(this)
            const computedStyle = window.getComputedStyle(this)

            // Get font-size from inline or computed style
            const inlineFontSize = element.attr('font-size')
            const cssFontSize = computedStyle.fontSize
            const fontSize = inlineFontSize || cssFontSize

            // Only process elements that have a font size defined
            if (fontSize && parseFloat(fontSize) > 0) {
                const originalFontSize = parseFloat(element.attr('data-fs')) || parseFloat(inlineFontSize) || parseFloat(cssFontSize)

                // Store the original font size for the first time
                if (!element.attr('data-fs')) {
                    element.attr('data-fs', originalFontSize)
                }

                // Calculate the target font size based on zoom factor
                const targetFontSize = originalFontSize / zoomFactor

                // Add the style change to a batch array
                updates.push({ element: this, targetFontSize })
            }
        })

        // Apply all style changes at once
        updates.forEach(({ element, targetFontSize }) => {
            element.style.setProperty('font-size', `${targetFontSize}px`, 'important')
        })
    }

    /**
     * @description adjusts all stroke-widths dynamically according to zoom
     * @param {*} transform
     */
    const scaleStrokeWidths = function (transform) {
        const zoomGroup = out.svg_.select('#em-zoom-group-' + out.svgId_)
        const elements = zoomGroup.selectAll('*') // Select all elements in the zoom group
        const zoomFactor = transform.k
        const updates = []

        elements.each(function () {
            const element = select(this)
            const computedStyle = window.getComputedStyle(this)

            // Get stroke-width from inline or computed style
            const inlineStrokeWidth = element.attr('stroke-width')
            const cssStrokeWidth = computedStyle.strokeWidth
            const strokeWidth = inlineStrokeWidth || cssStrokeWidth

            // Only process elements that have a stroke width defined
            if (strokeWidth && parseFloat(strokeWidth) > 0) {
                const originalStrokeWidth = parseFloat(element.attr('data-sw')) || parseFloat(inlineStrokeWidth) || parseFloat(cssStrokeWidth)

                // Store the original stroke width for the first time
                if (!element.attr('data-sw')) {
                    element.attr('data-sw', originalStrokeWidth)
                }

                // Calculate the target stroke width
                const targetStrokeWidth = originalStrokeWidth / zoomFactor

                // Add the style change to a batch array
                updates.push({ element: this, targetStrokeWidth })
            }
        })

        // Apply all style changes at once
        updates.forEach(({ element, targetStrokeWidth }) => {
            element.style.setProperty('stroke-width', `${targetStrokeWidth}px`, 'important')
        })
    }

    /**
     * @description get the current view's metres per pixel, based on a zoomFactor
     * @param {number} zoomFactor this zoom / previous zoom
     * @return {number}
     */
    const getMetresPerPixel = function (zoomFactor) {
        // Get current bounding box width in meters
        const bbox = getCurrentBbox()
        const bboxWidth = bbox[2] - bbox[0] // BBOX width in meters

        // Calculate meters per pixel
        const metersPerPixel = bboxWidth / (out.width_ * zoomFactor)

        return metersPerPixel
    }

    // Pan handler function
    const panHandler = function (event, previousT) {
        const transform = event.transform

        // Compute the projected center
        const centerX = (out.width_ / 2 - transform.x) / transform.k
        const centerY = (out.height_ / 2 - transform.y) / transform.k
        let [geoX, geoY] = out._projection.invert([centerX, centerY])

        // Clamp geoX and geoY to max bounds and adjust the event transform
        if (out.maxBounds_.xMin !== undefined && geoX < out.maxBounds_.xMin) {
            geoX = out.maxBounds_.xMin
            transform.x = out.width_ / 2 - out._projection([geoX, geoY])[0] * transform.k
        }
        if (out.maxBounds_.yMin !== undefined && geoY < out.maxBounds_.yMin) {
            geoY = out.maxBounds_.yMin
            transform.y = out.height_ / 2 - out._projection([geoX, geoY])[1] * transform.k
        }
        if (out.maxBounds_.xMax !== undefined && geoX > out.maxBounds_.xMax) {
            geoX = out.maxBounds_.xMax
            transform.x = out.width_ / 2 - out._projection([geoX, geoY])[0] * transform.k
        }
        if (out.maxBounds_.yMax !== undefined && geoY > out.maxBounds_.yMax) {
            geoY = out.maxBounds_.yMax
            transform.y = out.height_ / 2 - out._projection([geoX, geoY])[1] * transform.k
        }

        // set new position
        out.position_.x = geoX
        out.position_.y = geoY
    }

    /** Get x,y,z elements from URL and assign them to the view. */
    const setViewFromURL = function () {
        const x = getParameterByName('x'),
            y = getParameterByName('y'),
            z = getParameterByName('z')
        if (x != null && x != undefined && !isNaN(+x)) out.position_.x = +x
        if (y != null && y != undefined && !isNaN(+y)) out.position_.y = +y
        if (z != null && z != undefined && !isNaN(+z)) out.position_.z = +z
    }

    const addFootnote = function () {
        out.svg()
            .append('text')
            .attr('id', 'em-footnote')
            .attr('class', 'em-footnote')
            .attr('x', 0)
            .attr('y', out.height_)
            .html(out.footnote_)
            .on('mouseover', function () {
                out._tooltip.mw___ = out._tooltip.style('max-width')
                out._tooltip.style('max-width', '400px')
                if (out.footnoteTooltipText_) out._tooltip.mouseover(out.footnoteTooltipText_)
            })
            .on('mousemove', function (e) {
                if (out.footnoteTooltipText_) out._tooltip.mousemove(e)
            })
            .on('mouseout', function (e) {
                if (out.footnoteTooltipText_) out._tooltip.mouseout(e)
                out._tooltip.style('max-width', out._tooltip.mw___)
            })
    }

    const addCoastalMarginToMap = function () {
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

    const addCentroidsToMap = function (map) {
        let centroidFeatures

        if (!map.Geometries.centroidsData) {
            // if centroids data is absent (e.g. for world maps) then calculate manually
            if (map.geo_ == 'WORLD') {
                centroidFeatures = []
                map.Geometries.geoJSONs.worldrg.forEach((feature) => {
                    let newFeature = { ...feature }
                    // exception for France (because guyane)
                    if (feature.properties.id == 'FR') {
                        newFeature.geometry = {
                            coordinates: [2.2, 46.2],
                            type: 'Point',
                        }
                    } else {
                        newFeature.geometry = {
                            coordinates: geoCentroid(feature),
                            type: 'Point',
                        }
                    }
                    centroidFeatures.push(newFeature)
                })
            }
        } else {
            if (map.nutsLevel_ == 'mixed') {
                centroidFeatures = [
                    ...map.Geometries.centroidsData[0].features,
                    ...map.Geometries.centroidsData[1].features,
                    ...map.Geometries.centroidsData[2].features,
                    ...map.Geometries.centroidsData[3].features,
                ]
            } else {
                centroidFeatures = map.Geometries.centroidsData.features
            }
        }

        if (map.processCentroids_) centroidFeatures = map.processCentroids_(centroidFeatures)

        // calculate screen coordinates and save centroids to map
        map._centroidFeatures = centroidFeatures.map((d) => {
            let coords = map._projection(d.geometry.coordinates)
            d.properties.centroid = coords
            return d
        })

        // g_ps is the g element containing all proportional symbols for the map
        const zg = map.svg().select('#em-zoom-group-' + map.svgId_)
        const gcp = zg.append('g').attr('id', 'g_ps')

        // add centroid em-centroid elements
        // then symbols are drawn/appended to these containers in the map-type js file
        const symbolContainers = gcp
            .selectAll('g')
            .data(map._centroidFeatures)
            .enter()
            .append('g')
            .attr('transform', function (d) {
                return 'translate(' + d.properties.centroid[0].toFixed(3) + ',' + d.properties.centroid[1].toFixed(3) + ')'
            })
            .attr('class', 'em-centroid') // OUR SYMBOL CONTAINER
            .attr('id', (d) => 'ps' + d.properties.id)
    }

    /**
     * @function addScalebarToMap
     * @description appends an SVG scalebar to the map. Uses pixelSize to calculate units in km
     */
    const addScalebarToMap = function () {
        let sb = out.svg().append('g').attr('id', 'scalebar').attr('x', out.scalebarPosition_[0]).attr('y', out.scalebarPosition_[1])

        let segmentHeight = out.scalebarSegmentHeight_

        // Julien's nice scalebars
        const marginLeft = 5
        const maxLengthPix = out.scalebarMaxWidth_
        const textOffsetX = out.scalebarTextOffset_[0]
        const textOffsetY = out.scalebarTextOffset_[1]
        const pixelSizeM = out.position_.z
        const maxLengthM = maxLengthPix * pixelSizeM
        const niceLengthM = niceScaleBarLength(maxLengthM)
        const niceLengthPixel = niceLengthM[0] / pixelSizeM
        const scaleBarStartDigit = niceLengthM[1]
        const subdivisionNbs = {
            1: 4,
            2: 2,
            5: 5,
        }

        const scalebarSVG = out
            .svg()
            .append('g')
            .attr('class', 'em-scalebar')
            .attr('x', out.scalebarPosition_[0])
            .attr('y', out.scalebarPosition_[1])
            .attr('width', maxLengthPix + 20)
            .attr('height', out.scalebarHeight_)

        // top line full width
        scalebarSVG
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', marginLeft)
            .attr('y1', 1)
            .attr('x2', niceLengthPixel + marginLeft)
            .attr('y2', 1)

        //bottom line full width
        scalebarSVG
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', marginLeft)
            .attr('y1', out.scalebarSegmentHeight_)
            .attr('x2', niceLengthPixel + marginLeft)
            .attr('y2', out.scalebarSegmentHeight_)

        //first tick
        scalebarSVG
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', marginLeft)
            .attr('y1', 1)
            .attr('x2', marginLeft)
            .attr('y2', out.scalebarTickHeight_)

        scalebarSVG
            .append('text')
            .attr('class', 'em-scalebar-label')
            .attr('x', marginLeft + textOffsetX)
            .attr('y', out.scalebarTickHeight_ + textOffsetY)
            .text('0')

        //middle ticks
        const subdivisionNb = subdivisionNbs[scaleBarStartDigit]
        const divisionWidth = niceLengthPixel / subdivisionNb
        const divisionMinWidth = 15
        if (divisionWidth >= divisionMinWidth) {
            for (let i = 1; i < subdivisionNb; i++) {
                scalebarSVG
                    .append('line')
                    .attr('class', 'em-scalebar-line')
                    .attr('x1', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                    .attr('y1', 1)
                    .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                    .attr('y2', out.scalebarTickHeight_)
                scalebarSVG
                    .append('text')
                    .attr('class', 'em-scalebar-label')
                    .attr('x', marginLeft + textOffsetX + i * divisionWidth)
                    .attr('y', out.scalebarTickHeight_ + textOffsetY)
                    .text(getScalebarLabel((niceLengthM[0] / subdivisionNb) * i))
            }

            //every other segment mid-line
            for (let i = -1; i < subdivisionNb; i += 2) {
                if (i == 1) {
                    sb.append('line')
                        .attr('class', 'em-scalebar-line')
                        .attr('x1', marginLeft + out.scalebarStrokeWidth_ - 1)
                        .attr('y1', out.scalebarSegmentHeight_ / 2)
                        .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                        .attr('y2', out.scalebarSegmentHeight_ / 2)
                } else {
                    let x1 = marginLeft + out.scalebarStrokeWidth_ / 2 + (i - 1) * divisionWidth
                    if (x1 > 0) {
                        sb.append('line')
                            .attr('class', 'em-scalebar-line')
                            .attr('x1', x1)
                            .attr('y1', out.scalebarSegmentHeight_ / 2)
                            .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                            .attr('y2', out.scalebarSegmentHeight_ / 2)
                    }
                }
            }
        } else {
            // single full-length horizontal mid-line
            sb.append('line')
                .attr('class', 'em-scalebar-line')
                .attr('x1', marginLeft + out.scalebarStrokeWidth_ - 1)
                .attr('y1', out.scalebarSegmentHeight_ / 2)
                .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + divisionWidth * subdivisionNb)
                .attr('y2', out.scalebarSegmentHeight_ / 2)
        }

        //last tick
        scalebarSVG
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', niceLengthPixel + marginLeft)
            .attr('y1', 1)
            .attr('x2', niceLengthPixel + marginLeft)
            .attr('y2', out.scalebarTickHeight_)
        scalebarSVG
            .append('text')
            .attr('class', 'em-scalebar-label')
            .attr('x', niceLengthPixel + marginLeft + textOffsetX)
            .attr('y', out.scalebarTickHeight_ + textOffsetY)
            .text(getScalebarLabel(niceLengthM[0]) + out.scalebarUnits_)
    }

    const niceScaleBarLength = function (scaleBarLength) {
        //compute the 'nice' power of ten
        const pow10 = Math.pow(10, Math.floor(Math.log(scaleBarLength) / Math.log(10)))

        //check if 5 times this value fits
        if (5 * pow10 <= scaleBarLength) return [5 * pow10, 5]

        //check if 2 times this value fits
        if (2 * pow10 <= scaleBarLength) return [2 * pow10, 2]

        //returns the power of ten
        return [pow10, 1]
    }

    const getScalebarLabel = function (valueM) {
        if (valueM < 0.01) return valueM * 1000 + 'mm'
        if (valueM < 1) return valueM * 100 + 'cm'
        if (valueM < 1000) return valueM * 1 + 'm'
        return valueM / 1000
    }

    return out
}

/** Default geocenter positions and pixelSize (for default width = 800px) for territories and projections. */
const _defaultPosition = {
    EUR_3035: { geoCenter: [4970000, 3350000], pixelSize: 6800 },
    IC_32628: { geoCenter: [443468, 3145647], pixelSize: 1000 },
    GP_32620: { geoCenter: [669498, 1784552], pixelSize: 130 },
    MQ_32620: { geoCenter: [716521, 1621322], pixelSize: 130 },
    GF_32622: { geoCenter: [266852, 444074], pixelSize: 500 },
    RE_32740: { geoCenter: [348011, 7661627], pixelSize: 130 },
    YT_32738: { geoCenter: [516549, 8583920], pixelSize: 70 },
    MT_3035: { geoCenter: [4719755, 1441701], pixelSize: 70 },
    PT20_32626: { geoCenter: [397418, 4271471], pixelSize: 1500 },
    PT30_32628: { geoCenter: [333586, 3622706], pixelSize: 150 },
    LI_3035: { geoCenter: [4287060, 2672000], pixelSize: 40 },
    IS_3035: { geoCenter: [3011804, 4960000], pixelSize: 700 },
    SJ_SV_3035: { geoCenter: [4570000, 6160156], pixelSize: 800 },
    SJ_JM_3035: { geoCenter: [3647762, 5408300], pixelSize: 100 },
    CARIB_32620: { geoCenter: [636345, 1669439], pixelSize: 500 },
    WORLD_54030: { geoCenter: [14, 17], pixelSize: 9000 },
}
