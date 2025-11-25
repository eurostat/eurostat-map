const insetWidth = 85;
const insetHeight = 60;


const insets = [
    //Canarias, Martinique, Guadeloupe, Réunion
    {
        title: 'Canarias (ES)',
        geo: 'IC',
        x: 0,
        y: 0,
        position: { z: 6400 },
        width: insetWidth,
        height: insetHeight,
    },
    {
        title: 'Guadeloupe (FR)',
        geo: 'GP',
        x: 0,
        y: insetHeight + 10,
        width: insetWidth,
        height: insetHeight,
        position: { x: 680000, y: 1810000, z: 2000 },
        // titlePosition: [0, 10],
        // showScalebar: true,
        // scalebarPosition: [48, 55],
    },
    {
        title: 'Martinique (FR)',
        geo: 'MQ',
        x: 0,
        y: insetHeight * 2 + 20,
        position: { z: 2000 },
        width: insetWidth,
        height: insetHeight,
    },
    {
        title: 'Reunion (FR)',
        geo: 'RE',
        x: 0,
        y: insetHeight * 3 + 30,
        position: { x: 348011, y: 7661627, z: 2600 },
        width: insetWidth,
        height: insetHeight,
    },
].map((d) => {
    d.titlePosition = [3, 13]
    return d;
});