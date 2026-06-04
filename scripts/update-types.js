const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

function findRepoRoot(startDir) {
    let current = path.resolve(startDir)

    while (true) {
        const packageJsonPath = path.join(current, 'package.json')
        const srcDirPath = path.join(current, 'src')

        if (fs.existsSync(packageJsonPath) && fs.existsSync(srcDirPath)) {
            return current
        }

        const parent = path.dirname(current)
        if (parent === current) {
            throw new Error('Could not locate repository root from scripts/update-types.js')
        }
        current = parent
    }
}

const repoRoot = findRepoRoot(__dirname)

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

function writeText(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8')
}

function setDifference(a, b) {
    return [...a].filter((x) => !b.has(x)).sort()
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
    if (startIndex < 0) throw new Error(`Could not find section start token: ${sectionStartToken}`)

    const sectionStart = source.indexOf('\n', startIndex)
    const endIndex = source.indexOf(sectionEndToken, sectionStart)
    if (endIndex < 0) throw new Error(`Could not find section end token: ${sectionEndToken}`)

    const section = source.slice(sectionStart, endIndex)
    const matches = [...section.matchAll(/out\.([A-Za-z_$][\w$]*)\s*=/g)]
    return new Set(matches.map((m) => m[1]))
}

function getObjectLiteralTextAfterToken(source, token) {
    const tokenIndex = source.indexOf(token)
    if (tokenIndex < 0) throw new Error(`Could not find token: ${token}`)

    const openBraceIndex = source.indexOf('{', tokenIndex)
    if (openBraceIndex < 0) throw new Error(`Could not find opening brace for token: ${token}`)

    let depth = 0
    for (let i = openBraceIndex; i < source.length; i++) {
        const ch = source[i]
        if (ch === '{') depth += 1
        if (ch === '}') depth -= 1
        if (depth === 0) return source.slice(openBraceIndex + 1, i)
    }

    throw new Error(`Could not find matching closing brace for token: ${token}`)
}

function getTopLevelObjectKeys(objectLiteralBody) {
    return new Set([...objectLiteralBody.matchAll(/^\s*([A-Za-z_][\w]*)\s*:/gm)].map((m) => m[1]))
}

function getInterfaceKeys(typeSource, interfaceName) {
    const interfaceRegex = new RegExp(`export\\s+interface\\s+${interfaceName}(?:\\s+extends\\s+[^\\{]+)?\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
    const match = typeSource.match(interfaceRegex)
    if (!match) throw new Error(`Could not find interface ${interfaceName}`)

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

function getPrimaryLegendTypeFiles() {
    const files = listFilesRecursively(legendTypesRoot, (p) => p.endsWith('.d.ts'))
    const out = []

    for (const filePath of files) {
        const source = readText(filePath)
        const baseName = path.basename(filePath, '.d.ts')
        const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const hasPrimaryInterface = new RegExp(`export\\s+interface\\s+${escaped}\\b`).test(source)
        const hasPrimaryType = new RegExp(`export\\s+type\\s+${escaped}\\b`).test(source)
        if (hasPrimaryInterface || hasPrimaryType) {
            out.push({ name: baseName, filePath })
        }
    }

    return out
}

function findInterfaceRange(source, interfaceName) {
    const startRegex = new RegExp(`export\\s+interface\\s+${interfaceName}(?:\\s+extends\\s+[^\\{]+)?\\s*\\{`, 'm')
    const startMatch = startRegex.exec(source)
    if (!startMatch) return null

    const openBraceIndex = source.indexOf('{', startMatch.index)
    let depth = 0
    for (let i = openBraceIndex; i < source.length; i++) {
        const ch = source[i]
        if (ch === '{') depth += 1
        if (ch === '}') {
            depth -= 1
            if (depth === 0) {
                return {
                    start: startMatch.index,
                    openBraceIndex,
                    closeBraceIndex: i,
                }
            }
        }
    }

    return null
}

function addMissingInterfaceProperties(filePath, interfaceName, missingKeys) {
    if (!missingKeys.length) return 0

    const source = readText(filePath)
    const range = findInterfaceRange(source, interfaceName)
    if (!range) throw new Error(`Could not locate interface ${interfaceName} in ${filePath}`)

    const toInsert = missingKeys.map((key) => `    ${key}?: any\n`).join('')
    const updated = source.slice(0, range.closeBraceIndex) + toInsert + source.slice(range.closeBraceIndex)
    writeText(filePath, updated)
    return missingKeys.length
}

function ensureLegendTypeExportsInIndex(missingTypeFiles) {
    if (!missingTypeFiles.length) return 0

    const source = readText(indexTypesPath)
    const mapTypeSectionToken = '// ==================== Map Type Exports ===================='
    const insertIndex = source.indexOf(mapTypeSectionToken)
    if (insertIndex < 0) throw new Error(`Could not find insertion point in ${indexTypesPath}`)

    const exportLines = missingTypeFiles
        .map(({ name, filePath }) => {
            const rel = path.relative(path.join(repoRoot, 'src', 'types'), filePath).replace(/\\/g, '/')
            const noExt = rel.replace(/\.d\.ts$/, '')
            return `export type { ${name} } from './${noExt}'\n`
        })
        .join('')

    const banner = '// Auto-synced legend type exports\n'
    const updated = source.slice(0, insertIndex) + banner + exportLines + '\n' + source.slice(insertIndex)
    writeText(indexTypesPath, updated)
    return missingTypeFiles.length
}

function runCopyTypes() {
    execSync('npm run copy-types', {
        cwd: repoRoot,
        stdio: 'inherit',
    })
}

function main() {
    const legendSource = readText(legendImplPath)
    const legendTypeSource = readText(legendTypePath)

    const chLegendSource = readText(choroplethLegendImplPath)
    const chTypeSource = readText(choroplethLegendTypePath)

    const psLegendSource = readText(propLegendImplPath)
    const psTypeSource = readText(propLegendTypePath)

    const implKeys = getBaseLegendDefaultKeys(legendSource)
    const baseTypeKeys = getInterfaceKeys(legendTypeSource, 'LegendConfig')
    const missingBaseLegendKeys = setDifference(implKeys, baseTypeKeys)

    const choroplethDefaults = getOutAssignmentKeysInSection(
        chLegendSource,
        'const out = Legend.legend(map)',
        '//override attribute values with config values'
    )
    const choroplethSpecificDefaults = new Set([...choroplethDefaults].filter((k) => !baseTypeKeys.has(k)))
    const choroplethTypeKeys = getInterfaceKeys(chTypeSource, 'ChoroplethLegendConfig')
    const missingChoroplethKeys = setDifference(choroplethSpecificDefaults, choroplethTypeKeys)

    const sizeLegendBody = getObjectLiteralTextAfterToken(psLegendSource, 'out.sizeLegend =')
    const colorLegendBody = getObjectLiteralTextAfterToken(psLegendSource, 'out.colorLegend =')
    const sizeDefaultKeys = new Set([...getTopLevelObjectKeys(sizeLegendBody)].filter((k) => !k.startsWith('_')))
    const colorDefaultKeys = new Set([...getTopLevelObjectKeys(colorLegendBody)].filter((k) => !k.startsWith('_')))

    const psSizeTypeKeys = getInterfaceKeys(psTypeSource, 'ProportionalSymbolSizeLegendConfig')
    const psColorTypeKeys = getInterfaceKeys(psTypeSource, 'ProportionalSymbolColorLegendConfig')
    const missingPsSizeKeys = setDifference(sizeDefaultKeys, psSizeTypeKeys)
    const missingPsColorKeys = setDifference(colorDefaultKeys, psColorTypeKeys)

    const indexSource = readText(indexTypesPath)
    const primaryLegendTypeFiles = getPrimaryLegendTypeFiles()
    const missingLegendTypeExports = primaryLegendTypeFiles.filter(({ name }) => {
        const exportRegex = new RegExp(`\\b${name}\\b`)
        return !exportRegex.test(indexSource)
    })

    let totalInserted = 0
    totalInserted += addMissingInterfaceProperties(legendTypePath, 'LegendConfig', missingBaseLegendKeys)
    totalInserted += addMissingInterfaceProperties(choroplethLegendTypePath, 'ChoroplethLegendConfig', missingChoroplethKeys)
    totalInserted += addMissingInterfaceProperties(propLegendTypePath, 'ProportionalSymbolSizeLegendConfig', missingPsSizeKeys)
    totalInserted += addMissingInterfaceProperties(propLegendTypePath, 'ProportionalSymbolColorLegendConfig', missingPsColorKeys)
    const addedExports = ensureLegendTypeExportsInIndex(missingLegendTypeExports)

    runCopyTypes()

    const changedGroups = [
        ['LegendConfig keys added', missingBaseLegendKeys.length],
        ['ChoroplethLegendConfig keys added', missingChoroplethKeys.length],
        ['ProportionalSymbolSizeLegendConfig keys added', missingPsSizeKeys.length],
        ['ProportionalSymbolColorLegendConfig keys added', missingPsColorKeys.length],
        ['Legend type exports added', addedExports],
    ]

    const anyChanges = totalInserted > 0 || addedExports > 0
    if (!anyChanges) {
        console.log('No type discrepancies found in auto-sync scope. build/types has been refreshed from src/types.')
        return
    }

    console.log('Updated types from source defaults and refreshed build/types:')
    for (const [label, count] of changedGroups) {
        if (count > 0) console.log(`- ${label}: ${count}`)
    }
    console.log('Note: auto-sync currently targets legend config/type parity and export propagation.')
}

main()
