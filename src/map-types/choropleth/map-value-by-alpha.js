import { scaleLinear } from 'd3-scale'
import { min, max } from 'd3-array'
import * as Choropleth from './map-choropleth'
import { getRegionsSelector, spaceAsThousandSeparator } from '../../core/utils'
import * as ChoroplethLegend from '../../legend/choropleth/legend-choropleth'
import { select } from 'd3-selection'

export const map = function (config) {
    // inherits and extends choropleth map
    const out = Choropleth.map(config)

    out.alphaData_ = null
    out.opacityScale_ = null

    out.opacityScale = function (v) {
        if (!arguments.length) return out.opacityScale_
        out.opacityScale_ = v
        return out
    }

    const originalUpdateStatValues = out.updateStatValues
    out.updateStatValues = function () {
        //add extra alpha logic to choropleth-map.js code
        const alpha = out.statData('alpha')
        if (!alpha || !alpha.isReady()) {
            out.alphaData_ = null
            return out
        }

        out.alphaData_ = alpha
        const values = alpha.getArray().filter((v) => v != null && v !== ':' && !isNaN(+v))

        if (!out.opacityScale_) {
            const minStat = min(values)
            const maxStat = max(values)
            out.opacityScale_ = values.length > 0 ? scaleLinear().domain([minStat, maxStat]).range([0.1, 1]) : null
        }

        //continue with map-choropleth.js code
        originalUpdateStatValues.call(out)

        return out.updateStyle()
    }

    const originalUpdateStyle = out.updateStyle
    out.updateStyle = function () {
        if (!out.svg_ || !out.opacityScale_) return out
        //add mapType css class
        out.svg_.classed('em--alpha', true)

        const stats = out.statData()
        if (!stats || !stats.isReady()) return out
        const alphaData = out.statData('alpha')
        if (!alphaData || !alphaData.isReady()) return out

        const selector = getRegionsSelector(out)
        const regions = out.svg().selectAll(selector)

        regions.each(function (rg) {
            const sel = select(this)
            const statVal = stats.get(rg.properties.id)?.value
            const alphaVal = alphaData.get(rg.properties.id)?.value

            if (statVal === undefined || statVal === null || statVal === ':') {
                return // skip regions with no main stat
            }

            if (alphaVal === 'nd' || alphaVal == null) {
                const grey = out.noDataFillStyle_ || 'gray'
                sel.attr('ecl', 'nd')
                    .attr('force-grey', '1')
                    .style('fill', grey)
                    .attr('fill', 'grey')
                    .attr('fill___', grey) // so hover-out reverts to grey
                    .style('opacity', 1)
                return
            }

            sel.style('opacity', out.opacityScale_(+alphaVal))
        })

        originalUpdateStyle.call(out)
        return out
    }

    out.getLegendConstructor = function () {
        return ChoroplethLegend.legend
    }

    out.tooltip_.textFunction = function (region, map) {
        const buf = []
        const regionName = region.properties.na || region.properties.name
        const regionId = region.properties.id
        buf.push(`<div class="em-tooltip-bar"><b>${regionName}</b>${regionId ? ` (${regionId})` : ''}</div>`)

        const statData = map.statData()
        const alphaData = map.alphaData_ || map.statData('alpha')

        const sv = statData.get(regionId)
        const av = alphaData?.get(regionId)

        const unit = statData.unitText?.() || ''
        const alphaUnit = alphaData?.unitText?.() || ''

        const datasetLabel = statData.label_ ? statData.label_ + ': ' : ''
        const alphaDatasetLabel = alphaData?.label_ ? alphaData?.label_ + ': ' : ''

        if (!sv || (sv.value !== 0 && !sv.value) || sv.value === ':') {
            buf.push(`
        <div class="em-tooltip-text no-data">
            <table class="em-tooltip-table">
                <tbody>
                    <tr><td>${map.noDataText_}</td></tr>
                </tbody>
            </table>
        </div>
    `)
            return buf.join('')
        }

        // Build a single table for both dataset and alpha values
        buf.push(`
    <div class="em-tooltip-text">
        <table class="em-tooltip-table">
            <tbody>
                <tr>
                    <td>${datasetLabel}${spaceAsThousandSeparator(sv.value)} ${unit}</td>
                </tr>
                <tr>
                    <td>${
                        !av || av.value === ':' || av.value == null
                            ? `${alphaDatasetLabel}${map.noDataText_}`
                            : `${alphaDatasetLabel}${spaceAsThousandSeparator(av.value)} ${alphaUnit}`
                    }</td>
                </tr>
            </tbody>
        </table>
    </div>
`)

        return buf.join('')
    }

    return out
}
