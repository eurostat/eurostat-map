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
                a.download = filename + '.png' || 'eurostat-map.png'
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
