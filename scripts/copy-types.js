const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const srcDir = path.join(repoRoot, 'src', 'types')
const destDir = path.join(repoRoot, 'build', 'types')

function copyDtsFiles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            copyDtsFiles(fullPath)
            continue
        }
        if (!entry.name.endsWith('.d.ts')) continue
        const relPath = path.relative(srcDir, fullPath)
        const destPath = path.join(destDir, relPath)
        fs.mkdirSync(path.dirname(destPath), { recursive: true })
        fs.copyFileSync(fullPath, destPath)
    }
}

copyDtsFiles(srcDir)
console.log(`Copied .d.ts files from ${path.relative(repoRoot, srcDir)} to ${path.relative(repoRoot, destDir)}`)
