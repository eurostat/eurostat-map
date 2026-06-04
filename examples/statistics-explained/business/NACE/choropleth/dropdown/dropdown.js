// import the module that registers <ewc-select>
import { updateMap } from '../ch-map.js'
import './ewc-singleselect.js'

// Wait for the custom element to be defined, then initialize
;(async () => {
    await customElements.whenDefined('ewc-singleselect')
    // select the element that exists in the page
    const unitSelect = document.querySelector('#unitSelect')
    if (!unitSelect) return console.warn('#unitSelect not found')
    const naceSelect = document.querySelector('#NACESelect')
    if (!naceSelect) return console.warn('#NACESelect not found')

    const closeDropdown = (dropdown) => {
        if (typeof dropdown.closeDropdownWithoutFocus === 'function') {
            dropdown.closeDropdownWithoutFocus()
        }
    }

    // Capture interactions before bubbling quirks in Shadow DOM so only one dropdown stays open.
    document.addEventListener(
        'click',
        (event) => {
            const path = event.composedPath ? event.composedPath() : []
            if (path.includes(unitSelect)) {
                requestAnimationFrame(() => closeDropdown(naceSelect))
            } else if (path.includes(naceSelect)) {
                requestAnimationFrame(() => closeDropdown(unitSelect))
            }
        },
        true
    )

    // listen for selection events
    unitSelect.addEventListener('option-selected', (e) => {
        //console.log('option-selected', e.detail);
        const unitCode = e.detail.option.code
        // rebuild everything for the new city
        updateMap(unitCode, naceSelect.selectedOption)
    })

    naceSelect.addEventListener('option-selected', (e) => {
        //console.log('option-selected', e.detail);
        const naceCode = e.detail.option.code
        // rebuild everything for the new city
        updateMap(unitSelect.selectedOption, naceCode)
    })
})()
