/**
 * main.js — Story map scrollytelling demo
 *
 * Load order (index.html):
 *   1. d3.min.js          → window.d3
 *   2. flubber.min.js     → window.flubber
 *   3. eurostatmap.min.js → window.eurostatmap
 *   4. main.js
 */

const { scaleLinear } = window.d3
const { interpolate: flubberInterpolate } = window.flubber

// ─── Data ─────────────────────────────────────────────────────────────────────

const GDP_DATA = {
    DE11: 156,
    DE12: 130,
    DE13: 118,
    DE14: 112,
    DE21: 142,
    DE22: 96,
    DE23: 92,
    DE24: 88,
    DE25: 108,
    DE26: 115,
    DE27: 103,
    DE30: 174,
    DE40: 98,
    DE50: 175,
    DE60: 197,
    DE71: 163,
    DE72: 108,
    DE73: 104,
    DE80: 85,
    DE91: 107,
    DE92: 107,
    DE93: 110,
    DE94: 96,
    DEA1: 122,
    DEA2: 110,
    DEA3: 88,
    DEA4: 103,
    DEA5: 96,
    DEB1: 111,
    DEB2: 84,
    DEB3: 113,
    DEC0: 114,
    DED2: 95,
    DED4: 95,
    DED5: 91,
    DEE0: 79,
    DEF0: 105,
    DEG0: 83,
    FR10: 177,
    FR21: 81,
    FR22: 83,
    FR23: 88,
    FR24: 82,
    FR25: 84,
    FR26: 87,
    FR30: 92,
    FR41: 95,
    FR42: 85,
    FR43: 75,
    FR51: 94,
    FR52: 83,
    FR53: 80,
    FR61: 82,
    FR62: 74,
    FR63: 71,
    FR71: 106,
    FR72: 79,
    FR81: 76,
    FR82: 84,
    FR83: 103,
    NL11: 120,
    NL12: 119,
    NL13: 130,
    NL21: 118,
    NL22: 149,
    NL23: 133,
    NL31: 166,
    NL32: 142,
    NL33: 132,
    NL34: 120,
    NL41: 129,
    NL42: 133,
    BE10: 224,
    BE21: 115,
    BE22: 94,
    BE23: 107,
    BE24: 107,
    BE25: 105,
    BE31: 77,
    BE32: 82,
    BE33: 89,
    BE34: 88,
    BE35: 85,
    AT11: 89,
    AT12: 101,
    AT13: 167,
    AT21: 95,
    AT22: 104,
    AT31: 118,
    AT32: 114,
    AT33: 126,
    AT34: 106,
    ITC1: 128,
    ITC2: 112,
    ITC3: 104,
    ITC4: 154,
    ITH1: 119,
    ITH2: 117,
    ITH3: 125,
    ITH4: 117,
    ITH5: 112,
    ITI1: 108,
    ITI2: 91,
    ITI3: 88,
    ITI4: 87,
    ITF1: 67,
    ITF2: 70,
    ITF3: 64,
    ITF4: 63,
    ITF5: 57,
    ITF6: 63,
    ITG1: 67,
    ITG2: 73,
    ES11: 77,
    ES12: 82,
    ES13: 90,
    ES21: 126,
    ES22: 113,
    ES23: 90,
    ES24: 96,
    ES30: 121,
    ES41: 72,
    ES42: 74,
    ES43: 61,
    ES51: 112,
    ES52: 90,
    ES53: 104,
    ES61: 68,
    ES62: 72,
    ES63: 82,
    ES64: 83,
    ES70: 94,
    PL21: 74,
    PL22: 91,
    PL41: 70,
    PL42: 57,
    PL43: 55,
    PL51: 102,
    PL52: 57,
    PL61: 58,
    PL62: 56,
    PL63: 72,
    PL71: 81,
    PL72: 51,
    PL81: 48,
    PL82: 49,
    PL84: 46,
    PL91: 171,
    PL92: 73,
    RO11: 45,
    RO12: 41,
    RO21: 34,
    RO22: 40,
    RO31: 44,
    RO32: 105,
    RO41: 44,
    RO42: 42,
    BG31: 29,
    BG32: 29,
    BG33: 36,
    BG34: 38,
    BG41: 74,
    BG42: 38,
    HU11: 140,
    HU12: 55,
    HU21: 62,
    HU22: 62,
    HU23: 52,
    HU31: 43,
    HU32: 43,
    HU33: 44,
    CZ01: 187,
    CZ02: 85,
    CZ03: 74,
    CZ04: 73,
    CZ05: 72,
    CZ06: 85,
    CZ07: 71,
    CZ08: 73,
    SE11: 165,
    SE12: 113,
    SE21: 106,
    SE22: 103,
    SE23: 103,
    SE31: 99,
    SE32: 94,
    SE33: 89,
    DK01: 149,
    DK02: 118,
    DK03: 103,
    DK04: 101,
    DK05: 107,
    FI19: 115,
    FI1B: 131,
    FI1C: 93,
    FI1D: 86,
    FI20: 121,
    EL30: 84,
    EL41: 66,
    EL42: 58,
    EL43: 55,
    EL51: 55,
    EL52: 52,
    EL53: 50,
    EL54: 53,
    EL61: 55,
    EL62: 56,
    EL63: 57,
    EL64: 53,
    EL65: 49,
    PT11: 65,
    PT15: 72,
    PT16: 64,
    PT17: 96,
    PT18: 66,
    PT20: 75,
    PT30: 84,
    SK01: 103,
    SK02: 55,
    SK03: 55,
    SK04: 49,
    LT01: 84,
    LT02: 68,
    LV00: 72,
    EE00: 86,
    SI03: 88,
    SI04: 96,
    HR03: 70,
    HR04: 82,
    HR05: 62,
    HR06: 55,
    IE04: 231,
    IE05: 116,
    IE06: 135,
    LU00: 249,
}

// Left→right order on the Y axis (top = highest avg GDP)
const COUNTRY_ORDER = [
    'LU',
    'IE',
    'DK',
    'NL',
    'AT',
    'DE',
    'SE',
    'BE',
    'FI',
    'FR',
    'CZ',
    'IT',
    'ES',
    'SI',
    'EE',
    'LT',
    'PT',
    'SK',
    'PL',
    'HU',
    'HR',
    'EL',
    'LV',
    'RO',
    'BG',
]

// Full country names for Y axis labels
const COUNTRY_NAMES = {
    LU: 'Luxembourg',
    IE: 'Ireland',
    DK: 'Denmark',
    NL: 'Netherlands',
    AT: 'Austria',
    DE: 'Germany',
    SE: 'Sweden',
    BE: 'Belgium',
    FI: 'Finland',
    FR: 'France',
    CZ: 'Czechia',
    IT: 'Italy',
    ES: 'Spain',
    SI: 'Slovenia',
    EE: 'Estonia',
    LT: 'Lithuania',
    PT: 'Portugal',
    SK: 'Slovakia',
    PL: 'Poland',
    HU: 'Hungary',
    HR: 'Croatia',
    EL: 'Greece',
    LV: 'Latvia',
    RO: 'Romania',
    BG: 'Bulgaria',
}

// Diverging around 100 (EU-27 average): a class break sits exactly at 100, 4 classes below, 4 above
const COLORS = ['#d4488f', '#e470a8', '#e8a4c4', '#f1d2e0', '#cde8d3', '#8fd3a4', '#3fa468', '#1a7a45']
const THRESHOLDS = [50, 75, 90, 100, 110, 130, 160]
const NO_DATA_COLOR = '#e0dbd6'
const COUNTRY_AVERAGE_COLOR = '#1a7a45'

const dotColor = (v) => {
    const i = THRESHOLDS.findIndex((t) => v < t)
    return i === -1 ? COLORS[COLORS.length - 1] : COLORS[i]
}

function tooltipTextColor(background) {
    const { r, g, b } = window.d3.rgb(background)
    const linearize = (channel) => {
        const s = channel / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    const luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
    const blackContrast = (luminance + 0.05) / 0.05
    const whiteContrast = 1.05 / (luminance + 0.05)
    return blackContrast >= whiteContrast ? 'black' : 'white'
}
const nutsCountry = (id) => id.slice(0, 2)

const HIGH_VALUE = (id) => (GDP_DATA[id] || 0) > 130
const LOW_VALUE = (id) => GDP_DATA[id] < THRESHOLDS[0]

// Frame the Benelux, Paris and the German high-value regions as far east as Berlin.
const ZOOM_REGIONS = (id) => ['BE', 'LU', 'NL'].includes(nutsCountry(id)) || ['FR10', 'DE30'].includes(id) || /^DEA[1-5]$/.test(id)
const LOW_ZOOM_REGIONS = (id) => LOW_VALUE(id) && ['BG', 'RO'].includes(nutsCountry(id))

// ─── Scroll steps (concise demo text) ────────────────────────────────────────

const STEPS = [
    {
        title: 'GDP per capita — EU NUTS-2 regions',
        subtitle: 'Index: EU-27 = 100 · Purchasing power standard',
        enter: (l, s) => {
            showMap(l, s, null, null)
        },
        card: {
            num: '01',
            h2: 'Choropleth view',
            body: 'Each NUTS-2 region is coloured by its GDP per capita index relative to the EU-27 average (= 100).',
        },
    },
    {
        title: 'Highlighting Regions on the Map',
        subtitle: 'Regions with GDP index above 130 highlighted',
        enter: (l, s) => {
            showMap(l, s, HIGH_VALUE, null)
        },
        card: {
            num: '02',
            h2: 'Highlighting Regions',
            body: 'As the user scrolls, we highlight specific regions (e.g. high-GDP regions above 130) while muting the background regions to focus attention.',
        },
    },
    {
        title: 'Zooming into a Region',
        subtitle: 'High-value regions around Benelux, France and Germany',
        enter: (l, s) => {
            showMap(l, s, HIGH_VALUE, ZOOM_REGIONS, HIGH_VALUE)
        },
        card: {
            num: '03',
            h2: 'Zooming into a region',
            body: 'The map glides to an area of interest, then place names fade in.',
        },
    },
    {
        title: 'Back to the Full Map',
        subtitle: 'All regions shown in their GDP class colours',
        enter: (l, s) => showMap(l, s, null, null),
    },
    {
        title: 'Highlighting the Lowest GDP Regions',
        subtitle: 'Regions with a GDP index below 50 highlighted',
        enter: (l, s) => showMap(l, s, LOW_VALUE, null),
    },
    {
        title: 'Zooming into Romania and Bulgaria',
        subtitle: 'A cluster of regions with a GDP index below 50',
        enter: (l, s) => showMap(l, s, LOW_VALUE, LOW_ZOOM_REGIONS),
    },
    {
        title: 'Back to the Full Map',
        subtitle: 'All regions shown in their GDP class colours',
        enter: (l, s) => showMap(l, s, null, null),
    },
    {
        title: 'Transitioning the Map into a Chart',
        subtitle: 'Each NUTS-2 region polygon morphs into a dot grouped by country',
        enter: (l, s) => {
            tweenToChart(l, s)
        },
        card: {
            num: '08',
            h2: 'Map to Chart Morph',
            body: 'Finally, we morph the complex geographic boundaries of each NUTS-2 region into a standard chart. Each polygon smoothly transitions into a dot on a horizontal dot plot.',
        },
    },
]

// ─── Mount point ──────────────────────────────────────────────────────────────

const stage = document.querySelector('.map-stage')
const mapLegend = document.getElementById('map-legend')
const chartLegend = document.getElementById('chart-legend')
chartLegend.style.setProperty('--chart-average-color', COUNTRY_AVERAGE_COLOR)
stage.innerHTML = ''
const mount = document.createElement('div')
mount.id = 'eurostatmap-mount'
Object.assign(mount.style, { width: '100%', height: '100%', position: 'relative', overflow: 'hidden' })
stage.appendChild(mount)
const seedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
seedSvg.id = 'em-map'
mount.appendChild(seedSvg)

// ─── Build map ────────────────────────────────────────────────────────────────

const _map = window.eurostatmap.map('ch', {
    svgId: 'em-map',
    containerId: 'eurostatmap-mount',
    width: stage.offsetWidth || 560,
    nutsLevel: 2,
    nutsYear: 2021,
    geo: 'EUR',
    proj: '3035',
    scale: '20M',
    colors: COLORS,
    thresholds: THRESHOLDS,
    classificationMethod: 'threshold',
    noDataFillStyle: NO_DATA_COLOR,
    legend: { titleText: 'GDP index (EU avg = 100)', x: 10, y: 10, boxPadding: 10 },
    tooltip: { containerId: mount.id, showFlags: false },
    zoomButtons: false,
    zoomExtent: [1, 12], // enables the zoom behaviour that map.zoomTo() drives (user input is unbound in init)
    showSourceLink: false,
    footnote: '© EuroGeographics · Eurostat NUTS 2021',
    onBuild(mapInstance) {
        setTimeout(() => {
            init(mapInstance.svg(), mapInstance)
        }, mapInstance.transitionDuration() + 100)
    },
})

// Install the formatter after the choropleth layer registers its default.
_map.tooltip().textFunction = (region) => {
    const id = region.properties.id
    const val = GDP_DATA[id]
    const name = region.properties.na || id
    const background = val == null ? NO_DATA_COLOR : dotColor(val)
    return `<div class="em-tooltip-bar" style="background-color:${background};color:${tooltipTextColor(background)}"><b>${name}</b> (${id})</div>
            <div class="em-tooltip-text"><table class="em-tooltip-table">
            <tr><td>${val != null ? val + ' (EU=100)' : 'No data'}</td></tr>
            </table></div>`
}

_map.statData().setData(GDP_DATA)
_map.build()

// ─── Layout ───────────────────────────────────────────────────────────────────
// Horizontal chart: GDP index on X axis, countries on Y axis (top = richest).

function buildLayout(svg, map) {
    const svgW = +svg.attr('width')
    const svgH = +svg.attr('height')
    // Generous left margin for full country names
    const margin = { top: 20, right: 30, bottom: 30, left: 88 }
    const chartW = svgW - margin.left - margin.right
    const chartH = svgH - margin.top - margin.bottom

    const countries = COUNTRY_ORDER.filter((cc) => Object.keys(GDP_DATA).some((id) => nutsCountry(id) === cc))

    const vals = Object.values(GDP_DATA).filter(Number.isFinite)
    const xScale = scaleLinear()
        .domain([0, Math.max(...vals) + 15])
        .range([0, chartW])

    const bandH = chartH / countries.length
    const yCenter = (cc) => margin.top + countries.indexOf(cc) * bandH + bandH / 2

    // Deterministic vertical jitter within each country band
    const jitter = (id) => {
        let h = 0
        for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
        return ((h & 0xffff) / 0xffff - 0.5) * bandH * 0.55
    }

    // Per-region morph data
    const regionData = new Map()

    svg.selectAll('#em-nutsrg path').each(function (d) {
        const id = d?.properties?.id
        const value = GDP_DATA[id]
        const country = nutsCountry(id)
        if (!id || value == null || !countries.includes(country)) return
        const mapD = this.getAttribute('d')
        if (!mapD) return

        // Read fill from fill___ attribute (set by eurostatmap after its transition)
        // Fall back to style.fill, then the fill attribute
        const origFill = this.getAttribute('fill___') || this.style.fill || this.getAttribute('fill') || '#ccc'

        const chartX = margin.left + xScale(value)
        const chartY = yCenter(country) + jitter(id)

        regionData.set(id, {
            name: d.properties.na || id,
            mapD,
            chartX,
            chartY,
            origFill,
            origStroke: this.style.stroke || this.getAttribute('stroke') || '#fff',
            origStrokeWidth: this.style.strokeWidth || this.getAttribute('stroke-width') || '0.25px',
            country,
            value,
        })
    })

    // Country averages
    const countryAvgs = {}
    countries.forEach((cc) => {
        const v = [...regionData.values()].filter((r) => r.country === cc).map((r) => r.value)
        if (v.length) countryAvgs[cc] = v.reduce((a, b) => a + b) / v.length
    })

    // Per-country cntrg morph data
    const countryPathData = new Map()
    countries.forEach((cc) => {
        const node = svg.select(`#em-cntrg-${cc}`).node()
        if (!node) return
        const mapD = node.getAttribute('d')
        if (!mapD) return
        const avg = countryAvgs[cc]
        if (avg == null) return
        const chartX = margin.left + xScale(avg)
        const chartY = yCenter(cc)
        countryPathData.set(cc, {
            mapD,
            chartX,
            chartY,
            average: avg,
            origFill: node.getAttribute('fill___') || node.style.fill || node.getAttribute('fill') || '#e0dbd6',
            origStroke: node.style.stroke || node.getAttribute('stroke') || '#aaa',
            origStrokeWidth: node.style.strokeWidth || node.getAttribute('stroke-width') || '0.5px',
            origOpacity: node.style.opacity || '1',
        })
    })

    // Hide no-data NUTS regions (pointer events + visibility)
    // Only these regions are affected — data regions are never touched here
    svg.selectAll('#em-nutsrg path').each(function (d) {
        const id = d?.properties?.id
        if (!id || GDP_DATA[id] != null) return
        this.style.display = 'none'
        this.style.pointerEvents = 'none'
    })

    return { map, svg, svgW, svgH, margin, xScale, yCenter, countries, countryAvgs, regionData, countryPathData }
}

// ─── init ─────────────────────────────────────────────────────────────────────

function init(svg, map) {
    // The story drives the view itself: drop d3-zoom's wheel/drag/touch handlers so the page keeps scrolling
    // normally over the map. map.zoomTo() is programmatic and doesn't need them.
    svg.on('.zoom', null).style('touch-action', 'auto')

    let scrollTimer
    window.addEventListener('scroll', () => {
        const tooltip = map._tooltip
        if (!tooltip) return
        tooltip.style('visibility', 'hidden')
        clearTimeout(scrollTimer)
        scrollTimer = setTimeout(() => {
            // Cancel any hover triggered by the map moving under a stationary pointer.
            tooltip.mouseout()
            tooltip.style('opacity', 0).style('visibility', null)
        }, 150)
    }, { passive: true })

    const layout = buildLayout(svg, map)
    const stepEls = document.querySelectorAll('.step')
    const titleEl = document.getElementById('map-title')
    const subEl = document.getElementById('map-subtitle')
    const cntEl = document.getElementById('step-indicator')

    const state = { chartVisible: false, focusCountry: null, highlightPredicate: null, zoomPredicate: null, step: -1 }

    function applyStep(i) {
        const step = STEPS[i]
        if (!step || i === state.step) return
        state.step = i
        stepEls.forEach((s) => s.classList.toggle('active', parseInt(s.dataset.step, 10) - 1 === i))
        titleEl.textContent = step.title
        subEl.textContent = step.subtitle
        cntEl.textContent = `Step ${i + 1} of ${STEPS.length}`
        // Cancel whatever the previous step still has in flight, so fast scrolling can't leave
        // two transitions fighting over the same attribute
        interruptAll(layout)
        step.enter(layout, state)
    }

    // Fast scrolling flips through several steps; only act on the one the reader settles on
    const visible = new Set()
    let settleTimer = null
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const n = parseInt(entry.target.dataset.step, 10) - 1
                if (entry.isIntersecting) visible.add(n)
                else visible.delete(n)
            })
            if (!visible.size) return
            clearTimeout(settleTimer)
            settleTimer = setTimeout(() => applyStep(Math.max(...visible)), 120)
        },
        { rootMargin: '-40% 0px -40% 0px' }
    )

    stepEls.forEach((el) => observer.observe(el))
    applyStep(0)
    stepEls[0]?.classList.add('active')
}

// ─── Map helpers ──────────────────────────────────────────────────────────────

// Stop every in-flight transition started by a previous step (map zoom, morph, highlight, furniture)
function interruptAll({ svg, map }) {
    svg.interrupt() // the map's glide zoom runs on the svg itself
    ;[null, 'morph', 'highlight'].forEach((name) => {
        svg.selectAll('.em-zoom-group *').interrupt(name)
        svg.selectAll('.em-legend, .em-legend *, .em-sea, .em-graticule, .em-footnote').interrupt(name)
    })
}

/**
 * Show the map view: optionally highlight regions (everything else is muted) and optionally
 * glide the map to the bounding box of the regions matching `zoomPredicate`.
 */
function showMap(layout, state, predicate, zoomPredicate, labelPredicate = zoomPredicate) {
    state.highlightPredicate = predicate
    state.zoomPredicate = zoomPredicate

    tweenToMap(layout, state)

    hidePlaceLabels(layout)
    // Placenames only make sense once the map has settled on the area of interest
    zoomToRegions(layout, zoomPredicate, labelPredicate ? () => showPlaceLabels(layout, (id) => labelPredicate(id) && predicate(id)) : undefined)
}

// NUTS names that are too long for a map label
const SHORT_NAMES = { BE10: 'Brussels', NL42: 'Limburg', FR10: 'Île-de-France' }

// Project markers from the map and lay out the annotations in CSS pixels.
function showPlaceLabels(layout, predicate) {
    const { svg, regionData } = layout
    const zoomGroup = svg.select('.em-zoom-group')
    const probe = zoomGroup.append('path').attr('visibility', 'hidden').node()
    const places = []
    regionData.forEach((region, id) => {
        if (!predicate(id)) return
        probe.setAttribute('d', region.mapD)
        const { x, y, width, height } = probe.getBBox()
        places.push({
            id,
            name: SHORT_NAMES[id] || region.name,
            center: new DOMPoint(x + width / 2, y + height / 2),
            topLeft: new DOMPoint(x, y),
            bottomRight: new DOMPoint(x + width, y + height),
        })
    })
    probe.remove()

    const overlay = window.d3.select(stage).append('svg').attr('class', 'story-place-labels')
    const markers = overlay.append('g')
    const labelGroup = overlay.append('g')

    function positionLabels() {
        const frame = overlay.node().getBoundingClientRect()
        const matrix = zoomGroup.node().getScreenCTM()
        const left = Math.max(0, -frame.left) + 6
        const right = Math.min(frame.width, document.documentElement.clientWidth - frame.left) - 6
        const bottom = frame.height - 6
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
        const furniture = svg.selectAll('.em-legend, .em-footnote').nodes()
        const card = document.querySelector('.step.active .step-card')
        if (card) furniture.push(card)
        const occupied = furniture.map((node) => {
            const rect = node.getBoundingClientRect()
            return { x: rect.left - frame.left, y: rect.top - frame.top, w: rect.width, h: rect.height }
        })
        const visiblePlaces = places.filter((place) => {
            const first = place.topLeft.matrixTransform(matrix)
            const last = place.bottomRight.matrixTransform(matrix)
            return first.x < frame.left + right && last.x > frame.left + left
                && first.y < frame.top + bottom && last.y > frame.top + 6
        })
        for (const place of visiblePlaces) {
            const point = place.center.matrixTransform(matrix)
            place.x = clamp(point.x - frame.left, left, right)
            place.y = clamp(point.y - frame.top, 6, bottom)
            occupied.push({ x: place.x - 4, y: place.y - 4, w: 8, h: 8 })
        }

        const labels = labelGroup.selectAll('text').data(visiblePlaces, (place) => place.id).join('text')
            .attr('data-region', (place) => place.id)
            .text((place) => place.name)
        labels.each(function (place) {
            const text = this.getBBox()
            const w = text.width + 6
            const h = text.height + 4
            let best
            let bestDistance = Infinity
            // Find the closest free rectangle to the preferred upper-right position.
            for (let y = 6; y + h <= bottom; y += 4) {
                for (let x = left; x + w <= right; x += 4) {
                    const distance = (x - place.x - 5) ** 2 + (y + h - place.y + 4) ** 2
                    if (distance >= bestDistance || occupied.some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y)) continue
                    best = { x, y, w, h }
                    bestDistance = distance
                }
            }
            place.box = best
            this.style.visibility = best ? 'visible' : 'hidden'
            if (!best) return
            occupied.push(best)
            this.setAttribute('transform', `translate(${best.x + 3 - text.x},${best.y + 2 - text.y})`)
        })

        const anchored = visiblePlaces.filter((place) => place.box)
        markers.selectAll('line').data(anchored).join('line')
            .attr('x1', (p) => p.x).attr('y1', (p) => p.y)
            .attr('x2', (p) => clamp(p.x, p.box.x, p.box.x + p.box.w))
            .attr('y2', (p) => clamp(p.y, p.box.y, p.box.y + p.box.h))
        markers.selectAll('circle').data(anchored).join('circle')
            .attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', 2.5)
    }

    positionLabels()
    const resize = new ResizeObserver(positionLabels)
    resize.observe(stage)
    layout.removePlaceLabels = () => {
        resize.disconnect()
        overlay.remove()
    }
    overlay.style('opacity', 0).transition().duration(600).style('opacity', 1)
}

function hidePlaceLabels(layout) {
    layout.removePlaceLabels?.()
    layout.removePlaceLabels = null
}

// Glide to the regions matching the predicate (or back to the full view when there is none); onEnd runs when it lands
function zoomToRegions({ map, svg, regionData }, predicate, onEnd) {
    if (!predicate) {
        map.zoomTo(null, { duration: 1200 })
        return
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    // Measure each region's *geographic* outline (r.mapD), never its live path: after the chart step the live
    // paths are dots. getBBox is in zoom-group coordinates, which don't change while zooming.
    const probe = svg.select('.em-zoom-group').append('path').attr('visibility', 'hidden').node()
    regionData.forEach((r, id) => {
        if (!predicate(id)) return
        probe.setAttribute('d', r.mapD)
        const b = probe.getBBox()
        x0 = Math.min(x0, b.x)
        y0 = Math.min(y0, b.y)
        x1 = Math.max(x1, b.x + b.width)
        y1 = Math.max(y1, b.y + b.height)
    })
    probe.remove()
    if (!isFinite(x0)) return

    const w = +svg.attr('width')
    const h = +svg.attr('height')
    const k = Math.min(w / (x1 - x0), h / (y1 - y0)) * 0.7
    const [x, y] = map._projection.invert([(x0 + x1) / 2, (y0 + y1) / 2])
    map.zoomTo({ x, y, z: map.__baseZ / k }, { duration: 2000, onEnd })
}

// ─── Morph constants ──────────────────────────────────────────────────────────

const MORPH_DURATION = 2000
const MORPH_STAGGER = 600

const EASE = (t) => {
    t *= 2
    return t < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2)
}

// SVG map furniture selectors — everything that disappears during chart view
const FURNITURE = ['#em-cntbn', '#em-nutsbn', '.em-legend', '.em-sea', '.em-graticule', '.em-footnote', '#em-cntbn', '#em-cntbn-halo']

// Small square path centered at (cx, cy)
const squarePath = (cx, cy, s = 4.5) => `M${cx - s},${cy - s} L${cx + s},${cy - s} L${cx + s},${cy + s} L${cx - s},${cy + s} Z`

// Convert root SVG coordinates to zoom-group local coordinates *as they will be once the map is unzoomed*
// (the parent's CTM ignores the group's own zoom transform; the chart is always shown at k=1)
function rootToLocal(svgNode, x, y) {
    const zg = svgNode.querySelector('[id^="em-zoom-group"]')
    if (!zg) return { x, y }
    try {
        const inv = zg.parentNode.getCTM().inverse()
        const pt = svgNode.createSVGPoint()
        pt.x = x
        pt.y = y
        const local = pt.matrixTransform(inv)
        return { x: local.x, y: local.y }
    } catch (e) {
        return { x, y }
    }
}

// ─── tweenToChart ─────────────────────────────────────────────────────────────

function tweenToChart(layout, state, focusCountry = null) {
    const { svg, svgH, margin, regionData, countryPathData } = layout

    // No early return: an interrupted step can leave the geometry half-way, so every step re-applies its full target
    state.chartVisible = true
    state.focusCountry = focusCountry
    mapLegend.hidden = true
    chartLegend.hidden = false

    hidePlaceLabels(layout)
    // The chart is laid out in unzoomed coordinates: glide back out while the regions morph
    layout.map.zoomTo(null, { duration: MORPH_DURATION })

    const zoomGroup = svg.select('.em-zoom-group')
    zoomGroup.select('.story-chart-average-targets').remove()
    // The drawing clip excludes the map footer, and the CSS stage can be shorter still.
    const drawing = zoomGroup.node().parentNode
    const clip = svg.select(drawing.getAttribute('clip-path').slice(4, -1)).select('rect')
    const stageBottom = new DOMPoint(0, stage.getBoundingClientRect().bottom)
        .matrixTransform(drawing.getScreenCTM().inverse()).y
    const chartBottom = Math.min(+clip.attr('height'), stageBottom) - 4
    const scaleY = (y) => margin.top + (y - margin.top) *
        (chartBottom - margin.top - margin.bottom) / (svgH - margin.top - margin.bottom)

    // fade furniture only
    FURNITURE.forEach((sel) => svg.select(sel).transition().duration(400).style('opacity', 0))

    svg.selectAll('#em-cntrg path').transition().duration(400).style('pointer-events', 'none')

    // MORPH REGIONS → DOTS
    svg.selectAll('#em-nutsrg path').each(function (d) {
        const r = regionData.get(d?.properties?.id)
        if (!r) return

        const on = !focusCountry || r.country === focusCountry

        const local = rootToLocal(svg.node(), r.chartX, scaleY(r.chartY))

        const DOT_R = 4

        const targetD = `M${local.x - DOT_R} ${local.y}
             a${DOT_R} ${DOT_R} 0 1 0 ${DOT_R * 2} 0
             a${DOT_R} ${DOT_R} 0 1 0 ${-DOT_R * 2} 0`

        const currentD = this.getAttribute('d') || r.mapD

        let interp
        try {
            interp = flubberInterpolate(currentD, targetD, { maxSegmentLength: 4 })
        } catch {
            return
        }

        window.d3
            .select(this)
            .raise()
            .transition('morph')
            .duration(MORPH_DURATION)
            .ease(EASE)
            .attrTween('d', () => interp)
            .style('fill', dotColor(r.value))
            .style('stroke', on ? dotColor(r.value) : '#d8d3cc')
            .style('stroke-width', on ? '0.5px' : '0.35px')
            .style('filter', on ? null : 'grayscale(80%) brightness(1.1)')
            .style('opacity', on ? 1.0 : 0.2)
    })

    // COUNTRY BORDERS AND SHAPES (#em-cntrg)
    svg.selectAll('#em-cntrg path').each(function () {
        const id = this.getAttribute('id')
        if (!id) return
        const cc = id.replace('em-cntrg-', '')

        const cp = countryPathData.get(cc)
        if (cp) {
            // Morph active country to square
            const on = !focusCountry || cc === focusCountry
            const local = rootToLocal(svg.node(), cp.chartX, scaleY(cp.chartY))
            const targetD = squarePath(local.x, local.y)

            let interp
            try {
                interp = flubberInterpolate(this.getAttribute('d'), targetD)
            } catch {
                return
            }

            window.d3
                .select(this)
                .raise()
                .transition('morph')
                .duration(MORPH_DURATION)
                .ease(EASE)
                .attrTween('d', () => interp)
                .style('fill', 'none')
                .style('stroke', on ? COUNTRY_AVERAGE_COLOR : '#bbb')
                .style('stroke-width', on ? '1.8px' : '1px')
                .style('opacity', on ? 1 : 0.2)
        } else {
            // Fade out non-active country geometries (like UK, RS, etc.)
            window.d3
                .select(this)
                .transition('morph')
                .duration(MORPH_DURATION)
                .ease(EASE)
                .style('opacity', 0)
                .style('pointer-events', 'none')
        }
    })

    // AXES OVERLAY INSIDE ZOOM GROUP
    // Always rebuild: a previous overlay may be half faded out
    layout.svg.select('#em-chart-overlay').interrupt('overlay').remove()
    const overlay = buildAxesOverlay({ ...layout, svgH: chartBottom, yCenter: (cc) => scaleY(layout.yCenter(cc)) }, focusCountry)
    layout.svg.select('.em-zoom-group').node().appendChild(overlay.node())
    overlay.lower()

    overlay
        .style('opacity', 0)
        .transition('overlay')
        .delay(MORPH_DURATION + 200)
        .duration(400)
        .style('opacity', 1)
        .on('end', () => {
            if (state.chartVisible) addCountryAverageTargets(layout, zoomGroup, scaleY)
        })
}

function addCountryAverageTargets({ svg, map, countryPathData }, zoomGroup, scaleY) {
    const tooltip = map._tooltip
    const formatAverage = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })
    // Put the hit areas above the dots, including where a dot lies inside a hollow square.
    const targets = zoomGroup.append('g').attr('class', 'story-chart-average-targets')
    for (const [cc, { chartX, chartY, average }] of countryPathData) {
        const { x, y } = rootToLocal(svg.node(), chartX, scaleY(chartY))
        targets.append('rect')
            .attr('data-country', cc)
            .attr('x', x - 4.5).attr('y', y - 4.5)
            .attr('width', 9).attr('height', 9)
            .attr('fill', 'transparent')
            .on('pointerenter', (event) => {
                tooltip?.mouseover(
                    `<div class="em-tooltip-bar" style="background-color:${COUNTRY_AVERAGE_COLOR};color:${tooltipTextColor(COUNTRY_AVERAGE_COLOR)}"><b>${COUNTRY_NAMES[cc]}</b></div>
                    <div class="em-tooltip-text">Average of shown regions: ${formatAverage.format(average)} (EU-27 = 100)</div>`,
                    event
                )
            })
            .on('pointermove', (event) => tooltip?.mousemove(event))
            .on('pointerleave', () => tooltip?.mouseout())
    }
}

function tweenToMap(layout, state) {
    const { svg, svgW, regionData, countryPathData } = layout

    // No early return on state.chartVisible: an interrupted morph leaves shapes half-way while the flag already
    // says 'map', so we always (re)apply the full map state. Shapes already at their target are left alone.
    if (state.chartVisible) {
        layout.map._tooltip?.mouseout()
        svg.select('.story-chart-average-targets').remove()
    }
    state.chartVisible = false
    state.focusCountry = null
    mapLegend.hidden = false
    chartLegend.hidden = true
    let morphing = false
    const atTarget = (el, d) => el.getAttribute('d') === d

    svg.select('#em-chart-overlay').transition('overlay').duration(300).style('opacity', 0).remove()

    // DOTS → REGIONS
    svg.selectAll('#em-nutsrg path').each(function (d) {
        const id = d?.properties?.id
        const r = regionData.get(id)
        if (!r) return

        let interp = null
        if (!atTarget(this, r.mapD)) {
            try {
                interp = flubberInterpolate(this.getAttribute('d'), r.mapD)
                morphing = true
            } catch {
                return
            }
        }

        // Determine target stroke and filter based on active highlight predicate
        let targetStroke = r.origStroke
        let targetStrokeWidth = r.origStrokeWidth
        let targetFilter = null
        let targetOpacity = 1

        if (state.highlightPredicate) {
            const on = state.highlightPredicate(id)
            if (on) {
                window.d3.select(this).raise()
            } else {
                targetFilter = 'grayscale(70%) brightness(1.05)'
                targetOpacity = 0.08
            }
        }

        const tr = window.d3.select(this).transition('morph').duration(interp ? MORPH_DURATION : 400).ease(EASE)
        if (interp) tr.attrTween('d', () => interp)
        tr.style('fill', r.origFill)
            .style('stroke', targetStroke)
            .style('stroke-width', targetStrokeWidth)
            .style('filter', targetFilter)
            .style('opacity', targetOpacity)
    })

    // Restore all country geometries (#em-cntrg paths)
    svg.selectAll('#em-cntrg path').each(function () {
        const id = this.getAttribute('id')
        if (!id) return
        const cc = id.replace('em-cntrg-', '')

        const cp = countryPathData.get(cc)
        if (cp) {
            // Morph active country back to geographic shape
            let interp = null
            if (!atTarget(this, cp.mapD)) {
                try {
                    interp = flubberInterpolate(this.getAttribute('d'), cp.mapD)
                    morphing = true
                } catch {
                    return
                }
            }

            // Since active country geometries sit under NUTS regions,
            // we dim them to match the active highlight predicate state
            const targetOpacity = state.highlightPredicate ? 0.08 : 1

            const ctr = window.d3.select(this).transition('morph').duration(interp ? MORPH_DURATION : 400).ease(EASE)
            if (interp) ctr.attrTween('d', () => interp)
            ctr.style('fill', cp.origFill)
                .style('stroke', cp.origStroke)
                .style('stroke-width', cp.origStrokeWidth)
                .style('opacity', targetOpacity)
                .style('pointer-events', null)
        } else {
            // Restore non-active country geometries (like UK, RS, etc.) back to opacity 1 (or 0.08 if highlighted)
            const targetOpacity = state.highlightPredicate ? 0.08 : 1
            window.d3
                .select(this)
                .transition('morph')
                .duration(MORPH_DURATION)
                .ease(EASE)
                .style('opacity', targetOpacity)
                .style('pointer-events', null)
        }
    })

    // restore furniture
    FURNITURE.forEach((sel) => {
        let opacity = 1
        if (state.highlightPredicate) {
            if (sel === '#em-cntbn') {
                opacity = 0.3
            } else if (sel === '#em-nutsbn') {
                opacity = 0.08
            }
        }
        svg
            .select(sel)
            .transition()
            .delay(morphing ? MORPH_DURATION - 200 : 0)
            .duration(500)
            .style('opacity', opacity)
    })
}

// ─── Axes overlay (horizontal chart) ─────────────────────────────────────────

function buildAxesOverlay({ svg, svgW, svgH, margin, xScale, yCenter, countries }, focusCountry) {
    const g = svg.append('g').attr('id', 'em-chart-overlay')
    const ax = g.append('g')

    // Background
    g.append('rect').attr('width', svgW).attr('height', svgH).attr('fill', 'rgba(245,242,236,0.6)').attr('pointer-events', 'none')

    // X gridlines and tick labels (top)
    const xTicks = [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250].filter((v) => v <= xScale.domain()[1])

    xTicks.forEach((v) => {
        const x = margin.left + xScale(v)
        const avg = v === 100
        ax.append('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', margin.top)
            .attr('y2', svgH - margin.bottom)
            .attr('stroke', avg ? '#2a6e3f' : '#d4cfc8')
            .attr('stroke-width', avg ? 1.2 : 0.5)
            .attr('stroke-dasharray', avg ? '5 3' : null)
        ax.append('text')
            .attr('x', x)
            .attr('y', svgH - margin.bottom + 12)
            .attr('text-anchor', 'middle')
            .attr('font-size', 8.5)
            .attr('font-family', 'DM Sans, sans-serif')
            .attr('fill', avg ? '#2a6e3f' : '#b0aca5')
            .text(v)
        if (avg)
            ax.append('text')
                .attr('x', x)
                .attr('y', margin.top - 5)
                .attr('text-anchor', 'middle')
                .attr('font-size', 8)
                .attr('font-family', 'DM Sans, sans-serif')
                .attr('fill', '#2a6e3f')
                .attr('opacity', 0.85)
                .text('EU avg')
    })

    // X axis label
    ax.append('text')
        .attr('x', margin.left + xScale(xScale.domain()[1]) / 2)
        .attr('y', svgH - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('fill', '#6b6760')
        .text('GDP index (EU-27 = 100)')

    // Y axis country labels
    countries.forEach((cc) => {
        const focus = focusCountry && cc === focusCountry
        ax.append('text')
            .attr('x', margin.left - 6)
            .attr('y', yCenter(cc) + 3.5)
            .attr('text-anchor', 'end')
            .attr('font-family', 'DM Sans, sans-serif')
            .attr('font-size', focusCountry ? (focus ? 10 : 8) : 9)
            .attr('font-weight', focus ? 500 : 400)
            .attr('fill', focus ? '#1a7a45' : '#6b6760')
            .text(COUNTRY_NAMES[cc] || cc)
    })

    return g
}

// ─── Poland annotation ────────────────────────────────────────────────────────

function appendPolandAnnotation(overlay, { margin, xScale, yCenter, regionData }) {
    const pl = [...regionData.entries()].filter(([, r]) => r.country === 'PL').sort(([, a], [, b]) => a.value - b.value)
    if (pl.length < 2) return
    const [minId, minR] = pl[0]
    const [maxId, maxR] = pl[pl.length - 1]

    const y = yCenter('PL')
    const x1 = margin.left + xScale(minR.value)
    const x2 = margin.left + xScale(maxR.value)
    const g = overlay.append('g').attr('opacity', 0)

    const tick = (x) =>
        g
            .append('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', y - 8)
            .attr('y2', y + 8)
            .attr('stroke', '#c84040')
            .attr('stroke-width', 1.2)
    g.append('line').attr('x1', x1).attr('x2', x2).attr('y1', y).attr('y2', y).attr('stroke', '#c84040').attr('stroke-width', 1.2)
    tick(x1)
    tick(x2)

    g.append('text')
        .attr('x', (x1 + x2) / 2)
        .attr('y', y - 10)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', 9)
        .attr('fill', '#c84040')
        .text(`${maxR.value - minR.value}pt spread`)
    g.append('text')
        .attr('x', x2 + 4)
        .attr('y', y + 3.5)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', 8)
        .attr('fill', '#1a7a45')
        .text(`${maxId} (${maxR.value})`)
    g.append('text')
        .attr('x', x1 - 4)
        .attr('y', y + 3.5)
        .attr('text-anchor', 'end')
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', 8)
        .attr('fill', '#c84040')
        .text(`${minId} (${minR.value})`)

    g.transition()
        .delay(MORPH_STAGGER + MORPH_DURATION + 600)
        .duration(400)
        .attr('opacity', 1)
}
