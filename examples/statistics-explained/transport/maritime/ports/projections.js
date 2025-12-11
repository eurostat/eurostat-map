// european projection
proj4.defs(
    "EPSG:3035",
    "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 " +
    "+ellps=GRS80 +units=m +no_defs +type=crs"
)
const to3035 = ([lon, lat]) => proj4("EPSG:4326", "EPSG:3035", [lon, lat])
//canarias
proj4.defs(
    "EPSG:32628",
    "+proj=utm +zone=28 +datum=WGS84 +units=m +no_defs +type=crs"
);
const to32628 = ([lon, lat]) =>
    proj4("EPSG:4326", "EPSG:32628", [lon, lat]);
//guadeloupe, martinique
proj4.defs(
    "EPSG:32620",
    "+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs +type=crs"
);
const to32620 = ([lon, lat]) =>
    proj4("EPSG:4326", "EPSG:32620", [lon, lat]);
//reunion
proj4.defs(
    "EPSG:32740",
    "+proj=utm +zone=40 +south +datum=WGS84 +units=m +no_defs +type=crs"
);

const to32740 = ([lon, lat]) =>
    proj4("EPSG:4326", "EPSG:32740", [lon, lat]);
function indexByCode(portsData, valueKey = "tonnes_2024") {
    return Object.fromEntries(portsData.map((p) => [p.code, p[valueKey]]));
}

const getBBOXAsGeoJSON = function (bb) {
    return {
        type: "Feature",
        geometry: {
            type: "MultiPoint",
            coordinates: [
                [bb[0], bb[1]],
                [bb[2], bb[3]]
            ]
        }
    };
}