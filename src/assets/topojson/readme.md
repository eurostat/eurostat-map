world.json is a topojson file composed of GISCOs CNTR_RG_20M_2020_4326.json and CNTR_BN_20M_2020_4326.json topojson files (can be joined together in mapshaper.org).


In order to be consistent with NUTS2JSON files that eurostat-map uses, the NAME_ENGL and CNTR_ID properties were renamed to na and id

Steps:
1 download latest GISCO country rg and country bn geojson EPSG4326 files
2 open them in mapshaper, with NUTS_BN_20M_2021_RS_XK_border
3 export all to topojson
4 rename (find and replace all) NAME_ENGL and CNTR_ID to na and id
5 rename CNTR_RG_20M_202X_4326 to CNTR_RG_20M_2020_4326 and CNTR_BN_20M_202X_4326 to CNTR_RG_20M_2020_4326