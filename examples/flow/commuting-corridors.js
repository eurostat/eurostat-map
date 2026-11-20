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

const censusSources = { 2019: '6454112', 2020: '7630376', 2021: '8201899', 2022: '8582949' }

// INSEE NBFLUX_Cxx_ACTOCC15P. Each matrix uses the listed commune order for
// residence (rows) and workplace (columns). Diagonal counts size the circles.
const censusAreas = {
    dijon: {
        name: 'Dijon, Dole and Besançon',
        communes: [
            { id: '21231', name: 'Dijon', lon: 5.04, lat: 47.32 },
            { id: '39198', name: 'Dole', lon: 5.49, lat: 47.09, label: 'below' },
            { id: '25056', name: 'Besançon', lon: 6.02, lat: 47.24 },
        ],
        center: [5.55, 47.23],
        zoom: 158,
        countries: [['FRANCE', 5.54, 47.56]],
        regions: [
            ['CÔTE-D’OR', 5.05, 47.48],
            ['JURA', 5.66, 47.0],
            ['DOUBS', 6.08, 47.13],
        ],
        flows: {
            2019: [
                [44835, 160, 206],
                [308, 5264, 298],
                [226, 255, 34409],
            ],
            2020: [
                [45808, 148, 204],
                [342, 5183, 311],
                [220, 255, 34858],
            ],
            2021: [
                [47566, 182, 211],
                [357, 5401, 311],
                [207, 298, 36027],
            ],
            2022: [
                [48880, 180, 242],
                [340, 5485, 325],
                [215, 268, 36825],
            ],
        },
    },
    belfort: {
        name: 'Belfort, Héricourt and Montbéliard',
        communes: [
            { id: '90010', name: 'Belfort', lon: 6.841, lat: 47.6458 },
            { id: '70285', name: 'Héricourt', lon: 6.7594, lat: 47.5666, label: 'left' },
            { id: '25388', name: 'Montbéliard', lon: 6.7834, lat: 47.5168, label: 'below' },
        ],
        center: [6.83, 47.566],
        zoom: 55,
        countries: [
            ['FRANCE', 6.75, 47.68],
            ['SWITZERLAND', 7.025, 47.439],
        ],
        regions: [
            ['HAUTE-SAÔNE', 6.64, 47.616],
            ['TERRITOIRE DE BELFORT', 6.94, 47.574],
            ['DOUBS', 6.74, 47.467],
        ],
        flows: {
            2019: [
                [9359, 242, 855],
                [467, 1224, 464],
                [365, 102, 3955],
            ],
            2020: [
                [9017, 264, 780],
                [452, 1221, 467],
                [330, 110, 3894],
            ],
            2021: [
                [9021, 231, 843],
                [402, 1236, 501],
                [428, 149, 3764],
            ],
            2022: [
                [9393, 210, 796],
                [384, 1245, 486],
                [419, 144, 3781],
            ],
        },
    },
}

const form = document.querySelector('#dataset-form')
const picker = document.querySelector('#dataset')
const areaPicker = document.querySelector('#area')
const query = new URLSearchParams(location.search)
const requested = query.get('dataset')
const dataset = [...picker.options].some(({ value }) => value === requested) ? requested : '2022'
const area = Object.hasOwn(censusAreas, query.get('area')) ? query.get('area') : 'dijon'
const selectedArea = censusAreas[area]
const fictional = dataset === 'fictional'
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
    source.href = `https://www.insee.fr/fr/statistiques/${censusSources[dataset]}`
    source.textContent = `INSEE ${dataset} census, home-to-work flows`
}

const map = eurostatmap.map('flow').width(795).height(620).responsive(true).nutsLevel(3).insets(false).scale('03M')
const [x, y] = eurostatmap.projectToMap(map, ...(fictional ? [6.48, 47.04] : selectedArea.center))

const towns = fictional ? fictionalTowns : selectedArea.communes
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
    : selectedArea.flows[dataset].flatMap((row, i) => row.map((value, j) => ({ source: towns[i].id, target: towns[j].id, value })))

const domestic = '#256982'
const crossBorder = '#a14927'

// Preserve width and circle area scales when changing year within one census area.
const largestFlow = Math.max(...links.filter(({ source, target }) => source !== target).map(({ value }) => value))
const flowValues = [0.25, 0.5].map((share) => Math.round((largestFlow * share) / 10) * 10).concat(largestFlow)
const matrices = Object.values(selectedArea.flows)
const largestCensusFlow = Math.max(...matrices.flatMap((matrix) => matrix.flatMap((row, i) => row.filter((_, j) => i !== j))))
const largestLocalFlow = fictional ? 49000 : Math.max(...matrices.flatMap((matrix) => matrix.map((row, i) => row[i])))
const nodeSizeScale = (value) => 15 * Math.sqrt(value / largestLocalFlow)
nodeSizeScale.domain = () => [0, largestLocalFlow]
const counts = new Intl.NumberFormat('en')
const countries = fictional
    ? [
          ['FRANCE', 5.38, 46.8],
          ['SWITZERLAND', 7.46, 46.58],
      ]
    : selectedArea.countries
const regions = fictional ? [['BOURGOGNE-FRANCHE-COMTÉ', 5.68, 47.63]] : selectedArea.regions

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

map.title(document.title)
    .subtitle(fictional ? 'Fictional commuter counts in the French–Swiss border region' : `${selectedArea.name} · INSEE census ${dataset}`)
    .position({ x, y, z: fictional ? 465 : selectedArea.zoom })
    .drawCoastalMargin(false)
    .flowGraph({ nodes, links })
    .flowSettings({
        lineType: 'straight',
        bidirectionalLayout: 'parallel',
        arrows: true,
        color: ({ source, target }) => (source.country === target.country ? domestic : crossBorder),
        opacity: 1,
        maxWidth: fictional ? 11 : (8 * largestFlow) / largestCensusFlow,
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
        nodeSizeLegend: { title: 'Within each town', values: [largestLocalFlow, Math.round(largestLocalFlow / 1000) * 100] },
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
