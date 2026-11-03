# eurostat-map.js

eurostat-map.js is now bundled and compiled using webpack & babel.

### To install the project

-- Clone the repository
-- cd into eurostat-map.js
-- with node.js installed run "npm install"

### To run a development build

-- run "npx webpack --config webpack/webpack.config.dev.js --no-watch"
This will use the configuration in webpack.config.dev.js to build a non-minified development bundle containing source maps and place it in the /build folder as eurostatmap.js (without --no-watch the dev configuration keeps watching for changes)

### To run a production build

-- run "npm run build-prod"
This will use the configuration in webpack.config.prod.js to build the minified production bundle and place it in the /build folder as eurostatmap.min.js

### To run the checks

-- run "npm test" (tests run against the built build/eurostatmap.js, so build the dev bundle first)
-- run "npm run type-check" (typings and documentation sync checks)
