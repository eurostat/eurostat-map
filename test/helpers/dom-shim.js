globalThis.self = globalThis
globalThis.window = globalThis
globalThis.location = {
    href: 'http://localhost/',
    hostname: 'localhost'
}
globalThis.document = {
    documentElement: {},
    head: {
        appendChild: () => {}
    },
    querySelector: () => ({
        appendChild: () => {},
        insertBefore: () => {}
    }),
    createElement: () => ({
        setAttribute: () => {},
        style: {},
        appendChild: () => {}
    }),
    createTextNode: () => ({})
}
