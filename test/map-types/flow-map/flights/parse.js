proj4.defs(
    "EPSG:3035",
    "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 " +
    "+ellps=GRS80 +units=m +no_defs +type=crs"
)
const to3035 = ([lon, lat]) => proj4("EPSG:4326", "EPSG:3035", [lon, lat])

/**
 * Convert flightsGraph { airports: [...], flights: [...] } into { nodes: [...], links: [...] }
 * ensuring node.x/node.y are in EPSG:3035 (ETRS89 / LAEA Europe) using global `proj4`.
 *
 * Options:
 *  - keepAirportProps (default: true) : attach original airport object to node.airportRaw
 *
 * @param {Object} data - the original flightsGraph
 * @param {Object} [opts]
 * @returns {{nodes: Array, links: Array}}
 */
export function toFlowGraph(data, opts = {}) {
    const keepProps = opts.keepAirportProps !== false;

    if (typeof globalThis?.proj4 !== 'function') {
        throw new Error('proj4 must be available globally (proj4).');
    }

    const airports = Array.isArray(data?.airports) ? data.airports : [];
    const flights = Array.isArray(data?.flights) ? data.flights : [];

    // canonical node id getter (prefer .code, else iata, else icao, else name)
    const nodeIdOf = (a) => a?.code ?? a?.iata ?? a?.icao ?? a?.name;

    // Build node map from airports
    const nodeById = new Map();
    for (const a of airports) {
        const id = nodeIdOf(a);
        if (!id) continue;

        //to epsg3035
        let x
        let y
        if (a.longitude != null && a.latitude != null) {
            const p = to3035([+a.longitude, +a.latitude]);
            if (p && p.length >= 2 && isFinite(p[0]) && isFinite(p[1])) {
                x = p[0];
                y = p[1];
            }
        }

        nodeById.set(id, {
            id,
            name: a.name ?? id,
            code: a.code ?? null,
            iata: a.iata ?? null,
            icao: a.icao ?? null,
            city: a.city ?? null,
            country: a.country ?? null,
            latitude: (a.latitude != null) ? +a.latitude : undefined,
            longitude: (a.longitude != null) ? +a.longitude : undefined,
            x: x != null ? +x : null,
            y: y != null ? +y : null,
            incoming: typeof a.incoming === 'number' ? a.incoming : undefined,
            outgoing: typeof a.outgoing === 'number' ? a.outgoing : undefined,
            total: typeof a.total === 'number' ? a.total : undefined,
            ...(keepProps ? { airportRaw: a } : {})
        });
    }

    // Aggregate flights into linkMap keyed by "ORIG|DEST"
    const linkMap = new Map();
    for (const f of flights) {
        const origin = f.origin ?? (f.key && f.key.split('|')[0]) ?? null;
        const dest = f.destination ?? (f.key && f.key.split('|')[1]) ?? null;
        if (!origin || !dest) continue;
        const key = `${origin}|${dest}`;
        const v = Number(f.count ?? f.value ?? 0) || 0;
        if (!linkMap.has(key)) linkMap.set(key, { origin, dest, value: 0, raw: [] });
        const rec = linkMap.get(key);
        rec.value += v;
        rec.raw.push(f);
    }

    // Ensure all endpoints exist in nodes (create placeholders if necessary)
    for (const { origin, dest } of linkMap.values()) {
        if (!nodeById.has(origin)) {
            nodeById.set(origin, { id: origin, name: origin, x: null, y: null });
        }
        if (!nodeById.has(dest)) {
            nodeById.set(dest, { id: dest, name: dest, x: null, y: null });
        }
    }

    // Build nodes array preserving airports ordering first
    const seen = new Set();
    const nodes = [];
    for (const a of airports) {
        const id = nodeIdOf(a);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        nodes.push(nodeById.get(id));
    }
    for (const [id, node] of nodeById.entries()) {
        if (!seen.has(id)) {
            nodes.push(node);
            seen.add(id);
        }
    }

    // Build links array (source/dest as IDs)
    const links = Array.from(linkMap.values()).map((l) => ({
        source: l.origin,
        target: l.dest,
        value: l.value,
        raw: l.raw
    }));

    return { nodes, links };
}
