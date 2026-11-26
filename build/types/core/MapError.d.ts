/** What map.onError() receives. */
export interface MapError {
    /**
     * `geometry`: boundary data could not be loaded (the map shows a message). `data`: statistics could not be loaded.
     * `render`: the data arrived but drawing failed.
     */
    type: 'geometry' | 'data' | 'render'
    /** A message that can be shown to the reader. */
    message: string
    /** For `data` errors: the statistical dataset's key (`default`, `size`, ...). */
    statKey?: string
    /** For `geometry` errors: the geography that failed (an inset's, or the map's). */
    geo?: string
    /** The underlying error. */
    cause?: unknown
}
