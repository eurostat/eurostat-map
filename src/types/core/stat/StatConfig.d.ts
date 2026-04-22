/**
 * Configuration for statistical data sources
 */
export interface StatConfig {
    // Eurostat API data
    eurostatDatasetCode?: string
    filters?: { [key: string]: string }
    unitText?: string

    // CSV data
    csvURL?: string
    geoCol?: string
    valueCol?: string

    // Custom data (set via statData().setData())

    [key: string]: any
}
