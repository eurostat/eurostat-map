/**
 * main.js — Scrollytelling integration for eurostat-map
 *
 * Drives a sticky choropleth map whose appearance updates at each scroll step.
 * At step 4+, regions animate out of the map into a country-grouped dot chart.
 *
 * Depends on:
 *   - eurostatmap (loaded as a UMD global via <script> in index.html)
 *   - D3 sub-packages (loaded as UMD globals via <script> in index.html)
 *
 * The only library addition required is:
 *   - map.regionCentroids()   → Map<nutsId, [svgX, svgY]>   (see LIBRARY NOTES below)
 *   - map.onBuild(fn)         → already present as out.onBuild_ / out.onBuild()
 *
 * WHY NO ES MODULE IMPORTS:
 *   eurostatmap is built as a UMD bundle (webpack, "main": "build/eurostatmap.min.js").
 *   `import * as eurostatmap from './build/eurostatmap.min.js'` gives you the module
 *   namespace wrapper, not the bundle's own exports — so eurostatmap.map is undefined.
 *   The correct approach for a UMD bundle is to load it via <script> (which registers
 *   the `eurostatmap` global) and then reference window.eurostatmap in JS.
 *   D3 sub-packages are bundled inside eurostatmap, so we extract them from the global
 *   rather than loading them separately.
 */

// eurostatmap is loaded as a UMD global via <script> tag in index.html.
const em = window.eurostatmap

// D3 is bundled *inside* eurostatmap but not re-exported as window.d3.
// We load a separate slim D3 bundle (also via <script> in index.html) for
// the handful of functions tweenToChart needs: select, scaleLinear, min, max.
// If you prefer to avoid the extra request, you can inline these three
// tiny helpers directly (see the fallback implementations below).
const _select = window.d3?.select ?? _selectFallback
const _scaleLinear = window.d3?.scaleLinear ?? _scaleLinearFallback
const _min = window.d3?.min ?? ((arr) => Math.min(...arr))
const _max = window.d3?.max ?? ((arr) => Math.max(...arr))

// ── Minimal fallbacks (used only if the d3 UMD global is absent) ──────────────

/** Wraps a DOM element or selector string in a D3-like selection with .select/.selectAll/.append/.attr/.style/.text/.transition/.remove */
function _selectFallback(selector) {
    // We only need this for the chart overlay work, where we already have
    // the eurostatmap SVG node. Delegate to the D3 instance that eurostatmap
    // imported internally — it is accessible via map.svg() which returns a
    // real D3 selection, so we never actually need to call select() ourselves.
    // This fallback exists only to prevent a ReferenceError at parse time.
    console.warn('[story-map] window.d3.select not found — load d3.v7.min.js before main.js')
    return { selectAll: () => ({ transition: () => ({}) }) }
}

function _scaleLinearFallback() {
    // Minimal linear scale for y-axis mapping
    let _domain = [0, 1],
        _range = [0, 1]
    const scale = (v) => {
        const t = (v - _domain[0]) / (_domain[1] - _domain[0])
        return _range[0] + t * (_range[1] - _range[0])
    }
    scale.domain = (d) => {
        if (!d) return _domain
        _domain = d
        return scale
    }
    scale.range = (r) => {
        if (!r) return _range
        _range = r
        return scale
    }
    return scale
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.  MAP CONFIGURATION
//     Build the choropleth once and let eurostatmap handle rendering.
//     We hook into onBuild to know when the SVG is ready before wiring
//     the scroll observer.
// ─────────────────────────────────────────────────────────────────────────────

/** Container id that eurostatmap will render the SVG into */
const MAP_SVG_ID = 'em-map'

/**
 * GDP per capita index data, EU-27 = 100.
 * In a real deployment this comes from the Eurostat API:
 *   stat: { eurostatDatasetCode: 'nama_10r_3gdp', filters: { unit: 'PPS_HAB_EU27_2020', lastTimePeriod: 1 } }
 * We use manual data here so the demo works without a network call.
 *
 * Keys are NUTS-2 ids (2021 vintage).
 * Values are the GDP-PPS index (EU-27 = 100).
 */
const GDP_DATA = {
    // Germany — large spread
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
    // France — Paris outlier
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
    // Netherlands
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
    // Belgium
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
    // Austria
    AT11: 89,
    AT12: 101,
    AT13: 167,
    AT21: 95,
    AT22: 104,
    AT31: 118,
    AT32: 114,
    AT33: 126,
    AT34: 106,
    // Italy — north/south divide
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
    // Spain
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
    // Poland — Warsaw outlier vs east
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
    // Romania — mostly low
    RO11: 45,
    RO12: 41,
    RO21: 34,
    RO22: 40,
    RO31: 44,
    RO32: 105,
    RO41: 44,
    RO42: 42,
    // Bulgaria
    BG31: 29,
    BG32: 29,
    BG33: 36,
    BG34: 38,
    BG41: 74,
    BG42: 38,
    // Hungary
    HU11: 140,
    HU12: 55,
    HU21: 62,
    HU22: 62,
    HU23: 52,
    HU31: 43,
    HU32: 43,
    HU33: 44,
    // Czech Republic
    CZ01: 187,
    CZ02: 85,
    CZ03: 74,
    CZ04: 73,
    CZ05: 72,
    CZ06: 85,
    CZ07: 71,
    CZ08: 73,
    // Sweden
    SE11: 165,
    SE12: 113,
    SE21: 106,
    SE22: 103,
    SE23: 103,
    SE31: 99,
    SE32: 94,
    SE33: 89,
    // Denmark
    DK01: 149,
    DK02: 118,
    DK03: 103,
    DK04: 101,
    DK05: 107,
    // Finland
    FI19: 115,
    FI1B: 131,
    FI1C: 93,
    FI1D: 86,
    FI20: 121,
    // Greece
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
    // Portugal
    PT11: 65,
    PT15: 72,
    PT16: 64,
    PT17: 96,
    PT18: 66,
    PT20: 75,
    PT30: 84,
    // Slovakia
    SK01: 103,
    SK02: 55,
    SK03: 55,
    SK04: 49,
    // Lithuania
    LT01: 84,
    LT02: 68,
    // Latvia
    LV00: 72,
    // Estonia
    EE00: 86,
    // Slovenia
    SI03: 88,
    SI04: 96,
    // Croatia
    HR03: 70,
    HR04: 82,
    HR05: 62,
    HR06: 55,
    // Ireland
    IE04: 231,
    IE05: 116,
    IE06: 135,
    // Luxembourg
    LU00: 249,
}

/**
 * Map each NUTS-2 id to its NUTS-0 parent country code.
 * Used by tweenToChart to group dots.
 */
const NUTS0_OF = (nutsId) => nutsId.slice(0, 2)

/**
 * Country order for chart x-axis (left = highest avg GDP, right = lowest).
 * Generated by sorting countries by their mean GDP index.
 */
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
    'GR',
    'LV',
    'RO',
    'BG',
]

// Colour palette for the choropleth — 7 classes from low (pink) to high (green)
const CHOROPLETH_COLORS = ['#e470a8', '#e8b8cc', '#d4c8e0', '#b5e4c0', '#6dca8a', '#2a9455', '#1a7a45']
const CHOROPLETH_THRESHOLDS = [50, 75, 90, 110, 130, 160]

// ─────────────────────────────────────────────────────────────────────────────
// 2.  BUILD THE MAP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prepare the mount point for eurostatmap inside .map-stage.
 *
 * eurostatmap's buildMapTemplateBase() does:
 *   let svg = select('#' + svgId)          // look for existing element
 *   if (svg.size() == 0) svg = select('body').append('svg')  // fallback: append to body
 *
 * So we pre-insert an <svg id="em-map"> inside our mount div.
 * eurostatmap finds it, takes ownership, and renders into it in place —
 * no body-level append, no layout escape.
 */
function prepareMountPoint() {
    const stage = document.querySelector('.map-stage')
    if (!stage) return null
    stage.innerHTML = ''

    const mount = document.createElement('div')
    mount.id = 'eurostatmap-mount'
    mount.style.cssText = 'width:100%;height:100%;position:relative;overflow:hidden;'
    stage.appendChild(mount)

    // Pre-insert the SVG so eurostatmap renders here rather than appending to body
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = MAP_SVG_ID
    mount.appendChild(svg)

    return mount
}

prepareMountPoint()

// Build the choropleth map.
//
// svgId: eurostatmap does `select('#' + svgId)` to find or create the SVG element.
//   It appends the SVG to document.body if no element with that id exists, OR
//   it uses an existing element. We pre-create the SVG inside our mount div below.
//
// containerId: used only for tooltip overflow detection — set to our mount div.
const map = em.map('ch', {
    svgId: MAP_SVG_ID,
    containerId: 'eurostatmap-mount',
    width: document.querySelector('.map-stage')?.offsetWidth || 560,
    nutsLevel: 2,
    nutsYear: 2021,
    geo: 'EUR',
    proj: '3035',
    scale: '20M',
    colors: CHOROPLETH_COLORS,
    thresholds: CHOROPLETH_THRESHOLDS,
    classificationMethod: 'threshold',
    noDataFillStyle: '#e0dbd6',
    legend: {
        titleText: 'GDP index (EU avg = 100)',
        x: 10,
        y: 10,
        boxPadding: 10,
    },
    tooltip: {
        textFunction: (region, map) => {
            const id = region.properties.id
            const val = GDP_DATA[id]
            const name = region.properties.na || id
            return `
                <div class="em-tooltip-bar"><b>${name}</b> (${id})</div>
                <div class="em-tooltip-text">
                    <table class="em-tooltip-table">
                        <tr><td>${val != null ? val + ' (EU=100)' : 'No data'}</td></tr>
                    </table>
                </div>`
        },
        showFlags: false,
    },
    // onBuild fires when geo + stat are both ready (see tryFinalize in stat-map.js).
    // Wire the scroll observer here — never before the SVG is populated.
    onBuild: (mapInstance) => {
        console.log('[eurostatmap] Build complete — wiring scroll observer')
        onMapReady(mapInstance)
    },
    zoomButtons: false,
    showSourceLink: false,
    showScalebar: false,
    footnote: '© EuroGeographics · Eurostat NUTS 2021 · GDP index, EU-27 = 100',
})

// Inject the manual data before build() so updateStatValues fires in the right order
map.statData().setData(GDP_DATA)

// Kick off the build
map.build()

// ─────────────────────────────────────────────────────────────────────────────
// 3.  SCROLL STEP DEFINITIONS
//     Each step is a pure-function descriptor { title, subtitle, apply(map) }.
//     apply() is called by the IntersectionObserver whenever the step becomes
//     active. It should be idempotent (safe to call multiple times).
// ─────────────────────────────────────────────────────────────────────────────

const steps = [
    {
        // Step 1 — full choropleth, no highlights
        title: 'GDP per capita — EU NUTS-2 regions',
        subtitle: 'Index: EU-27 = 100 · Purchasing power standard',
        apply(map) {
            ensureChoropleth(map)
            clearChartOverlay()
            clearHighlights(map)
        },
    },
    {
        // Step 2 — highlight high-GDP north/west cluster
        title: 'Northern & western regions — above average',
        subtitle: 'Regions with index > 130 highlighted',
        apply(map) {
            ensureChoropleth(map)
            clearChartOverlay()
            highlightByPredicate(map, (id) => (GDP_DATA[id] || 0) > 130, '#ffd700')
        },
    },
    {
        // Step 3 — highlight low-GDP east cluster
        title: 'Eastern regions — persistently below average',
        subtitle: 'Regions with index < 60 highlighted',
        apply(map) {
            ensureChoropleth(map)
            clearChartOverlay()
            highlightByPredicate(map, (id) => (GDP_DATA[id] || 999) < 60, '#e84040')
        },
    },
    {
        // Step 4 — tween choropleth into country dot chart
        title: 'All regions by country — internal spread',
        subtitle: 'Each dot = one NUTS-2 region · Square = country average',
        apply(map) {
            tweenToChart(map)
        },
    },
    {
        // Step 5 — same chart but Poland highlighted
        title: 'Poland: a country of extremes',
        subtitle: 'Warsaw (PL91) vs eastern periphery — 120+ pt spread',
        apply(map) {
            tweenToChart(map, 'PL')
        },
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// 4.  SCROLL OBSERVER
//     Wired inside onBuild so we never observe before the SVG exists.
// ─────────────────────────────────────────────────────────────────────────────

function onMapReady(mapInstance) {
    const stepEls = document.querySelectorAll('.step')
    const mapTitleEl = document.getElementById('map-title')
    const mapSubtitleEl = document.getElementById('map-subtitle')
    const stepIndicatorEl = document.getElementById('step-indicator')

    function applyStep(index) {
        const cfg = steps[index]
        if (!cfg) return
        if (mapTitleEl) mapTitleEl.textContent = cfg.title
        if (mapSubtitleEl) mapSubtitleEl.textContent = cfg.subtitle
        if (stepIndicatorEl) stepIndicatorEl.textContent = `Step ${index + 1} of ${steps.length}`
        cfg.apply(mapInstance)
    }

    // rootMargin fires when the card crosses the middle 20% of the viewport
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return
                const el = entry.target
                el.classList.add('active')
                stepEls.forEach((s) => {
                    if (s !== el) s.classList.remove('active')
                })
                const idx = parseInt(el.dataset.step, 10) - 1
                applyStep(idx)
            })
        },
        { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    )

    stepEls.forEach((el) => observer.observe(el))

    // Apply step 1 immediately
    applyStep(0)
    if (stepEls[0]) stepEls[0].classList.add('active')
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  MAP MANIPULATION HELPERS
//     These are the building blocks for step transitions.
//     They work entirely through the existing eurostatmap public API plus
//     direct D3 selection of the rendered SVG — no private API needed until
//     tweenToChart, which requires regionCentroids() (see LIBRARY NOTES).
// ─────────────────────────────────────────────────────────────────────────────

/** Ensure the choropleth region fills are visible and the chart overlay is absent */
function ensureChoropleth(map) {
    const svg = map.svg()
    if (!svg) return
    // Restore region fill opacities in case tweenToChart dimmed them
    svg.selectAll('path.em-nutsrg, path.em-cntrg').transition().duration(500).style('opacity', 1)
    // Remove chart overlay if present
    svg.select('#em-chart-overlay').remove()
    // Restore legend visibility
    svg.select('.em-legend').style('display', null)
}

/** Remove any dashed highlight ellipses injected by highlightByPredicate */
function clearHighlights(map) {
    const svg = map.svg()
    if (!svg) return
    svg.select('#em-highlight-overlay').remove()
    // Restore region strokes to default
    svg.selectAll('path.em-nutsrg').style('stroke', null).style('stroke-width', null)
}

/** Remove the chart overlay SVG layer */
function clearChartOverlay() {
    // map is the module-level variable — we reach the SVG through it
    // rather than calling d3.select() so we don't need the d3 global here.
    const svg = map?.svg?.()
    if (svg) svg.select('#em-chart-overlay').remove()
}

/**
 * Highlight regions matching predicate by overlaying a thick stroke.
 * Non-matching regions are dimmed.
 * @param {Function} predicate  (nutsId: string) => boolean
 * @param {string}   color      stroke/highlight colour
 */
function highlightByPredicate(map, predicate, color) {
    clearHighlights(map)
    const svg = map.svg()
    if (!svg) return

    svg.selectAll('path.em-nutsrg')
        .transition()
        .duration(400)
        .style('opacity', function (d) {
            if (!d?.properties?.id) return 0.4
            return predicate(d.properties.id) ? 1 : 0.25
        })
        .style('stroke', function (d) {
            if (!d?.properties?.id) return null
            return predicate(d.properties.id) ? color : null
        })
        .style('stroke-width', function (d) {
            if (!d?.properties?.id) return null
            return predicate(d.properties.id) ? '1.5px' : null
        })
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.  tweenToChart
//     The centrepiece of the story map.
//
//     Strategy:
//     1. Compute the projected SVG centroid of each NUTS-2 region.
//        We use map._pathFunction.centroid(feature) — the geoPath centroid
//        in SVG-pixel space — which is available on every map after buildMapTemplate().
//     2. Build a target chart coordinate space (y = GDP index, x = country group).
//     3. Spawn <circle> elements at each region's map centroid, then transition
//        them to the chart coordinates.  The original <path> regions fade out.
//     4. Draw axes and country labels on top.
//
//     This entire function lives in application code — no library change needed
//     except regionCentroids() as a convenience (see §7 below).
// ─────────────────────────────────────────────────────────────────────────────

/** Track whether the chart overlay is currently shown */
let _chartVisible = false

/**
 * @param {object} map          the eurostatmap instance
 * @param {string} [focusCountry]  if set, dim all other country groups
 */
function tweenToChart(map, focusCountry = null) {
    if (_chartVisible && _lastFocusCountry === focusCountry) return
    _chartVisible = true
    _lastFocusCountry = focusCountry

    const svg = map.svg()
    if (!svg) return

    // Remove any previous chart overlay so we can rebuild cleanly
    svg.select('#em-chart-overlay').remove()

    // -- Layout constants (in SVG coordinate space) --
    const svgW = +svg.attr('width') || map.width()
    const svgH = +svg.attr('height') || map.height()
    const margin = { top: 40, right: 20, bottom: 55, left: 58 }
    const chartW = svgW - margin.left - margin.right
    const chartH = svgH - margin.top - margin.bottom

    // Countries actually present in data
    const countriesPresent = COUNTRY_ORDER.filter((cc) => Object.keys(GDP_DATA).some((id) => NUTS0_OF(id) === cc))

    // -- Scales --
    const allValues = Object.values(GDP_DATA).filter(Number.isFinite)
    const yScale = _scaleLinear()
        .domain([Math.max(0, _min(allValues) - 10), _max(allValues) + 15])
        .range([chartH, 0])

    const xBandWidth = chartW / countriesPresent.length
    const xCenter = (cc) => {
        const i = countriesPresent.indexOf(cc)
        return margin.left + i * xBandWidth + xBandWidth / 2
    }

    // Jitter within each country column so dots don't stack exactly
    const jitter = () => (Math.random() - 0.5) * (xBandWidth * 0.55)

    // -- Gather region centroids --
    // map._pathFunction.centroid(feature) gives the visual centroid
    // of each rendered region path in SVG coordinates.
    const regionFeatures = map.Geometries?.geoJSONs?.nutsrg || []
    const centroidMap = new Map() // nutsId -> [svgX, svgY]

    regionFeatures.forEach((feature) => {
        const id = feature.properties?.id
        if (!id) return
        // _pathFunction is the geoPath used to render the map
        const c = map._pathFunction?.centroid(feature)
        if (c && !isNaN(c[0]) && !isNaN(c[1])) {
            centroidMap.set(id, c)
        }
    })

    // -- Build chart data: one entry per region that has both a centroid and a GDP value --
    const chartData = []
    centroidMap.forEach((centroid, nutsId) => {
        const value = GDP_DATA[nutsId]
        if (value == null) return
        const country = NUTS0_OF(nutsId)
        if (!countriesPresent.includes(country)) return
        chartData.push({ nutsId, country, value, centroid })
    })

    // -- Compute country averages for square markers --
    const countryAvgs = {}
    countriesPresent.forEach((cc) => {
        const vals = chartData.filter((d) => d.country === cc).map((d) => d.value)
        if (vals.length) countryAvgs[cc] = vals.reduce((a, b) => a + b) / vals.length
    })

    // -- Fade out choropleth regions --
    svg.selectAll('path.em-nutsrg').transition().duration(600).style('opacity', 0.08)

    // Clear any existing highlights
    svg.select('#em-highlight-overlay').remove()
    svg.select('.em-legend').style('display', 'none')

    // -- Create chart overlay group --
    const overlay = svg.append('g').attr('id', 'em-chart-overlay').attr('transform', `translate(0, 0)`)

    // Background for readability
    overlay.append('rect').attr('x', 0).attr('y', 0).attr('width', svgW).attr('height', svgH).attr('fill', 'rgba(245,242,236,0.82)')

    // -- Draw axes --
    const axisG = overlay.append('g').attr('class', 'em-chart-axes')

    // Y axis ticks
    const yTicks = [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250].filter((v) => v >= yScale.domain()[0] && v <= yScale.domain()[1])
    yTicks.forEach((v) => {
        const y = margin.top + yScale(v)
        // gridline
        axisG
            .append('line')
            .attr('x1', margin.left)
            .attr('x2', svgW - margin.right)
            .attr('y1', y)
            .attr('y2', y)
            .attr('stroke', v === 100 ? '#2a6e3f' : '#d4cfc8')
            .attr('stroke-width', v === 100 ? 1.2 : 0.5)
            .attr('stroke-dasharray', v === 100 ? '5 3' : null)
        // tick label
        axisG
            .append('text')
            .attr('x', margin.left - 6)
            .attr('y', y + 3.5)
            .attr('text-anchor', 'end')
            .attr('font-family', 'DM Sans, sans-serif')
            .attr('font-size', 9)
            .attr('fill', v === 100 ? '#2a6e3f' : '#b0aca5')
            .text(v)
        // EU average label
        if (v === 100) {
            axisG
                .append('text')
                .attr('x', svgW - margin.right - 2)
                .attr('y', y - 4)
                .attr('text-anchor', 'end')
                .attr('font-family', 'DM Sans, sans-serif')
                .attr('font-size', 8.5)
                .attr('fill', '#2a6e3f')
                .attr('opacity', 0.85)
                .text('EU avg')
        }
    })

    // Y axis label (rotated)
    axisG
        .append('text')
        .attr('transform', `rotate(-90)`)
        .attr('x', -(margin.top + chartH / 2))
        .attr('y', 13)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', 9)
        .attr('fill', '#6b6760')
        .text('GDP index (EU-27 = 100)')

    // Country x labels
    countriesPresent.forEach((cc) => {
        const x = xCenter(cc)
        const isFocus = focusCountry && cc === focusCountry
        axisG
            .append('text')
            .attr('x', x)
            .attr('y', svgH - margin.bottom + 14)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'DM Sans, sans-serif')
            .attr('font-size', focusCountry ? (isFocus ? 11 : 8) : 9)
            .attr('font-weight', isFocus ? 500 : 400)
            .attr('fill', isFocus ? '#1a7a45' : '#9b9590')
            .text(cc)
    })

    // Legend row at bottom
    const legY = svgH - 14
    const legX = margin.left
    overlay.append('circle').attr('cx', legX).attr('cy', legY).attr('r', 4).attr('fill', '#888780').attr('opacity', 0.7)
    overlay
        .append('text')
        .attr('x', legX + 9)
        .attr('y', legY + 3.5)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', 8.5)
        .attr('fill', '#888780')
        .text('NUTS-2 region')
    overlay
        .append('rect')
        .attr('x', legX + 90)
        .attr('y', legY - 4.5)
        .attr('width', 9)
        .attr('height', 9)
        .attr('fill', 'none')
        .attr('stroke', '#444')
        .attr('stroke-width', 1.2)
        .attr('opacity', 0.7)
    overlay
        .append('text')
        .attr('x', legX + 104)
        .attr('y', legY + 3.5)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', 8.5)
        .attr('fill', '#888780')
        .text('country average')

    // -- Spawn dots at their map centroid position, then tween to chart position --
    const dotsG = overlay.append('g').attr('class', 'em-chart-dots')

    // Pre-assign jitter per region so it's stable across focus changes
    const jitterMap = new Map()
    chartData.forEach((d) => {
        if (!jitterMap.has(d.nutsId)) jitterMap.set(d.nutsId, jitter())
    })

    chartData.forEach((d) => {
        const [startX, startY] = d.centroid
        const targetX = xCenter(d.country) + jitterMap.get(d.nutsId)
        const targetY = margin.top + yScale(d.value)
        const isFocused = !focusCountry || d.country === focusCountry
        const regionColor = getChartDotColor(d.value)

        dotsG
            .append('circle')
            .attr('class', 'em-chart-dot')
            .attr('data-nuts', d.nutsId)
            .attr('cx', startX)
            .attr('cy', startY)
            .attr('r', 0)
            .attr('fill', regionColor)
            .attr('opacity', 0)
            .transition()
            .duration(800)
            .delay(() => Math.random() * 250) // slight stagger
            .ease(d3EaseCubicInOut)
            .attr('cx', targetX)
            .attr('cy', targetY)
            .attr('r', isFocused ? 4.5 : 3)
            .attr('opacity', isFocused ? 0.85 : 0.18)
    })

    // -- Country average square markers --
    countriesPresent.forEach((cc) => {
        const avg = countryAvgs[cc]
        if (avg == null) return
        const x = xCenter(cc) - 4.5
        const y = margin.top + yScale(avg) - 4.5
        const isFocused = !focusCountry || cc === focusCountry

        dotsG
            .append('rect')
            .attr('class', 'em-chart-avg')
            .attr('x', x)
            .attr('y', y)
            .attr('width', 9)
            .attr('height', 9)
            .attr('fill', 'none')
            .attr('stroke', isFocused ? '#1a7a45' : '#999')
            .attr('stroke-width', isFocused ? 1.8 : 1)
            .attr('opacity', 0)
            .transition()
            .duration(700)
            .delay(400)
            .attr('opacity', isFocused ? 1 : 0.25)
    })

    // -- Focus annotation: show Poland's spread --
    if (focusCountry === 'PL') {
        const plData = chartData.filter((d) => d.country === 'PL').sort((a, b) => a.value - b.value)
        const plMin = plData[0]
        const plMax = plData[plData.length - 1]
        if (plMin && plMax) {
            const x = xCenter('PL')
            const y1 = margin.top + yScale(plMax.value)
            const y2 = margin.top + yScale(plMin.value)

            const annotG = overlay.append('g').attr('class', 'em-chart-annotation').attr('opacity', 0)

            // Bracket line
            annotG
                .append('line')
                .attr('x1', x + 14)
                .attr('x2', x + 14)
                .attr('y1', y1)
                .attr('y2', y2)
                .attr('stroke', '#c84040')
                .attr('stroke-width', 1.2)

            annotG
                .append('line')
                .attr('x1', x + 10)
                .attr('x2', x + 14)
                .attr('y1', y1)
                .attr('y2', y1)
                .attr('stroke', '#c84040')
                .attr('stroke-width', 1.2)
            annotG
                .append('line')
                .attr('x1', x + 10)
                .attr('x2', x + 14)
                .attr('y1', y2)
                .attr('y2', y2)
                .attr('stroke', '#c84040')
                .attr('stroke-width', 1.2)

            // Label
            annotG
                .append('text')
                .attr('x', x + 18)
                .attr('y', (y1 + y2) / 2 + 3.5)
                .attr('font-family', 'DM Sans, sans-serif')
                .attr('font-size', 9)
                .attr('fill', '#c84040')
                .text(`${plMax.value - plMin.value}pt spread`)

            // Region labels (Warsaw + poorest)
            annotG
                .append('text')
                .attr('x', x - 8)
                .attr('y', y1 - 6)
                .attr('text-anchor', 'end')
                .attr('font-family', 'DM Sans, sans-serif')
                .attr('font-size', 8)
                .attr('fill', '#1a7a45')
                .text(`${plMax.nutsId} (${plMax.value})`)
            annotG
                .append('text')
                .attr('x', x - 8)
                .attr('y', y2 + 10)
                .attr('text-anchor', 'end')
                .attr('font-family', 'DM Sans, sans-serif')
                .attr('font-size', 8)
                .attr('fill', '#c84040')
                .text(`${plMin.nutsId} (${plMin.value})`)

            annotG.transition().delay(900).duration(400).attr('opacity', 1)
        }
    }
}

let _lastFocusCountry = null

/**
 * Map a GDP index value to a fill colour matching the choropleth palette.
 * Uses the same thresholds as the map classification.
 */
function getChartDotColor(value) {
    const thresholds = CHOROPLETH_THRESHOLDS
    const colors = CHOROPLETH_COLORS
    for (let i = 0; i < thresholds.length; i++) {
        if (value < thresholds[i]) return colors[i]
    }
    return colors[colors.length - 1]
}

/**
 * Minimal cubic-in-out easing (mirrors d3.easeCubicInOut without importing d3-ease).
 * t in [0,1]
 */
function d3EaseCubicInOut(t) {
    t *= 2
    if (t < 1) return 0.5 * t * t * t
    t -= 2
    return 0.5 * (t * t * t + 2)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7.  LIBRARY NOTES — minimal additions needed in eurostatmap
// ─────────────────────────────────────────────────────────────────────────────
//
// Everything above works with the current eurostatmap API *except* one
// convenience getter. Here is what you need to add, and where:
//
//  A.  map.regionCentroids()  →  Map<nutsId, [svgX, svgY]>
//      ─────────────────────────────────────────────────────
//      Add to stat-map.js (or map-template.js), after buildMapTemplate():
//
//          out.regionCentroids = function () {
//              const result = new Map()
//              const features = out.Geometries?.geoJSONs?.nutsrg || []
//              features.forEach(f => {
//                  const id = f.properties?.id
//                  if (!id || !out._pathFunction) return
//                  const c = out._pathFunction.centroid(f)
//                  if (c && !isNaN(c[0])) result.set(id, c)
//              })
//              return result
//          }
//
//      Then in tweenToChart above replace the centroid-building loop with:
//          const centroidMap = map.regionCentroids()
//
//      This keeps all geographic knowledge inside the library and makes
//      tweenToChart portable across any eurostatmap instance.
//
//  B.  out.onBuild_ / out.onBuild()  →  already present in stat-map.js ✓
//      Called at the end of tryFinalize(). No change needed.
//
//  C.  map._pathFunction  →  set in map-template.js definePathFunction() ✓
//      Already a public-ish property. No change needed for now, but you
//      may want to expose it as map.pathFunction() via the getter/setter
//      pattern for cleanliness.
//
//  D.  map.svg()  →  already public ✓
//
//  So: the only real library addition is regionCentroids() — a 10-line
//  convenience wrapper around the already-available _pathFunction.centroid().
//
// ─────────────────────────────────────────────────────────────────────────────
