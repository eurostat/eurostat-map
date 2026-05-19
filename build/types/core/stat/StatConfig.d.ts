/**
 * Configuration for a statistical data source.
 * Pass this to map.stat() or as the config argument to statData().
 */
export interface StatConfig {
    /** Eurostat dataset code. e.g. 'demo_r_d3dens' */
    eurostatDatasetCode?: string
    /**
     * Filters for the Eurostat API query.
     * @example { TIME: '2024', UNIT: 'EUR_HAB' }
     */
    filters?: Record<string, string>
    /** Number of decimal places for Eurostat API data. @default 2 */
    precision?: number
    /** URL of a CSV file to use as the data source. */
    csvURL?: string
    /** CSV column containing NUTS region IDs. @default 'geo' */
    geoCol?: string
    /** CSV column containing statistical values. @default 'value' */
    valueCol?: string
    /** Unit of measure label shown in tooltips. e.g. 'people/km²' */
    unitText?: string
    /** Optional transform function applied to raw values after data loads. e.g. v => v * 1000 */
    transform?: (value: number) => number
    /** Dataset label/name from the Eurostat API response. */
    label?: string
}
