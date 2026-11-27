import assert from 'node:assert/strict'
import { test } from 'node:test'
import { footnoteGivesSource } from '../../../src/core/decoration/texts.js'

test('a footnote gives a source with "Source:", also marked up', () => {
    assert.equal(footnoteGivesSource('Source: Eurostat'), true)
    assert.equal(footnoteGivesSource("Note: x.<br> <tspan font-style='italic'>Source</tspan>: Eurostat"), true)
    assert.equal(footnoteGivesSource('SOURCE : Eurostat'), true)
    assert.equal(footnoteGivesSource('Open source software'), false)
    assert.equal(footnoteGivesSource('Credits'), false)
    assert.equal(footnoteGivesSource(false), false)
})
