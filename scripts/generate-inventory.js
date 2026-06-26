const fs = require('fs');
const path = require('path');
const manifest = require('../examples/scripts/example-manifest');

const examplesDir = path.join(__dirname, '..', 'examples');
const inventory = {};

for (const p of manifest.paths) {
    const filePath = path.join(examplesDir, p);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        continue;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    
    // Find all occurrences of map('type') or map("type")
    const matches = [...html.matchAll(/\.map\(\s*['"]([^'"]+)['"]\s*\)/g)];
    let types = matches.map(m => m[1]);
    
    if (types.length === 0) {
        // Fallback checks for examples that don't call .map('type') inline but use configs
        if (p.includes('choropleth')) {
            types.push('choropleth');
        } else if (p.includes('proportional-symbol') || p.includes('prop-circles') || p.includes('prop-symbols')) {
            types.push('proportionalSymbol');
        } else if (p.includes('pie')) {
            types.push('pieChart');
        } else if (p.includes('waffle')) {
            types.push('waffle');
        } else if (p.includes('coxcomb')) {
            types.push('coxcomb');
        } else if (p.includes('flow')) {
            types.push('flow');
        } else if (p.includes('sparkline')) {
            types.push('sparkline');
        } else if (p.includes('mushroom')) {
            types.push('mushroom');
        } else if (p.includes('categorical')) {
            types.push('categorical');
        } else if (p.includes('bivariate')) {
            types.push('bivariateChoropleth');
        } else if (p.includes('trivariate')) {
            types.push('trivariateChoropleth');
        } else if (p.includes('stripe')) {
            types.push('stripeComposition');
        } else {
            types.push('choropleth'); // default fallback
        }
    }
    
    inventory[p] = {
        path: p,
        types: [...new Set(types)]
    };
}

fs.writeFileSync(
    path.join(examplesDir, '_inventory.json'),
    JSON.stringify(inventory, null, 4),
    'utf8'
);
console.log(`Generated examples/_inventory.json with ${Object.keys(inventory).length} entries.`);
