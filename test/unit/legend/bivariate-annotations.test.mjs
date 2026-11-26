import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    getAnnotationLineEndOffset,
    getAnnotationLineLength,
    getAnnotationOffset,
    splitMultilineText,
} from '../../../src/legend/choropleth/bivariate-annotations.js'

describe('bivariate corner annotations', () => {
    it('splits a text on newlines and <br> tags', () => {
        assert.deepEqual(splitMultilineText('High A<br/>low B\nand more<BR>'), ['High A', 'low B', 'and more'])
        assert.deepEqual(splitMultilineText(undefined), [])
    })

    it('places a label outwards from its corner unless an offset is configured', () => {
        assert.deepEqual(getAnnotationOffset({}, 'topLeft', -1, 0.5), { x: -8, y: 4, isCustom: false })
        assert.deepEqual(getAnnotationOffset({ annotationOffsets: { topLeft: { x: 3 } } }, 'topLeft', -1, 0.5), { x: 3, y: 4, isCustom: true })
        assert.deepEqual(getAnnotationOffset({ annotationOffsets: { y: 2 } }, 'topLeft', -1, 0.5), { x: -8, y: 2, isCustom: true })
    })

    it('reads the line end offset per corner or for all corners', () => {
        assert.deepEqual(getAnnotationLineEndOffset({}, 'topLeft'), { x: 0, y: 0 })
        assert.deepEqual(getAnnotationLineEndOffset({ annotationLineEndOffsets: { topLeft: { y: 5 } } }, 'topLeft'), { x: 0, y: 5 })
        assert.deepEqual(getAnnotationLineEndOffset({ annotationLineEndOffsets: { x: 2 } }, 'topRight'), { x: 2, y: 0 })
    })

    it('keeps a line at least 2px long and follows a moved label', () => {
        assert.equal(getAnnotationLineLength({}, 'topLeft', 1, 0, { isCustom: false }), 18)
        assert.equal(getAnnotationLineLength({ annotationLineLength: { topLeft: 10 } }, 'topLeft', 1, 0, { isCustom: true, x: 5, y: 0 }), 15)
        assert.equal(getAnnotationLineLength({ annotationLineLength: 1 }, 'topLeft', 1, 0, { isCustom: false }), 2)
    })
})
