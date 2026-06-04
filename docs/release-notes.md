# Release notes

## 4.4.4

### New

- Added a legend toggle button API so users can show/hide the legend directly on the map (`legendButton`), with mobile-first hidden behavior when enabled.

Example:

```js
const map = eurostatmap.map('choropleth').legend({ title: 'Population density' }).legendButton(true).build()

// Optional custom position
map.legendButtonPosition([10, 50])
```

- Added manual composition category ordering support via `compositionSettings.order` for pie-composition maps.

Example:

```ts
compositionSettings?: {
	type?: 'flag' | 'pie' | 'ring' | 'segment' | 'radar' | 'agepyramid' | 'halftone'
	minSize?: number
	maxSize?: number
	strokeFill?: string
	strokeWidth?: number
	reverseOrder?: boolean
	/** Category code order for composition rendering. */
	order?: string[]
	stripesOrientation?: number
	offsetAngle?: number
	agePyramidHeightFactor?: number
	otherColor?: string
	otherText?: string
}
```

### Improvements

- Generalized composition ordering so `compositionSettings.order` can drive category order consistently across composition chart types.

Example:

```js
eurostatmap
    .map('pie')
    .compositionSettings({
        type: 'radar',
        order: ['EMP', 'WAGE', 'UNITS'],
        reverseOrder: false,
    })
    .build()
```

- Added new business services statistics-explained examples with two dropdown-driven maps (proportional-circle and choropleth).

Example:

```js
// Services example dropdown update wiring
unitSelect.addEventListener('option-selected', (e) => {
    updateMap(e.detail.option.code, naceSelect.selectedOption)
})

naceSelect.addEventListener('option-selected', (e) => {
    updateMap(unitSelect.selectedOption, e.detail.option.code)
})
```

### Fixes

- Improved ring composition legibility by defaulting to an order that keeps smaller shares closer to the center (unless overridden).

Example:

```js
map.compositionSettings({
    type: 'ring',
    // Optional manual override (outer -> inner)
    order: ['TOTAL', 'LARGE_CAT', 'MID_CAT', 'SMALL_CAT'],
})
```

- Fixed dropdown UX so opening one selector closes the other (prevents both dropdowns being open simultaneously).

Example:

```js
document.addEventListener(
    'click',
    (event) => {
        const path = event.composedPath ? event.composedPath() : []
        if (path.includes(unitSelect)) requestAnimationFrame(() => naceSelect.closeDropdownWithoutFocus())
        else if (path.includes(naceSelect)) requestAnimationFrame(() => unitSelect.closeDropdownWithoutFocus())
    },
    true
)
```

- Removed example dependency on internal `/src` formatter utilities so shipped example folders are standalone and zip-portable.
- Enforced space as thousand separator in localized example number formatting.

Example:

```js
const longIntlFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })

const longFormatter = {
    format(value) {
        return longIntlFormatter.format(value).replace(/,/g, ' ')
    },
}
```

### Notes

- Published package: `eurostat-map@4.4.4`
- Dist-tag `latest` points to `4.4.4`
- Release tag format used: `4.4.4` (no `v` prefix)
