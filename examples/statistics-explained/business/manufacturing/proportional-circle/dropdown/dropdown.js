
// import the module that registers <ewc-select>
import { renderMap } from '../ps-map.js';
import './ewc-singleselect.js';

// Wait for the custom element to be defined, then initialize
(async () => {
    await customElements.whenDefined('ewc-singleselect');
    // select the element that exists in the page
    const sel = document.querySelector('#mySelect');
    if (!sel) return console.warn('#mySelect not found');

    // listen for selection events
    sel.addEventListener('option-selected', e => {
        //console.log('option-selected', e.detail);
        const code = e.detail.option.code;
        // rebuild everything for the new city
        renderMap(code);
    });
})();
