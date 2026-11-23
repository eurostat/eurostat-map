/**
 * Layout profile: how much room a map really has, and so which layout it should use.
 *
 * Responsive behaviour is decided from the width of the map's own container, never from the device or the
 * window: a map embedded in a 600px iframe on a desktop is as cramped as a map on a phone, and a map in a
 * wide column on a phone-sized window is not. `window.innerWidth` is only the fallback, for when the container
 * cannot be measured (server side rendering, a container that shrinks to fit the map, a map not yet in the page).
 *
 * `map.layout()` picks the policy: 'auto' (default, the profile follows the container), 'desktop' or 'compact'
 * (the profile is fixed, whatever the container).
 */

/** Container width (px) at or below which the 'compact' layout profile is used. */
export const COMPACT_BREAKPOINT = 768

/** A container narrower than this was not really measured (a collapsed or shrink-to-fit parent). */
const MIN_MEASURABLE_WIDTH = 60

/** The container width of the map that was laid out last: what code without a map at hand falls back to. */
let activeContainerWidth

export const setActiveContainerWidth = function (width) {
    activeContainerWidth = width
}

/** Width (px) of the container of the map laid out last, else of the window: what the layout is sized to. */
export const getActiveWidth = function () {
    return activeContainerWidth ?? (typeof window !== 'undefined' ? window.innerWidth : COMPACT_BREAKPOINT)
}

/**
 * The width (px) the container of a map offers, or undefined when it cannot be told.
 * The map's own svg is taken out of the flow while measuring, so that it does not size its own container.
 * @param {*} out map instance
 * @returns {number|undefined}
 */
export const measureContainerWidth = function (out) {
    if (typeof document === 'undefined') return undefined
    const svg = out.svg_?.node?.()
    if (!svg) return undefined
    let host = svg.parentNode
    // the wrapper the library adds is sized by its parent, which is the real container
    if (host?.classList?.contains('em-map-wrapper')) host = host.parentNode
    // a map nested in another svg (IMAGE) is laid out by that svg's host page
    while (host && host instanceof SVGElement) host = host.parentNode
    if (!host || host === document || !host.getBoundingClientRect) return undefined

    const previous = { position: svg.style.position, width: svg.style.width, height: svg.style.height }
    svg.style.position = 'absolute'
    svg.style.width = '0'
    svg.style.height = '0'
    const wrapper = svg.parentNode?.classList?.contains('em-map-wrapper') ? svg.parentNode : undefined
    const wrapperPosition = wrapper ? wrapper.style.position : undefined
    if (wrapper) wrapper.style.position = 'static'
    let width = host.clientWidth
    svg.style.position = previous.position
    svg.style.width = previous.width
    svg.style.height = previous.height
    if (wrapper) wrapper.style.position = wrapperPosition

    const style = window.getComputedStyle(host)
    width -= (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
    return width >= MIN_MEASURABLE_WIDTH ? Math.floor(width) : undefined
}

/**
 * Measure the container and remember on the map the width its layout is for: `out._containerWidth_`. That is the
 * width of the container, unless the caller set `width()`: then the map is drawn at that width (and the browser
 * scales it to fit, see `responsive`), so its layout is the one for that width, whatever the container.
 * @param {*} out map instance
 * @returns {number|undefined} the measured width of the container
 */
export const resolveContainerWidth = function (out) {
    const width = out._widthExplicit_ ? undefined : measureContainerWidth(out)
    out._containerWidth_ = out._widthExplicit_ ? out.width_ : width
    if (!out.isInset && !out.isInset_) setActiveContainerWidth(width)
    return width
}

/**
 * Whether the compact layout profile applies.
 * @param {*} [out] map instance; without one, the last laid out map (or the window) decides
 * @param {number} [breakpoint] container width (px) at or below which a feature goes compact
 * @returns {boolean}
 */
export const isCompact = function (out, breakpoint = COMPACT_BREAKPOINT) {
    if (out?.layout_ === 'compact') return true
    if (out?.layout_ === 'desktop') return false
    const width = out?._containerWidth_ ?? activeContainerWidth ?? (typeof window !== 'undefined' ? window.innerWidth : Infinity)
    return width <= breakpoint
}

/**
 * Observe the container of a map and rebuild it when the profile changes or the container's width does. Only for a
 * map in 'auto' layout whose width was not set (a map drawn at a width of its own is scaled by the browser instead).
 * Replaces any observer of an earlier build.
 * @param {*} out map instance
 */
export const observeContainer = function (out) {
    out._layoutObserver?.disconnect()
    out._layoutObserver = undefined
    // a map built again into the same svg (a new map() call) replaces the one before: its observer must go
    const previousSvg = out.svg_?.node?.()
    previousSvg?.__emLayoutObserver?.disconnect()
    if (previousSvg) previousSvg.__emLayoutObserver = undefined
    if (out.isInset || out.layout_ !== 'auto' || out._widthExplicit_ || typeof ResizeObserver === 'undefined') return
    const svg = out.svg_?.node?.()
    let host = svg?.parentNode
    if (host?.classList?.contains('em-map-wrapper')) host = host.parentNode
    if (!host || host instanceof SVGElement) return

    let timer
    let lastWidth = out._containerWidth_
    let lastCompact = isCompact(out)
    const observer = new ResizeObserver(() => {
        clearTimeout(timer)
        timer = setTimeout(() => {
            const width = measureContainerWidth(out)
            if (width === undefined || width === lastWidth) return
            const compact = width <= COMPACT_BREAKPOINT
            const widthChanged = Math.abs(width - lastWidth) >= 16
            lastWidth = width
            if (compact === lastCompact && !widthChanged) return
            lastCompact = compact
            out.build()
        }, 150)
    })
    observer.observe(host)
    out._layoutObserver = observer
    if (svg) svg.__emLayoutObserver = observer
}
