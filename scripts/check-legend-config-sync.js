const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..', '..')
const legendImplPath = path.join(repoRoot, 'src', 'legend', 'legend.js')
const legendTypePath = path.join(repoRoot, 'src', 'types', 'legend', 'LegendConfig.d.ts')
const choroplethLegendImplPath = path.join(repoRoot, 'src', 'legend', 'choropleth', 'legend-choropleth.js')
const choroplethLegendTypePath = path.join(repoRoot, 'src', 'types', 'legend', 'choropleth', 'ChoroplethLegendConfig.d.ts')
const propLegendImplPath = path.join(repoRoot, 'src', 'legend', 'proportional-symbol', 'legend-proportional-symbols.js')
const propLegendTypePath = path.join(repoRoot, 'src', 'types', 'legend', 'proportional-symbol', 'ProportionalSymbolsLegendConfig.d.ts')
const legendTypesRoot = path.join(repoRoot, 'src', 'types', 'legend')
const indexTypesPath = path.join(repoRoot, 'src', 'types', 'index.d.ts')

function readText(filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function getBaseLegendDefaultKeys(legendSource) {
    const stopToken = 'out.build = function'
    const defaultsBlock = legendSource.includes(stopToken) ? legendSource.slice(0, legendSource.indexOf(stopToken)) : legendSource

    const matches = [...defaultsBlock.matchAll(/out\.([A-Za-z_$][\w$]*)\s*=/g)]
    const internalKeys = new Set(['map', 'svgId', 'svg', 'lgg'])

    return new Set(matches.map((m) => m[1]).filter((key) => !internalKeys.has(key)))
}

function getOutAssignmentKeysInSection(source, sectionStartToken, sectionEndToken) {
    const startIndex = source.indexOf(sectionStartToken)
    if (startIndex < 0) {
        throw new Error(`Could not find section start token: ${sectionStartToken}`)
    }

    const sectionStart = source.indexOf('\n', startIndex)
    const endIndex = source.indexOf(sectionEndToken, sectionStart)
    if (endIndex < 0) {
        throw new Error(`Could not find section end token: ${sectionEndToken}`)
    }

    const section = source.slice(sectionStart, endIndex)
    const matches = [...section.matchAll(/out\.([A-Za-z_$][\w$]*)\s*=/g)]
    return new Set(matches.map((m) => m[1]))
}

function getObjectLiteralTextAfterToken(source, token) {
    const tokenIndex = source.indexOf(token)
    if (tokenIndex < 0) {
        throw new Error(`Could not find token: ${token}`)
    }

    const openBraceIndex = source.indexOf('{', tokenIndex)
    if (openBraceIndex < 0) {
        throw new Error(`Could not find opening brace for token: ${token}`)
    }

    let depth = 0
    for (let i = openBraceIndex; i < source.length; i++) {
        const ch = source[i]
        if (ch === '{') depth += 1
        if (ch === '}') depth -= 1
        if (depth === 0) {
            return source.slice(openBraceIndex + 1, i)
        }
    }

    throw new Error(`Could not find matching closing brace for token: ${token}`)
}

function getTopLevelObjectKeys(objectLiteralBody) {
    return new Set([...objectLiteralBody.matchAll(/^\s*([A-Za-z_][\w]*)\s*:/gm)].map((m) => m[1]))
}

function getInterfaceKeys(typeSource, interfaceName) {
    const interfaceRegex = new RegExp(`export\\s+interface\\s+${interfaceName}(?:\\s+extends\\s+[^\\{]+)?\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
    const match = typeSource.match(interfaceRegex)
    if (!match) {
        throw new Error(`Could not find interface ${interfaceName}`)
    }

    const body = match[1]
    const keys = [...body.matchAll(/^\s*([A-Za-z_][\w]*)\??\s*:/gm)].map((m) => m[1])
    return new Set(keys)
}

function listFilesRecursively(dirPath, predicate) {
    const out = []
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
            out.push(...listFilesRecursively(fullPath, predicate))
            continue
        }
        if (!predicate || predicate(fullPath)) out.push(fullPath)
    }
    return out
}

function getIndexExportedTypeNames(indexSource) {
    const exported = new Set()
    const exportMatches = [...indexSource.matchAll(/export\s+type\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]+['"]/gm)]
    for (const m of exportMatches) {
        const body = m[1]
        const names = body
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => s.replace(/\s+as\s+[A-Za-z_][\w]*/g, '').trim())
        for (const name of names) exported.add(name)
    }
    return exported
}

function getPrimaryLegendTypeNames() {
    const typeFiles = listFilesRecursively(legendTypesRoot, (p) => p.endsWith('.d.ts'))
    const names = new Set()

    for (const filePath of typeFiles) {
        const source = readText(filePath)
        const baseName = path.basename(filePath, '.d.ts')
        const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const hasPrimaryInterface = new RegExp(`export\\s+interface\\s+${escaped}\\b`).test(source)
        const hasPrimaryType = new RegExp(`export\\s+type\\s+${escaped}\\b`).test(source)
        if (hasPrimaryInterface || hasPrimaryType) {
            names.add(baseName)
        }
    }

    return names
}

function setDifference(a, b) {
    return [...a].filter((x) => !b.has(x)).sort()
}

function assertNoMissing({ checkName, sourceLabel, expectedLabel, sourceKeys, expectedKeys }) {
    const missing = setDifference(sourceKeys, expectedKeys)
    if (!missing.length) return

    console.error(`${checkName} failed: ${expectedLabel} is missing properties defined in ${sourceLabel}:`)
    for (const key of missing) {
        console.error(`  - ${key}`)
    }
    process.exit(1)
}

function main() {
    const legendSource = readText(legendImplPath)
    const typeSource = readText(legendTypePath)
    const chLegendSource = readText(choroplethLegendImplPath)
    const chTypeSource = readText(choroplethLegendTypePath)
    const psLegendSource = readText(propLegendImplPath)
    const psTypeSource = readText(propLegendTypePath)
    const indexTypesSource = readText(indexTypesPath)

    // 1) Base LegendConfig vs src/legend/legend.js defaults
    const implKeys = getBaseLegendDefaultKeys(legendSource)
    const baseTypeKeys = getInterfaceKeys(typeSource, 'LegendConfig')
    assertNoMissing({
        checkName: 'Base legend sync',
        sourceLabel: 'src/legend/legend.js',
        expectedLabel: 'src/types/legend/LegendConfig.d.ts',
        sourceKeys: implKeys,
        expectedKeys: baseTypeKeys,
    })

    // 2) ChoroplethLegendConfig vs choropleth legend defaults (excluding inherited base keys)
    const choroplethDefaults = getOutAssignmentKeysInSection(
        chLegendSource,
        'const out = Legend.legend(map)',
        '//override attribute values with config values'
    )
    const choroplethSpecificDefaults = new Set([...choroplethDefaults].filter((k) => !baseTypeKeys.has(k)))
    const choroplethTypeKeys = getInterfaceKeys(chTypeSource, 'ChoroplethLegendConfig')
    assertNoMissing({
        checkName: 'Choropleth legend sync',
        sourceLabel: 'src/legend/choropleth/legend-choropleth.js',
        expectedLabel: 'src/types/legend/choropleth/ChoroplethLegendConfig.d.ts',
        sourceKeys: choroplethSpecificDefaults,
        expectedKeys: choroplethTypeKeys,
    })

    // 3) ProportionalSymbols nested config sync
    const sizeLegendBody = getObjectLiteralTextAfterToken(psLegendSource, 'out.sizeLegend =')
    const colorLegendBody = getObjectLiteralTextAfterToken(psLegendSource, 'out.colorLegend =')

    const sizeDefaultKeys = new Set([...getTopLevelObjectKeys(sizeLegendBody)].filter((k) => !k.startsWith('_')))
    const colorDefaultKeys = new Set([...getTopLevelObjectKeys(colorLegendBody)].filter((k) => !k.startsWith('_')))

    const psSizeTypeKeys = getInterfaceKeys(psTypeSource, 'ProportionalSymbolSizeLegendConfig')
    const psColorTypeKeys = getInterfaceKeys(psTypeSource, 'ProportionalSymbolColorLegendConfig')

    assertNoMissing({
        checkName: 'Proportional size legend sync',
        sourceLabel: 'src/legend/proportional-symbol/legend-proportional-symbols.js (sizeLegend)',
        expectedLabel: 'src/types/legend/proportional-symbol/ProportionalSymbolsLegendConfig.d.ts#ProportionalSymbolSizeLegendConfig',
        sourceKeys: sizeDefaultKeys,
        expectedKeys: psSizeTypeKeys,
    })

    assertNoMissing({
        checkName: 'Proportional color legend sync',
        sourceLabel: 'src/legend/proportional-symbol/legend-proportional-symbols.js (colorLegend)',
        expectedLabel: 'src/types/legend/proportional-symbol/ProportionalSymbolsLegendConfig.d.ts#ProportionalSymbolColorLegendConfig',
        sourceKeys: colorDefaultKeys,
        expectedKeys: psColorTypeKeys,
    })

    // 4) Ensure primary legend config types are exported from src/types/index.d.ts
    const primaryLegendTypeNames = getPrimaryLegendTypeNames()
    const indexExportedTypeNames = getIndexExportedTypeNames(indexTypesSource)
    assertNoMissing({
        checkName: 'Legend type index export sync',
        sourceLabel: 'src/types/legend/**/*.d.ts primary type/interface names',
        expectedLabel: 'src/types/index.d.ts exports',
        sourceKeys: primaryLegendTypeNames,
        expectedKeys: indexExportedTypeNames,
    })

    console.log('Legend config typing sync checks passed.')
}

main()
