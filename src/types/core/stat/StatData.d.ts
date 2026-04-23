import type { StatConfig } from './StatConfig'

/**
 * A statistical dataset indexed by NUTS region ID.
 * Returned by map.statData() and created internally by statData().
 */
export interface StatData {
    /**
     * Returns the stat entry {value, status} for a given NUTS ID.
     * If called with no argument, returns the entire data index.
     * @example map.statData().get('DE')  // → { value: 120, status: 'e' }
     */
    get(nutsId?: string): { value: any; status?: string } | Record<string, { value: any; status?: string }> | undefined

    /**
     * Returns the raw value for a given NUTS ID.
     * @example map.statData().getValue('DE')  // → 120
     */
    getValue(nutsId: string): any

    /**
     * Sets a stat value for a given NUTS ID.
     * @param nutsId - The NUTS region ID.
     * @param stat - Either a value directly or an object { value, status }.
     * @example map.statData().set('DE', 120)
     * @example map.statData().set('DE', { value: 120, status: 'e' })
     */
    set(nutsId: string, stat: any): this

    /**
     * Sets the entire dataset at once, indexed by NUTS ID.
     * Overwrites any previously loaded data.
     * @example
     * map.statData().setData({ DE: 120, FR: 95, IT: 88 })
     * // or with status:
     * map.statData().setData({ DE: { value: 120, status: 'e' }, FR: 95 })
     */
    setData(data: Record<string, number | string | { value: any; status?: string }>): this

    /**
     * Sets multi-date data for sparkline maps.
     * @example
     * map.statData().setManualMultiDate({ DE: { '2020': 100, '2021': 110 } })
     */
    setManualMultiDate(data: Record<string, Record<string, number>>): this

    /** Returns true if data has been loaded. */
    hasData(): boolean

    /** Returns true if the loaded data contains at least one finite numeric value. */
    hasNumericData(): boolean

    /** Returns all stat values as a flat array, for use in classification. */
    getArray(): any[]

    /** Returns all unique stat values, for use in categorical maps. */
    getUniqueValues(): any[]

    /** Returns the minimum numeric value in the dataset. */
    getMin(): number | undefined

    /** Returns the maximum numeric value in the dataset. */
    getMax(): number | undefined

    /** Returns the NUTS ID of the region with the highest value. */
    getMaxRegionId(): string | undefined

    /** Returns the NUTS ID of the region with the lowest value. */
    getMinRegionId(): string | undefined

    /** Returns true if the data is ready to be used for rendering. */
    isReady(): boolean

    /**
     * Returns the time stamp of the loaded Eurostat dataset.
     * Reflects the 'time' filter if set, otherwise the first time dimension in the API response.
     */
    getTime(): string | undefined

    /** Unit of measure label shown in tooltips. e.g. 'people/km²' */
    unitText(): string | undefined
    unitText(text: string): this

    /** Metadata from the Eurostat API response or CSV source. */
    metadata?: {
        label?: string
        href?: string
        source?: string
        updated?: string
        time?: string
        extension?: any
    }

    /** Eurostat dataset code. */
    eurostatDatasetCode_?: string
    /** CSV source URL. */
    csvURL_?: string

    /**
     * Fetches data from the configured remote source (Eurostat API or CSV).
     * Called internally by the map build pipeline.
     * @param nutsLevel - NUTS level (0–3).
     * @param lang - BCP 47 language code. e.g. 'en'
     * @param callback - Called when data is ready.
     */
    retrieveFromRemote(nutsLevel: number, lang: string, callback: () => void): this
}
