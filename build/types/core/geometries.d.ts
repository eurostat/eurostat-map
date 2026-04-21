export function Geometries(map: any, withCenterPoints: any): {
    defaultGeoData: any;
    allNUTSGeoData: any;
    geoJSONs: {
        mixed: {
            rg0: any;
            rg1: any;
            rg2: any;
            rg3: any;
        };
        cntbn: any;
        cntrg: any;
        nutsbn: any;
        nutsrg: any;
        gra: any;
        worldrg: any;
        worldbn: any;
        kosovo: any;
    };
    userGeometries: any;
    statisticalRegions: any;
    centroidsData: any;
    centroidsFeatures: any;
    _allCentroidsFeatures: any;
    getRegionFeatures(): any;
    getDefaultGeoData(geo: any, filterGeometriesFunction: any, nutsLevel: any): Promise<any>;
    getDefaultGeoDataPromise(): Promise<any>[];
    isGeoReady(): boolean;
    setUserGeometries(geometries: any): void;
    addDefaultGeometriesToMap(container: any, drawGraticule: any, pathFunction: any, nutsLevel: any, nutsYear: any, geo: any, proj: any, scale: any): void;
    addUserGeometriesToMap(geometries: any, container: any, pathFunction: any): void;
    getAllRegionFeatures(): any;
    getRegionCentroids(pathFunction: any): Map<any, any>;
};
//# sourceMappingURL=geometries.d.ts.map