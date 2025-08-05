import proj4 from 'proj4'

export function initProj4() {
    // Load proj4 definitions for dynamic minimaps that are linked to the main map view and also for placename labels

    // 3035 LAEA projection
    proj4.defs('EPSG:3035', '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs')

    // 54030 Robinson projection
    proj4.defs('EPSG:54030', '+proj=robin +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs')
}

// Export helper for convenience
export const projectToMap = (map, lon, lat) => {
    switch (map.proj_) {
        case '3035':
            return proj4('EPSG:4326', 'EPSG:3035', [lon, lat])
        case '54030':
            return proj4('EPSG:4326', 'EPSG:54030', [lon, lat])
        default:
            return [lon, lat] // already in map coords
    }
}

// Optionally also export the inverse for things like minimap center
export const projectFromMap = (map, x, y) => {
    switch (map.proj_) {
        case '3035':
            return proj4('EPSG:3035', 'EPSG:4326', [x, y])
        case '54030':
            return proj4('EPSG:54030', 'EPSG:4326', [x, y])
        default:
            return [x, y]
    }
}
