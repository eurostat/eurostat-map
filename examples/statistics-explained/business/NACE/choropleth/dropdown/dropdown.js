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
