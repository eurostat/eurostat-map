import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
    adjustDuplicateThresholds,
    applyNiceNumbers,
    averageBlendHex,
    centerDivergingColorFunction,
    convertRectanglesToPaths,
    csvToIndex,
    formatRawValue,
    fromCategoryEcl,
    getBBOXAsGeoJSON,
    getEstatDataURL,
    getEstatRestDataURLBase,
    getTextColorForBackground,
    hexToRgb,
    interpolateIntensity,
    jsonstatToIndex,
    lowerCaseAllWordsExceptFirstLetters,
    multiplyBlendMultipleHex,
    roundToNiceNumber,
    spaceAsThousandSeparator,
    toCategoryEcl,
    upperCaseFirstLetter,
} from '../../../src/core/utils.js'

describe('number formatting', () => {
    it('spaceAsThousandSeparator groups thousands with a space', () => {
        assert.equal(spaceAsThousandSeparator(1234567), '1 234 567')
        assert.equal(spaceAsThousandSeparator(999), '999')
        assert.equal(spaceAsThousandSeparator(-1234.5), '-1 234.5')
    })

    it('formatRawValue groups the integer part and never rounds the decimals', () => {
        assert.equal(formatRawValue(1234567.8912), '1 234 567.8912')
        assert.equal(formatRawValue(-1234), '-1 234')
        assert.equal(formatRawValue(0), '0')
    })

    it('formatRawValue falls back to "0" for missing or non-numeric values', () => {
        for (const v of [null, undefined, NaN, 'abc']) assert.equal(formatRawValue(v), '0')
    })
})

describe('string helpers', () => {
    it('upperCaseFirstLetter only touches the first character', () => {
        assert.equal(upperCaseFirstLetter('hello world'), 'Hello world')
        assert.equal(upperCaseFirstLetter(''), '')
    })

    it('lowerCaseAllWordsExceptFirstLetters turns upper case into title case', () => {
        assert.equal(lowerCaseAllWordsExceptFirstLetters('HELLO WORLD'), 'Hello World')
    })

    it('category ecl round-trips a raw value and ignores other ecl values', () => {
        assert.equal(fromCategoryEcl(toCategoryEcl('no railway lines')), 'no railway lines')
        assert.equal(fromCategoryEcl('3'), undefined)
        assert.equal(fromCategoryEcl(3), undefined)
        assert.equal(fromCategoryEcl(undefined), undefined)
    })
})

describe('getEstatDataURL', () => {
    it('defaults to JSON in English', () => {
        assert.equal(getEstatDataURL('demo_r_d3dens'), getEstatRestDataURLBase + 'demo_r_d3dens?format=json&lang=en')
    })

    it('appends filters, repeating the parameter for array values', () => {
        assert.equal(
            getEstatDataURL('demo_r_d3dens', { time: 2021, geo: ['FR', 'DE'] }),
            getEstatRestDataURLBase + 'demo_r_d3dens?format=json&lang=en&time=2021&geo=FR&geo=DE'
        )
    })

    it('uses the given language and format', () => {
        assert.equal(getEstatDataURL('x', null, 'fr', 'csv'), getEstatRestDataURLBase + 'x?format=csv&lang=fr')
    })
})

describe('stat indexing', () => {
    it('csvToIndex converts numeric strings, keeps text and marks empty cells as no data', () => {
        const rows = [
            { id: 'FR', v: '12.5' },
            { id: 'DE', v: '' },
            { id: 'IT', v: 'abc' },
        ]
        assert.deepEqual(csvToIndex(rows, 'id', 'v'), {
            FR: { value: 12.5, status: '' },
            DE: { value: ':', status: '' },
            IT: { value: 'abc', status: '' },
        })
    })

    it('csvToIndex keeps a "0" cell as the value 0', () => {
        assert.deepEqual(csvToIndex([{ geo: 'ES', value: '0' }], 'geo', 'value'), { ES: { value: 0, status: '' } })
    })

    it('jsonstatToIndex indexes the dataset by geo code', () => {
        const jsonstat = {
            Dimension: (id) => (id === 'geo' ? { id: ['FR', 'DE'] } : undefined),
            Data: (i) => [{ value: 1, status: 'p' }, { value: 2 }][i],
        }
        assert.deepEqual(jsonstatToIndex(jsonstat), { FR: { value: 1, status: 'p' }, DE: { value: 2 } })
    })
})

describe('colours', () => {
    it('hexToRgb reads 6 and 3 digit hex codes, with or without #', () => {
        assert.deepEqual(hexToRgb('#ffffff'), [255, 255, 255])
        assert.deepEqual(hexToRgb('#fff'), [255, 255, 255])
        assert.deepEqual(hexToRgb('1a2b3c'), [26, 43, 60])
    })

    it('multiplyBlendMultipleHex: white is neutral, black absorbs, greys darken', () => {
        assert.equal(multiplyBlendMultipleHex(['#ffffff', '#336699']), '#336699')
        assert.equal(multiplyBlendMultipleHex(['#336699', '#000000']), '#000000')
        assert.equal(multiplyBlendMultipleHex(['#808080', '#808080']), '#404040')
        assert.equal(multiplyBlendMultipleHex(['#336699']), '#336699')
    })

    it('averageBlendHex averages each channel', () => {
        assert.equal(averageBlendHex(['#000000', '#ffffff']), 'rgb(127.5,127.5,127.5)')
        assert.equal(averageBlendHex(['#102030']), 'rgb(16,32,48)')
    })

    it('interpolateIntensity makes lower classes lighter than higher ones', () => {
        const lightness = (hex) => hexToRgb(hex).reduce((a, b) => a + b, 0)
        const [low, mid, high] = [0, 1, 2].map((i) => interpolateIntensity('#336699', i))
        assert.ok(lightness(low) > lightness(mid) && lightness(mid) > lightness(high))
        assert.match(high, /^#[0-9a-f]{6}$/)
    })

    it('getTextColorForBackground picks black on light and white on dark backgrounds', () => {
        assert.equal(getTextColorForBackground('#ffffff'), 'black')
        assert.equal(getTextColorForBackground('#fff'), 'black')
        assert.equal(getTextColorForBackground('#123'), 'white')
        assert.equal(getTextColorForBackground('rgb(10, 20, 30)'), 'white')
        assert.equal(getTextColorForBackground('rgb(250,250,210)'), 'black')
    })

    it('getTextColorForBackground defaults to black without a background', () => {
        assert.equal(getTextColorForBackground(''), 'black')
        assert.equal(getTextColorForBackground(undefined), 'black')
    })

    it('centerDivergingColorFunction puts the divergence point at the middle of the ramp', () => {
        const position = centerDivergingColorFunction((t) => t, [-10, 30], 0)
        assert.equal(position(-10), 0)
        assert.equal(position(0), 0.5)
        assert.equal(position(30), 1)
        // each side is stretched on its own
        assert.equal(position(-5), 0.25)
        assert.equal(position(15), 0.75)
    })

    it('centerDivergingColorFunction clamps outside the domain and applies the transform', () => {
        const position = centerDivergingColorFunction((t) => t, [-10, 30], 0)
        assert.equal(position(100), 1)
        assert.equal(position(-100), 0)

        const log = centerDivergingColorFunction((t) => t, [1, 100], 10, Math.log10)
        assert.equal(log(10), 0.5)
        assert.equal(log(100), 1)
    })
})

describe('geometry helpers', () => {
    it('getBBOXAsGeoJSON returns the two corners as a MultiPoint feature', () => {
        assert.deepEqual(getBBOXAsGeoJSON([1, 2, 3, 4]), {
            type: 'Feature',
            geometry: {
                type: 'MultiPoint',
                coordinates: [
                    [1, 2],
                    [3, 4],
                ],
            },
        })
    })

    it('convertRectanglesToPaths draws the rectangle as a closed path', () => {
        assert.equal(convertRectanglesToPaths(1, 2, 10, 20), 'M1,2L11,2 11,22 1,22z')
        assert.equal(convertRectanglesToPaths('1', '2', '10', '20'), 'M1,2L11,2 11,22 1,22z')
    })

    it('convertRectanglesToPaths returns nothing for a negative position or size', () => {
        assert.equal(convertRectanglesToPaths(-1, 2, 10, 20), '')
        assert.equal(convertRectanglesToPaths(1, 2, -10, 20), '')
    })
})

describe('nice class thresholds', () => {
    it('roundToNiceNumber snaps to the nearest nice fraction of the magnitude', () => {
        assert.equal(roundToNiceNumber(37, 0, 100), 40)
        assert.equal(roundToNiceNumber(1270, 0, 5000), 1500)
        assert.equal(roundToNiceNumber(0.0234, 0, 1), 0.025)
        assert.equal(roundToNiceNumber(0, -5, 5), 0)
    })

    it('roundToNiceNumber keeps the sign', () => {
        assert.equal(roundToNiceNumber(-37, -100, 0), -40)
    })

    it('roundToNiceNumber never leaves the data range', () => {
        assert.equal(roundToNiceNumber(960, 0, 500), 500)
        assert.equal(roundToNiceNumber(2.2, 5, 100), 5)
    })

    it('applyNiceNumbers rounds every threshold and keeps them sorted', () => {
        assert.deepEqual(applyNiceNumbers([12.3, 27.8, 41.2, 88], [1, 100]), [10, 30, 40, 90])
    })

    it('applyNiceNumbers returns an empty list without thresholds', () => {
        assert.deepEqual(applyNiceNumbers([], [1, 2]), [])
        assert.deepEqual(applyNiceNumbers(undefined, [1, 2]), [])
    })

    it('applyNiceNumbers keeps the number of classes when rounding merges two thresholds', () => {
        const result = applyNiceNumbers([10.1, 10.2, 50], [0, 100])
        const sorted = [...result].sort((a, b) => a - b)
        assert.equal(result.length, 3)
        assert.equal(new Set(result).size, 3, 'thresholds are distinct')
        assert.deepEqual(result, sorted)
        assert.ok(result.every((t) => t >= 0 && t <= 100))
    })

    it('adjustDuplicateThresholds fills the largest gap', () => {
        assert.deepEqual(adjustDuplicateThresholds([10, 50], 3, 0, 100), [10, 50, 70])
    })

    it('adjustDuplicateThresholds truncates when there are already enough thresholds', () => {
        assert.deepEqual(adjustDuplicateThresholds([1, 2, 3, 4], 2, 0, 10), [1, 2])
    })
})
