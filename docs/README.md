# eurostat-map.js

eurostat-map.js is now bundled and compiled using webpack & babel.

### To install the project

-- Clone the repository
-- cd into eurostat-map.js
-- with node.js installed run "npm install"

### To run a development build

-- run "npm run build-dev"
This will use the configuration in webpack.config.dev.js to build a non-minified development bundle containing source maps and place it in the /build folder as eurostatmap.js

### To run a production build

-- run "npm run build-prod"
This will use the configuration in webpack.config.prod.js to build a minified development bundle without source maps and place it in the /build folder as eurostatmap.min.js
