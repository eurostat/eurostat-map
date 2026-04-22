/**
 * Statistical data object
 */
export interface StatData {
    setData(data: { [regionId: string]: number }): this
    getData(): { [regionId: string]: number }
    set(regionId: string, value: number): this
    get(regionId: string): number | undefined

    [key: string]: any
}
