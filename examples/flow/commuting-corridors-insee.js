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
const overview = area === 'france'
const areas = overview ? Object.values(commutingCensusAreas) : [commutingCensusAreas[area]]
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
areaPicker.disabled = false
form.querySelector('button').disabled = false

document.body.classList.add('census')
document.querySelector('#census-note').hidden = false
const source = document.querySelector('#census-source')
source.href = `https://www.insee.fr/fr/statistiques/${commutingCensusSources[dataset]}`
source.textContent = `INSEE ${dataset} census, home-to-work flows`

const townLabelPositions = { 39198: 'bottom', 70285: 'left', 25388: 'bottom' }
const towns = areas.flatMap(({ places }) => places.map(([id, name, lon, lat]) => ({ id, name, lon, lat, labelPosition: townLabelPositions[id] })))
const links = areas
    .flatMap(({ places, flows }) =>
        flows[dataset].flatMap((row, i) => row.map((value, j) => ({ source: places[i][0], target: places[j][0], value })))
    )
    .filter(({ value }) => value > 0)

// Keep the width and area scales stable when switching census year.
const matrices = areas.flatMap(({ flows }) => Object.values(flows))
const largestCensusFlow = Math.max(...matrices.flatMap((matrix) => matrix.flatMap((row, i) => row.filter((_, j) => i !== j))))
const largestLocalFlow = Math.max(...matrices.flatMap((matrix) => matrix.map((row, i) => row[i])))
const views = {
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
renderCommutingMap({
    towns,
    links,
    view: views[area],
    title: overview ? document.title : areaNames.get(area),
    subtitle: `${overview ? `${areas.length} selected local networks` : areas[0].region} · INSEE census ${dataset}`,
    overview,
    maxFlowWidth: overview ? 4 : 8,
    scaleMaxFlow: largestCensusFlow,
    scaleMaxLocal: largestLocalFlow,
})
