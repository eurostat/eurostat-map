// Type-checks every JavaScript and TypeScript example of the documentation against src/types, so that the docs and the
// typings cannot drift apart. Only mismatches with the API count (unknown member, wrong argument or option, syntax):
// examples are fragments, so names they leave undeclared are not errors.
//   node scripts/check-docs-examples.js
const fs = require('fs')
const os = require('os')
const path = require('path')
const ts = require('typescript')

const ROOT = path.resolve(__dirname, '..')
const DOCS = ['README.md', 'docs/reference.md', 'docs/multi-layer-guide.md', 'docs/responsive.md', 'docs/release-notes.md', 'skills/eurostat-map/SKILL.md']
// 2339/2551: unknown property; 2345/2322: wrong type; 2353/2561: unknown option; 2554: argument count;
// 2559/2769: nothing in common / no matching overload; 1005/1109/1128: syntax
const CHECKED = new Set([2339, 2551, 2345, 2322, 2353, 2561, 2554, 2559, 2769, 1005, 1109, 1128])

/** Whether code is syntactically a program on its own. */
const parses = (code) => !ts.createSourceFile('f.ts', code, ts.ScriptTarget.ES2022, false, ts.ScriptKind.TS).parseDiagnostics.length

/** A fragment (the rest of a builder chain, an object, some properties of one) made into a program. */
function asProgram(code) {
    if (/^\s*(\/\/.*\n\s*)*\./.test(code)) return 'map\n' + code
    const trimmed = code.trim().replace(/[;,]$/, '')
    const wrapped = [code, `const fragment = (\n${trimmed}\n)`, `const fragment = {\n${trimmed}\n}`]
    return wrapped.find(parses) ?? code
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-doc-examples-'))
const types = path.join(ROOT, 'src', 'types', 'index').replace(/\\/g, '/')
const origins = {}
const files = []

for (const doc of DOCS) {
    let text = fs.readFileSync(path.join(ROOT, doc), 'utf8').replace(/\r/g, '')
    // earlier versions' release notes describe the API of their time: only the latest section is checked
    if (doc === 'docs/release-notes.md') text = text.slice(0, text.indexOf('\n## ', text.indexOf('\n## ') + 1))
    for (const match of text.matchAll(/```(?:javascript|js|ts|typescript)\n([\s\S]*?)```/g)) {
        const code = asProgram(match[1].replace(/^import .*$/gm, '').replace(/\b(const|let|var) eurostatmap\b.*$/gm, '').replace(/^.*\/\/ warns.*$/gm, ''))
        const declaresMap = /\b(const|let|var) map\b/.test(code)
        const name = `example${files.length}.ts`
        const file = path.join(dir, name)
        fs.writeFileSync(
            file,
            `export {}\ndeclare const eurostatmap: typeof import('${types}');\n` +
                (declaresMap ? '' : `declare const map: import('${types}').MapInstance;\n`) +
                code +
                '\n'
        )
        origins[name] = `${doc}:${text.slice(0, match.index).split('\n').length}`
        files.push(file)
    }
}

const program = ts.createProgram(files, {
    noEmit: true,
    strict: false,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
})
const problems = new Map()
for (const diagnostic of [...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()]) {
    if (!diagnostic.file || !CHECKED.has(diagnostic.code)) continue
    const origin = origins[path.basename(diagnostic.file.fileName)]
    if (!origin) continue
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ').slice(0, 300)
    if (!problems.has(origin)) problems.set(origin, new Set())
    problems.get(origin).add(message)
}
fs.rmSync(dir, { recursive: true, force: true })

if (problems.size) {
    console.error(`${problems.size} documentation example(s) do not match the typings:`)
    for (const [origin, messages] of problems) console.error(`  ${origin}\n    ${[...messages].slice(0, 3).join('\n    ')}`)
    process.exit(1)
}
console.log(`${files.length} documentation examples match the typings`)
