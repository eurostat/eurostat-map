export function statData(config: any): {
    __data: any;
    /**
     * The statistical values, indexed by NUTS id.
     * Each stat value is an object {value,status}.
     */
    _data_: any;
    get(nutsId: any): any;
    getValue(nutsId: any): any;
    set(nutsId: string, stat: any): /*elided*/ any;
    setData(data: any): /*elided*/ any;
    setManualMultiDate(dataObject: any): /*elided*/ any;
    hasData(): boolean;
    hasNumericData(): boolean;
    getArray(): any[];
    getUniqueValues(): any[];
    getMin(): any;
    getMax(): any;
    getMaxRegionId(): string;
    getMinRegionId(): string;
    isReady(): boolean;
    /** Some metadata */
    metadata: any;
    unitText_: any;
    retrieveFromRemote(nutsLevel: any, lang: any, callback: any): /*elided*/ any;
    /**
     * Eurobase/jsonstat data source
     * See https://ec.europa.eu/eurostat/web/json-and-unicode-web-services/getting-started/rest-request
     */
    /** The Eurobase dataset code */
    eurostatDatasetCode_: any;
    /** The Eurobase code */
    filters_: {
        lastTimePeriod: number;
    };
    /** The precision (number of decimal places) */
    precision_: number;
    /** Dataset label/name */
    label_: any;
    getTime(): any;
    /**
     * CSV data source
     */
    /** The CSV file URL */
    csvURL_: any;
    /** The CSV column with the NUTS ids */
    geoCol_: string;
    /** The CSV column with the statistical values */
    valueCol_: string;
};
//# sourceMappingURL=stat-data.d.ts.map