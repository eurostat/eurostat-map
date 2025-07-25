import { select, selectAll } from 'd3-selection'
import { formatDefaultLocale } from 'd3-format'
import { geoIdentity, geoPath, geoCentroid } from 'd3-geo'
import { geoRobinson } from 'd3-geo-projection'
import { getBBOXAsGeoJSON, executeForAllInsets, getFontSizeFromClass, getParameterByName, convertRectanglesToPaths, getCurrentBbox } from './utils'
import { appendAnnotations } from './annotations'
import { addLabelsToMap, updateLabels, updateValuesLabels } from './labels'
import { defineDeprecatedFunctions } from './deprecated'
import { Geometries } from './geometries'
import { buildInsets, removeInsets } from './insets'
import { appendStamp } from './stamps'
import { buildGridCartogramBase } from './cartograms'
import { appendMinimap } from './minimaps'
import { defineMapZoom, setMapView } from './zoom'
import { appendZoomButtons } from './buttons/zoom-buttons'
import { appendInsetsButton } from './buttons/insets-button'
import { zoomIdentity } from 'd3-zoom'

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
export const mapTemplate = function (config, withCenterPoints, mapType) {
    //build map template object
    const out = {}
    out._mapType = mapType

    // expose imported function to other modules
    out.updateValuesLabels = updateValuesLabels

    //map
    out.svgId_ = 'map'
    out.svg_ = undefined
    out.width_ = Math.min(795, window.innerWidth)
    out.height_ = 0
    out.containerId_ = undefined

    //geographical focus
    out.gridCartogram_ = false // draw geometries as grid cells
    out.gridCartogramShape_ = 'square' // square or hexagon
    out.gridCartogramMargins_ = { top: 80, right: 50, bottom: 80, left: 150 }
    out.gridCartogramCellPadding_ = 4
    out.gridCartogramPositions_ = undefined //user defined cartograms
    out.nutsLevel_ = 3 // 0,1,2,3, or 'mixed'
    out.nutsYear_ = 2024
    out.geo_ = 'EUR'
    out.proj_ = '3035'
    out.projectionFunction_ = undefined // e.g. d3.geoRobinson()
    out.filterGeometriesFunction_ = undefined // user defined filter function
    out.scale_ = '20M' //TODO choose automatically, depending on pixelSize ?
    out.position_ = { x: undefined, y: undefined, z: undefined } // initial map view

    // pan & zoom
    out.zoomExtent_ = undefined
    out.lockPanUntilZoom_ = true // if true, user can pan only after zooming once

    //events
    out.onZoomEnd_ = undefined // user function to call when zoom ends
    out.onZoom_ = undefined // user function to call when zooming
    out.onRegionMouseOver_ = undefined // user function to call when mouseover a region
    out.onRegionMouseMove_ = undefined // user function to call when mousemove over a region
    out.onRegionMouseOut_ = undefined // user function to call when mouseout of a region

    // geometries
    out.geometries_ = undefined // [{id:String, data:geojson, class:function}] user-defined geometries
    out.processCentroids_ = undefined // runs over symbol centroids

    //dorling cartograms (used for ps and pie maps)
    out.dorling_ = false
    out.animateDorling_ = true
    out.dorlingStrength_ = { x: 1, y: 1 }
    out.dorlingIterations_ = 1
    out.onDorlingProgress_ = undefined
    out.dorlingWorker_ = false // use a web worker for (non-animated) dorling cartograms to not block the main thread
    out.dorlingWorkerD3URL_ = undefined

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

    //minimap
    out.minimap_ = undefined

    //buttons
    out.showZoomButtons_ = false // show zoom buttons
    out.showInsetsButton_ = false // show insets button

    //tooltip
    out.tooltip_ = {
        fontSize: '14px',
        transitionDuration: 200,
        xOffset: 0,
        yOffset: 0,
        textFunction: null,
        showFlags: false,
        omitList: false, // if specified, tooltip will not show the list of regions
    } //  See tooltip.js for more details

    // region mouseover color
    out.hoverColor_ = 'red'

    //coastal margin
    out.drawCoastalMargin_ = false
    out.coastalMarginStdDev_ = 3

    //graticule
    out.drawGraticule_ = false

    //background map toggle (e.g. for dorling)
    out.backgroundMap_ = true

    //labelling
    // see docs\reference.md#labelling
    out.labels_ = undefined

    //annotations
    out.annotations_ = undefined
    out.annotationsAdded = false //simple flag to know when annotations have already been added

    //hatching
    out.patternFill_ = undefined // e.g. {pattern:'hatching',regionIds:['DE','FR']}

    //dataset source link
    out.showSourceLink_ = true

    //default copyright and disclaimer text
    out.footnote_ = 'Administrative boundaries: \u00A9EuroGeographics \u00A9UN-FAO \u00A9INSTAT \u00A9Turkstat' //"(C)EuroGeographics (C)UN-FAO (C)Turkstat";
    out.footnoteTooltipText_ =
        '<div class="em-footnote-tooltip">The designations employed and the presentation of material on this map do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence.</div>'

    out.nuts2jsonBaseURL_ = window.location.hostname.includes('ec.europa.eu')
        ? 'https://ec.europa.eu/assets/estat/E/E4/gisco/pub/nuts2json/v2'
        : 'https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2'

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

    // convert geo to uppercase
    out.geo = function (v) {
        if (!arguments.length) return out.geo_
        out.geo_ = v.toUpperCase()
        return out
    }

    //special ones which affect also the insets
    ;['tooltip_', 'nuts2jsonBaseURL_', 'processCentroids_'].forEach(function (att) {
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
        appendAnnotations(out)
        return out
    }

    //stamps override (update after first call)
    out.stamp = function (v) {
        //get
        if (!arguments.length) return out.stamp_
        //set
        out.stamp_ = v
        //update
        appendStamp(out.stamp_, out)
        return out
    }

    //minimap override (update after first call)
    out.minimap = function (v) {
        //get
        if (!arguments.length) return out.minimap_
        //set
        out.minimap_ = v
        //update
        appendMinimap(out)
        return out
    }

    //labels override (update after first call)
    out.labels = function (v) {
        //get
        if (!arguments.length) return out.labels_
        //set
        out.labels_ = v
        //update
        updateLabels(out)
        return out
    }

    out.position = function (v) {
        if (!arguments.length) return out.position_
        out.position_ = v
        setMapView(out, v)
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

    const createMapSVG = function (out) {
        //get svg element. Create it if it does not exists
        let svg = select('#' + out.svgId())
        if (svg.size() == 0) {
            svg = select('body').append('svg').attr('id', out.svgId())
        }
        svg.attr('class', 'em-map')
        //add mapType css class
        svg.classed('em--' + out._mapType, true)
        // pies and coxcombs are proportional symbols, so add proportional-symbols class too
        if (out._mapType === 'pie' || out._mapType === 'coxcomb') {
            svg.classed('em--ps', true)
        }
        return svg
    }

    /**
     * Build a map object, including container, frame, map svg, insets and d3 zoom
     */
    out.buildMapTemplateBase = function () {
        const svg = createMapSVG(out)
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

        // build insets
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
        //prepare drawing group
        const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
        //remove all children
        zoomGroup.selectAll('*').remove()

        // separate logic for cartograms
        if (out.gridCartogram_ == true) {
            buildGridCartogramBase(out)
            out.footnote_ = false //dont need copyright
        } else {
            // default geographic logic

            // position
            if (!out.position_.x || !out.position_.y) {
                defineDefaultPosition()
            }
            out.position_.z = out.position_.z || getDefaultZ()

            // d3 projection/path functions
            defineProjection()
            definePathFunction()

            // d3 zoom
            if (out.zoomExtent()) {
                defineMapZoom(out)
            }

            if (out.backgroundMap_) {
                drawBackgroundMap(out)
            }
        }

        //prepare group for proportional symbols, with centroids
        if (withCenterPoints) {
            addCentroidsToMap(out)
        }

        // add geographical labels to map
        if (out.labels_) {
            addLabelsToMap(out, zoomGroup)
        }

        //annotations
        if (out.annotations_) {
            appendAnnotations(out)
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

        //subtitle
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

        // scalebar
        if (out.showScalebar_) {
            if (out.scalebarPosition_.length !== 2) {
                out.scalebarPosition_[0] = 15
                out.scalebarPosition_[1] = out.height_ - 50
            }
            addScalebarToMap()
        }

        //minimap
        if (out.minimap_) {
            appendMinimap(out)
        }

        //zoom buttons
        if (out.showZoomButtons_) {
            appendZoomButtons(out)
        }

        //insets buttons
        if (out.showInsetsButton_) {
            appendInsetsButton(out)
        }

        return out
    }

    const drawBackgroundMap = function (out) {
        //draw background map
        const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
        //draw sea
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

        // coastal margin
        if (out.drawCoastalMargin_) {
            addCoastalMarginToMap()
        }

        // draw polygons and borders
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
                out.projectionFunction_ ||
                geoIdentity()
                    .reflectY(true)
                    .fitSize([out.width_, out.height_], getBBOXAsGeoJSON(getCurrentBbox(out)))
        }
    }

    const definePathFunction = function () {
        out._pathFunction = geoPath().projection(out._projection)
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

        // Project coordinates and save as the working centroids array
        map.Geometries.centroidsFeatures = centroidFeatures.map((d) => {
            const coords = map._projection(d.geometry.coordinates)
            d.properties.centroid = coords
            return d
        })

        // Keep a permanent unfiltered master copy so we can rebuild later
        map.Geometries._allCentroidsFeatures = [...map.Geometries.centroidsFeatures]

        // em-prop-symbols is the g element containing all proportional symbols for the map
        const zg = map.svg().select('#em-zoom-group-' + map.svgId_)
        const gcp = zg.append('g').attr('id', 'em-prop-symbols')

        // add centroid elements
        // then symbols are drawn/appended to these containers in the map-type js file
        const symbolContainers = gcp
            .selectAll('g')
            .data(map.Geometries.centroidsFeatures)
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

        const scalebarGroup = out
            .svg()
            .append('g')
            .attr('class', 'em-scalebar')
            .attr('transform', `translate(${out.scalebarPosition_[0]},${out.scalebarPosition_[1]})`)
            .attr('width', maxLengthPix + 20)
            .attr('height', out.scalebarHeight_)

        // top line full width
        // scalebarGroup
        //     .append('line')
        //     .attr('class', 'em-scalebar-line')
        //     .attr('x1', marginLeft)
        //     .attr('y1', 1)
        //     .attr('x2', niceLengthPixel + marginLeft)
        //     .attr('y2', 1)

        //bottom line full width
        // scalebarGroup
        //     .append('line')
        //     .attr('class', 'em-scalebar-line')
        //     .attr('x1', marginLeft)
        //     .attr('y1', out.scalebarSegmentHeight_)
        //     .attr('x2', niceLengthPixel + marginLeft)
        //     .attr('y2', out.scalebarSegmentHeight_)

        //first tick
        scalebarGroup
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', marginLeft)
            .attr('y1', 1)
            .attr('x2', marginLeft)
            .attr('y2', out.scalebarTickHeight_)

        scalebarGroup
            .append('text')
            .attr('class', 'em-scalebar-label')
            .attr('x', marginLeft + textOffsetX)
            .attr('y', out.scalebarTickHeight_ + textOffsetY)
            .text('0')

        //middle ticks
        const subdivisionNb = subdivisionNbs[scaleBarStartDigit]
        const divisionWidth = niceLengthPixel / subdivisionNb
        const divisionMinWidth = 15
        const midlineY = out.scalebarSegmentHeight_ / 2 + 1
        if (divisionWidth >= divisionMinWidth) {
            for (let i = 1; i < subdivisionNb; i++) {
                scalebarGroup
                    .append('line')
                    .attr('class', 'em-scalebar-line')
                    .attr('x1', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                    .attr('y1', 1)
                    .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                    .attr('y2', out.scalebarTickHeight_)
                scalebarGroup
                    .append('text')
                    .attr('class', 'em-scalebar-label')
                    .attr('x', marginLeft + textOffsetX + i * divisionWidth)
                    .attr('y', out.scalebarTickHeight_ + textOffsetY)
                    .text(getScalebarLabel((niceLengthM[0] / subdivisionNb) * i))

                if (i == 1) {
                    scalebarGroup
                        .append('line')
                        .attr('class', 'em-scalebar-line em-scalebar-midline')
                        .attr('x1', marginLeft + out.scalebarStrokeWidth_ - 1)
                        .attr('y1', midlineY)
                        .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                        .attr('y2', midlineY)
                } else {
                    let x1 = marginLeft + out.scalebarStrokeWidth_ / 2 + (i - 1) * divisionWidth
                    if (x1 > 0) {
                        scalebarGroup
                            .append('line')
                            .attr('class', 'em-scalebar-line em-scalebar-midline')
                            .attr('x1', x1)
                            .attr('y1', midlineY)
                            .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                            .attr('y2', midlineY)
                    }
                }
            }

            // Draw final midline segment (last segment)
            if (divisionWidth >= divisionMinWidth) {
                scalebarGroup
                    .append('line')
                    .attr('class', 'em-scalebar-line em-scalebar-midline')
                    .attr('x1', marginLeft + (subdivisionNb - 1) * divisionWidth)
                    .attr('y1', midlineY)
                    .attr('x2', marginLeft + subdivisionNb * divisionWidth)
                    .attr('y2', midlineY)
            }
        } else {
            // single full-length horizontal mid-line
            scalebarGroup
                .append('line')
                .attr('class', 'em-scalebar-line em-scalebar-midline')
                .attr('x1', marginLeft + out.scalebarStrokeWidth_ - 1)
                .attr('y1', midlineY)
                .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + divisionWidth * subdivisionNb)
                .attr('y2', midlineY)
        }

        //last tick
        scalebarGroup
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', niceLengthPixel + marginLeft)
            .attr('y1', 1)
            .attr('x2', niceLengthPixel + marginLeft)
            .attr('y2', out.scalebarTickHeight_)
        scalebarGroup
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
    EUR_3035: { geoCenter: [4790000, 3420000], pixelSize: 6400 },
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
