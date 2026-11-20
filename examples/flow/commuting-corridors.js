// Illustrative commuter counts. Town coordinates are real; the flows are synthetic.
const fictionalTowns = [
    { id: 'DIJ', name: 'Dijon', country: 'FR', lon: 5.04, lat: 47.32, local: 36000 },
    { id: 'BES', name: 'Besançon', country: 'FR', lon: 6.02, lat: 47.24, local: 24000 },
    { id: 'PON', name: 'Pontarlier', country: 'FR', lon: 6.35, lat: 46.9, local: 5800 },
    { id: 'LAU', name: 'Lausanne', country: 'CH', lon: 6.63, lat: 46.52, local: 41000 },
    { id: 'NEU', name: 'Neuchâtel', country: 'CH', lon: 6.93, lat: 46.99, local: 19000 },
    { id: 'BER', name: 'Bern', country: 'CH', lon: 7.45, lat: 46.95, local: 49000 },
    { id: 'BAS', name: 'Basel', country: 'CH', lon: 7.59, lat: 47.56, local: 46000 },
]
const fictionalCorridors = [
    ['DIJ', 'BES', 3200, 1300],
    ['BES', 'PON', 1700, 950],
    ['BES', 'NEU', 2300, 420],
    ['PON', 'LAU', 900, 170],
    ['PON', 'NEU', 4700, 600],
    ['LAU', 'NEU', 1200, 2100],
    ['NEU', 'BER', 3500, 1500],
    ['BER', 'BAS', 2400, 1100],
]

const form = document.querySelector('#dataset-form')
const picker = document.querySelector('#dataset')
const areaPicker = document.querySelector('#area')
const years = Object.keys(commutingCensusSources).reverse()
const areaNames = new Map(
    Object.entries(commutingCensusAreas).map(([key, { places }]) => [
        key,
        new Intl.ListFormat('en', { style: 'long' }).format(places.map(([, name]) => name)),
    ])
)
picker.prepend(...years.map((year) => new Option(`INSEE census ${year}`, year)))
areaPicker.add(new Option('All selected networks in France', 'france'))
for (const [key, name] of areaNames) areaPicker.add(new Option(name, key))

const query = new URLSearchParams(location.search)
const selectedOption = (select, fallback) => {
    const requested = query.get(select.name)
    return [...select.options].some(({ value }) => value === requested) ? requested : fallback
}
const dataset = selectedOption(picker, picker.dataset.default || years[0])
const area = selectedOption(areaPicker, areaPicker.dataset.default)
const fictional = dataset === 'fictional'
const overview = !fictional && area === 'france'
const areas = overview ? Object.values(commutingCensusAreas) : [commutingCensusAreas[fictional ? 'dijon' : area]]
picker.value = dataset
areaPicker.value = area
let navigating = false
function showDataset() {
    if (navigating || (picker.value === dataset && areaPicker.value === area)) return
    const url = new URL(location.href)
    url.searchParams.set('dataset', picker.value)
    url.searchParams.set('area', areaPicker.value)
    navigating = true
    location.assign(url.href)
}
for (const control of [picker, areaPicker]) {
    control.addEventListener('input', showDataset)
    control.addEventListener('change', showDataset)
}
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        navigating = false
        picker.value = dataset
        areaPicker.value = area
    }
})
picker.disabled = false
areaPicker.disabled = fictional
form.querySelector('button').disabled = false

if (fictional) {
    document.querySelector('#fictional-note').hidden = false
} else {
    document.body.classList.add('census')
    document.querySelector('#census-note').hidden = false
    const source = document.querySelector('#census-source')
    source.href = `https://www.insee.fr/fr/statistiques/${commutingCensusSources[dataset]}`
    source.textContent = `INSEE ${dataset} census, home-to-work flows`
}

const map = eurostatmap
    .map('flow')
    .width(795)
    .height(620)
    .responsive(true)
    .nutsLevel(overview ? 2 : 3)
    .insets(false)
    .scale('03M')

const townLabelPositions = { 39198: 'below', 70285: 'left', 25388: 'below' }
const towns = fictional
    ? fictionalTowns
    : areas.flatMap(({ places }) => places.map(([id, name, lon, lat]) => ({ id, name, lon, lat, label: townLabelPositions[id] })))
const nodes = towns.map(({ id, name, country = 'FR', lon, lat }) => {
    const [x, y] = eurostatmap.projectToMap(map, lon, lat)
    return { id, name, country, x, y }
})
const links = fictional
    ? [
          ...fictionalCorridors.flatMap(([a, b, forward, reverse]) => [
              { source: a, target: b, value: forward },
              { source: b, target: a, value: reverse },
          ]),
          ...fictionalTowns.map(({ id, local }) => ({ source: id, target: id, value: local })),
      ]
    : areas
          .flatMap(({ places, flows }) =>
              flows[dataset].flatMap((row, i) => row.map((value, j) => ({ source: places[i][0], target: places[j][0], value })))
          )
          .filter(({ value }) => value > 0)

const domestic = '#256982'
const crossBorder = '#a14927'

// Preserve width and circle area scales when changing year within one census area.
const largestFlow = Math.max(...links.filter(({ source, target }) => source !== target).map(({ value }) => value))
const flowValues = [0.25, 0.5].map((share) => Math.round((largestFlow * share) / 10) * 10).concat(largestFlow)
const matrices = areas.flatMap(({ flows }) => Object.values(flows))
const largestCensusFlow = Math.max(...matrices.flatMap((matrix) => matrix.flatMap((row, i) => row.filter((_, j) => i !== j))))
const largestLocalFlow = fictional ? 49000 : Math.max(...matrices.flatMap((matrix) => matrix.map((row, i) => row[i])))
const nodeSizeScale = (value) => (overview ? 2.3 : 15) * Math.sqrt(value / largestLocalFlow)
nodeSizeScale.domain = () => [0, largestLocalFlow]
const counts = new Intl.NumberFormat('en')
const views = {
    fictional: {
        center: [6.48, 47.04],
        z: 465,
        countries: [
            ['FRANCE', 5.38, 46.8],
            ['SWITZERLAND', 7.46, 46.58],
        ],
        regions: [['BOURGOGNE-FRANCHE-COMTÉ', 5.68, 47.63]],
    },
    france: { center: [2.48, 46.64], z: 1940, countries: [['FRANCE', 2.35, 46.49]], regions: [] },
    dijon: {
        center: [5.55, 47.23],
        z: 158,
        countries: [['FRANCE', 5.54, 47.56]],
        regions: [
            ['CÔTE-D’OR', 5.05, 47.48],
            ['JURA', 5.66, 47.0],
            ['DOUBS', 6.08, 47.13],
        ],
    },
    belfort: {
        center: [6.83, 47.566],
        z: 55,
        countries: [
            ['FRANCE', 6.75, 47.68],
            ['SWITZERLAND', 7.025, 47.439],
        ],
        regions: [
            ['HAUTE-SAÔNE', 6.64, 47.616],
            ['TERRITOIRE DE BELFORT', 6.94, 47.574],
            ['DOUBS', 6.74, 47.467],
        ],
    },
}
const view = views[fictional ? 'fictional' : area]
const countries = view?.countries || []
const regions = view?.regions || []
const eastings = nodes.map(({ x }) => x)
const northings = nodes.map(({ y }) => y)
const [minX, maxX] = [Math.min(...eastings), Math.max(...eastings)]
const [minY, maxY] = [Math.min(...northings), Math.max(...northings)]
const [x, y] = view ? eurostatmap.projectToMap(map, ...view.center) : [(minX + maxX) / 2, (minY + maxY) / 2]
const z = view?.z || Math.max((maxX - minX) / 475, (maxY - minY) / 330)
const subtitle = fictional
    ? 'Fictional commuter counts in the French–Swiss border region'
    : `${overview ? `${areas.length} selected local networks` : areas[0].region} · INSEE census ${dataset}`

function avoidLabelCollisions() {
    const svg = map.svg().node()
    const frame = svg.getBoundingClientRect()
    const occupied = [...svg.querySelectorAll('.em-legend, [id^="title"], [id^="subtitle"]')]
        .map((element) => element.getBoundingClientRect())
        .filter(({ width, height }) => width && height)
    const labels = [...svg.querySelectorAll('.town-label'), ...svg.querySelectorAll('.country-label'), ...svg.querySelectorAll('.region-label')]
    for (const label of labels) {
        const box = label.getBoundingClientRect()
        const outside = box.left < frame.left || box.right > frame.right || box.top < frame.top || box.bottom > frame.bottom
        const overlaps = occupied.some(
            (other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
        )
        label.style.visibility = outside || overlaps ? 'hidden' : 'visible'
        if (!outside && !overlaps) occupied.push(box)
    }
}

map.title(fictional || overview ? document.title : areaNames.get(area))
    .subtitle(subtitle)
    .position({ x, y, z })
    .drawCoastalMargin(false)
    .flowGraph({ nodes, links })
    .flowSettings({
        lineType: 'straight',
        bidirectionalLayout: 'parallel',
        arrows: true,
        color: ({ source, target }) => (source.country === target.country ? domestic : crossBorder),
        opacity: 1,
        maxWidth: fictional ? 11 : ((overview ? 4 : 8) * largestFlow) / largestCensusFlow,
        minWidth: overview ? 0.35 : 1,
        nodes: true,
        nodeType: 'circle',
        nodeSizeBy: 'internal',
        nodeSizeScale,
    })
    .legend({
        position: 'top right',
        flowWidthLegend: {
            title: 'Between towns',
            titlePadding: 40,
            values: flowValues,
            labels: flowValues.map((value) => counts.format(value)),
        },
        nodeSizeLegend: {
            title: 'Within each town',
            values: overview ? [largestLocalFlow] : [largestLocalFlow, Math.round(largestLocalFlow / 1000) * 100],
        },
        flowColorLegend: {
            title: 'Corridor type',
            marginTop: 30,
            items: [
                { label: 'Domestic', color: domestic },
                { label: 'Cross-border', color: crossBorder },
            ],
        },
    })
    .onZoom(avoidLabelCollisions)
    .onBuild((map) => {
        const geographicLabels = map.svg().select('#em-zoom-group-map').append('g')
        for (const [places, className] of [
            [countries, 'country-label'],
            [regions, 'region-label'],
        ]) {
            geographicLabels
                .selectAll(`.${className}`)
                .data(places)
                .join('text')
                .attr('class', className)
                .attr('text-anchor', 'middle')
                .attr('transform', ([, lon, lat]) => `translate(${map._projection(eurostatmap.projectToMap(map, lon, lat))})`)
                .text(([name]) => name)
        }

        const townById = new Map(towns.map((town) => [town.id, town]))
        map.svg()
            .selectAll('.em-node-circle-group')
            .each(function () {
                const { name, label } = townById.get(this.getAttribute('data-id'))
                const radius = Number(this.querySelector('circle').getAttribute('r'))
                const x = label === 'left' ? -radius - 5 : 0
                const y = label === 'below' ? radius + 14 : label === 'left' ? 4 : -radius - 5
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
                text.setAttribute('class', 'town-label')
                text.setAttribute('text-anchor', label === 'left' ? 'end' : 'middle')
                text.setAttribute('x', x)
                text.setAttribute('y', y)
                text.textContent = name
                this.append(text)
            })
        avoidLabelCollisions()
    })

map.statData().unitText('commuters')
map.build()
