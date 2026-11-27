import { applyComputedStylesToSVG, ensureSvgSize, getDownloadURL } from './utils'

/** The copyright notice of the boundaries the library loads. */
export const BOUNDARY_ATTRIBUTION = 'Administrative boundaries: \u00A9EuroGeographics \u00A9OpenStreetMap'

/** The notice to write on an exported image of a map, or null for none. */
const exportAttribution = function (out) {
    if (out.exportAttribution_ === false) return null
    if (typeof out.exportAttribution_ === 'string') return out.exportAttribution_ || null
    // boundaries the caller supplied carry their own terms
    return out.Geometries?.userGeometries ? null : BOUNDARY_ATTRIBUTION
}

/**
 * On screen the notice shows on hover over "Credits", which an image cannot do: it is written in a line added below
 * the map, in place of "Credits". A map that already names EuroGeographics in its own text is left as it is.
 * @param {SVGSVGElement} svg a clone prepared for export: sized, with a viewBox
 * @param {string|null} notice
 */
const addAttributionLine = function (svg, notice) {
    if (!notice) return
    svg.querySelectorAll('.em-credits').forEach((node) => node.remove())
    const written = Array.from(svg.querySelectorAll('text')).some((node) => node.textContent.includes('EuroGeographics'))
    if (written && notice === BOUNDARY_ATTRIBUTION) return

    const [x, y, width, height] = svg.getAttribute('viewBox').trim().split(/[\s,]+/).map(Number)
    // two lines on a map too narrow for one (about 6px a character at this size)
    const split = notice.length * 6 > width - 10 ? notice.lastIndexOf(' ', Math.ceil(notice.length / 2) + 6) : -1
    const lines = split > 0 ? [notice.slice(0, split), notice.slice(split + 1)] : [notice]
    const lineHeight = 14
    const band = lines.length * lineHeight + 4

    lines.forEach((line, i) => {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('class', 'em-export-attribution')
        text.setAttribute('x', String(x + 5))
        text.setAttribute('y', String(y + height + (i + 1) * lineHeight - 2))
        text.setAttribute('style', 'font: 11px Arial, sans-serif; fill: #555555; stroke: none')
        text.textContent = line
        svg.appendChild(text)
    })
    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height + band}`)
    const shown = Number(svg.getAttribute('height'))
    svg.setAttribute('height', String(Math.round((shown * (height + band)) / height)))
    svg.style.removeProperty('height')
    svg.style.removeProperty('max-height')
}

/**
 * Exports the fully rendered map (with computed CSS styles inlined) as an SVG file
 * and triggers a browser download.
 * @returns {object} The map instance.
 */
export const exportMapToSVG = function (out, filename) {
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
    addAttributionLine(svgNodeClone, exportAttribution(out))

    // Remove the cloned SVG from the document after applying styles
    document.body.removeChild(svgNodeClone)

    const svgUrl = getDownloadURL(svgNodeClone)

    // Create a download link and trigger download
    const downloadLink = document.createElement('a')
    downloadLink.href = svgUrl
    downloadLink.download = filename + '.svg' || 'eurostatmap.svg'
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
 * @param {number} [width] - Output width in pixels. Defaults to HD: see exportSvgToPNG.
 * @param {number} [height] - Output height in pixels. Defaults to the width's proportional height.
 * @returns {Promise<object>} Resolves to the map instance.
 */
export const exportMapToPNG = async function (out, width, height, filename) {
    await exportSvgToPNG(out.svg_.node(), { width, height, filename, attribution: exportAttribution(out) })
    return out
}

const HD_WIDTH = 1920 // smallest default width of an exported PNG, in pixels

/**
 * Renders any SVG element (with its computed CSS styles inlined) to a PNG and triggers a browser download.
 * It works for a composite SVG made of several maps (nested `<svg>` elements, captions, a legend): the element is
 * cloned, so the page is not touched. Fonts and external resources must be accessible without CORS restrictions for
 * the canvas to remain untainted.
 *
 * @param {SVGSVGElement} svgNode - The SVG to render. It has to be in the document, so that its styles resolve.
 * @param {object} [options]
 * @param {number} [options.width] - Output width in pixels. Defaults to the SVG's width times `scale` (or, with only
 * `height` given, to the proportional width).
 * @param {number} [options.height] - Output height in pixels, likewise.
 * @param {number} [options.scale] - Pixel density multiplier when width/height are not given. By default the PNG is HD:
 * twice the SVG's size, and at least 1920 px wide.
 * @param {string} [options.filename='eurostat-map'] - File name, without extension.
 * @param {string} [options.background='#ffffff'] - Background colour behind the SVG (PNG is otherwise transparent).
 * @param {string} [options.attribution] - A notice to write in a line below the picture.
 * @returns {Promise<Blob>} Resolves to the PNG once the download has started.
 */
export const exportSvgToPNG = async function (svgNode, options = {}) {
    const { width, height, scale, filename = 'eurostat-map', background = '#ffffff' } = options

    // Clone original SVG
    const svgNodeClone = svgNode.cloneNode(true)

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
    addAttributionLine(svgNodeClone, options.attribution)

    // Insert a background rect as first child if none present
    const svgWidth =
        parseFloat(svgNodeClone.getAttribute('width')) || svgNodeClone.viewBox.baseVal.width || svgNodeClone.getBoundingClientRect().width
    const svgHeight =
        parseFloat(svgNodeClone.getAttribute('height')) || svgNodeClone.viewBox.baseVal.height || svgNodeClone.getBoundingClientRect().height
    if (!svgNodeClone.querySelector('rect[data-export-background]')) {
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        bg.setAttribute('x', 0)
        bg.setAttribute('y', 0)
        bg.setAttribute('width', String(svgWidth))
        bg.setAttribute('height', String(svgHeight))
        bg.setAttribute('fill', background)
        bg.setAttribute('data-export-background', 'true')
        svgNodeClone.insertBefore(bg, svgNodeClone.firstElementChild)
    }

    // Determine pixel dimensions: HD unless a size or scale was asked for, keeping the SVG's proportions
    const sourceWidth = svgWidth || 800
    const sourceHeight = svgHeight || 600
    const factor = width ? width / sourceWidth : height ? height / sourceHeight : (scale ?? Math.max(2, HD_WIDTH / sourceWidth))
    const w = Math.round(width || sourceWidth * factor)
    const h = Math.round(height || sourceHeight * factor)

    // Give the image that size itself, so the browser draws the vectors at full resolution instead of enlarging a smaller picture
    svgNodeClone.setAttribute('width', String(w))
    svgNodeClone.setAttribute('height', String(h))
    for (const property of ['width', 'height', 'max-width', 'max-height']) svgNodeClone.style.removeProperty(property)

    // Serialize while still in DOM, then remove the clone
    const svgString = new XMLSerializer().serializeToString(svgNodeClone)
    document.body.removeChild(svgNodeClone)

    const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }))
    let pngUrl
    try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = () => reject(new Error('The SVG could not be loaded for export (invalid SVG or blocked external resource).'))
            img.src = url
        })

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        // Fill the background to avoid transparent -> black in some viewers
        ctx.fillStyle = background
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)

        const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
        if (!pngBlob) throw new Error('canvas.toBlob returned null: the canvas is probably tainted by a cross-origin resource, or too large.')

        pngUrl = URL.createObjectURL(pngBlob)
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = filename + '.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        return pngBlob
    } finally {
        URL.revokeObjectURL(url)
        if (pngUrl) setTimeout(() => URL.revokeObjectURL(pngUrl), 10000) // after the download has started
    }
}
