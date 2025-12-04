const maritimeFlowGraph = {
    "nodes": [
        {
            "id": "EU",
            "name": "EU",
            "y": 49,
            "x": 12
        },
        {
            "id": "US",
            "name": "USA: East coast",
            "y": 36.8,
            "x": -75.6
        },
        {
            "id": "UK",
            "name": "UNITED KINGDOM",
            "y": 55,
            "x": -2
        },
        {
            "id": "NO",
            "name": "NORWAY",
            "y": 61,
            "x": 7
        },
        {
            "id": "CN",
            "name": "CHINA",
            "y": 35,
            "x": 103
        },
        {
            "id": "BR",
            "name": "BRAZIL",
            "y": -10,
            "x": -55
        },
        {
            "id": "TR",
            "name": "TÜRKIYE",
            "y": 42,
            "x": 33
        },
        {
            "id": "EG",
            "name": "EGYPT",
            "y": 26.5,
            "x": 30
        },
        {
            "id": "RU",
            "name": "RUSSIA: Black Sea",
            "y": 44.6,
            "x": 37.9
        },
        {
            "id": "CA",
            "name": "CANADA: East coast",
            "y": 47,
            "x": -64
        },
        {
            "id": "LY",
            "name": "LIBYA",
            "y": 26.3,
            "x": 17.2
        },
        {
            "id": "DZ",
            "name": "ALGERIA",
            "y": 28,
            "x": 3
        },
        {
            "id": "MA",
            "name": "MOROCCO",
            "y": 31.8,
            "x": -7.1
        },
        {
            "id": "NG",
            "name": "NIGERIA",
            "y": 9.1,
            "x": 8.7
        },
        {
            "id": "UA",
            "name": "UKRAINE",
            "y": 49,
            "x": 32
        },
        {
            "id": "IN",
            "name": "INDIA",
            "y": 22,
            "x": 79
        },
        {
            "id": "IQ",
            "name": "IRAQ",
            "y": 32,
            "x": 45
        }
    ],
    "links": [
        {
            "source": "US",
            "target": "EU",
            "value": 172400000,
            "meta": {
                "direction": "Inwards",
                "partner": "US",
                "label": "USA: East coast",
                "share": 0.087
            }
        },
        {
            "source": "EU",
            "target": "UK",
            "value": 110400000,
            "meta": {
                "direction": "Outwards",
                "partner": "UK",
                "label": "UNITED KINGDOM",
                "share": 0.055
            }
        },
        {
            "source": "NO",
            "target": "EU",
            "value": 109400000,
            "meta": {
                "direction": "Inwards",
                "partner": "NO",
                "label": "NORWAY",
                "share": 0.055
            }
        },
        {
            "source": "UK",
            "target": "EU",
            "value": 96200000,
            "meta": {
                "direction": "Inwards",
                "partner": "UK",
                "label": "UNITED KINGDOM",
                "share": 0.048
            }
        },
        {
            "source": "CN",
            "target": "EU",
            "value": 79100000,
            "meta": {
                "direction": "Inwards",
                "partner": "CN",
                "label": "CHINA",
                "share": 0.04
            }
        },
        {
            "source": "BR",
            "target": "EU",
            "value": 79100000,
            "meta": {
                "direction": "Inwards",
                "partner": "BR",
                "label": "BRAZIL",
                "share": 0.04
            }
        },
        {
            "source": "TR",
            "target": "EU",
            "value": 78500000,
            "meta": {
                "direction": "Inwards",
                "partner": "TR",
                "label": "TÜRKIYE",
                "share": 0.039
            }
        },
        {
            "source": "EG",
            "target": "EU",
            "value": 64200000,
            "meta": {
                "direction": "Inwards",
                "partner": "EG",
                "label": "EGYPT",
                "share": 0.032
            }
        },
        {
            "source": "EU",
            "target": "US",
            "value": 48500000,
            "meta": {
                "direction": "Outwards",
                "partner": "US",
                "label": "USA: East coast",
                "share": 0.024
            }
        },
        {
            "source": "RU",
            "target": "EU",
            "value": 44700000,
            "meta": {
                "direction": "Inwards",
                "partner": "RU",
                "label": "RUSSIA: Black Sea",
                "share": 0.022
            }
        },
        {
            "source": "EU",
            "target": "TR",
            "value": 42500000,
            "meta": {
                "direction": "Outwards",
                "partner": "TR",
                "label": "TÜRKIYE",
                "share": 0.021
            }
        },
        {
            "source": "CA",
            "target": "EU",
            "value": 39000000,
            "meta": {
                "direction": "Inwards",
                "partner": "CA",
                "label": "CANADA: East coast",
                "share": 0.02
            }
        },
        {
            "source": "LY",
            "target": "EU",
            "value": 36300000,
            "meta": {
                "direction": "Inwards",
                "partner": "LY",
                "label": "LIBYA",
                "share": 0.018
            }
        },
        {
            "source": "DZ",
            "target": "EU",
            "value": 34900000,
            "meta": {
                "direction": "Inwards",
                "partner": "DZ",
                "label": "ALGERIA",
                "share": 0.018
            }
        },
        {
            "source": "EU",
            "target": "MA",
            "value": 33800000,
            "meta": {
                "direction": "Outwards",
                "partner": "MA",
                "label": "MOROCCO",
                "share": 0.017
            }
        },
        {
            "source": "NG",
            "target": "EU",
            "value": 33299999.999999996,
            "meta": {
                "direction": "Inwards",
                "partner": "NG",
                "label": "NIGERIA",
                "share": 0.017
            }
        },
        {
            "source": "EU",
            "target": "CN",
            "value": 32600000,
            "meta": {
                "direction": "Outwards",
                "partner": "CN",
                "label": "CHINA",
                "share": 0.016
            }
        },
        {
            "source": "UA",
            "target": "EU",
            "value": 27200000,
            "meta": {
                "direction": "Inwards",
                "partner": "UA",
                "label": "UKRAINE",
                "share": 0.014
            }
        },
        {
            "source": "IN",
            "target": "EU",
            "value": 26000000,
            "meta": {
                "direction": "Inwards",
                "partner": "IN",
                "label": "INDIA",
                "share": 0.013
            }
        },
        {
            "source": "IQ",
            "target": "EU",
            "value": 25400000,
            "meta": {
                "direction": "Inwards",
                "partner": "IQ",
                "label": "IRAQ",
                "share": 0.013
            }
        }
    ]
}