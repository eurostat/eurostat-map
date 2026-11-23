// Adds `availableCount` (seats available, Eurostat tra_meas ST_PAS) to each flight in
// eurostat-flight-data.json, using the same avia_par_XX route data as the passenger counts.
// Passenger counts (PAS_CRD) are refreshed from the same snapshot.
// Usage: node fetch-seats.mjs
import fs from 'node:fs'

const FILE = new URL('./eurostat-flight-data.json', import.meta.url)
const COUNTRIES = 'be bg dk de ee ie el es fr hr it cy lv lt lu hu mt nl at pl pt ro si sk se cz fi uk no ch tr'.split(' ')
const url = (cc, measure, unit) =>
    `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/avia_par_${cc}?format=JSON&tra_meas=${measure}&unit=${unit}&TIME=2024&freq=A`

// sum the values of a JSON-stat response by "ORIGIN|DESTINATION" (ICAO codes from the airp_pr category)
function routeTotals(json, into) {
    const { id, size, dimension, value } = json
    const pos = id.indexOf('airp_pr')
    const stride = size.slice(pos + 1).reduce((a, b) => a * b, 1)
    const byIndex = {}
    for (const [k, i] of Object.entries(dimension.airp_pr.category.index)) byIndex[i] = k
    for (const [flat, v] of Object.entries(value)) {
        const parts = (byIndex[Math.floor(Number(flat) / stride) % size[pos]] || '').split('_')
        if (parts.length < 4) continue
        const key = `${parts[1]}|${parts[3]}`
        into.set(key, (into.get(key) || 0) + v)
    }
}

async function fetchAll(measure, unit) {
    const totals = new Map()
    await Promise.all(
        COUNTRIES.map(async (cc) => {
            const r = await fetch(url(cc, measure, unit))
            if (!r.ok) return console.warn('skipped', cc, measure, r.status)
            routeTotals(await r.json(), totals)
        })
    )
    return totals
}

const [pax, seats] = await Promise.all([fetchAll('PAS_CRD', 'PAS'), fetchAll('ST_PAS', 'SEAT')])
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))

// Eurostat revises its data, so refresh the passenger counts from the same snapshot as the seats
// (keeps empty seats = seats - passengers consistent). Refuse to write if anything moved implausibly.
let maxChange = 0
let noSeats = 0
for (const f of data.flights) {
    const fresh = pax.get(f.key)
    if (fresh) {
        maxChange = Math.max(maxChange, Math.abs(fresh - f.count) / f.count)
        f.count = fresh
    }
    f.availableCount = seats.get(f.key) || 0
    if (!f.availableCount) noSeats++
}
console.log(`${data.flights.length} flights; largest passenger-count revision: ${(maxChange * 100).toFixed(1)}%; without seat data: ${noSeats}`)
if (maxChange > 0.25) throw new Error('Passenger counts moved by more than 25%; check the data before writing')

// airport totals (incoming/outgoing/total) are left as they were
fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n')
