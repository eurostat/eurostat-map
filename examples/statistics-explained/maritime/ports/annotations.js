const portsAnnotations = [
    {
        note: {
            title: "Rotterdam",
            wrap: 150,
            align: "middle"
        },
        className: "rotterdam",
        x: 257,
        y: 320,
        dy: -20,
        dx: 0
    },
    {
        note: {
            title: "Antwerp-Bruges",
            align: "right"
        },
        className: "center-vertically",
        x: 222,
        y: 369,
        dy: 0,
        dx: -50
    },
    {
        note: {
            title: "Hamburg",
            align: "left"
        },
        className: "center-vertically",
        x: 335,
        y: 366,
        dy: 0,
        dx: 30
    },
    {
        note: {
            title: "Aliaga",
            align: "left"
        },
        className: "center-vertically",
        x: 575,
        y: 566,
        dy: 0,
        dx: 10
    },
    {
        note: {
            title: "Izmit",
            align: "left"
        },
        className: "center-vertically",
        x: 604,
        y: 536,
        dy: 0,
        dx: 10
    }

].map((a) => {
    a.color = "#5b5b5b";
    return a;
});
