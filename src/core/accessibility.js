// What a map offers to people who use a keyboard or a screen reader, or who ask for less motion.

const MAP_HINT = 'Map regions. Use the arrow keys to move between regions, Page Up and Page Down to change country, and Escape to leave.'
const FLOW_HINT = 'Flows. Use the arrow keys to move between places and flows, Page Up and Page Down to switch between the two, and Escape to leave.'
const LEGEND_HINT = 'Use the arrow keys to highlight each item on the map, and Escape to leave.'

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Titles may carry markup (<tspan>...): the accessible name is its text. */
const plainText = (html) => {
    if (!html) return ''
    const element = document.createElement('template')
    element.innerHTML = String(html)
    return element.content.textContent.replace(/\s+/g, ' ').trim()
}

/**
 * Names the map's svg for assistive technology: aria-label (map.ariaLabel(), else the title and subtitle) and a
 * <desc> from map.ariaDescription(). Attributes the page put on its own svg are left alone.
 * @param {*} map
 */
export const applyMapAccessibility = function (map) {
    if (map.isInset) return
    const node = map.svg_?.node()
    if (!node) return

    // data-em-a11y marks the attributes as the library's, so a later build (or another map in the same svg) may update them
    const ours = node.hasAttribute('data-em-a11y')
    if (ours || (!node.hasAttribute('role') && !node.hasAttribute('aria-label') && !node.hasAttribute('aria-labelledby'))) {
        const name = map.ariaLabel_ || [plainText(map.title_), plainText(map.subtitle_)].filter(Boolean).join('. ') || 'Statistical map'
        node.setAttribute('data-em-a11y', '')
        node.setAttribute('role', 'group')
        node.setAttribute('aria-roledescription', 'map')
        node.setAttribute('aria-label', name)
    }

    node.querySelector(':scope > desc.em-description')?.remove()
    if (map.ariaDescription_) {
        // <desc>, not <title>: browsers show an svg <title> as a tooltip over the whole map
        const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc')
        desc.setAttribute('class', 'em-description')
        desc.textContent = map.ariaDescription_
        node.insertBefore(desc, node.firstChild)
    }
}

/**
 * Makes an svg group that handles clicks usable from the keyboard.
 * @param {*} selection d3 selection of the button group
 * @param {string} label
 */
export const makeButtonAccessible = function (selection, label) {
    selection
        .attr('role', 'button')
        .attr('tabindex', 0)
        .attr('aria-label', label)
        .on('keydown.em-a11y', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            event.stopPropagation()
            this.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        })
}

const hasListener = (element, ...types) => !!element.__on?.some((listener) => types.includes(listener.type) && listener.value)
const hasHoverHandler = (element) => hasListener(element, 'mouseover', 'mouseenter')

const isShown = (element) => {
    if (element.checkVisibility && !element.checkVisibility()) return false
    const box = element.getBoundingClientRect()
    return box.width > 0 || box.height > 0
}

/** The elements of the map that show a tooltip for a region, one per region (its symbol rather than its area), in id order. */
const regionTargets = (drawing) => {
    const byId = new Map()
    drawing.querySelectorAll('path, g.em-centroid, .em-grid-cell, .em-grid-shape').forEach((element) => {
        const id = element.__data__?.properties?.id
        if (id === undefined || !hasHoverHandler(element) || !isShown(element)) return
        if (!byId.has(id) || element.tagName.toLowerCase() === 'g') byId.set(id, element)
    })
    return [...byId.keys()].sort().map((id) => {
        const element = byId.get(id)
        // NUTS ids start with the country code: Page Up and Page Down jump from country to country
        return { key: String(id), group: String(id).slice(0, 2), element, name: element.__data__.properties.na || String(id) }
    })
}

/** A flow map's places (one per node symbol), then its flows from the largest to the smallest. */
const flowTargets = (drawing) => {
    const places = new Map()
    const flows = []
    drawing.querySelectorAll('.em-flow-container *').forEach((element) => {
        if (!hasHoverHandler(element) || !isShown(element)) return
        if (element.matches('.em-flow-link, .em-flow-link-bundled')) {
            flows.push({ element, value: +element.getAttribute('data-nb') || 0 })
        } else {
            // a donut is several arcs in one group
            const symbol = element.parentNode.matches('g[class*="donut"]') ? element.parentNode : element
            if (!places.has(symbol)) places.set(symbol, element)
        }
    })
    flows.sort((a, b) => b.value - a.value)
    return [
        ...[...places.values()].map((element, i) => ({ key: 'place' + i, group: 'places', element, name: 'Place ' + (i + 1) })),
        ...flows.map(({ element }, i) => ({ key: 'flow' + i, group: 'flows', element, name: 'Flow ' + (i + 1) })),
    ]
}

/**
 * The text a swatch stands for: its row's own text, else the labels level with it (the two bounds of a threshold
 * legend, written at its edges).
 */
const swatchName = (element, legend) => {
    if (element.__emName) return element.__emName // set by a legend whose items carry no text (the bivariate square)
    const own = element.textContent?.trim()
    if (own) return own.replace(/\s+/g, ' ')
    const row = element.parentNode
    if (row !== legend && row.querySelectorAll('rect').length === 1 && row.querySelector('text')) return row.textContent.trim()
    const box = element.getBoundingClientRect()
    const slack = 3
    const horizontal = element.parentNode.querySelectorAll('rect').length > 1 && sideBySide(element.parentNode)
    return [...legend.querySelectorAll('text.em-legend-label')]
        .filter((label) => {
            const b = label.getBoundingClientRect()
            const centre = horizontal ? b.left + b.width / 2 : b.top + b.height / 2
            return horizontal ? centre >= box.left - slack && centre <= box.right + slack : centre >= box.top - slack && centre <= box.bottom + slack
        })
        .map((label) => label.textContent.trim())
        .join(' to ')
}

const sideBySide = (group) => {
    const [a, b] = group.querySelectorAll('rect')
    return Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 1
}

/** A legend's hoverable items, in drawing order. A swatch and the label that does the same thing count once. */
const legendTargets = (legend) => {
    const hoverable = [...legend.querySelectorAll('*')].filter((element) => hasListener(element, 'mouseover', 'mouseenter', 'mousemove') && !element.hasAttribute('tabindex') && isShown(element))
    const targets = []
    hoverable.forEach((element) => {
        if (element.tagName === 'text' && hoverable.some((other) => other !== element && other.tagName !== 'text' && other.parentNode === element.parentNode)) return
        if (!hasHoverHandler(element)) {
            // a colour bar reads the pointer's position: offer evenly spaced points along it
            for (let i = 0; i <= 10; i++) targets.push({ element, at: i / 10, name: '' })
        } else {
            targets.push({ element, name: element.tagName === 'text' ? element.textContent.trim() : swatchName(element, legend) })
        }
    })
    return targets.map((target, i) => ({ ...target, key: 'item' + i, group: 'items', name: target.name || `Item ${i + 1} of ${targets.length}` }))
}

/** Runs an element's own mouse handlers, with the pointer at its centre (or at a fraction of its longer side). */
const mouseEvent = (element, type, at) => {
    const box = element.getBoundingClientRect()
    let x = box.left + box.width / 2
    let y = box.top + box.height / 2
    if (at !== undefined) {
        // just inside the ends, so that the pointer stays on the element
        if (box.width >= box.height) x = box.left + 0.5 + at * (box.width - 1)
        else y = box.bottom - 0.5 - at * (box.height - 1)
    }
    element.dispatchEvent(new MouseEvent(type, { bubbles: type !== 'mouseenter' && type !== 'mouseleave', cancelable: true, view: window, clientX: x, clientY: y }))
}

const liveRegion = (map) => {
    const id = 'em-announcer-' + map.svgId_
    let region = document.getElementById(id)
    if (region) return region
    region = document.createElement('div')
    region.id = id
    region.className = 'em-announcer'
    region.setAttribute('aria-live', 'polite')
    document.body.appendChild(region)
    return region
}

/** The text of an element, each block on its own, so that "France" and "117" are not read as one word. */
const blockText = (node) => {
    if (!node) return ''
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    const parts = []
    while (walker.nextNode()) parts.push(walker.currentNode.textContent.trim())
    return parts.filter(Boolean).join(' ')
}

const tooltipText = (map) => {
    const node = document.getElementById(map.tooltip_?.id)
    return node && getComputedStyle(node).opacity !== '0' ? blockText(node) : ''
}

/**
 * Makes `container` one tab stop whose arrow keys move through targets. Each move runs the target's own mouse
 * handlers, so it shows the usual tooltip and highlight, and announces it.
 * @param {*} container d3 selection of the focusable group
 * @param {object} options
 * @param {() => {key: string, group: string, element: Element, name: string, at?: number}[]} options.getTargets read again
 *   at every key: a zoom, a data change or a rebuilt legend moves and replaces elements
 * @param {*} options.map
 * @param {string} options.label
 * @param {(target: object) => string} options.describe what to announce after a move
 */
const arrowNavigation = function (container, { getTargets, map, label, describe }) {
    let current = null

    const leave = () => {
        if (!current) return
        const { element } = current
        element.classList.remove('em-keyboard-focus', 'em-flow-focus')
        mouseEvent(element, 'mouseout')
        // handlers on mouseleave, of the element or of a group around it
        for (let node = element; node && node !== container.node().parentNode; node = node.parentNode) mouseEvent(node, 'mouseleave')
        current = null
    }

    const show = (target) => {
        leave()
        current = target
        target.element.classList.add('em-keyboard-focus')
        if (target.element.closest('.em-flow-container')) target.element.classList.add('em-flow-focus')
        ;['mouseenter', 'mouseover', 'mousemove'].forEach((type) => mouseEvent(target.element, type, target.at))
        liveRegion(map).textContent = describe(target)
    }

    /** The first target of the next (or previous) group. */
    const otherGroup = (targets, index, step) => {
        let i = index
        do i = (i + step + targets.length) % targets.length
        while (i !== index && targets[i].group === targets[index].group)
        while (i > 0 && targets[i - 1].group === targets[i].group) i--
        return i
    }

    container
        .attr('tabindex', 0)
        .attr('role', 'application')
        .attr('aria-label', label)
        .on('blur.em-keyboard', leave)
        .on('keydown.em-keyboard', (event) => {
            if (event.key === 'Escape') return leave()
            const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']
            if (!keys.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return

            const targets = getTargets()
            if (!targets.length) return
            event.preventDefault()
            event.stopPropagation()

            const index = current ? targets.findIndex((t) => t.key === current.key) : -1
            let next
            if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = targets.length - 1
            else if (index < 0) next = 0
            else if (event.key === 'PageDown') next = otherGroup(targets, index, 1)
            else if (event.key === 'PageUp') next = otherGroup(targets, index, -1)
            else next = (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + targets.length) % targets.length
            show(targets[next])
        })
}

const removeNavigation = (container) => container.on('.em-keyboard', null).attr('tabindex', null).attr('role', null).attr('aria-label', null)

/**
 * One tab stop on the map: the arrow keys then move from region to region (on a flow map, through places and flows).
 * Turned off with map.keyboardNavigation(false).
 * @param {*} map
 */
export const setupKeyboardNavigation = function (map) {
    if (map.isInset) return
    const drawing = map.svg_?.select('#em-drawing-' + map.svgId_)
    if (!drawing || drawing.empty()) return

    removeNavigation(drawing)
    if (map.keyboardNavigation_ === false) return

    const flows = map._mapType === 'flow'
    arrowNavigation(drawing, {
        map,
        label: flows ? FLOW_HINT : MAP_HINT,
        getTargets: () => (flows ? flowTargets : regionTargets)(drawing.node()),
        describe: (target) => tooltipText(map) || target.name,
    })
}

/**
 * Makes a legend whose items highlight the map on hover usable from the keyboard. Called after every legend update.
 * @param {*} legend the legend object (its lgg is the legend's group)
 */
export const setupLegendNavigation = function (legend) {
    const map = legend.map
    const container = legend.lgg
    const node = container?.node?.()
    if (!map || !node) return

    removeNavigation(container)
    if (map.keyboardNavigation_ === false || !legendTargets(node).length) return

    // the legend's own words, so that they are still read when the group takes the keyboard
    const text = blockText(node)
    arrowNavigation(container, {
        map,
        label: `Legend: ${text}. ${LEGEND_HINT}`,
        getTargets: () => legendTargets(node),
        describe: (target) => {
            // a colour bar writes the value under the pointer
            const hovered = blockText(node.querySelector('.em-hover-label'))
            return hovered || tooltipText(map) || target.element.__emName || target.name
        },
    })
}
