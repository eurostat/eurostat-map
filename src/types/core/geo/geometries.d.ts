import type { MapInstance } from '../MapInstance'

/**
 * Geometries class for managing geographic data loading and rendering.
 * Handles NUTS regions, country boundaries, centroids, and custom geometries.
 */
export interface GeometriesClass {
    /** Default geographic data (NUTS regions, countries, etc.) */
    defaultGeoData: any
    /** All NUTS level data (for mixed level maps) */
    allNUTSGeoData: any
    /** Centroid point data */
    centroidsData: any
    /** Processed GeoJSON features organized by type */
    geoJSONs: {
        /** Nutsrg. */
        nutsrg?: any[]
        /** Nutsbn. */
        nutsbn?: any[]
        /** Cntrg. */
        cntrg?: any[]
        /** Cntbn. */
        cntbn?: any[]
        /** Worldrg. */
        worldrg?: any[]
        /** Graticule. */
        graticule?: any[]
        /** Mixed. */
        mixed?: any
    }
    /** User-provided custom geometries */
    userGeometries: boolean
    /** Centroid features with projected coordinates */
    centroidsFeatures: any[]
    /** Master copy of all centroid features before filtering */
    _allCentroidsFeatures: any[]

    /** Fetches default geographic data from NUTS2JSON */
    getDefaultGeoData(geo: string, filterFunction: any, nutsLevel: number | string): Promise<void>
    /** Sets user-defined custom geometries */
    setUserGeometries(geometries: any[]): void
    /** Adds default NUTS geometries to the map */
    addDefaultGeometriesToMap(
        /** Zoom group. */
        zoomGroup: any,
        /** Draw graticule. */
        drawGraticule: boolean,
        /** Path function. */
        pathFunction: any,
        /** Nuts level. */
        nutsLevel: number | string,
        /** Nuts year. */
        nutsYear: number,
        /** Geo. */
        geo: string,
        /** Proj. */
        proj: string,
        /** Scale. */
        scale: string
    ): void
    /** Adds user-defined geometries to the map */
    addUserGeometriesToMap(geometries: any[], zoomGroup: any, pathFunction: any): void
}

/**
 * Factory function that creates a Geometries instance for a map.
 * @param map - The map instance
 * @param withCenterPoints - Whether to load centroid data
 * @returns Geometries instance
 */
export function Geometries(map: MapInstance, withCenterPoints: boolean): GeometriesClass
