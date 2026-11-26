import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { BOX_CORNER_RADIUS } from '../../../src/core/buttons/corner-radius.js'

describe('rounded background boxes', () => {
    it('shares one radius with the zoom buttons', () => {
        const zoom = readFileSync(new URL('../../../src/core/buttons/zoom-buttons.js', import.meta.url), 'utf8')
        assert.match(zoom, /ZOOM_BUTTON_RADIUS = BOX_CORNER_RADIUS/)
        assert.ok(BOX_CORNER_RADIUS > 0)
    })

    it('does not reset the radius to 0 in the stylesheets (CSS would override the attributes)', () => {
        for (const f of ['legend/legend.css', 'decoration/ranked-bar-chart.css', 'insets.css']) {
            const css = readFileSync(new URL('../../../src/css/' + f, import.meta.url), 'utf8')
            assert.doesNotMatch(css, /^\s*r[xy]:\s*0/m, f)
        }
    })

    it('rounds the legend, ranked bar chart and image insets background rects', () => {
        for (const f of ['legend/legend.js', 'core/decoration/ranked-bar-chart.js', 'core/insets.js']) {
            const src = readFileSync(new URL('../../../src/' + f, import.meta.url), 'utf8')
            assert.match(src, /\.attr\('rx', BOX_CORNER_RADIUS\)\s*\.attr\('ry', BOX_CORNER_RADIUS\)/, f)
        }
    })

    it('rounds the inset sea, frame and clipPath rects with the same radius', () => {
        const src = readFileSync(new URL('../../../src/core/map-template.js', import.meta.url), 'utf8')
        assert.match(src, /import \{ BOX_CORNER_RADIUS \} from '\.\/buttons\/corner-radius'/)
        assert.match(src, /roundInsetCorners = \(out\) => \(sel\) => \{\s*if \(out\.isInset\) sel\.attr\('rx', BOX_CORNER_RADIUS\)\.attr\('ry', BOX_CORNER_RADIUS\)/)
        // clipPath rect, frame rect and sea rect all go through it
        assert.equal(src.match(/\.call\(roundInsetCorners\(out\)\)/g).length, 3)
        for (const f of ['map.css', 'insets.css']) {
            const css = readFileSync(new URL('../../../src/css/' + f, import.meta.url), 'utf8')
            assert.doesNotMatch(css, /^\s*r[xy]:/m, f)
        }
    })
})
