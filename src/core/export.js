import { applyComputedStylesToSVG, ensureSvgSize, getDownloadURL } from './utils'

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
 * @param {number} [width] - Output width in pixels. Defaults to the SVG's current width.
 * @param {number} [height] - Output height in pixels. Defaults to the SVG's current height.
 * @returns {Promise<object>} Resolves to the map instance.
 */
export const exportMapToPNG = async function (out, width, height, filename) {
    await exportSvgToPNG(out.svg_.node(), { width, height, filename })
    return out
}

/**
 * Renders any SVG element (with its computed CSS styles inlined) to a PNG and triggers a browser download.
 * It works for a composite SVG made of several maps (nested `<svg>` elements, captions, a legend): the element is
 * cloned, so the page is not touched. Fonts and external resources must be accessible without CORS restrictions for
 * the canvas to remain untainted.
 *
 * @param {SVGSVGElement} svgNode - The SVG to render. It has to be in the document, so that its styles resolve.
 * @param {object} [options]
 * @param {number} [options.width] - Output width in pixels. Defaults to the SVG's width times `scale`.
 * @param {number} [options.height] - Output height in pixels. Defaults to the SVG's height times `scale`.
 * @param {number} [options.scale=1] - Pixel density multiplier (2 doubles the resolution) when width/height are not given.
 * @param {string} [options.filename='eurostat-map'] - File name, without extension.
 * @param {string} [options.background='#ffffff'] - Background colour behind the SVG (PNG is otherwise transparent).
 * @returns {Promise<Blob>} Resolves to the PNG once the download has started.
 */
export const exportSvgToPNG = async function (svgNode, options = {}) {
    const { width, height, scale = 1, filename = 'eurostat-map', background = '#ffffff' } = options

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

    // Serialize while still in DOM, then remove the clone
    const svgString = new XMLSerializer().serializeToString(svgNodeClone)
    document.body.removeChild(svgNodeClone)

    // Determine pixel dimensions
    const w = Math.round(width || (svgWidth || 800) * scale)
    const h = Math.round(height || (svgHeight || 600) * scale)

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
