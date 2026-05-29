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

const COLORS = ['#e470a8', '#e8b8cc', '#d4c8e0', '#b5e4c0', '#6dca8a', '#2a9455', '#1a7a45']
const THRESHOLDS = [50, 75, 90, 110, 130, 160]

const dotColor = (v) => {
    const i = THRESHOLDS.findIndex((t) => v < t)
    return i === -1 ? COLORS[COLORS.length - 1] : COLORS[i]
}
const nutsCountry = (id) => id.slice(0, 2)

// ─── Scroll steps (concise demo text) ────────────────────────────────────────

const STEPS = [
    {
        title: 'GDP per capita — EU NUTS-2 regions',
        subtitle: 'Index: EU-27 = 100 · Purchasing power standard',
        enter: (l, s) => {
            tweenToMap(l, s)
            resetHighlights(l, s)
        },
        card: {
            num: '01',
            h2: 'Choropleth view',
            body: 'Each NUTS-2 region is coloured by its GDP per capita index relative to the EU-27 average (= 100).',
        },
    },
    {
        title: 'Highlighting Regions on the Map',
        subtitle: 'Regions with GDP index above 130 highlighted in red',
        enter: (l, s) => {
            tweenToMap(l, s)
            highlight(l, s, (id) => (GDP_DATA[id] || 0) > 130, '#e84040')
        },
        card: {
            num: '02',
            h2: 'Highlighting Regions',
            body: 'As the user scrolls, we highlight specific regions (e.g. high-GDP regions above 130) in red while dimming background regions to focus attention.',
        },
    },
    {
        title: 'Transitioning the Map into a Chart',
        subtitle: 'Each NUTS-2 region polygon morphs into a dot grouped by country',
        enter: (l, s) => {
            tweenToChart(l, s)
        },
        card: {
            num: '03',
            h2: 'Map to Chart Morph',
            body: 'Finally, we morph the complex geographic boundaries of each NUTS-2 region into a standard chart. Each polygon smoothly transitions into a dot on a horizontal dot plot.',
        },
    },
]

// ─── Mount point ──────────────────────────────────────────────────────────────

const stage = document.querySelector('.map-stage')
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
    noDataFillStyle: '#e0dbd6',
    legend: { titleText: 'GDP index (EU avg = 100)', x: 10, y: 10, boxPadding: 10 },
    tooltip: {
        showFlags: false,
        textFunction: (region) => {
            const id = region.properties.id
            const val = GDP_DATA[id]
            const name = region.properties.na || id
            return `<div class="em-tooltip-bar"><b>${name}</b> (${id})</div>
                    <div class="em-tooltip-text"><table class="em-tooltip-table">
                    <tr><td>${val != null ? val + ' (EU=100)' : 'No data'}</td></tr>
                    </table></div>`
        },
    },
    zoomButtons: false,
    showSourceLink: false,
    footnote: '© EuroGeographics · Eurostat NUTS 2021',
    onBuild(mapInstance) {
        setTimeout(() => {
            init(mapInstance.svg(), mapInstance._pathFunction)
        }, mapInstance.transitionDuration() + 100)
    },
})

_map.statData().setData(GDP_DATA)
_map.build()

// ─── Layout ───────────────────────────────────────────────────────────────────
// Horizontal chart: GDP index on X axis, countries on Y axis (top = richest).

function buildLayout(svg) {
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

    return { svg, svgW, svgH, margin, xScale, yCenter, countries, countryAvgs, regionData, countryPathData }
}

// ─── init ─────────────────────────────────────────────────────────────────────

function init(svg) {
    const layout = buildLayout(svg)
    const stepEls = document.querySelectorAll('.step')
    const titleEl = document.getElementById('map-title')
    const subEl = document.getElementById('map-subtitle')
    const cntEl = document.getElementById('step-indicator')

    const state = { chartVisible: false, focusCountry: null, highlightPredicate: null, highlightColor: null }

    function applyStep(i) {
        const step = STEPS[i]
        if (!step) return
        titleEl.textContent = step.title
        subEl.textContent = step.subtitle
        cntEl.textContent = `Step ${i + 1} of ${STEPS.length}`
        step.enter(layout, state)
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return
                stepEls.forEach((s) => s.classList.remove('active'))
                entry.target.classList.add('active')
                applyStep(parseInt(entry.target.dataset.step, 10) - 1)
            })
        },
        { rootMargin: '-40% 0px -40% 0px' }
    )

    stepEls.forEach((el) => observer.observe(el))
    applyStep(0)
    stepEls[0]?.classList.add('active')
}

// ─── Map helpers ──────────────────────────────────────────────────────────────

function resetHighlights(layout, state) {
    state.highlightPredicate = null
    state.highlightColor = null

    if (state.chartVisible) return

    const { svg, regionData } = layout
    svg.selectAll('#em-nutsrg path').each(function (d) {
        const r = regionData.get(d?.properties?.id)
        if (!r) return
        window.d3
            .select(this)
            .transition('highlight')
            .duration(300)
            .style('stroke', r.origStroke)
            .style('stroke-width', r.origStrokeWidth)
            .style('filter', null)
            .style('opacity', 1)
    })

    svg.selectAll('#em-cntrg path').each(function () {
        window.d3
            .select(this)
            .transition('highlight')
            .duration(300)
            .style('opacity', 1)
    })

    svg.select('#em-cntbn').transition('highlight').duration(300).style('opacity', 1)
    svg.select('#em-nutsbn').transition('highlight').duration(300).style('opacity', 1)
}

function highlight(layout, state, predicate, color) {
    state.highlightPredicate = predicate
    state.highlightColor = color

    if (state.chartVisible) return

    const { svg, regionData } = layout
    svg.selectAll('#em-nutsrg path').each(function (d) {
        const id = d?.properties?.id
        const r = regionData.get(id)
        if (!r) return

        const on = predicate(id)
        const selection = window.d3.select(this)
        if (on) selection.raise()

        selection
            .transition('highlight')
            .duration(400)
            .style('stroke', on ? color : r.origStroke)
            .style('style-width', on ? '2.5px' : r.origStrokeWidth)
            .style('stroke-width', on ? '2.5px' : r.origStrokeWidth)
            .style('filter', on ? null : 'grayscale(70%) brightness(1.05)')
            .style('opacity', on ? 1.0 : 0.08)
    })

    svg.selectAll('#em-cntrg path').each(function () {
        window.d3
            .select(this)
            .transition('highlight')
            .duration(400)
            .style('opacity', 0.08)
    })

    svg.select('#em-cntbn').transition('highlight').duration(400).style('opacity', 0.3)
    svg.select('#em-nutsbn').transition('highlight').duration(400).style('opacity', 0.08)
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

// Convert root SVG coordinates to zoom-group local coordinates
function rootToLocal(svgNode, x, y) {
    const zg = svgNode.querySelector('[id^="em-zoom-group"]')
    if (!zg) return { x, y }
    try {
        const inv = zg.getCTM().inverse()
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
    const { svg, svgW, regionData, countryPathData } = layout

    if (state.chartVisible && state.focusCountry === focusCountry) return
    state.chartVisible = true
    state.focusCountry = focusCountry

    const zoomGroup = svg.select('.em-zoom-group')

    // fade furniture only
    FURNITURE.forEach((sel) => svg.select(sel).transition().duration(400).style('opacity', 0))

    svg.selectAll('#em-cntrg path').transition().duration(400).style('pointer-events', 'none')

    // MORPH REGIONS → DOTS
    svg.selectAll('#em-nutsrg path').each(function (d) {
        const r = regionData.get(d?.properties?.id)
        if (!r) return

        const on = !focusCountry || r.country === focusCountry

        const local = rootToLocal(svg.node(), r.chartX, r.chartY)

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
            const local = rootToLocal(svg.node(), cp.chartX, cp.chartY)
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
                .style('stroke', on ? '#1a7a45' : '#bbb')
                .style('stroke-width', on ? '1.8px' : '1px')
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
    let overlay = layout.svg.select('#em-chart-overlay')

    if (overlay.empty()) {
        overlay = buildAxesOverlay(layout)
        const zoomGroup = layout.svg.select('.em-zoom-group')
        zoomGroup.node().appendChild(overlay.node())
        overlay.lower()
    }

    overlay
        .style('opacity', 0)
        .transition()
        .delay(MORPH_DURATION + 200)
        .duration(400)
        .style('opacity', 1)
}

function tweenToMap(layout, state) {
    const { svg, svgW, regionData, countryPathData } = layout

    if (!state.chartVisible) return

    state.chartVisible = false
    state.focusCountry = null

    svg.select('#em-chart-overlay').transition().duration(300).style('opacity', 0).remove()

    // DOTS → REGIONS
    svg.selectAll('#em-nutsrg path').each(function (d) {
        const id = d?.properties?.id
        const r = regionData.get(id)
        if (!r) return

        let interp
        try {
            interp = flubberInterpolate(this.getAttribute('d'), r.mapD)
        } catch {
            return
        }

        // Determine target stroke and filter based on active highlight predicate
        let targetStroke = r.origStroke
        let targetStrokeWidth = r.origStrokeWidth
        let targetFilter = null
        let targetOpacity = 1

        if (state.highlightPredicate) {
            const on = state.highlightPredicate(id)
            if (on) {
                targetStroke = state.highlightColor
                targetStrokeWidth = '2.5px'
                window.d3.select(this).raise()
            } else {
                targetFilter = 'grayscale(70%) brightness(1.05)'
                targetOpacity = 0.08
            }
        }

        window.d3
            .select(this)
            .transition('morph')
            .duration(MORPH_DURATION)
            .ease(EASE)
            .attrTween('d', () => interp)
            .style('fill', r.origFill)
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
            let interp
            try {
                interp = flubberInterpolate(this.getAttribute('d'), cp.mapD)
            } catch {
                return
            }

            // Since active country geometries sit under NUTS regions,
            // we dim them to match the active highlight predicate state
            const targetOpacity = state.highlightPredicate ? 0.08 : 1

            window.d3
                .select(this)
                .transition('morph')
                .duration(MORPH_DURATION)
                .ease(EASE)
                .attrTween('d', () => interp)
                .style('fill', cp.origFill)
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
            .delay(MORPH_DURATION - 200)
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

    // Legend
    const [lx, ly] = [margin.left + 10, svgH - margin.bottom + 22]
    g.append('circle').attr('cx', lx).attr('cy', ly).attr('r', 4).attr('fill', '#888780').attr('opacity', 0.7)
    g.append('text')
        .attr('x', lx + 9)
        .attr('y', ly + 3.5)
        .attr('font-size', 8.5)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('fill', '#888780')
        .text('NUTS-2 region')
    g.append('rect')
        .attr('x', lx + 100)
        .attr('y', ly - 4.5)
        .attr('width', 9)
        .attr('height', 9)
        .attr('fill', 'none')
        .attr('stroke', '#888780')
        .attr('stroke-width', 1.2)
        .attr('opacity', 0.7)
    g.append('text')
        .attr('x', lx + 115)
        .attr('y', ly + 3.5)
        .attr('font-size', 8.5)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('fill', '#888780')
        .text('country average')

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
