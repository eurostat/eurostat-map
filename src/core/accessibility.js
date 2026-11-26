// What a map offers to people who use a keyboard or a screen reader, or who ask for less motion.

const NAVIGATION_HINT = 'Map regions. Use the arrow keys to move between regions, Page Up and Page Down to change country, and Escape to leave.'

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

const hasHoverHandler = (element) => !!element.__on?.some((listener) => listener.type === 'mouseover' && listener.value)

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
    return [...byId.keys()].sort().map((id) => ({ id: String(id), element: byId.get(id) }))
}

const mouseEvent = (element, type) => {
    const box = element.getBoundingClientRect()
    element.dispatchEvent(
        new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: box.left + box.width / 2,
            clientY: box.top + box.height / 2,
        })
    )
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

const tooltipText = (map) => {
    const node = document.getElementById(map.tooltip_?.id)
    if (!node) return ''
    // the text of each block on its own, so that "France" and "117" are not read as one word
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    const parts = []
    while (walker.nextNode()) parts.push(walker.currentNode.textContent.trim())
    return parts.filter(Boolean).join(' ')
}

/**
 * One tab stop per map; the arrow keys then move from region to region. Each move runs the region's own mouse
 * handlers, so every map type shows its usual tooltip and highlight, and the tooltip's text is announced.
 * Turned off with map.keyboardNavigation(false). Flow maps have no region tooltips.
 * @param {*} map
 */
export const setupKeyboardNavigation = function (map) {
    if (map.isInset) return
    const drawing = map.svg_?.select('#em-drawing-' + map.svgId_)
    if (!drawing || drawing.empty()) return

    drawing.on('.em-keyboard', null).attr('tabindex', null).attr('role', null).attr('aria-label', null)
    if (map.keyboardNavigation_ === false || map._mapType === 'flow') return

    let targets = []
    let current = null

    const leave = () => {
        if (!current) return
        current.element.classList.remove('em-keyboard-focus')
        mouseEvent(current.element, 'mouseout')
        current = null
    }

    const show = (target) => {
        leave()
        current = target
        target.element.classList.add('em-keyboard-focus')
        mouseEvent(target.element, 'mouseover')
        mouseEvent(target.element, 'mousemove')
        liveRegion(map).textContent = tooltipText(map) || target.element.__data__.properties.na || target.id
    }

    /** The first region of the next (or previous) country. NUTS ids start with the country code. */
    const otherCountry = (index, step) => {
        const country = (i) => targets[i].id.slice(0, 2)
        let i = index
        do i = (i + step + targets.length) % targets.length
        while (i !== index && country(i) === country(index))
        while (i > 0 && country(i - 1) === country(i)) i--
        return i
    }

    drawing
        .attr('tabindex', 0)
        .attr('role', 'application')
        .attr('aria-label', NAVIGATION_HINT)
        .on('blur.em-keyboard', leave)
        .on('keydown.em-keyboard', (event) => {
            if (event.key === 'Escape') return leave()
            const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']
            if (!keys.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return

            // read again at every key: a zoom, a data change or a NUTS level change moves and replaces regions
            targets = regionTargets(drawing.node())
            if (!targets.length) return
            event.preventDefault()
            event.stopPropagation()

            const index = current ? targets.findIndex((t) => t.id === current.id) : -1
            let next
            if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = targets.length - 1
            else if (index < 0) next = 0
            else if (event.key === 'PageDown') next = otherCountry(index, 1)
            else if (event.key === 'PageUp') next = otherCountry(index, -1)
            else next = (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + targets.length) % targets.length
            show(targets[next])
        })
}
