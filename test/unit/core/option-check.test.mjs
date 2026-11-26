import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGEND_OPTIONS, isOneEditAway, suggestOption, warnMisspelledOptions } from '../../../src/core/option-check.js'

const TYPES = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../src/types/legend')

test('one edit: insertion, deletion, substitution and swapped neighbours', () => {
    for (const [a, b] of [['titel', 'title'], ['orientaton', 'orientation'], ['titles', 'title'], ['boxPaddung', 'boxPadding']]) assert.ok(isOneEditAway(a, b), `${a} ~ ${b}`)
    for (const [a, b] of [['title', 'title'], ['width', 'height'], ['labels', 'ticks']]) assert.ok(!isOneEditAway(a, b), `${a} !~ ${b}`)
})

test('suggestions: only for names that are not options themselves', () => {
    assert.equal(suggestOption('titel', LEGEND_OPTIONS), 'title')
    assert.equal(suggestOption('shapewidth', LEGEND_OPTIONS), 'shapeWidth')
    assert.equal(suggestOption('labels', LEGEND_OPTIONS), undefined) // 'label' is an option too, and so is 'labels'
    assert.equal(suggestOption('somethingElse', LEGEND_OPTIONS), undefined)
    assert.equal(suggestOption('xx', LEGEND_OPTIONS), undefined)
})

test('warns once per misspelt option, sub-legends included', () => {
    const warnings = []
    const original = console.warn
    console.warn = (message) => warnings.push(message)
    try {
        warnMisspelledOptions({ titel: 'a', sizeLegend: { orientaton: 'x' }, colorLegend: false, title: 'ok' })
        warnMisspelledOptions({ titel: 'a' })
    } finally {
        console.warn = original
    }
    assert.equal(warnings.length, 2)
    assert.match(warnings[0], /"legend\.titel": did you mean "title"/)
    assert.match(warnings[1], /"legend\.sizeLegend\.orientaton": did you mean "orientation"/)
})

test('every typed legend option is in the list, so none is reported as misspelt', () => {
    const files = fs.readdirSync(TYPES, { recursive: true }).filter((f) => String(f).endsWith('.d.ts'))
    const missing = new Set()
    for (const file of files) {
        const source = fs.readFileSync(path.join(TYPES, String(file)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
        for (const [, name] of source.matchAll(/(?:^|[{;])\s*(\w+)\??\s*:/gm)) if (!LEGEND_OPTIONS.includes(name)) missing.add(name)
    }
    assert.deepEqual([...missing], [], 'add these to LEGEND_OPTIONS in src/core/option-check.js')
})
