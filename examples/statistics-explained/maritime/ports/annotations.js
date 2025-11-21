const portsAnnotations = [
    {
        note: {
            title: "Rotterdam",
            wrap: 150,
            align: "middle"
        },
        className: "rotterdam",
        x: 257,
        y: 334,
        dy: -20,
        dx: 0
    },
    {
        note: {
            title: "Antwerp-Bruges",
            align: "left"
        },
        className: "center-vertically",
        x: 258,
        y: 399,
        dy: 0,
        dx: 50
    },
    {
        note: {
            title: "Hamburg",
            align: "left"
        },
        className: "center-vertically",
        x: 330,
        y: 360,
        dy: 0,
        dx: 30
    },
    {
        note: {
            title: "Aliaga",
            align: "left"
        },
        className: "center-vertically",
        x: 565,
        y: 566,
        dy: 0,
        dx: 15
    },
    {
        note: {
            title: "Izmit",
            align: "left"
        },
        className: "center-vertically",
        x: 595,
        y: 536,
        dy: 0,
        dx: 15
    }

].map((a) => {
    a.color = "#5b5b5b";
    return a;
});
