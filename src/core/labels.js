/**
 * Default labels for country / geographical names.
 * Using centroids would clash with proportional symbols, and are generally not ideal placements, so labels are positioned independently 
 * Labels are provided for all supported languages (defined using map.lg())
 */
 export const defaultLabels = {
	"EUR_3035": {
		cc:[
			{ text:"AL", x: 5100000, y: 2060000, class: "cc", size:7, },
			{ text:"AT", x: 4670000, y: 2629000, class: "cc", size: 18 },
			{ text:"BE", x: 3930000, y: 3010000, class: "cc", size:17},
			{ text:"BG", x: 5567000, y: 2200000, class: "cc", size: 22 },
			{ text:"HR", x: 4876000, y: 2455000, class: "cc", size: 10 },
			{ text:"CY", x: 6426000, y: 1480000, class: "cc", size: 10 },
			{ text:"CZ", x: 4707000, y: 2885000, class: "cc", size: 18 },
			{ text:"DK", x: 4316000, y: 3621000, class: "cc", size: 20 },
			{ text:"EE", x: 5220000, y: 3990000, class: "cc", size: 12 },
			{ text:"FI", x: 5150000, y: 4424000, class: "cc", size: 20 },
			{ text:"FR", x: 3767740, y: 2662817, class: "cc", size: 22 },
			{ text:"DE", x: 4347284, y: 3093276, class: "cc", size: 22 },
			{ text:"EL", x: 5370000, y: 1750000, class: "cc", size: 22 },
			{ text:"HU", x: 5020000, y: 2630000, class: "cc", size: 17 },
			{ text:"IS", x: 3040000, y: 4833000, class: "cc", size: 10 },
			{ text:"IE",x: 3136000, y: 3394000, class: "cc", size: 17 },
			{ text:"IT",x: 4469967, y: 2181963, class: "cc", size: 22 },
			{ text:"LV", x: 5290000, y: 3800000, class: "cc", size:12},
			{ text:"LT", x: 5190000, y: 3630000, class: "cc", size:12 },
			{ text:"LU", x: 4120000, y: 2940000, class: "cc", size:12 },
			{ text:"MT",x: 4731000, y: 1300000, class: "cc", size: 10 },
			{ text:"ME",x: 5073000, y: 2185000, class: "cc", size: 7 },
			{ text:"MK", x: 5300000, y: 2080000, class: "cc", size: 10 },
			{ text:"NL",x: 4020000, y: 3208000, class: "cc", size:17 },
			{ text:"NO",x: 4300000, y: 4147000, class: "cc", size: 20, },
			{ text:"PL",x: 4964000, y: 3200000, class: "cc", size: 22 },
			{ text:"PT",x: 2800000, y: 1990000, class: "cc", size: 18, },
			{ text:"RO",x: 5451000, y: 2600000, class: "cc", size: 22 },
			{ text:"RS",x: 5200000, y: 2300000, class: "cc", size:10 },
			{ text:"SK",x: 5040000, y: 2835000, class: "cc", size:12, },
			{ text:"SI",x: 4655000, y: 2480000, class: "cc", size:10, },
			{ text:"ES",x: 3160096, y: 1900000, class: "cc", size: 22 },
			{ text:"SE",x: 4630000, y: 4000000, class: "cc", size: 20, },
			{ text:"CH", x: 4200000, y: 2564000, class: "cc", size:16 },
			{ text:"TR",x: 6510000, y: 2100000, class: "cc", size: 22 },
			{ text:"UK",x: 3558000, y: 3250000, class: "cc", size: 17 }
		],
		en: [
			{ text: "MEDITERRANEAN SEA", x: 5472000, y: 1200000, class: "seas", size: 12, letterSpacing: 7 },
			{ text: "ATLANTIC OCEAN", x: 2820000, y: 2540000, class: "seas", size: 12, letterSpacing: 2 },
			{ text: "NORTH SEA", x: 3915000, y: 3700000, class: "seas", size: 12 },
			{ text: "BALTIC SEA", x: 4900000, y: 3672000, class: "seas", size: 10, rotate: -50 },
			{ text: "NORWEGIAN SEA", x: 3850000, y: 4800000, class: "seas", size: 12, letterSpacing: 1},
			{ text: "BLACK SEA", x: 6300000, y: 2500000, class: "seas", size: 12, letterSpacing: 4 },
			{ text: "ALBANIA", cc:"AL", x: 5100000, y: 2060000, class: "countries", size:7, rotate: 80 },
			{ text: "AUSTRIA",cc:"AT", x: 4670000, y: 2629000, class: "countries", size: 10 },
			{ text: "BELGIUM",cc:"BE", x: 3900000, y: 3030000, class: "countries", size:7, rotate: 30 },
			{ text: "BULGARIA",cc:"BG", x: 5567000, y: 2256000, class: "countries", size: 12 },
			{ text: "CROATIA",cc:"HR", x: 4876000, y: 2455000, class: "countries", size:7 },
			{ text: "CYPRUS",cc:"CY", x: 6426000, y: 1480000, class: "countries", size: 10 },
			{ text: "CZECHIA",cc:"CZ", x: 4707000, y: 2885000, class: "countries", size: 12 },
			{ text: "DENMARK",cc:"DK", x: 4316000, y: 3621000, class: "countries", size: 10 },
			{ text: "ESTONIA",cc:"EE", x: 5220000, y: 3990000, class: "countries", size:7 },
			{ text: "FINLAND",cc:"FI", x: 5150000, y: 4424000, class: "countries", size: 12 },
			{ text: "FRANCE",cc:"FR", x: 3767740, y: 2662817, class: "countries", size: 12 },
			{ text: "GERMANY",cc:"DE", x: 4347284, y: 3093276, class: "countries", size: 12 },
			{ text: "GREECE",cc:"EL", x: 5470000, y: 1860000, class: "countries", size: 12 },
			{ text: "HUNGARY",cc:"HU", x: 5020000, y: 2630000, class: "countries", size: 10 },
			{ text: "ICELAND",cc:"IS", x: 3040000, y: 4833000, class: "countries", size: 10 },
			{ text: "IRELAND", cc:"IE",x: 3136000, y: 3394000, class: "countries", size: 10 },
			{ text: "ITALY", cc:"IT",x: 4469967, y: 2181963, class: "countries", size: 12 },
			{ text: "LATVIA",cc:"LV", x: 5290000, y: 3800000, class: "countries", size:7 },
			{ text: "LITHUANIA",cc:"LT", x: 5190000, y: 3630000, class: "countries", size:7 },
			{ text: "LUX.",cc:"LU", x: 4120000, y: 2940000, class: "countries", size:7 },
			{ text: "MALTA", cc:"MT",x: 4731000, y: 1330000, class: "countries", size:7 },
			{ text: "MONT.", cc:"ME",x: 5073000, y: 2185000, class: "countries", size: 7 },
			{ text: "N. MACEDONIA",cc:"MK", x: 5300000, y: 2082000, class: "countries", size: 7 },
			{ text: "NETHERLANDS", cc:"NL",x: 3977000, y: 3208000, class: "countries", size:7 },
			{ text: "NORWAY", cc:"NO",x: 4330000, y: 4147000, class: "countries", size: 12, rotate: -75 },
			{ text: "POLAND", cc:"PL",x: 4964000, y: 3269000, class: "countries", size: 12 },
			{ text: "PORTUGAL", cc:"PT",x: 2830000, y: 1990000, class: "countries", size: 10, rotate: -75 },
			{ text: "ROMANIA", cc:"RO",x: 5451000, y: 2600000, class: "countries", size: 12 },
			{ text: "SERBIA", cc:"RS",x: 5200000, y: 2300000, class: "countries", size:7 },
			{ text: "SLOVAKIA", cc:"SK",x: 5040000, y: 2835000, class: "countries", size:7, rotate: -30 },
			{ text: "SLOVENIA", cc:"SI",x: 4735000, y: 2522000, class: "countries", size:7, rotate: -30 },
			{ text: "SPAIN", cc:"ES",x: 3160096, y: 1850000, class: "countries", size: 12 },
			{ text: "SWEDEN", cc:"SE",x: 4630000, y: 4100000, class: "countries", size: 12, rotate: -75 },
			{ text: "SWITZERLAND",cc:"CH", x: 4200000, y: 2564000, class: "countries", size:7 },
			{ text: "TURKEY", cc:"TR",x: 6510000, y: 2100000, class: "countries", size: 12 },
			{ text: "U.K.", cc:"UK",x: 3558000, y: 3250000, class: "countries", size: 12 }
		],
		fr: [
			{ text: "MER MÉDITERRANÉE", x: 5472000, y: 1242000, class: "seas", size: 12 },
			{ text: "OCÈAN ATLANTIQUE", x: 2820000, y: 2540000, class: "seas", size: 12 },
			{ text: "MER DU NORD", x: 3915000, y: 3700000, class: "seas", size: 12 },
			{ text: "MER BALTIQUE", x: 4900000, y: 3672000, class: "seas", size: 10, rotate: -50 },
			{ text: "MER DE NORVÈGE", x: 3850000, y: 4800000, class: "seas", size: 12 },
			{ text: "MER NOIRE", x: 6265000, y: 2472000, class: "seas", size: 12 },
			{ text: "ALBANIE", x: 5100000, y: 2060000, class: "countries", size:7, rotate: 80 },
			{ text: "AUTRICHE", x: 4670000, y: 2629000, class: "countries", size: 10 },
			{ text: "BELGIQUE", x: 3900000, y: 3030000, class: "countries", size:7, rotate: 30 },
			{ text: "BULGARIE", x: 5567000, y: 2256000, class: "countries", size: 12 },
			{ text: "CROATIE", x: 4876000, y: 2455000, class: "countries", size:7 },
			{ text: "CHYPRE", x: 6426000, y: 1480000, class: "countries", size: 10 },
			{ text: "TCHÉQUIE", x: 4707000, y: 2885000, class: "countries", size: 12 },
			{ text: "DANEMARK", x: 4316000, y: 3621000, class: "countries", size: 10 },
			{ text: "ESTONIE", x: 5220000, y: 3990000, class: "countries", size: 10 },
			{ text: "FINLANDE", x: 5125000, y: 4424000, class: "countries", size: 12 },
			{ text: "FRANCE", x: 3767740, y: 2662817, class: "countries", size: 12 },
			{ text: "ALLEMAGNE", x: 4347284, y: 3093276, class: "countries", size: 12 },
			{ text: "GRÈCE", x: 5420000, y: 1860000, class: "countries", size: 12 },
			{ text: "HONGRIE", x: 5020000, y: 2654000, class: "countries", size: 10 },
			{ text: "ISLANDE", x: 3040000, y: 4833000, class: "countries", size: 10 },
			{ text: "IRLANDE", x: 3136000, y: 3394000, class: "countries", size: 10 },
			{ text: "ITALIE", x: 4500000, y: 2181963, class: "countries", size: 12 },
			{ text: "LETTONIE", x: 5290000, y: 3776000, class: "countries", size: 10 },
			{ text: "LITUANIE", x: 5190000, y: 3630000, class: "countries", size: 10 },
			{ text: "LUX.", x: 4120000, y: 2940000, class: "countries", size:7 },
			{ text: "MALTE", x: 4731000, y: 1335000, class: "countries", size:7 },
			{ text: "MONT.", x: 5073000, y: 2185000, class: "countries", size: 7 },
			{ text: "MAC. DU NORD", x: 5300000, y: 2082000, class: "countries", size: 7 },
			{ text: "PAYS-BAS", x: 3977000, y: 3208000, class: "countries", size:7 },
			{ text: "NORVEGE", x: 4330000, y: 4147000, class: "countries", size: 12, rotate: -75 },
			{ text: "POLOGNE", x: 4964000, y: 3269000, class: "countries", size: 12 },
			{ text: "PORTUGAL", x: 2836136, y: 1956179, class: "countries", size: 10, rotate: -75 },
			{ text: "ROUMANIE", x: 5451000, y: 2600000, class: "countries", size: 12 },
			{ text: "SERBIE", x: 5200000, y: 2300000, class: "countries", size:7 },
			{ text: "SLOVAQUIE", x: 5040000, y: 2835000, class: "countries", size:7, rotate: -30 },
			{ text: "SLOVÉNIE", x: 4735000, y: 2522000, class: "countries", size:7, rotate: -35 },
			{ text: "ESPAGNE", x: 3160096, y: 1850000, class: "countries", size: 12 },
			{ text: "SUÈDE", x: 4700000, y: 4401000, class: "countries", size: 12, rotate: -75 },
			{ text: "SUISSE", x: 4200000, y: 2564000, class: "countries", size:7 },
			{ text: "TURQUIE", x: 6510000, y: 2100000, class: "countries", size: 12 },
			{ text: "ROYAUME-UNI", x: 3558000, y: 3250000, class: "countries", size: 10 }
		],
		de: [
			{ text: "MITTELMEER", x: 5472000, y: 1200000, class: "seas", size: 12, letterSpacing: 7 },
			{ text: "ATLANTISCHER OZEAN", x: 2820000, y: 2540000, class: "seas", size: 12 },
			{ text: "NORDSEE", x: 3915000, y: 3700000, class: "seas", size: 12 },
			{ text: "OSTSEE", x: 4900000, y: 3672000, class: "seas", size: 10, rotate: -50 },
			{ text: "NORWEGISCHE MEER", x: 3850000, y: 4800000, class: "seas", size: 12 },
			{ text: "SCHWARZE MEER", x: 6300000, y: 2500000, class: "seas", size: 12, letterSpacing: 1 },
			{ text: "ALBANIEN", x: 5100000, y: 2060000, class: "countries", size:7, rotate: 80 },
			{ text: "ÖSTERREICH", x: 4650000, y: 2629000, class: "countries", size:7 },
			{ text: "BELGIEN", x: 3900000, y: 3030000, class: "countries", size:7, rotate: 30 },
			{ text: "BULGARIEN", x: 5567000, y: 2256000, class: "countries", size: 10 },
			{ text: "KROATIEN", x: 4876000, y: 2455000, class: "countries", size:7 },
			{ text: "ZYPERN", x: 6426000, y: 1480000, class: "countries", size: 10 },
			{ text: "TSCHECHIEN", x: 4707000, y: 2885000, class: "countries", size:7 },
			{ text: "DÄNEMARK", x: 4316000, y: 3621000, class: "countries", size: 10 },
			{ text: "ESTLAND", x: 5220000, y: 3990000, class: "countries", size:7 },
			{ text: "FINNLAND", x: 5150000, y: 4424000, class: "countries", size: 12 },
			{ text: "FRANKREICH", x: 3767740, y: 2662817, class: "countries", size: 12 },
			{ text: "DEUTSCHLAND", x: 4347284, y: 3093276, class: "countries", size: 10 },
			{ text: "GRIECHENLAND", x: 5550000, y: 1500000, class: "countries", size: 10 },
			{ text: "UNGARN", x: 5020000, y: 2630000, class: "countries", size: 10 },
			{ text: "ISLAND", x: 3040000, y: 4833000, class: "countries", size: 10 },
			{ text: "IRLAND", x: 3136000, y: 3394000, class: "countries", size: 10 },
			{ text: "ITALIEN", x: 4469967, y: 2181963, class: "countries", size: 12, rotate:35 },
			{ text: "LETTLAND", x: 5290000, y: 3800000, class: "countries", size:7 },
			{ text: "LITAUEN", x: 5190000, y: 3630000, class: "countries", size:7 },
			{ text: "LUX.", x: 4120000, y: 2940000, class: "countries", size:7 },
			{ text: "MALTA", x: 4731000, y: 1330000, class: "countries", size:7 },
			{ text: "MONT.", x: 5073000, y: 2185000, class: "countries", size: 7 },
			{ text: "NORDMAZEDONIEN", x: 5350000, y: 2082000, class: "countries", size: 7 },
			{ text: "NIEDERLANDE", x: 3977000, y: 3208000, class: "countries", size:7 },
			{ text: "NORWEGEN", x: 4330000, y: 4147000, class: "countries", size: 12, rotate: -75 },
			{ text: "POLEN", x: 4964000, y: 3269000, class: "countries", size: 12 },
			{ text: "PORTUGAL", x: 2836136, y: 1956179, class: "countries", size: 10, rotate: -75 },
			{ text: "RUMÄNIEN", x: 5451000, y: 2600000, class: "countries", size: 12 },
			{ text: "SERBIEN", x: 5200000, y: 2300000, class: "countries", size:7 },
			{ text: "SLOWAKEI", x: 5040000, y: 2835000, class: "countries", size:7, rotate: -30 },
			{ text: "SLOWENIEN", x: 4735000, y: 2522000, class: "countries", size:7, rotate: -30 },
			{ text: "SPANIEN", x: 3160096, y: 1850000, class: "countries", size: 12 },
			{ text: "SCHWEDEN", x: 4670000, y: 4180000, class: "countries", size: 12, rotate: -75 },
			{ text: "SCHWEIZ", x: 4200000, y: 2564000, class: "countries", size:7 },
			{ text: "TRUTHAHN", x: 6510000, y: 2100000, class: "countries", size: 12 },
			{ text: "VEREINIGTES", x: 3550000, y: 3520000, class: "countries", size: 10 },
			{ text: "KÖNIGREICH", x: 3550000, y: 3420000, class: "countries", size: 10 } 
		],
	},
	"IC_32628": {
		cc: [
			{ text: "ES", x: 420468, y: 3180647, class: "cc", size: 12 }
		],
		en: [
			{ text: "Canary Islands", x: 420468, y: 3180647, class: "countries", size: 12 }
		],
		fr: [
			{ text: "Les îles Canaries", x: 420468, y: 3180647, class: "countries", size: 12 }
		],
		de: [
			{ text: "Kanarische Inseln", x: 410000, y: 3180647, class: "countries", size: 12 }
		]
	},
	"GP_32620": {
		cc: [
			{ text: "FR", x: 667000, y: 1740000, class: "cc", size: 12 },
		],
		en: [
			{ text: "Guadeloupe", x: 700000, y: 1810000, class: "countries", size: 12 },
		]
	},
	"MQ_32620": {
		cc: [
			{ text: "FR", x: 716521, y: 1621322, class: "cc", size: 12 }
		],
		en: [
			{ text: "Martinique", x: 716521, y: 1621322, class: "countries", size: 12 }
		]
	},
	"GF_32622": {
		cc: [
			{ text: "FR", x: 266852, y: 444074, class: "cc", size: 12 }
		],
		en: [
			{ text: "Guyane", x: 266852, y: 444074, class: "countries", size: 12 }
		],
		de: [
			{ text: "Guayana", x: 266852, y: 444074, class: "countries", size: 12 }
		]
	},
	"RE_32740": {
		cc: [
			{ text: "FR", x: 348011, y: 7680000, class: "cc", size: 10 }
		],
		en: [
			{ text: "Réunion", x: 348011, y: 7680000, class: "countries", size: 10 }
		]
	},
	"YT_32738": {
		cc: [
			{ text: "FR", x: 516549, y: 8593920, class: "cc", size: 10 }
		],
		en: [
			{ text: "Mayotte", x: 516549, y: 8593920, class: "countries", size: 10 }
		]
	},
	"MT_3035": {
		cc: [
			{ text: "MT", x: 4719755, y: 1410701, class: "cc", size: 10 }
		],
		en: [
			{ text: "Malta", x: 4719755, y: 1410701, class: "countries", size: 10 }
		]
	},
	"PT20_32626": {
		cc:[
			{ text: "PT", x: 397418, y: 4320000, class: "cc", size: 10 }
		],
		en: [
			{ text: "Azores", x: 397418, y: 4320000, class: "countries", size: 10 }
		],
		fr: [
			{ text: "Açores", x: 397418, y: 4271471, class: "countries", size: 10 }
		],
		de: [
			{ text: "Azoren", x: 397418, y: 4271471, class: "countries", size: 10 }
		]
	},
	"PT30_32628": {
		cc: [
			{ text: "PT", x: 333586, y: 3624000, class: "cc", size: 10, rotate: 30 }
		],
		en: [
			{ text: "Madeira", x: 333586, y: 3624000, class: "countries", size: 10, rotate: 30 }
		],
		fr: [
			{ text: "Madère", x: 333586, y: 3624000, class: "countries", size: 10, rotate: 30 }
		]
	},
	"LI_3035": {
		cc: [
			{ text: "LI", x: 4287060, y: 2660000, class: "cc", size:12 }
		],
		en: [
			{ text: "Liechtenstein", x: 4287060, y: 2679000, class: "countries", size:7 }
		],
	},
	"IS_3035": {
		cc: [
			{ text: "IS", x: 3011804, y: 4960000, class: "cc", size: 12 }
		],
		en: [
			{ text: "Iceland", x: 3011804, y: 4960000, class: "countries", size: 12 }
		],
		fr: [
			{ text: "Islande", x: 3011804, y: 4960000, class: "countries", size: 12 }
		],
		de: [
			{ text: "Island", x: 3011804, y: 4960000, class: "countries", size: 12 }
		]
	},
	"SJ_SV_3035": {
		cc: [
			{ text: "NO", x: 4570000, y: 6260000, class: "cc", size: 10 }
		],
		en: [
			{ text: "Svalbard", x: 4570000, y: 6260000, class: "countries", size: 10 }
		],
		de: [
			{ text: "Spitzbergen", x: 4570000, y: 6260000, class: "countries", size:7 }
		]
	},
	"SJ_JM_3035": {
		cc: [
			{ text: "NO", x: 3647762, y: 5420300, class: "cc", size:10 }
		],
		en: [
			{ text: "Jan Mayen", x: 3647762, y: 5420300, class: "countries", size:7 }
		]
	},
	"CARIB_32620": {
		cc: [
			{ text: "FR", x: 700000, y: 1810000, class: "cc", size: 10 },
			{ text: "FR", x: 640000, y: 1590000, class: "cc", size: 10 },
			{ text: "FR", x: 540000, y: 1962000, class: "cc", size:7 },
		],
		en: [
			{ text: "Guadeloupe", x: 700000, y: 1810000, class: "countries", size: 10 },
			{ text: "Martinique", x: 570000, y: 1590000, class: "countries", size: 10 },
			{ text: "Saint Martin", x: 597000, y: 1962000, class: "countries", size:7 },
		]
	},
}