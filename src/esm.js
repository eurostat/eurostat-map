// Entry of the ES module build: named exports, and the same object as the default export, so that both
// `import { map } from 'eurostat-map'` and `import eurostatmap from 'eurostat-map'` work.
import * as eurostatmap from './index'

export * from './index'
export default eurostatmap
