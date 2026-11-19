// Source: Top_Flows_Map_EU-2025.xls, Report. The unlocated partner ZZ09 is excluded.
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
            "id": "NO",
            "name": "NORWAY",
            "y": 61,
            "x": 7
        },
        {
            "id": "UK",
            "name": "UNITED KINGDOM",
            "y": 55,
            "x": -2
        },
        {
            "id": "CN",
            "name": "CHINA",
            "y": 35,
            "x": 103
        },
        {
            "id": "TR",
            "name": "TÜRKIYE",
            "y": 42,
            "x": 33
        },
        {
            "id": "BR",
            "name": "BRAZIL",
            "y": -10,
            "x": -55
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
            "y": 44.5,
            "x": 40
        },
        {
            "id": "CA",
            "name": "CANADA: East coast",
            "y": 48,
            "x": -65
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
            "y": 32,
            "x": -6
        },
        {
            "id": "NG",
            "name": "NIGERIA",
            "y": 9.1,
            "x": 8.7
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
            "value": 190610088,
            "meta": {
                "direction": "Inwards",
                "partner": "US_ATL",
                "label": "USA: East coast",
                "share": 0.09434681664214357
            }
        },
        {
            "source": "NO",
            "target": "EU",
            "value": 111713417,
            "meta": {
                "direction": "Inwards",
                "partner": "NO",
                "label": "NORWAY",
                "share": 0.05529510730914896
            }
        },
        {
            "source": "EU",
            "target": "UK",
            "value": 108843065,
            "meta": {
                "direction": "Outwards",
                "partner": "GB",
                "label": "UNITED KINGDOM",
                "share": 0.0538743610271242
            }
        },
        {
            "source": "UK",
            "target": "EU",
            "value": 94519794,
            "meta": {
                "direction": "Inwards",
                "partner": "GB",
                "label": "UNITED KINGDOM",
                "share": 0.046784730898247015
            }
        },
        {
            "source": "CN",
            "target": "EU",
            "value": 86854348,
            "meta": {
                "direction": "Inwards",
                "partner": "CN",
                "label": "CHINA",
                "share": 0.0429905433196638
            }
        },
        {
            "source": "TR",
            "target": "EU",
            "value": 80977520,
            "meta": {
                "direction": "Inwards",
                "partner": "TR",
                "label": "TÜRKIYE",
                "share": 0.04008167307270492
            }
        },
        {
            "source": "BR",
            "target": "EU",
            "value": 80221999,
            "meta": {
                "direction": "Inwards",
                "partner": "BR",
                "label": "BRAZIL",
                "share": 0.039707710697448634
            }
        },
        {
            "source": "EG",
            "target": "EU",
            "value": 59256708,
            "meta": {
                "direction": "Inwards",
                "partner": "EG",
                "label": "EGYPT",
                "share": 0.02933046106401799
            }
        },
        {
            "source": "RU",
            "target": "EU",
            "value": 53689832,
            "meta": {
                "direction": "Inwards",
                "partner": "RU01",
                "label": "RUSSIA: BLACK SEA",
                "share": 0.026575008638847555
            }
        },
        {
            "source": "CA",
            "target": "EU",
            "value": 46691124,
            "meta": {
                "direction": "Inwards",
                "partner": "CA1-2",
                "label": "Canada: East coast",
                "share": 0.023110838261842626
            }
        },
        {
            "source": "EU",
            "target": "US",
            "value": 44198279,
            "meta": {
                "direction": "Outwards",
                "partner": "US_ATL",
                "label": "USA: East coast",
                "share": 0.021876947691831006
            }
        },
        {
            "source": "LY",
            "target": "EU",
            "value": 43876107,
            "meta": {
                "direction": "Inwards",
                "partner": "LY",
                "label": "LIBYA",
                "share": 0.02171748130193441
            }
        },
        {
            "source": "EU",
            "target": "TR",
            "value": 43085591,
            "meta": {
                "direction": "Outwards",
                "partner": "TR",
                "label": "TÜRKIYE",
                "share": 0.021326197352132755
            }
        },
        {
            "source": "DZ",
            "target": "EU",
            "value": 33516313,
            "meta": {
                "direction": "Inwards",
                "partner": "DZ",
                "label": "ALGERIA",
                "share": 0.016589664641105947
            }
        },
        {
            "source": "EU",
            "target": "MA",
            "value": 33235728,
            "meta": {
                "direction": "Outwards",
                "partner": "MA",
                "label": "MOROCCO",
                "share": 0.016450782686717805
            }
        },
        {
            "source": "NG",
            "target": "EU",
            "value": 31454033,
            "meta": {
                "direction": "Inwards",
                "partner": "NG",
                "label": "NIGERIA",
                "share": 0.015568892052066694
            }
        },
        {
            "source": "EU",
            "target": "CN",
            "value": 25856600,
            "meta": {
                "direction": "Outwards",
                "partner": "CN",
                "label": "CHINA",
                "share": 0.012798314741816023
            }
        },
        {
            "source": "IN",
            "target": "EU",
            "value": 24535708,
            "meta": {
                "direction": "Inwards",
                "partner": "IN",
                "label": "INDIA",
                "share": 0.012144509076881468
            }
        },
        {
            "source": "MA",
            "target": "EU",
            "value": 21681621,
            "meta": {
                "direction": "Inwards",
                "partner": "MA",
                "label": "MOROCCO",
                "share": 0.010731813528103767
            }
        },
        {
            "source": "IQ",
            "target": "EU",
            "value": 21629497,
            "meta": {
                "direction": "Inwards",
                "partner": "IQ",
                "label": "IRAQ",
                "share": 0.010706013563777352
            }
        }
    ]
}
