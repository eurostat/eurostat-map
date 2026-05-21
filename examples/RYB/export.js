const SVG_NS = 'http://www.w3.org/2000/svg'

function addSVGNamespaces(svg) {
    if (!svg.hasAttribute('xmlns')) {
        svg.setAttribute('xmlns', SVG_NS)
    }

    if (!svg.hasAttribute('xmlns:xlink')) {
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    }
}

function numberAttr(el, name, fallback = 0) {
    const value = parseFloat(el.getAttribute(name))
    return Number.isFinite(value) ? value : fallback
}

function flattenForeignObjectSVGs(svgNode) {
    svgNode.querySelectorAll('foreignObject').forEach((foreignObject) => {
        const innerSvg = foreignObject.querySelector('svg')
        if (!innerSvg) return

        const g = document.createElementNS(SVG_NS, 'g')

        const x = numberAttr(foreignObject, 'x')
        const y = numberAttr(foreignObject, 'y')
        const foreignTransform = foreignObject.getAttribute('transform')

        const transforms = []

        if (x || y) {
            transforms.push(`translate(${x},${y})`)
        }

        if (foreignTransform) {
            transforms.push(foreignTransform)
        }

        const innerX = numberAttr(innerSvg, 'x')
        const innerY = numberAttr(innerSvg, 'y')

        if (innerX || innerY) {
            transforms.push(`translate(${innerX},${innerY})`)
        }

        if (transforms.length) {
            g.setAttribute('transform', transforms.join(' '))
        }

        Array.from(innerSvg.children).forEach((child) => {
            g.appendChild(child.cloneNode(true))
        })

        foreignObject.replaceWith(g)
    })
}

function setSVGBoxFromContent(svg, padding = 4) {
    const bb = svg.getBBox()

    const x = bb.x - padding
    const y = bb.y - padding
    const width = bb.width + padding * 2
    const height = bb.height + padding * 2

    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`)
    svg.setAttribute('width', Math.ceil(width))
    svg.setAttribute('height', Math.ceil(height))
}

function serializeSVG(svgNode) {
    const serializer = new XMLSerializer()

    let svgContent = serializer.serializeToString(svgNode)

    svgContent = svgContent
        .replace(/&nbsp;/g, '&#160;')
        .replace(/&copy;/g, '&#169;')
        .replace(/&reg;/g, '&#174;')
        .replace(/&times;/g, '&#215;')
        .replace(/&deg;/g, '&#176;')

    return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgContent
}

function downloadTextFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
}

const exportToSVG = function (svg, filename = 'eurostatmap-legend.svg') {
    if (!svg) return null

    const svgNodeClone = svg.cloneNode(true)

    addSVGNamespaces(svgNodeClone)

    // Use a wrapper for off-screen measurement.
    // Do NOT put off-screen styles directly on the SVG,
    // because they get serialized into the exported file.
    const exportHost = document.createElement('div')
    exportHost.style.position = 'absolute'
    exportHost.style.left = '-10000px'
    exportHost.style.top = '-10000px'
    exportHost.style.width = '0'
    exportHost.style.height = '0'
    exportHost.style.overflow = 'hidden'
    exportHost.style.visibility = 'visible'

    document.body.appendChild(exportHost)
    exportHost.appendChild(svgNodeClone)

    applyComputedStylesToSVG(svgNodeClone)

    // Flatten the ternary legend's foreignObject content.
    flattenForeignObjectSVGs(svgNodeClone)

    // Remove page-only export/positioning styles.
    cleanSVGForStandaloneExport(svgNodeClone)

    // Now crop around actual visible content.
    setSVGBoxFromContent(svgNodeClone, 6)

    document.body.removeChild(exportHost)

    const svgContent = serializeSVG(svgNodeClone)

    downloadTextFile(svgContent, filename, 'image/svg+xml;charset=utf-8')

    return svg
}

function forceVisibleForExport(svg) {
    svg.style.removeProperty('visibility')
    svg.setAttribute('visibility', 'visible')

    svg.querySelectorAll('*').forEach((el) => {
        el.style.removeProperty('visibility')
        el.removeAttribute('visibility')
    })
}

function applyComputedStylesToSVG(svg) {
    if (!svg || !(svg instanceof SVGElement)) return

    const PAINT_PROPS = new Set([
        'fill',
        'fill-opacity',
        'fill-rule',
        'stroke',
        'stroke-width',
        'stroke-opacity',
        'stroke-linecap',
        'stroke-linejoin',
        'stroke-dasharray',
        'stroke-dashoffset',
    ])

    const PROPS = [
        // painting (includes PAINT_PROPS)
        ...Array.from(PAINT_PROPS),
        // geometry / alignment
        'vector-effect',
        'shape-rendering',
        'text-anchor',
        'dominant-baseline',
        // text
        'font-family',
        'font-size',
        'font-style',
        'font-weight',
        'letter-spacing',
        'word-spacing',
        'line-height',
        // layout / visibility
        'opacity',
        'display',
        'mix-blend-mode',
        // filters, marker, etc
        'filter',
        'marker-start',
        'marker-mid',
        'marker-end',
        'transform',
    ]

    function inlineComputedStyle(el) {
        const cs = window.getComputedStyle(el)

        PROPS.forEach((p) => {
            try {
                if (p === 'transform' && el === svg) return

                const v = cs.getPropertyValue(p)

                if (!v || v === '' || v === 'initial') return
                if (v === 'none' && !PAINT_PROPS.has(p)) return
                if (v === '0px' && p !== 'stroke-width') return

                if (!el.style.getPropertyValue(p)) {
                    el.style.setProperty(p, v)
                }
            } catch (e) {
                // ignore properties that error for this element
            }
        })

        // for text elements ensure font-size is captured if computed
        if (el.tagName && el.tagName.toLowerCase() === 'text') {
            const fs = cs.getPropertyValue('font-size')
            if (fs && !el.style.getPropertyValue('font-size')) el.style.setProperty('font-size', fs)
        }
    }

    inlineComputedStyle(svg)
    svg.querySelectorAll('*').forEach((el) => inlineComputedStyle(el))
}
function ensureSvgSize(svg) {
    const rect = svg.getBoundingClientRect()
    // Use integer pixel width/height
    const w = Math.round(rect.width) || parseInt(svg.getAttribute('width')) || 800
    const h = Math.round(rect.height) || parseInt(svg.getAttribute('height')) || 600

    // If svg already has viewBox, preserve it; else set viewBox to current content box
    if (!svg.hasAttribute('viewBox')) {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    }
    svg.setAttribute('width', w)
    svg.setAttribute('height', h)
}

function cleanSVGForStandaloneExport(svg) {
    // Remove only root page/layout positioning.
    svg.removeAttribute('transform')
    svg.removeAttribute('visibility')

    svg.style.removeProperty('position')
    svg.style.removeProperty('left')
    svg.style.removeProperty('right')
    svg.style.removeProperty('top')
    svg.style.removeProperty('bottom')
    svg.style.removeProperty('transform')
    svg.style.removeProperty('translate')
    svg.style.removeProperty('visibility')
    svg.style.removeProperty('pointer-events')

    // Do NOT remove child transforms.
    // These may be intentional, e.g.
    // #em-ternary-axis-title-1 { transform: translate(0px, 6px); }
    svg.querySelectorAll('*').forEach((el) => {
        el.style.removeProperty('visibility')
        el.removeAttribute('visibility')
    })
}
