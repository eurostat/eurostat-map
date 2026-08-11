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

    /** Returns GeoJSON features for all statistical regions at the map's current NUTS level
     * (or the 4-level array [rg0,rg1,rg2,rg3] when nutsLevel is 'mixed', or worldrg for WORLD geo). */
    getRegionFeatures(): any[]

    /** Fetches default geographic data from NUTS2JSON */
    getDefaultGeoData(geo: string, filterFunction: any, nutsLevel: number | string): Promise<any[]>
    /** Returns the array of NUTS2JSON fetch promises used by getDefaultGeoData(). */
    getDefaultGeoDataPromise(): Promise<any>[]
    /** Returns true once default geo data (or user geometries) has loaded for this map and every inset. */
    isGeoReady(): boolean
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
    /** Returns all statistical region features (used e.g. for statistical value labelling). */
    getAllRegionFeatures(): any[]
    /** Returns a Map of region id -> projected [x, y] centroid, computed via the given d3 path function. */
    getRegionCentroids(pathFunction: any): Map<string, [number, number]>
}

/**
 * Factory function that creates a Geometries instance for a map.
 * @param map - The map instance
 * @param withCenterPoints - Whether to load centroid data
 * @returns Geometries instance
 */
export function Geometries(map: MapInstance, withCenterPoints: boolean): GeometriesClass
