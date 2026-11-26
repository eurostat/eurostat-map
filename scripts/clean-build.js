// Empties build/ before a full build, so that nothing left from an earlier one gets published. build/package.json is
// a source file (it is committed, and bundlers read it next to the bundles): it stays.
const fs = require('node:fs')
const path = require('node:path')

const buildDir = path.resolve(__dirname, '..', 'build')

if (fs.existsSync(buildDir)) {
    for (const name of fs.readdirSync(buildDir)) {
        if (name !== 'package.json') fs.rmSync(path.join(buildDir, name), { recursive: true, force: true })
    }
}
