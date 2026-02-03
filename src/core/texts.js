import { getFontSizeFromClass } from './utils'

export function addTitle(out) {
    // define default position
    const cssClass = out.isInset ? 'em-inset-title' : 'em-title'
    if (!out.titlePosition()) out.titlePosition([10, getFontSizeFromClass(cssClass) + (out.isInset ? 0 : 10)])

    // ensure header group exists (create if missing)
    if (out.header_ && !out.isInset) {
        if (
            out
                .svg()
                .select('#em-header-' + out.svgId_)
                .empty()
        ) {
            out.svg()
                .append('g')
                .attr('id', 'em-header-' + out.svgId_)
                .attr('class', 'em-header')
        }
    }

    const parent = out.header_ && !out.isInset ? out.svg().select('#em-header-' + out.svgId_) : out.svg() // fallback to old behaviour

    // remove any previous title (prevents duplicates and wrong bbox)
    parent.select('#title' + out.geo_).remove()

    // append new title (keep .html if you rely on markup)
    parent
        .append('text')
        .attr('id', 'title' + out.geo_)
        .attr('class', cssClass)
        .attr('x', out.titlePosition()[0])
        .attr('y', out.titlePosition()[1])
        .html(out.title())
}

export function addSubtitle(out) {
    if (!out.subtitle()) return

    const cssSubtitleClass = out.isInset ? 'em-inset-subtitle' : 'em-subtitle'
    const cssTitleClass = out.isInset ? 'em-inset-title' : 'em-title'
    if (!out.subtitlePosition()) out.subtitlePosition([10, getFontSizeFromClass(cssTitleClass) + getFontSizeFromClass(cssSubtitleClass) + 15])

    // ensure header group exists if needed
    if (
        out.header_ &&
        !out.isInset &&
        out
            .svg()
            .select('#em-header-' + out.svgId_)
            .empty()
    ) {
        out.svg()
            .append('g')
            .attr('id', 'em-header-' + out.svgId_)
            .attr('class', 'em-header')
    }

    const parent = out.header_ && !out.isInset ? out.svg().select('#em-header-' + out.svgId_) : out.svg()

    parent.select('#subtitle' + out.geo_).remove()

    parent
        .append('text')
        .attr('id', 'subtitle' + out.geo_)
        .attr('class', cssSubtitleClass)
        .attr('x', out.subtitlePosition()[0])
        .attr('y', out.subtitlePosition()[1])
        .html(out.subtitle())
}

export const addFootnote = function (out) {
    const wrap = out.footnoteWrap_ || Infinity // e.g. user sets map.footnoteWrap(500)
    const text = out.footnote_ || ''

    // --- Determine base position depending on footer mode ---
    let position
    if (out.footer_ && !out.isInset) {
        // Footer is its own translated group; Y should be small padding only
        position = out.footnotePosition_ ? [out.footnotePosition_[0], out.footnotePosition_[1]] : [5, 10]
    } else {
        // Legacy mode: footnote drawn directly on SVG, use bottom of map area
        position = out.footnotePosition_ ? out.footnotePosition_ : [10, out.height_]
    }

    const svg = out.svg()

    // --- Choose correct parent group ---
    let parent
    if (out.footer_ && !out.isInset) {
        parent = svg.select('#em-footer-' + out.svgId_)
        if (parent.empty()) {
            parent = svg
                .append('g')
                .attr('id', 'em-footer-' + out.svgId_)
                .attr('class', 'em-footer')
        }
    } else {
        parent = svg
    }

    // --- Remove any existing footnote ---
    parent.select('#em-footnote').remove()

    // --- Append text element ---
    const foot = parent.append('text').attr('id', 'em-footnote').attr('class', 'em-footnote').attr('x', position[0]).attr('y', position[1])

    // --- Wrapping logic ---
    const words = text.split(/(\s+)/) // keep whitespace tokens
    let line = ''
    let lineIndex = 0

    for (const w of words) {
        if ((line + w).length > wrap && line.length > 0) {
            foot.append('tspan')
                .attr('x', position[0])
                .attr('dy', lineIndex === 0 ? 0 : '1.2em')
                .html(line.trim())
            line = w
            lineIndex++
        } else {
            line += w
        }
    }

    // last line
    if (line.trim().length > 0) {
        foot.append('tspan')
            .attr('x', position[0])
            .attr('dy', lineIndex === 0 ? 0 : '1.2em')
            .html(line.trim())
    }

    // --- Tooltip logic ---
    foot.on('mouseover', function () {
        out._tooltip.mw___ = out._tooltip.style('max-width')
        out._tooltip.style('max-width', '400px')
        if (out.footnoteTooltipText_) out._tooltip.mouseover(out.footnoteTooltipText_)
    })
        .on('mousemove', function (e) {
            if (out.footnoteTooltipText_) out._tooltip.mousemove(e)
        })
        .on('mouseout', function () {
            if (out.footnoteTooltipText_) out._tooltip.mouseout()
            out._tooltip.style('max-width', out._tooltip.mw___)
        })

    return out
}

export function addSourceLink(out, withCenterPoints) {
    const svg = out.svg()

    // --- Choose correct parent group ---
    let parent
    if (out.footer_ && !out.isInset) {
        parent = svg.select('#em-footer-' + out.svgId_)
        if (parent.empty()) {
            parent = svg
                .append('g')
                .attr('id', 'em-footer-' + out.svgId_)
                .attr('class', 'em-footer')
        }
    } else {
        parent = svg
    }

    // --- Remove any existing source link ---
    parent.selectAll('#em-source-link, .em-source-dataset-link, .em-source-pretext').remove()

    // --- Retrieve dataset info ---
    // Spark / multiseries maps define a primary dataset explicitly
    const stat = out._primaryDataset_ || out.stat()
    if (!stat || !stat.eurostatDatasetCode) return

    // --- Compute link URL ---
    const code = stat.eurostatDatasetCode
    const url = `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`

    // --- Determine positioning ---
    // In footer mode → near top of footer; otherwise → bottom of map
    const yPos = out.footer_ && !out.isInset ? 10 : out.height_
    const paddingRight = 10

    // --- Append dataset link ---
    const linkText = parent
        .append('a')
        .attr('class', 'em-source-dataset-link')
        .attr('href', url)
        .attr('target', '_blank')
        .append('text')
        .attr('class', 'em-source-dataset-link-text')
        .attr('x', out.width_ - paddingRight)
        .attr('y', yPos)
        .text('EUROSTAT')
        .attr('text-anchor', 'end')

    const linkWidth = linkText.node().getComputedTextLength()

    // --- Append "Source:" pretext ---
    parent
        .append('text')
        .attr('id', 'em-source-link')
        .attr('class', 'em-source-pretext')
        .attr('x', out.width_ - linkWidth - paddingRight - 6)
        .attr('y', yPos)
        .text('Source:')
        .attr('text-anchor', 'end')
}
