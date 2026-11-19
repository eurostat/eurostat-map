import { buildSingleLayerMap } from '../../core/stat-map'
import { registerLayerType } from '../../core/layer-registry'
import { addCentroidsToMap, getCentroidsGroup } from '../../core/geo/centroids'
import { createSqrtScale } from '../../core/scale'
import { executeForAllInsets, spaceAsThousandSeparator } from '../../core/utils'
import { legend } from '../../legend/proportional-symbol/legend-venn'
import { parseVennValue } from './venn-utils'

export const map = (config) => buildSingleLayerMap('venn', config)

export function decorateVennLayer(layer, config) {
    layer.vennSettings_ = {
        colors: ['#00c7dd', '#f4cf18', '#e94398'],
        maxRadius: 18,
        maxValue: undefined,
        opacity: 0.85,
        ...config?.vennSettings,
    }
    layer.vennSettings = function (settings) {
        if (!arguments.length) return layer.vennSettings_
        Object.assign(layer.vennSettings_, settings)
        return layer
    }
    layer.vennSeries_ = []
    layer.vennScale_ = null
    layer.vennTargets_ = []
    layer.tooltip_.textFunction ??= (region) => renderTooltip(region, layer)

    layer.updateClassification = function () {
        const settings = layer.vennSettings_
        layer.vennSeries_ = (layer.getEncodingStats('color') || []).slice(0, 3).map((key, index) => {
            const data = layer.statData(key)
            return { data, index, label: data?.label_ || key, color: settings.colors[index], unit: data?.unitText() || '' }
        })
        const maxValue = parseVennValue(settings.maxValue)
        const values = maxValue > 0 ? [maxValue] : layer.vennSeries_.flatMap(({ data }) => data?.getArray() || []).map(parseVennValue)
        layer.vennScale_ = createSqrtScale(values, settings.maxRadius)
        return layer
    }

    layer.updateStyle = function () {
        layer.vennTargets_ = []
        const map = layer.map
        renderSymbols(map, layer)
        if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId_, (inset) => renderSymbols(inset, layer))
        return layer
    }

    layer.getLegendConstructor = () => legend
    return layer
}

function renderSymbols(map, layer) {
    if (!map.svg() || map.gridCartogram_ || !layer.vennScale_) return
    const target = map === layer.map ? layer : map
    let centroids = getCentroidsGroup(target)
    if (!centroids || centroids.selectAll('g.em-centroid').empty()) {
        addCentroidsToMap(target)
        centroids = getCentroidsGroup(target)
    }
    if (!centroids) return

    const groups = centroids
        .selectAll('g.em-centroid')
        .selectAll('g.em-venn-symbol')
        .data((region) => {
            const circles = layer.vennSeries_.flatMap((series) => {
                const radius = layer.vennScale_(parseVennValue(series.data?.get(region.properties.id)?.value))
                return radius > 0 ? [{ index: series.index, color: series.color, radius }] : []
            })
            return circles.length ? [{ region, circles }] : []
        })
        .join('g')
        .attr('class', 'em-venn-symbol')
        .style('isolation', 'isolate')
        .style('cursor', 'pointer')
    const circles = groups
        .selectAll('circle')
        .data(
            ({ circles }) => circles,
            (series) => series.index
        )
        .join('circle')
        .attr('class', 'em-venn-circle')
        .attr('r', (series) => series.radius)
        .attr('fill', (series) => series.color)
        .attr('fill-opacity', layer.vennSettings_.opacity)
        .style('mix-blend-mode', 'multiply')
        .style('opacity', null)
    layer.vennTargets_.push(circles)

    const tooltip = map._tooltip || layer.map._tooltip
    groups
        .on('mouseenter', function (event, { region }) {
            if (layer.tooltip_.omitRegions?.includes(region.properties.id)) return
            tooltip?.mouseover(layer.tooltip_.textFunction(region, map), event)
            map.onRegionMouseOver_?.(event, region, this, map)
        })
        .on('mousemove', function (event, { region }) {
            if (layer.tooltip_.omitRegions?.includes(region.properties.id)) return
            tooltip?.mousemove(event)
            map.onRegionMouseMove_?.(event, region, this, map)
        })
        .on('mouseleave', function (event, { region }) {
            if (layer.tooltip_.omitRegions?.includes(region.properties.id)) return
            tooltip?.mouseout()
            map.onRegionMouseOut_?.(event, region, this, map)
        })
}

function renderTooltip(region, layer) {
    const container = document.createElement('div')
    const heading = document.createElement('div')
    heading.className = 'em-tooltip-bar'
    const id = region.properties.id
    heading.textContent = region.properties.na ? `${region.properties.na} (${id})` : id
    container.append(heading)
    const content = document.createElement('div')
    content.className = 'em-tooltip-text'
    for (const { data, label, unit, color } of layer.vennSeries_) {
        const row = document.createElement('div')
        const swatch = document.createElement('span')
        Object.assign(swatch.style, { backgroundColor: color, display: 'inline-block', width: '0.75em', height: '0.75em', marginRight: '0.35em' })
        const value = parseVennValue(data?.get(id)?.value)
        const formatted = value === undefined ? layer.map.noDataText_ : [spaceAsThousandSeparator(value), unit].filter(Boolean).join(' ')
        row.append(swatch, `${label}: ${formatted}`)
        content.append(row)
    }
    container.append(content)
    return container.innerHTML
}

registerLayerType('venn', 'overlay', decorateVennLayer)
