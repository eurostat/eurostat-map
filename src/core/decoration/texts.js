import { getFontSizeFromClass } from '../utils'

export function addTitle(out) {
    // define default position
    const cssClass = out.isInset ? 'em-inset-title' : 'em-title'
    if (!out.titlePosition()) out.titlePosition([5, getFontSizeFromClass(cssClass) + (out.isInset ? 5 : 10)])

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
    const title = parent
        .append('text')
        .attr('id', 'title' + out.geo_)
        .attr('class', cssClass)
        .attr('x', out.titlePosition()[0])
        .attr('y', out.titlePosition()[1])
        .html(out.title())

    wrapTextForMobile(title, out, out.titlePosition()[0])
}

export function addSubtitle(out) {
    if (!out.subtitle()) return

    const cssSubtitleClass = out.isInset ? 'em-inset-subtitle' : 'em-subtitle'
    const cssTitleClass = out.isInset ? 'em-inset-title' : 'em-title'
    const hasCustomSubtitlePosition = !!out.subtitlePosition()
    if (!hasCustomSubtitlePosition) out.subtitlePosition([5, getFontSizeFromClass(cssTitleClass) + getFontSizeFromClass(cssSubtitleClass) + 15])

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

    let subtitleY = out.subtitlePosition()[1]
    if (!hasCustomSubtitlePosition) {
        const title = parent.select('#title' + out.geo_)
        const titleBox = title.empty() ? null : title.node()?.getBBox?.()
        if (titleBox) subtitleY = titleBox.y + titleBox.height + getFontSizeFromClass(cssSubtitleClass) + 5
    }

    const subtitle = parent
        .append('text')
        .attr('id', 'subtitle' + out.geo_)
        .attr('class', cssSubtitleClass)
        .attr('x', out.subtitlePosition()[0])
        .attr('y', subtitleY)
        .html(out.subtitle())

    wrapTextForMobile(subtitle, out, out.subtitlePosition()[0])
}

function wrapTextForMobile(textSelection, out, x) {
    if (typeof window === 'undefined' || window.innerWidth > 768) return

    const node = textSelection.node()
    if (!node) return

    const rawLines = String(node.textContent || '')
        .split(/\n|<br\s*\/?>/i)
        .map((line) => line.trim())
        .filter(Boolean)
    if (!rawLines.length) return

    const maxWidth = Math.max(80, out.width_ - x - 8)
    const y = textSelection.attr('y')
    const dy = textSelection.attr('dy') || 0
    const lineHeightEm = 1.15

    textSelection.text(null)

    let lineNumber = 0
    rawLines.forEach((rawLine) => {
        const words = rawLine.split(/\s+/).filter(Boolean)
        let line = []
        let tspan = textSelection
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dy', lineNumber === 0 ? dy : `${lineHeightEm}em`)

        words.forEach((word) => {
            line.push(word)
            tspan.text(line.join(' '))

            if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
                line.pop()
                tspan.text(line.join(' '))
                line = [word]
                lineNumber++
                tspan = textSelection
                    .append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dy', `${lineHeightEm}em`)
                    .text(word)
            }
        })

        lineNumber++
    })
}

export const addFootnote = function (out) {
    const wrap = out.footnoteWrap_ || Infinity // e.g. user sets map.footnoteWrap(500)
    const text = out.footnote_ || ''

    // In header mode, root-level elements must be shifted down by header height.
    let headerOffset = 0
    if (out.header_ && !out.isInset) {
        const header = out.svg().select('#em-header-' + out.svgId_)
        const hb = header.empty() ? null : header.node()?.getBBox?.()
        const headerPadding = out.headerPadding_ ? out.headerPadding_ : 20
        if (hb) headerOffset = hb.height + headerPadding
    }

    // --- Determine base position depending on footer mode ---
    let position
    if (out.footer_ && !out.isInset) {
        // Footer is its own translated group; Y should be small padding only
        position = out.footnotePosition_ ? [out.footnotePosition_[0], out.footnotePosition_[1]] : [5, 10]
    } else {
        // Legacy mode: footnote drawn directly on SVG, use bottom of map area
        const basePosition = out.footnotePosition_ ? out.footnotePosition_ : [10, out.height_]
        position = [basePosition[0], basePosition[1] + headerOffset]
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
    // SVG <text> does not understand <br>, so convert <br> into tspans.
    const lineHeight = '1.2em'
    let line = ''
    let lineIndex = 0

    const appendLine = function (value, forceBlank = false) {
        const clean = value.trim()

        if (!clean && !forceBlank) return

        foot.append('tspan')
            .attr('x', position[0])
            .attr('dy', lineIndex === 0 ? 0 : lineHeight)
            .html(clean || '&nbsp;')

        lineIndex++
    }

    const parts = String(text).split(/<br\s*\/?>/gi)

    parts.forEach((part, partIndex) => {
        const words = part.split(/(\s+)/) // keep whitespace tokens

        for (const w of words) {
            if ((line + w).length > wrap && line.trim().length > 0) {
                appendLine(line)
                line = w
            } else {
                line += w
            }
        }

        // Explicit <br> means force a new SVG text row
        if (partIndex < parts.length - 1) {
            appendLine(line, line.trim().length === 0)
            line = ''
        }
    })

    // last line
    appendLine(line)

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
