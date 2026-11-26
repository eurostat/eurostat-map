// A reduced proj4: the core plus only the two projections eurostat-map needs (EPSG:3035 LAEA and EPSG:54030 Robinson;
// 'longlat' for EPSG:4326 is always registered by the core). The default 'proj4' entry registers ~30 projections and
// adds ~60 KB to the bundle. Mirrors node_modules/proj4/lib/index.js, so check it against that file when upgrading proj4.
import core from 'proj4/lib/core.js'
import Proj from 'proj4/lib/Proj.js'
import Point from 'proj4/lib/Point.js'
import toPoint from 'proj4/lib/common/toPoint.js'
import defs from 'proj4/lib/defs.js'
import nadgrid from 'proj4/lib/nadgrid.js'
import transform from 'proj4/lib/transform.js'
import laea from 'proj4/lib/projections/laea.js'
import robin from 'proj4/lib/projections/robin.js'

const proj4 = Object.assign(core, { defaultDatum: 'WGS84', Proj, WGS84: new Proj('WGS84'), Point, toPoint, defs, nadgrid, transform })
;[laea, robin].forEach((projection) => proj4.Proj.projections.add(projection))

export default proj4
