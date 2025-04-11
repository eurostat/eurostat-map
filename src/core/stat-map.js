import { applyInlineStylesFromCSS, flags, serialize, rasterize, getDownloadURL } from './utils'
import * as MapTemplate from './map-template'
import * as StatisticalData from './stat-data'
import * as Legend from '../legend/legend'
import { select } from 'd3-selection'
import * as tp from '../tooltip/tooltip'

/**
 * An abstract statistical map: A map template with statistical data, without any particular styling rule.
 *
 * @param {*} withCenterPoints Set to true (or 1) to add regions center points to the map template, to be used for proportional symbols maps for example.
 */
export const statMap = function (config, withCenterPoints, mapType) {
    //build stat map from map template
    const out = MapTemplate.mapTemplate(config, withCenterPoints, mapType)

    //statistical data

    //the statistical data configuration.
    //A map can have several stat datasets. This is a dictionary of all stat configuration
    out.stat_ = { default: undefined }
    out.stat = function (k, v) {
        //no argument: getter - return the default stat
        if (!arguments.length) return out.stat_['default']
        //two arguments: setter - set the config k with value v
        if (arguments.length == 2) {
            out.stat_[k] = v
            return out
        }
        //one string argument: getter - return the config k
        if (typeof k === 'string' || k instanceof String) return out.stat_[k]
        //one non-string argument: setter - set the entire dictionnary
        out.stat_ = k.default ? k : { default: k }
        return out
    }

    //the statistical data, retrieved from the config information. As a dictionary.
    out.statData_ = {
        default: StatisticalData.statData(),
        color: StatisticalData.statData(),
        size: StatisticalData.statData(),
        v1: StatisticalData.statData(),
        v2: StatisticalData.statData(), //bivariate
        v3: StatisticalData.statData(), //trivariate
    }
    out.statData = function (k, v) {
        //no argument: getter - return the default statData
        if (!arguments.length) return out.statData_['default']
        //one argument: getter
        if (arguments.length == 1) return out.statData_[k]
        //setter
        out.statData_[k] = v
        return out
    }

    //test for no data case
    out.noDataText_ = 'No data available'
    //langage (currently used only for eurostat data API)
    out.language_ = 'en'
    //transition time for rendering
    out.transitionDuration_ = 500
    //specific tooltip text function
    out.tooltip_.textFunction = undefined
    //for maps using special fill patterns, this is the function to define them in the SVG image - See functions: getFillPatternLegend and getFillPatternDefinitionFun
    out.filtersDefinitionFunction_ = undefined
    //a callback function to execute after the map build is complete.
    out.callback_ = undefined

    //legend configuration
    out.legend_ = undefined
    //legend object
    out.legendObj_ = undefined

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;['legend_', 'legendObj_', 'noDataText_', 'language_', 'transitionDuration_', 'tooltipText_', 'filtersDefinitionFunction_', 'callback_'].forEach(
        function (att) {
            out[att.substring(0, att.length - 1)] = function (v) {
                if (!arguments.length) return out[att]
                out[att] = v
                return out
            }
        }
    )

    //override attribute values with config values
    if (config) for (let key in config) if (out[key] && config[key] != undefined) out[key](config[key])

    // override legend for updating after build
    out.legend = function (v) {
        if (!arguments.length) return out.legend_

        // clear existing legend
        if (v == false) {
            const legend = out.legendObj()
            if (legend) {
                const legendSvg = select('#' + legend.svgId)
                if (legendSvg.size() > 0) {
                    legendSvg.selectAll('*').remove()
                }
            }
            out.legend_ = v
            return out
        }
        //set new legend config
        out.legend_ = v
        //update if existing legend
        if (out.legendObj_) out.updateLegend()
        return out
    }

    out.updateLegend = function (v) {
        if (out.legendObj_) out.legendObj().update()
        return out
    }

    /**
     * Build the map.
     * This method should be called once, preferably after the map attributes have been set to some initial values.
     */
    out.build = function () {
        if (out.projectionFunction_) out.proj('4326') //when using custom d3 projection function always request NUTS2JSON in WGS84

        //build map template base
        out.buildMapTemplateBase()

        //add additional filters for fill patterns for example
        if (out.filtersDefinitionFunction_) {
            out.filtersDefinitionFunction_(out.svg(), out.numberOfClasses_)
        }

        //legend element
        if (out.legend()) {
            out.buildLegend()
        }

        //define tooltip
        //prepare map tooltip
        if (out.tooltip_) {
            out._tooltip = tp.tooltip(out.tooltip_)
        } else {
            //no config specified, use default
            out._tooltip = tp.tooltip()
        }

        //launch geo data retrieval
        out.updateGeoData()

        //launch stat data retrieval
        out.updateStatData()

        return out
    }

    out.buildLegend = function () {
        //create legend object
        out.legendObj(out.getLegendConstructor()(out, out.legend()))
        const legend = out.legendObj()

        //get legend svg. If it does not exist, create it embeded within the map
        let legendSvg = select('#' + legend.svgId)
        if (legendSvg.size() == 0) {
            //get legend position
            const x = legend.x == undefined ? out.width() - 100 - legend.boxPadding : legend.x
            const y = legend.y == undefined ? legend.boxPadding : legend.y

            //build legend SVG in a new group
            out.svg()
                .append('g')
                .attr('id', legend.svgId)
                .attr('class', 'em-legend')
                .attr('transform', 'translate(' + x + ',' + y + ')')
        }

        legend.build()
    }

    /** Check if all stat datasets have been loaded. */
    const isStatDataReady = function () {
        for (let statKey in out.stat_) {
            if (!out.statData_[statKey].isReady()) {
                // BUG HERE. E.G. for chbi maps the user callback is never executed for all inset maps because isReady() returns false, because v1 and v2 are specified but not 'default'.
                return false
            }
        }
        return true
    }

    /**
     * Launch map geo data retrieval, and make/update the map once received.
     * This method should be called after attributes related to the map geometries have changed, to retrieve this new data and refresh the map.
     */
    out.updateGeoData = function () {
        out.updateGeoMapTemplate(() => {
            //if stat datasets have not been loaded, wait again
            if (!isStatDataReady()) return

            //proceed with map construction
            out.updateStatValues()
            //execute callback function
            if (out.callback()) out.callback()(out)
        })

        return out
    }

    /**
     * Launch map geo stat datasets retrieval, and make/update the map once received.
     * This method should be called after specifications on the stat data sources attached to the map have changed, to retrieve this new data and refresh the map.
     */
    out.updateStatData = function () {
        for (let statKey in out.stat_) {
            //case when no stat data source is specified and stat data where specified programmatically
            //bug - map.statData('size').setData({ ES: 10000, DE: 10000, FR: 5000 }) results in out.statData(statKey).get() = undefined
            if (!out.stat(statKey) && out.statData(statKey).get()) return

            //if no config is specified, use default data source: population density - why?
            //TODO move that out of loop ?
            if (statKey == 'default' && !out.stat(statKey)) {
                out.stat(statKey, { eurostatDatasetCode: 'demo_r_d3dens', unitText: 'inhab./km²' })
            }

            //build stat data object from stat configuration and store it
            const statData = StatisticalData.statData(out.stat(statKey))
            out.statData(statKey, statData)

            //launch query
            let nl = out.nutsLevel_
            if (out.nutsLevel_ == 'mixed') {
                nl = 0
            }
            statData.retrieveFromRemote(nl, out.language(), () => {
                //if geodata has not been loaded, wait again
                if (!out.Geometries.isGeoReady()) return
                //if stat datasets have not all been loaded, wait again
                if (!isStatDataReady()) return

                //proceed with map construction
                out.updateStatValues()

                //execute callback function
                if (out.callback()) out.callback()()
            })
        }

        return out
    }

    /**
     * Make/update the map with new stat data.
     * This method should be called after stat data attached to the map have changed, to refresh the map.
     * If the stat data sources have changed, call *updateStatData* instead.
     */
    out.updateStatValues = function () {
        //update classification and styles
        out.updateClassification()
        out.updateStyle()

        //update legend, if any
        if (out.legend_ && out.legendObj()) out.legendObj().update()

        return out
    }

    /**
     * Abstract method.
     * Make/update the map after classification attributes have been changed.
     * For example, if the number of classes, or the classification method has changed, call this method to update the map.
     */
    out.updateClassification = function () {
        console.log('Map updateClassification function not implemented')
        return out
    }

    /**
     * Abstract method.
     * Make/update the map after styling attributes have been changed.
     * For example, if the style (color?) for one legend element has changed, call this method to update the map.
     */
    out.updateStyle = function () {
        console.log('Map updateStyle function not implemented')
        return out
    }

    /**
     * Abstract method.
     * Function which return the legend constructor function for the map.
     */
    out.getLegendConstructor = function () {
        console.log('Map getLegendConstructor function not implemented')
        return Legend.legend
    }

    /**
     * Retrieve the time stamp of the map, even if not specified in the dimension initially.
     * This applies only for stat data retrieved from Eurostat API.
     * This method is useful for example when the data retrieved is the freshest, and one wants to know what this date is, for example to display it in the map title.
     */
    out.getTime = function () {
        return out.statData('default').getTime()
    }

    /**
     * Set some map attributes based on the following URL parameters:
     * "w":width, "h":height, "x":xGeoCenter, "y":yGeoCenter, "z":pixGeoSize, "s":scale, "lvl":nuts level, "time":time,
     * "proj":CRS, "geo":geo territory, "ny":nuts version, "language":langage, "numberOfClasses":class number
     */
    out.setFromURL = function () {
        const opts = getURLParameters()
        if (opts.w) out.width(opts.w)
        if (opts.h) out.height(opts.h)
        if (opts.x && opts.y) out.geoCenter([opts.x, opts.y])
        if (opts.z) out.pixelSize(opts.z)
        if (opts.s) out.scale(opts.s)
        if (opts.lvl) out.nutsLevel(opts.lvl)
        if (opts.time) {
            out.filters_.time = opts.time
            delete out.filters_.lastTimePeriod
        }
        if (opts.proj) out.proj(opts.proj)
        if (opts.geo) out.geo(opts.geo)
        if (opts.ny) out.nutsYear(opts.ny)
        if (opts.language) out.language(opts.language)
        if (opts.numberOfClasses) out.numberOfClasses(+opts.numberOfClasses)
        return out
    }

    /**
     * @function exportMapToSVG
     * @description Exports the current map with styling to SVG and downloads it
     *
     */
    out.exportMapToSVG = function () {
        // Clone the original SVG node to avoid modifying the DOM
        const svgNodeClone = out.svg_.node().cloneNode(true)
        // Add XML namespaces if not already present
        if (!svgNodeClone.hasAttribute('xmlns')) {
            svgNodeClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        }
        if (!svgNodeClone.hasAttribute('xmlns:xlink')) {
            svgNodeClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
        }

        // Temporarily append the clone to the document to compute styles
        document.body.appendChild(svgNodeClone)

        // Convert CSS to inline styles before saving the SVG
        applyInlineStylesFromCSS(svgNodeClone)

        // Remove the cloned SVG from the document after applying styles
        document.body.removeChild(svgNodeClone)

        const svgUrl = getDownloadURL(svgNodeClone)

        // Create a download link and trigger download
        const downloadLink = document.createElement('a')
        downloadLink.href = svgUrl
        downloadLink.download = 'eurostatmap.svg'
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)

        return out
    }

    /**
     * @function exportMapToPNG
     * @description Exports the current map with styling to PNG and downloads it
     *
     */
    out.exportMapToPNG = function (width, height) {
        const svgNodeClone = out.svg_.node().cloneNode(true)
        // Convert CSS to inline styles before saving the SVG
        applyInlineStylesFromCSS(svgNodeClone)

        // Step 1: Serialize the SVG node to a string
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svgNodeClone)

        // Step 2: Create a Blob from the serialized SVG
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })

        // Step 3: Create a URL for the Blob
        const url = URL.createObjectURL(svgBlob)

        // Get the width and height attributes from the SVG
        width = width || svgNodeClone.getAttribute('width')
        height = height || svgNodeClone.getAttribute('height')

        if (!width || !height) {
            throw new Error('SVG width or height attributes are missing or invalid.')
        }

        // Step 4: Create an Image element and load the Blob URL
        const img = new Image()
        img.onload = function () {
            // Step 5: Draw the image on a canvas
            const canvas = document.createElement('canvas')
            canvas.width = parseFloat(width) // Set canvas width from SVG's width attribute
            canvas.height = parseFloat(height) // Set canvas height from SVG's height attribute

            const context = canvas.getContext('2d')
            context.drawImage(img, 0, 0, canvas.width, canvas.height)

            // Step 6: Convert the canvas to a PNG blob
            canvas.toBlob(function (pngBlob) {
                // Step 7: Download the PNG file
                const pngUrl = URL.createObjectURL(pngBlob)
                const downloadLink = document.createElement('a')
                downloadLink.href = pngUrl
                downloadLink.download = 'eurostat-map.png'
                document.body.appendChild(downloadLink)
                downloadLink.click()
                document.body.removeChild(downloadLink)

                // Clean up URLs
                URL.revokeObjectURL(url)
                URL.revokeObjectURL(pngUrl)
            }, 'image/png')
        }

        // Set the image source to the Blob URL
        img.src = url
        return out
    }

    return out
}

/**
 * Retrieve some URL parameters, which could be then reused as map definition parameters.
 * This allow a quick map customisation by simply adding and changing some URL parameters.
 * See map method: setFromURL(...)
 */
export const getURLParameters = function () {
    const ps = {}
    const p = ['w', 'h', 'x', 'y', 'z', 's', 'lvl', 'time', 'proj', 'geo', 'ny', 'language', 'sl', 'numberOfClasses']
    for (let i = 0; i < p.length; i++) ps[p[i]] = getURLParameterByName(p[i])
    return ps
}
