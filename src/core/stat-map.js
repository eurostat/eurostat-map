import { getDownloadURL, executeForAllInsets, applyComputedStylesToSVG, ensureSvgSize } from './utils'
import * as StatisticalData from './stat-data'
import * as Legend from '../legend/legend'
import { select } from 'd3-selection'
import * as tp from '../tooltip/tooltip'
import { hideSpinner, showSpinner } from './decoration/spinner'
import { createMapInstance, updateGeoMapTemplate } from './map-instance'

/**
 * An abstract statistical map: a map template with statistical data,
 * without any particular styling rule. All concrete map types (choropleth,
 * proportional symbol, flow, etc.) are built on top of this.
 *
 * @param {object} config - Initial configuration object. Any getter/setter
 *   defined on the map can be passed here as a key/value pair.
 *   @example { title: 'My map', nutsLevel: 2, legend: { x: 10, y: 90 } }
 * @param {boolean} withCenterPoints - When true, NUTS region centroid points
 *   are added to the map. Required for proportional symbol, pie, coxcomb, etc.
 * @param {string} mapType - Internal map type identifier (e.g. 'choropleth',
 *   'ps', 'coxcomb'). Used for CSS class assignment and inset inheritance.
 * @returns {object} A statMap instance with builder-pattern getter/setters.
 */
export const statMap = function (config, withCenterPoints, mapType) {
    //build stat map from map template
    const out = createMapInstance(config, withCenterPoints, mapType)

    // build-completion latch
    out._geoDone_ = false
    out._statDone_ = false
    out._finalized_ = false

    const tryFinalize = function () {
        if (out._finalized_) return
        if (!out._geoDone_ || !out._statDone_) return
        out._finalized_ = true
        if (out.onBuild()) out.onBuild()(out)
    }

    // render scheduling flag
    let _renderScheduled = false
    out._loadingStatCount_ = 0

    /**
     * Statistical data configuration dictionary.
     * Keys are stat dataset names ('default', 'color', 'size', 'v1', 'v2', 'v3', etc.).
     * The 'default' key is used by single-stat map types (choropleth, ps, etc.).
     *
     * As a getter/setter it behaves as follows:
     *   - `map.stat()` → returns the default stat config
     *   - `map.stat('color')` → returns the stat config for key 'color'
     *   - `map.stat({ eurostatDatasetCode: 'demo_r_d3dens', ... })` → sets default stat config
     *   - `map.stat('color', { eurostatDatasetCode: '...', ... })` → sets stat config for key 'color'
     *
     * @example
     * map.stat({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²', filters: { TIME: '2024' } })
     *
     * @example
     * // bivariate: set two independent datasets
     * map.stat('v1', { eurostatDatasetCode: 'dataset_a' })
     * map.stat('v2', { eurostatDatasetCode: 'dataset_b' })
     */
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

    /**
     * Retrieved statistical data, keyed by stat dataset name.
     * Each value is a StatData instance.
     * Lazily creates a new StatData entry if a key is accessed that doesn't yet exist.
     *
     * - `map.statData()` → returns the default StatData instance
     * - `map.statData('color')` → returns the StatData instance for key 'color'
     * - `map.statData('color', statDataInstance)` → sets StatData for key 'color'
     *
     * Use `.statData().setData({ regionId: value, ... })` to supply custom data
     * directly without fetching from the Eurostat API.
     *
     * @example
     * map.statData().setData({ DE: 120, FR: 95, IT: 88 })
     */
    out.statData_ = {
        default: StatisticalData.statData(),
        color: StatisticalData.statData(),
        size: StatisticalData.statData(),
        v1: StatisticalData.statData(),
        v2: StatisticalData.statData(), //bivariate
        v3: StatisticalData.statData(), //trivariate
    }
    out.statData = function (k, v) {
        if (!arguments.length) return out.statData_['default']

        // lazy create if not exist
        if (arguments.length === 1) {
            if (!out.statData_[k]) out.statData_[k] = StatisticalData.statData()
            return out.statData_[k]
        }

        // setter
        out.statData_[k] = v
        return out
    }

    /**
     * Text shown in the tooltip and legend for regions with no data.
     * @type {string}
     * @default 'No data available'
     * @example map.noDataText('Data not available')
     */
    out.noDataText_ = 'No data available'
    /**
     * BCP 47 language tag used when fetching labels from the Eurostat API.
     * @type {string}
     * @default 'en'
     * @example map.language('fr')
     */
    out.language_ = 'en'
    /**
     * Duration in milliseconds for D3 transitions when the map updates.
     * Set to 0 to disable transitions.
     * @type {number}
     * @default 500
     * @example map.transitionDuration(0)
     */
    out.transitionDuration_ = 500
    //specific tooltip text function
    out.tooltip_.textFunction = undefined
    /**
     * A function that defines SVG filter/pattern definitions used for fill patterns.
     * Receives (svg, numberOfClasses) as arguments.
     * See also: getFillPatternDefinitionFunction() in the public API.
     * @type {function|undefined}
     */
    out.filtersDefinitionFunction_ = undefined
    /**
     * Callback fired once after the map has fully built (geo + stat data both loaded).
     * Receives the map instance as its only argument.
     * @type {function(map: object): void | undefined}
     * @example
     * map.onBuild(m => console.log('Map ready', m))
     */
    out.onBuild_ = undefined
    /**
     * Legend configuration object. Passed to the legend constructor.
     * The available properties depend on the map type's legend.
     * @type {object|undefined}
     * @example
     * map.legend({ x: 10, y: 90, title: 'Density, people/km²' })
     */
    out.legend_ = undefined
    out.legendObj_ = undefined

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;['legend_', 'legendObj_', 'noDataText_', 'language_', 'transitionDuration_', 'tooltipText_', 'filtersDefinitionFunction_', 'onBuild_'].forEach(
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
     * Builds the map from scratch. Should be called once after initial configuration.
     * Triggers geo data retrieval, stat data retrieval, legend build, and tooltip setup.
     * Returns the map instance for chaining.
     *
     * @returns {object} The map instance (builder pattern).
     *
     * @example
     * eurostatmap.map('choropleth')
     *   .stat({ eurostatDatasetCode: 'demo_r_d3dens' })
     *   .legend({ x: 10, y: 90 })
     *   .build()
     */
    out.build = function () {
        // RESET BUILD LIFECYCLE FLAGS
        out._geoDone_ = false
        out._statDone_ = false
        out._finalized_ = false
        _renderScheduled = false

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
            if (!out.tooltip_) out.tooltip_ = { id: out.svgId() }
            out._tooltip = tp.tooltip(out.tooltip_)
        }

        //launch geo data retrieval
        out.updateGeoData()

        //launch stat data retrieval
        out.updateStatData()

        return out
    }

    out.updateLoader = () => {
        if (out.isInset) return

        // 🛠 Ensure wrapper exists (lazy creation)
        if (!out._wrapper_) {
            const svg = out.svg?.()
            if (!svg || svg.empty()) return
            out._wrapper_ = svg.node().parentNode?.classList?.contains('em-map-wrapper') ? svg.node().parentNode : null
        }

        if (!out._wrapper_) return

        if (out._loadingGeo_ || out._loadingStatCount_ > 0) {
            showSpinner(out._wrapper_, 'Loading…')
        } else {
            hideSpinner(out._wrapper_)
        }
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
            out.svg().append('g').attr('id', legend.svgId).attr('class', 'em-legend')
        }

        legend.build()
    }

    /** Check if all stat datasets have been loaded. */
    const isStatDataReady = function () {
        for (const key in out.statData_) {
            const hasConfig = !!out.stat_[key]
            const hasManualData = !!(out.statData_[key] && out.statData_[key].get())

            if (!hasConfig && !hasManualData) continue
            if (!out.statData_[key].isReady()) return false
        }
        return true
    }

    /**
     * Re-fetches geographic data and rebuilds the map geometry.
     * Call this when any geo-related attribute changes (geo, proj, nutsLevel,
     * nutsYear, scale, etc.) after the initial build.
     * @returns {object} The map instance.
     */
    out.updateGeoData = function () {
        out._loadingGeo_ = true
        out.updateLoader()

        updateGeoMapTemplate(() => {
            out._loadingGeo_ = false
            out.updateLoader()

            if (!out.Geometries.isGeoReady()) return

            out._geoDone_ = true

            if (isStatDataReady()) {
                out._statDone_ = true
                out.updateStatValues()
            }

            tryFinalize()
        }, out)

        return out
    }

    /**
     * Re-fetches all configured statistical datasets and refreshes the map.
     * Call this when stat configuration changes after the initial build
     * (e.g. changing filters, dataset code, or CSV URL).
     * For changes to already-loaded data values, use updateStatValues() instead.
     * @returns {object} The map instance.
     */
    out.updateStatData = function () {
        for (let statKey in out.stat_) {
            const config = out.stat(statKey)
            const manualData = out.statData(statKey).get?.()

            if (!config && !manualData) continue

            if (config) {
                const statData = StatisticalData.statData(config)
                out.statData(statKey, statData)

                // detect remote on statData, not config
                const isRemote = !!statData.eurostatDatasetCode_ || !!statData.csvURL_

                if (isRemote) {
                    out._loadingStatCount_++
                    out.updateLoader()
                }

                let nl = out.nutsLevel_
                if (nl === 'mixed') nl = 0

                statData.retrieveFromRemote(nl, out.language(), () => {
                    // bookkeeping MUST always run
                    if (isRemote) {
                        out._loadingStatCount_ = Math.max(0, out._loadingStatCount_ - 1)
                        out.updateLoader()
                    }

                    if (!isStatDataReady()) return

                    out._statDone_ = true
                    if (!out.Geometries.isGeoReady()) return

                    if (_renderScheduled) {
                        // Render already scheduled, but still need to ensure callback fires
                        tryFinalize()
                        return
                    }

                    _renderScheduled = true
                    Promise.resolve().then(() => {
                        _renderScheduled = false
                        out.updateStatValues()
                        tryFinalize()
                    })
                })
            }
        }

        return out
    }

    /**
     * Re-applies classification and styling using the currently loaded stat data.
     * Call this after directly modifying statData values (e.g. via setData())
     * without needing to re-fetch from remote.
     * @returns {object} The map instance.
     */
    out.updateStatValues = function () {
        // filter out centroids without stat data
        if (withCenterPoints) {
            // insets
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, out.refreshCentroids)
            }
            //main map
            out.refreshCentroids(out)
        }

        out.updateClassification()
        out.updateStyle()

        if (out.legend_ && out.legendObj()) out.legendObj().update()

        return out
    }

    out.regionCentroids = function () {
        return out.Geometries.getRegionCentroids(out._pathFunction)
    }

    /**
     * Abstract method — implemented by each concrete map type.
     * Updates the map's data classification (class breaks, thresholds, etc.)
     * without re-fetching data. Call after changing numberOfClasses,
     * classificationMethod, thresholds, or similar attributes.
     * @returns {object} The map instance.
     */
    out.updateClassification = function () {
        console.log('Map updateClassification function not implemented')
        return out
    }

    /**
     * Abstract method — implemented by each concrete map type.
     * Re-applies visual styling (fill colors, symbol sizes, etc.)
     * to already-classified data. Call after changing color schemes,
     * symbol styles, or other purely visual attributes.
     * @returns {object} The map instance.
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
     * Returns the time stamp of the loaded Eurostat dataset.
     * Useful when fetching the most recent available data and wanting to
     * display the actual time period in the map title.
     * Only meaningful for stat data fetched from the Eurostat API.
     *
     * @returns {string|undefined} The time dimension value, e.g. '2021'.
     *
     * @example
     * map.onBuild(() => map.title('Population density ' + map.getTime()))
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
     * Exports the fully rendered map (with computed CSS styles inlined) as an SVG file
     * and triggers a browser download.
     * @returns {object} The map instance.
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

        // inline the actual computed styles
        applyComputedStylesToSVG(svgNodeClone)
        //set explicit width / height / viewBox for reliable export
        ensureSvgSize(svgNodeClone)

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
     * Exports the fully rendered map as a PNG file and triggers a browser download.
     * Renders via an off-screen canvas. Fonts and external resources must be
     * accessible without CORS restrictions for the canvas to remain untainted.
     *
     * @param {number} [width] - Output width in pixels. Defaults to the SVG's current width.
     * @param {number} [height] - Output height in pixels. Defaults to the SVG's current height.
     * @returns {Promise<object>} Resolves to the map instance.
     */
    out.exportMapToPNG = async function (width, height) {
        // Clone original SVG
        const svgNodeClone = out.svg_.node().cloneNode(true)

        // Ensure xml namespaces
        if (!svgNodeClone.hasAttribute('xmlns')) svgNodeClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        if (!svgNodeClone.hasAttribute('xmlns:xlink')) svgNodeClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

        // Append clone so getComputedStyle & fonts resolve correctly
        document.body.appendChild(svgNodeClone)

        // Wait for webfonts (if any) to load
        if (document.fonts && document.fonts.ready) {
            try {
                await document.fonts.ready
            } catch (e) {
                console.warn('document.fonts.ready failed', e)
            }
        }

        // Inline computed styles and set explicit size/viewBox (must run while clone is in DOM)
        applyComputedStylesToSVG(svgNodeClone)
        ensureSvgSize(svgNodeClone)

        // Insert white background rect as first child if none present
        if (!svgNodeClone.querySelector('rect[data-export-background]')) {
            const w = svgNodeClone.getAttribute('width') || svgNodeClone.viewBox.baseVal.width || svgNodeClone.getBoundingClientRect().width
            const h = svgNodeClone.getAttribute('height') || svgNodeClone.viewBox.baseVal.height || svgNodeClone.getBoundingClientRect().height
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            bg.setAttribute('x', 0)
            bg.setAttribute('y', 0)
            bg.setAttribute('width', String(w))
            bg.setAttribute('height', String(h))
            bg.setAttribute('fill', '#ffffff')
            bg.setAttribute('data-export-background', 'true')
            svgNodeClone.insertBefore(bg, svgNodeClone.firstElementChild)
        }

        // Serialize while still in DOM
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svgNodeClone)

        // Remove clone from DOM now
        document.body.removeChild(svgNodeClone)

        // Create blob URL
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)

        // Determine pixel dimensions
        const w = Math.round(width || parseFloat(svgNodeClone.getAttribute('width')) || 800)
        const h = Math.round(height || parseFloat(svgNodeClone.getAttribute('height')) || 600)

        // Create image and set crossOrigin (best-effort)
        const img = new Image()
        img.crossOrigin = 'anonymous'

        // Helper to revoke and cleanup
        const cleanup = (pngUrl) => {
            try {
                URL.revokeObjectURL(url)
            } catch (e) {}
            if (pngUrl) {
                try {
                    URL.revokeObjectURL(pngUrl)
                } catch (e) {}
            }
        }

        img.onload = function () {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext('2d')

                // Fill white background to avoid transparent -> black in some viewers
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, w, h)

                ctx.drawImage(img, 0, 0, w, h)

                canvas.toBlob(function (pngBlob) {
                    if (!pngBlob) {
                        console.error('canvas.toBlob returned null — likely CORS/taint issue.')
                        // open the serialized SVG for debugging
                        const debugWin = window.open()
                        debugWin.document.write('<pre>' + escapeHtml(svgString) + '</pre>')
                        cleanup()
                        return
                    }

                    const pngUrl = URL.createObjectURL(pngBlob)
                    const a = document.createElement('a')
                    a.href = pngUrl
                    a.download = 'eurostat-map.png'
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)

                    cleanup(pngUrl)
                }, 'image/png')
            } catch (err) {
                console.error('Error drawing SVG to canvas:', err)
                // open serialized SVG for debugging
                const debugWin = window.open()
                debugWin.document.write('<pre>' + escapeHtml(svgString) + '</pre>')
                cleanup()
            }
        }

        img.onerror = function (err) {
            console.error('Image failed to load for export. Likely CORS or invalid SVG. Error:', err)
            // open serialized SVG for debugging
            const debugWin = window.open()
            debugWin.document.write('<pre>' + escapeHtml(svgString) + '</pre>')
            cleanup()
        }

        // start loading
        img.src = url

        return out
    }

    // small helper to escape HTML for debug window
    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
