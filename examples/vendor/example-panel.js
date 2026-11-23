// A reusable settings side panel for the examples, built with Eurostat UI components:
//   - dropdowns: <ewc-singleselect> (Eurostat web components)
//   - radios, checkboxes, sliders: the Europa Component Library (ECL) styles used on ec.europa.eu/eurostat
//
// The panel sits to the right of the map (below it on narrow screens). Usage:
//
//   <svg id="map"></svg>
//   <script type="module">
//       import { createPanel } from '../vendor/example-panel.js'
//
//       const panel = createPanel({ map: '#map', title: 'Settings' })
//       panel.select({ id: 'palette', label: 'Palette', options: [{ value: 'teal', label: 'Teal' }], value: 'teal', onChange: (v) => {} })
//       panel.radio({ id: 'mode', label: 'Mode', options: [{ value: 'a', label: 'A' }], value: 'a', onChange: (v) => {} })
//       panel.range({ id: 'width', label: 'Width', min: 0, max: 10, step: 1, value: 5, unit: 'px', onChange: (v) => {} })
//       panel.checkbox({ id: 'bundle', label: 'Edge bundling', checked: true, onChange: (v) => {} })
//   </script>
//
// An example that already has native controls (<select>, checkbox, radios) and listeners on them can keep both:
// panel.adopt('#dataset', '#grid-toggle', 'input[name=level]') shows Eurostat controls in the panel in their place,
// hides the native ones, and passes every change on to them (their value is set and a 'change' event is dispatched),
// so the example's own listeners run as before. The native controls must exist when adopt() is called.
//
// Every control method returns { el, get(), set(value), show(), hide() } (a range also has configure()) and the panel keeps them by id:
// panel.get('palette'), panel.show('width', false). panel.add(node) appends custom content (a legend, a note).
import './ewc-singleselect.js'

const ECL_CSS = 'https://cdn1.fpfis.tech.ec.europa.eu/ecl/v4.8.0/eu/styles/ecl-eu.css'
const CHECK_PATH = 'M19.53 36.69 6 23.19l2.13-2.13 11.4 11.4L39.99 12l2.13 2.13z' // ECL "check" icon

function addStylesheet(href) {
    if ([...document.styleSheets].some((s) => s.href === href) || document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
}

function el(tag, className, html) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (html !== undefined) node.innerHTML = html
    return node
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

let uid = 0

/**
 * Wraps the map element in a two-column layout and returns the panel.
 * @param {object} [config]
 * @param {string|Element} [config.map='#map'] the map's <svg> (or its container)
 * @param {string} [config.title='Settings'] heading of the panel
 * @param {number} [config.width=280] panel width in pixels
 */
export function createPanel({ map = '#map', title = 'Settings', width = 280 } = {}) {
    addStylesheet(ECL_CSS)
    addStylesheet(new URL('./example-panel.css', import.meta.url).href)

    const mapEl = typeof map === 'string' ? document.querySelector(map) : map
    if (!mapEl) throw new Error('example-panel: map element not found: ' + map)

    const layout = el('div', 'ex-layout')
    const mapBox = el('div', 'ex-map')
    const aside = el('aside', 'ex-panel')
    layout.style.setProperty('--ex-panel-width', width + 'px')
    aside.setAttribute('aria-label', title)
    aside.appendChild(el('h2', 'ex-panel-title', escapeHtml(title)))
    // a map built before the panel is wrapped by the library (spinner, tooltip): the wrapper moves, not the svg out of it
    const mapNode = mapEl.parentNode?.classList?.contains('em-map-wrapper') ? mapEl.parentNode : mapEl
    mapNode.parentNode.insertBefore(layout, mapNode)
    mapBox.appendChild(mapNode)
    layout.append(mapBox, aside)

    // On a narrow screen the panel is a sheet at the bottom of the window, closed to its title bar, so the map can fill the screen
    const title_ = aside.querySelector('.ex-panel-title')
    const narrow = window.matchMedia('(max-width: 900px)')
    const setOpen = (open) => {
        aside.classList.toggle('ex-collapsed', !open)
        title_.setAttribute('aria-expanded', String(open))
    }
    title_.setAttribute('role', 'button')
    title_.setAttribute('tabindex', '0')
    title_.addEventListener('click', () => setOpen(aside.classList.contains('ex-collapsed')))
    title_.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(aside.classList.contains('ex-collapsed'))
        }
    })
    setOpen(!narrow.matches)
    narrow.addEventListener('change', (e) => setOpen(!e.matches))

    const controls = new Map()

    // wraps a control in a row that can be shown, hidden and looked up by id
    function register(id, row, api) {
        aside.appendChild(row)
        const control = {
            el: row,
            show: (visible = true) => {
                row.hidden = !visible
            },
            hide: () => {
                row.hidden = true
            },
            ...api,
        }
        if (id) controls.set(id, control)
        return control
    }

    const panel = {
        el: aside,
        mapEl,

        /** Dropdown. options: [{value,label}], or an array of such arrays for grouped options. */
        select({ id, label, options, value, onChange, height = '240px' }) {
            const groups = Array.isArray(options[0]) ? options : [options]
            const row = el('div', 'ex-control')
            row.appendChild(el('div', 'ex-label', escapeHtml(label)))
            const select = document.createElement('ewc-singleselect')
            const json = groups.map((g) => g.map((o) => ({ name: o.label, code: String(o.value), status: 'active' })))
            const initial = String(value ?? groups[0][0].value)
            select.setAttribute('options', JSON.stringify(json))
            select.setAttribute('defaultOption', initial)
            select.setAttribute('activeOption', initial)
            select.setAttribute('dropdownHeight', height)
            select.setAttribute('selectedLabel', 'Select below')
            select.setAttribute('invertColors', 'false')
            select.setAttribute('searchMode', groups.flat().length > 15 ? 'search' : '')
            row.appendChild(select)
            let current = initial
            select.addEventListener('option-selected', (e) => {
                current = e.detail.option.code
                if (onChange) onChange(current)
            })
            const original = new Map(groups.flat().map((o) => [String(o.value), o.value]))
            return register(id, row, { get: () => original.get(current) ?? current, set: (v) => select.setAttribute('activeOption', String(v)) })
        },

        /** Radio buttons. options: [{value,label}] */
        radio({ id, label, options, value, onChange }) {
            const name = 'ex-radio-' + ++uid
            const row = el('fieldset', 'ex-control ex-fieldset')
            row.appendChild(el('legend', 'ex-label', escapeHtml(label)))
            const inputs = options.map((o, i) => {
                const inputId = `${name}-${i}`
                const item = el(
                    'div',
                    'ecl-radio',
                    `<input id="${inputId}" name="${name}" class="ecl-radio__input" type="radio" value="${escapeHtml(o.value)}" />
                     <label class="ecl-radio__label" for="${inputId}">
                         <span class="ecl-radio__box"><span class="ecl-radio__box-inner"></span></span>
                         <span class="ecl-radio__text">${escapeHtml(o.label)}</span>
                     </label>`
                )
                row.appendChild(item)
                const input = item.querySelector('input')
                input.checked = o.value === (value ?? options[0].value)
                input.addEventListener('change', () => input.checked && onChange && onChange(o.value))
                return { input, option: o }
            })
            return register(id, row, {
                get: () => inputs.find((i) => i.input.checked)?.option.value,
                set: (v) => inputs.forEach((i) => (i.input.checked = i.option.value === v)),
            })
        },

        /**
         * Slider. onInput fires while dragging, onChange when released. With `steps` (an array of values) the
         * slider snaps to those values, e.g. the class breaks of a map; get() and the callbacks then give the
         * step's value, not its position. `format` turns a value into the text shown under the slider.
         * The control's configure({ min, max, step, steps, value, format }) changes any of these later.
         */
        range({ id, label, min, max, step = 1, steps, value, unit = '', format, onChange, onInput }) {
            const inputId = 'ex-range-' + ++uid
            const row = el('div', 'ex-control ecl-form-group')
            row.innerHTML = `<label class="ex-label" for="${inputId}">${escapeHtml(label)}</label>
                <input id="${inputId}" class="ecl-range" type="range" />
                <div class="ecl-range__value"><span class="ecl-range__value-current"></span> ${escapeHtml(unit)}</div>`
            const input = row.querySelector('input')
            const out = row.querySelector('.ecl-range__value-current')
            const cfg = { min, max, step, steps, format: format || ((v) => String(v)) }

            const valueOf = () => (cfg.steps ? cfg.steps[+input.value] : +input.value)
            const show = () => (out.textContent = cfg.format(valueOf()))
            // the position of a value on the slider: the nearest step, or the value itself
            const positionOf = (v) => {
                if (!cfg.steps) return v
                let best = 0
                cfg.steps.forEach((x, i) => {
                    if (Math.abs(x - v) < Math.abs(cfg.steps[best] - v)) best = i
                })
                return best
            }
            function configure(next = {}) {
                const current = next.value !== undefined ? next.value : valueOf()
                Object.assign(cfg, next)
                delete cfg.value
                if (next.steps === null) cfg.steps = undefined
                input.min = cfg.steps ? 0 : cfg.min
                input.max = cfg.steps ? cfg.steps.length - 1 : cfg.max
                input.step = cfg.steps ? 1 : cfg.step
                input.value = positionOf(current ?? cfg.min)
                show()
            }
            configure({ value })

            input.addEventListener('input', () => {
                show()
                if (onInput) onInput(valueOf())
            })
            input.addEventListener('change', () => onChange && onChange(valueOf()))
            return register(id, row, {
                get: valueOf,
                set: (v) => configure({ value: v }),
                configure,
            })
        },

        /** Checkbox. */
        checkbox({ id, label, checked = false, onChange }) {
            const inputId = 'ex-checkbox-' + ++uid
            const row = el(
                'div',
                'ex-control ecl-checkbox',
                `<input id="${inputId}" class="ecl-checkbox__input" type="checkbox" />
                 <label class="ecl-checkbox__label" for="${inputId}">
                     <span class="ecl-checkbox__box">
                         <svg class="ecl-icon ecl-icon--xs ecl-checkbox__icon" focusable="false" aria-hidden="true" viewBox="0 0 48 48"><path fill-rule="evenodd" d="${CHECK_PATH}"></path></svg>
                     </span>
                     <span class="ecl-checkbox__text">${escapeHtml(label)}</span>
                 </label>`
            )
            const input = row.querySelector('input')
            input.checked = checked
            input.addEventListener('change', () => onChange && onChange(input.checked))
            return register(id, row, { get: () => input.checked, set: (v) => (input.checked = !!v) })
        },

        /** Appends custom content (an element or an HTML string), e.g. a legend or a note. */
        add(content, id) {
            const row = el('div', 'ex-control')
            if (typeof content === 'string') row.innerHTML = content
            else row.appendChild(content)
            return register(id, row, { get: () => row })
        },

        /**
         * Replaces native controls by Eurostat ones in the panel, see the top of this file. Takes selectors or elements:
         * a <select>, a checkbox, or the radios of a group (any one of them, or a selector matching all).
         */
        adopt(...targets) {
            const nodes = targets.flatMap((t) => (typeof t === 'string' ? [...document.querySelectorAll(t)] : [t]))
            const labelOf = (node) => {
                const label = (node.id && document.querySelector(`label[for="${node.id}"]`)) || node.closest('label')
                const text = label?.textContent.replace(/\s+/g, ' ').trim().replace(/:$/, '')
                return { label, text }
            }
            const hide = (...els) => els.filter(Boolean).forEach((e) => (e.style.display = 'none'))
            const notify = (node) => {
                node.dispatchEvent(new Event('input', { bubbles: true }))
                node.dispatchEvent(new Event('change', { bubbles: true }))
            }
            const done = new Set()
            const adopted = []
            nodes.forEach((node) => {
                if (done.has(node)) return
                done.add(node)
                const { label, text } = labelOf(node)
                const id = node.id || node.name || undefined
                if (node.tagName === 'SELECT') {
                    adopted.push(
                        panel.select({
                            id,
                            label: text || id,
                            value: node.value,
                            options: [...node.options].map((o) => ({ value: o.value, label: o.textContent.trim() })),
                            onChange: (v) => {
                                node.value = v
                                notify(node)
                            },
                        })
                    )
                    hide(node, label)
                } else if (node.type === 'checkbox') {
                    // the label of a switch is often a sibling, not a <label for>: take the text next to it
                    const sibling = node.closest('label')?.previousElementSibling
                    adopted.push(
                        panel.checkbox({
                            id,
                            label: text || sibling?.textContent.trim() || id,
                            checked: node.checked,
                            onChange: (v) => {
                                node.checked = v
                                notify(node)
                            },
                        })
                    )
                    hide(node.closest('label'), label, sibling)
                } else if (node.type === 'radio') {
                    const group = [...document.querySelectorAll(`input[type=radio][name="${node.name}"]`)]
                    group.forEach((g) => done.add(g))
                    const legend = node.closest('fieldset')?.querySelector('legend')
                    adopted.push(
                        panel.radio({
                            id: node.name,
                            label: legend?.textContent.trim() || node.name,
                            value: group.find((g) => g.checked)?.value,
                            options: group.map((g) => ({ value: g.value, label: labelOf(g).text || g.value })),
                            onChange: (v) => {
                                const target = group.find((g) => g.value === String(v))
                                if (target) {
                                    target.checked = true
                                    notify(target)
                                }
                            },
                        })
                    )
                    hide(node.closest('fieldset') || undefined, ...group.map((g) => g.closest('label')))
                }
            })
            return adopted
        },

        /** A control by id. */
        control: (id) => controls.get(id),
        get: (id) => controls.get(id)?.get(),
        set: (id, value) => controls.get(id)?.set(value),
        show: (id, visible = true) => controls.get(id)?.show(visible),
    }
    return panel
}
