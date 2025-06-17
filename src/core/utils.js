// e.g. to be used with deprecated .style() functions. They will now update CSS classes.
export function updateCSSRule(selector, property, value) {
    // Validate the selector
    if (!selector.startsWith('.') && !selector.startsWith('#')) {
        throw new Error('Invalid selector: Must start with "." for classes or "#" for IDs.')
    }

    // Check if the rule already exists in any stylesheet
    const styleSheets = Array.from(document.styleSheets)
    for (const styleSheet of styleSheets) {
        try {
            const rules = styleSheet.cssRules || styleSheet.rules
            for (const rule of rules) {
                if (rule.selectorText === selector) {
                    // Update the property if the rule exists
                    rule.style[property] = value
                    return
                }
            }
        } catch (e) {
            // Some stylesheets (e.g., cross-origin) may not be accessible
            console.warn(`Could not access rules in stylesheet:`, e)
        }
    }

    // If the rule doesn't exist, create a new stylesheet and add it
    let customSheet = document.getElementById('custom-styles')
    if (!customSheet) {
        customSheet = document.createElement('style')
        customSheet.id = 'custom-styles'
        document.head.appendChild(customSheet)
    }

    // Add the new rule to the custom stylesheet
    try {
        customSheet.sheet.insertRule(`${selector} { ${property}: ${value}; }`, customSheet.sheet.cssRules.length)
    } catch (e) {
        console.error(`Failed to insert rule: ${selector} { ${property}: ${value}; }`, e)
    }
}

export const getFontSizeFromClass = function (className) {
    // Create a temporary element with the specified class
    const tempElement = document.createElement('div')
    tempElement.className = className

    // Apply inline styles to minimize layout interference
    tempElement.style.position = 'absolute'
    tempElement.style.visibility = 'hidden'
    tempElement.style.height = 'auto'
    tempElement.style.width = 'auto'
    tempElement.style.lineHeight = 'normal'
    tempElement.style.fontSize = 'initial'

    // Append directly to the body
    document.body.appendChild(tempElement)

    // Get the computed font-size property and parse it to a number
    const fontSize = parseFloat(window.getComputedStyle(tempElement).fontSize)

    // Remove the temporary element from the document body
    document.body.removeChild(tempElement)

    return fontSize || 0
}

export const getCSSPropertyFromClass = function (className, propertyName) {
    // Create a temporary element with the specified class
    const tempElement = document.createElement('div')
    tempElement.className = className

    // Apply inline styles to minimize layout interference
    tempElement.style.position = 'absolute'
    tempElement.style.visibility = 'hidden'
    tempElement.style.height = 'auto'
    //tempElement.style.width = 'auto'
    tempElement.style.lineHeight = 'normal'

    // Append directly to the body
    document.body.appendChild(tempElement)

    // Get the computed value of the specified property
    const propertyValue = window.getComputedStyle(tempElement).getPropertyValue(propertyName)

    // Remove the temporary element from the document body
    document.body.removeChild(tempElement)

    return propertyValue || null
}

// Helper function to get all CSS rules defined in the document
function getAllCSSRules() {
    let cssRules = []
    for (let sheet of document.styleSheets) {
        try {
            // Some stylesheets may not be accessible due to CORS, so we catch any errors
            for (let rule of sheet.cssRules) {
                cssRules.push(rule)
            }
        } catch (e) {
            console.warn('Unable to access stylesheet:', sheet.href, e)
        }
    }
    return cssRules
}

// Helper function to get explicitly defined styles from CSS for an element
function getStylesFromCSS(element) {
    let matchedRules = []
    const cssRules = getAllCSSRules()

    cssRules.forEach((rule) => {
        if (element.matches(rule.selectorText)) {
            matchedRules.push(rule.style)
        }
    })

    // Create an object of the explicitly set styles
    let explicitStyles = {}
    matchedRules.forEach((style) => {
        for (let i = 0; i < style.length; i++) {
            const property = style[i]
            explicitStyles[property] = style.getPropertyValue(property)
        }
    })

    return explicitStyles
}

// Helper function to apply inline styles explicitly set in CSS. Useful for exporting SVGs with CSS styles.
export const applyInlineStylesFromCSS = (svgElement) => {
    const allElements = svgElement.querySelectorAll('*')

    allElements.forEach((element) => {
        const cssStyles = getStylesFromCSS(element)

        // Apply each explicitly defined CSS style as an inline style
        Object.keys(cssStyles).forEach((property) => {
            const value = cssStyles[property]

            // Check if the property already has an inline style
            const existingInlineStyle = element.style.getPropertyValue(property)

            if (!existingInlineStyle && value) {
                // If no existing inline style, set the new style
                element.style.setProperty(property, value)
            }
        })
    })
}

/**
 * Return a GeoJSON feature representing a bounding box, with multipoint geometry.
 * This bounding box is an array like the one in topojson bbox element.
 * [xmin,ymin,xmax,ymax]
 * This is useful for to call d3.fitSize([w, h], getTopoJSONExtentAsGeoJSON(topo.bbox)))
 *
 * @param {*} bb The bounding box [xmin,ymin,xmax,ymax]. For topojson data, just give the topojson.bbox element.
 */
export const getBBOXAsGeoJSON = function (bb) {
    return {
        type: 'Feature',
        geometry: {
            type: 'MultiPoint',
            coordinates: [
                [bb[0], bb[1]],
                [bb[2], bb[3]],
            ],
        },
    }
}

// indexing

/**
 * Index JSONStat stat values by 'geo' code.
 * Return a structure like: {geo:{value:0,status:""}}
 *
 * @param {*} jsData The JSONStat data to index
 */
export const jsonstatToIndex = function (jsData) {
    const ind = {}
    const geos = jsData.Dimension('geo').id
    for (let i = 0; i < geos.length; i++) ind[geos[i]] = jsData.Data(i)
    return ind
}

/**
 * Index CSV stat values by 'geo' code.
 * Return a structure like: {geo:{value:0,status:""}}
 *
 * @param {*} csvData The CSV data to index
 * @param {*} geoCol The name of the geo column in the CSV data
 * @param {*} valueCol The name of the statistical value column in the CSV file.
 */
export const csvToIndex = function (csvData, geoCol, valueCol) {
    const ind = {}
    for (let i = 0; i < csvData.length; i++) {
        const d = csvData[i]
        const v = d[valueCol]
        if (!v) {
            ind[d[geoCol]] = { value: ':', status: '' }
        } else {
            ind[d[geoCol]] = { value: isNaN(+v) ? v : +v, status: '' }
        }
    }
    return ind
}

/**
 * @description returns string with space as thousand separator
 * @function spaceAsThousandSeparator
 * @param {number} number
 */
export const spaceAsThousandSeparator = function (number) {
    return number.toLocaleString('en').replace(/,/gi, ' ')
}

//REST API
export const getEstatRestDataURLBase = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/' //the different dataswag endpoints are appended to this base URL

// This function builds a URL to fetch data from the Eurobase REST API.

/**
 * Build URL to fetch data from eurobase REST API.
 * @param {string} datasetCode The Eurobase dataset code
 * @param {object=} filters The filter parameters as for example: {key:value,key:[value1,value2,value3]}
 * @param {number=} lang
 * @param {number=} format
 * @param {number=} version
 */
export const getEstatDataURL = function (datasetCode, filters, lang, format) {
    lang = lang || 'en'
    format = format || 'json'
    var url = []
    url.push(getEstatRestDataURLBase, datasetCode, '?', 'format=', format, '&lang=', lang)
    if (filters)
        for (var param in filters) {
            var o = filters[param]
            if (Array.isArray(o)) for (var i = 0; i < o.length; i++) url.push('&', param, '=', o[i])
            else url.push('&', param, '=', o)
        }
    return url.join('')
}

/**
 * @param {string} name
 * @returns {string}
 */
export const getURLParameterByName = function (name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]')
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
        results = regex.exec(location.search)
    return !results ? null : decodeURIComponent(results[1].replace(/\+/g, ' '))
}

//flags
export const flags = {
    b: 'break in time series',
    c: 'confidential',
    d: 'definition differs, see metadata',
    e: 'estimated',
    f: 'forecast',
    n: 'not significant',
    p: 'provisional',
    r: 'revised',
    s: 'Eurostat estimate',
    u: 'low reliability',
    z: 'not applicable',
}

/**
 * @description Executes a function for all inset maps. Some insets might be external SVGs which is why this function was created.
 * @param {*} insets map.insets
 * @param {*} mainSvgId the ID of the map's svg
 * @param {*} callback the function to execute for each inset
 * @param {*} [parameter=null] the parameter to pass to the callback
 * @param {*} [parameter2=null] the parameter to pass to the callback
 */
export const executeForAllInsets = function (insets, mainSvgId, callback, parameter = null, parameter2 = null) {
    for (const geo in insets) {
        const insetGroup = insets[geo]

        if (Array.isArray(insetGroup)) {
            insetGroup.forEach((inset) => {
                // Handle nested arrays for multiple insets with the same geo
                if (Array.isArray(inset)) {
                    inset.forEach((nestedInset) => {
                        if (nestedInset.svgId_ !== mainSvgId) {
                            callback(nestedInset, parameter, parameter2)
                        }
                    })
                } else {
                    if (inset.svgId_ !== mainSvgId) {
                        callback(inset, parameter, parameter2)
                    }
                }
            })
        } else {
            // Apply callback to unique inset
            if (insetGroup.svgId_ !== mainSvgId) {
                callback(insetGroup, parameter, parameter2)
            }
        }
    }
}

export const upperCaseFirstLetter = (string) => `${string.slice(0, 1).toUpperCase()}${string.slice(1)}`

export const lowerCaseAllWordsExceptFirstLetters = (string) =>
    string.replaceAll(/\S*/g, (word) => `${word.slice(0, 1)}${word.slice(1).toLowerCase()}`)

export function getDownloadURL(svgNode) {
    // Create XML header to ensure the SVG is recognized properly
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'

    // create blob
    const svgContent = xmlHeader + svgNode.outerHTML
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    return svgUrl
}

// Rasterize function with additional error handling
export function serialize(svg) {
    const xmlns = 'http://www.w3.org/2000/xmlns/'
    const xlinkns = 'http://www.w3.org/1999/xlink'
    const svgns = 'http://www.w3.org/2000/svg'
    const fragment = window.location.href + '#'
    const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT, null, false)
    while (walker.nextNode()) {
        for (const attr of walker.currentNode.attributes) {
            if (attr.value.includes(fragment)) {
                attr.value = attr.value.replace(fragment, '#')
            }
        }
    }
    svg.setAttributeNS(xmlns, 'xmlns', svgns)
    svg.setAttributeNS(xmlns, 'xmlns:xlink', xlinkns)
    const serializer = new window.XMLSerializer()
    const string = serializer.serializeToString(svg)
    return new Blob([string], { type: 'image/svg+xml' })
}

// adapted from https://observablehq.com/@mbostock/saving-sv
//svg to canvas blob promise
export function rasterize(svg) {
    let resolve, reject
    const promise = new Promise((y, n) => ((resolve = y), (reject = n)))
    const image = new Image()
    image.onerror = reject
    image.onload = () => {
        const rect = svg.getBoundingClientRect()
        const canvas = document.createElement('canvas')
        canvas.width = rect.width
        canvas.height = rect.height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, rect.width, rect.height)
        context.canvas.toBlob(resolve)
    }
    image.src = URL.createObjectURL(serialize(svg))
    return promise
}

/**
 * Get a URL parameter by name.
 *
 * @param {string} name
 * @returns {string | null}
 */
export function getParameterByName(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]')
    let regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
        results = regex.exec(location.search)
    return !results ? null : decodeURIComponent(results[1].replace(/\+/g, ' '))
}

export const hexToRgb = (hex) => {
    hex = hex.replace('#', '')
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((h) => h + h)
            .join('')
    }
    const int = parseInt(hex, 16)
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

//blends two colors using 'multiply' blending mode. Returns the blended color as an RGB string
export const multiplyBlendMultipleHex = (colors) => {
    // Convert hex color to RGB
    const hexToRgb = (hex) => {
        hex = hex.replace('#', '')
        if (hex.length === 3) {
            hex = hex
                .split('')
                .map((h) => h + h)
                .join('')
        }
        const int = parseInt(hex, 16)
        return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
    }

    // Convert RGB to hex
    const rgbToHex = ([r, g, b]) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`

    // Convert all hex colors to RGB arrays
    const rgbColors = colors.map(hexToRgb)

    // Initialize the result with the first color
    let blended = [...rgbColors[0]]

    // Sequentially multiply each color with the result
    for (let i = 1; i < rgbColors.length; i++) {
        blended = blended.map((v, idx) => Math.round((v / 255) * (rgbColors[i][idx] / 255) * 255))
    }

    // Return the blended color as a hex code
    return rgbToHex(blended)
}

// convert rect attributes into an SVG path string
// used for workaround whereby clipPaths which use rect elements do not work in adobe illustrator
export const convertRectanglesToPaths = function (x, y, width, height) {
    var x = parseFloat(x, 10)
    var y = parseFloat(y, 10)
    var width = parseFloat(width, 10)
    var height = parseFloat(height, 10)

    if (x < 0 || y < 0 || width < 0 || height < 0) {
        return ''
    }

    return 'M' + x + ',' + y + 'L' + (x + width) + ',' + y + ' ' + (x + width) + ',' + (y + height) + ' ' + x + ',' + (y + height) + 'z'
}

export const getTextColorForBackground = function (backgroundColor) {
    let r, g, b

    // Create a temporary element to handle named colors
    if (!backgroundColor.startsWith('rgb') && !backgroundColor.startsWith('#')) {
        const tempDiv = document.createElement('div')
        tempDiv.style.color = backgroundColor
        document.body.appendChild(tempDiv)
        const computedColor = window.getComputedStyle(tempDiv).color
        document.body.removeChild(tempDiv)
        backgroundColor = computedColor // Convert named color to RGB
    }

    // Handle hex colors like '#FFFFFF' or '#FFF'
    if (backgroundColor.startsWith('#')) {
        let hex = backgroundColor.replace('#', '')
        if (hex.length === 3) {
            hex = hex
                .split('')
                .map((c) => c + c)
                .join('')
        }
        r = parseInt(hex.substring(0, 2), 16)
        g = parseInt(hex.substring(2, 4), 16)
        b = parseInt(hex.substring(4, 6), 16)
    }
    // Handle RGB colors like 'rgb(255,255,255)'
    else {
        const rgb = backgroundColor.match(/\d+/g)
        r = parseInt(rgb[0])
        g = parseInt(rgb[1])
        b = parseInt(rgb[2])
    }

    // Calculate luminance
    const luminance = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? 'black' : 'white'
}

// get css selector. Different maps have different selectors for their regions.
export const getRegionsSelector = (map) => {
    if (map.Geometries.userGeometries) return '#em-user-regions path'
    if (map.gridCartogram_) return '#em-grid-container .em-grid-cell'
    if (map.geo_ === 'WORLD') return '#em-worldrg path'
    return '#em-nutsrg path:not(#em-cntrg-RS):not(#em-cntrg-EL), #em-cntrg path:not(#em-cntrg-RS):not(#em-cntrg-EL)'
}

// get css selector for legend mouse hover. Different maps have different selectors for their regions
export const getLegendRegionsSelector = (map) => {
    if (map.Geometries.userGeometries) return '#em-user-regions'
    if (map.gridCartogram_) return '#em-grid-container'
    if (map.geo_ === 'WORLD') return '#em-worldrg'
    return '#em-nutsrg, #em-cntrg'
}

// Helper function to calculate current view as bbox
export const getCurrentBbox = function (map) {
    const halfWidth = 0.5 * map.position_.z * map.width_
    const halfHeight = 0.5 * map.position_.z * map.height_
    const bbox = [map.position_.x - halfWidth, map.position_.y - halfHeight, map.position_.x + halfWidth, map.position_.y + halfHeight]
    return bbox
}
