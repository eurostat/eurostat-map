function spaceAsThousandSeparator(e) {
  return e.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
const mapConfig = {
  width: 797,
  height: 625,
  geo: "EUR",
  position: { x: 48e5, y: 342e4, z: 6400 },
  insetBoxPosition: [545, 81],
  data: selectOptions[0].stats,
  nutsLevel: "mixed",
  nutsYear: 2024,
  stamp: {
    text: selectOptions[0].stamp,
    fontSize: 10,
    x: 260,
    y: 70,
    size: 45,
    stampColor: "#9a9a9a",
    textColor: "#9a9a9a",
    strokeWidth: 2,
    lineHeight: 15,
  },
  insets: [
    {
      geo: "IC",
      x: 8,
      y: 8,
      width: 70.5,
      height: 69.3,
      svgId: "inset-0-0d1928f0b574a8",
      title: "Canarias (ES)",
      position: { x: 42e4, y: 315e4, z: 6800 },
      scalebarPosition: [1, 55],
      showScalebar: !0,
      titlePosition: [2, 11],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      scalebarMaxWidth: 15,
      proj: "32628",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "GP",
      x: 90.5,
      y: 8,
      width: 78.75,
      height: 75.6,
      svgId: "inset-1-efdad98ed2f7c8",
      title: "Guadeloupe (FR)",
      position: { x: 68e4, y: 181e4, z: 1820 },
      titlePosition: [0, 10],
      showScalebar: !0,
      scalebarPosition: [48, 55],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      scalebarMaxWidth: 15,
      proj: "32620",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "GP",
      x: 90.5,
      y: 26,
      width: 23,
      height: 15,
      position: { x: 493e3, y: 1998e3, z: 1200 },
      frameStrokeWidth: 0.8,
      titlePosition: [2, 11],
      svgId: "inset-2-3aefd3b058a728",
      proj: "32620",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "MQ",
      x: 173.75,
      y: 8,
      width: 63,
      height: 61.949999999999996,
      svgId: "inset-3-d33c180c12f148",
      title: "Martinique (FR)",
      position: { x: 716521, y: 1625e3, z: 1800 },
      showScalebar: !0,
      scalebarPosition: [0, 35],
      titlePosition: [2, 11],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      scalebarMaxWidth: 15,
      proj: "32620",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "MT",
      x: 8,
      y: 105.5,
      width: 73.5,
      height: 94.5,
      svgId: "inset-4-6bae8f04fa60c8",
      title: "Malta",
      position: { x: 4721e3, y: 144e4, z: 900 },
      showScalebar: !0,
      scalebarPosition: [1, 60],
      titlePosition: [2, 11],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      scalebarMaxWidth: 15,
      proj: "3035",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "GF",
      x: 90.5,
      y: 92.6,
      width: 75.75,
      height: 94.5,
      svgId: "inset-5-e82404a16d9ff",
      title: "Guyane (FR)",
      position: { x: 269852, y: 47e4, z: 6500 },
      titlePosition: [0, 10],
      showScalebar: !0,
      scalebarPosition: [48, 75],
      scalebarMaxWidth: 17,
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      proj: "32622",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "RE",
      x: 173.75,
      y: 72.94999999999999,
      width: 63,
      height: 61.949999999999996,
      svgId: "inset-6-744e63ef895368",
      title: "Réunion (FR)",
      position: { x: 340011, y: 7671627, z: 2e3 },
      showScalebar: !0,
      scalebarPosition: [1, 40],
      titlePosition: [2, 11],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      scalebarMaxWidth: 15,
      proj: "32740",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "YT",
      x: 173.75,
      y: 137.89999999999998,
      width: 63,
      height: 61.949999999999996,
      svgId: "inset-7-ea235aec92e71",
      title: "Mayotte (FR)",
      position: { z: 1200, x: 516549, y: 8583920 },
      showScalebar: !0,
      scalebarPosition: [1, 30],
      titlePosition: [2, 11],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      scalebarMaxWidth: 15,
      proj: "32738",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "PT20",
      x: 8,
      y: 196.85,
      width: 53.34,
      height: 60.9,
      svgId: "inset-8-cdbd04a7a0e55",
      title: "Açores (PT)",
      position: { x: 47e4, y: 437e4, z: 5e3 },
      showScalebar: !0,
      scalebarPosition: [34, 41],
      titlePosition: [2, 11],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      scalebarMaxWidth: 15,
      proj: "32626",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "PT20",
      x: 11,
      y: 212.85,
      width: 20,
      height: 20,
      svgId: "inset-9-c85641df9018d",
      position: { x: 14e4, y: 4385e3, z: 2800 },
      frameStrokeWidth: 0.8,
      titlePosition: [2, 11],
      proj: "32626",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "PT20",
      x: 38,
      y: 212.85,
      width: 20,
      height: 22,
      svgId: "inset-10-5736dea5bb323",
      position: { x: 65e4, y: 414e4, z: 6e3 },
      frameStrokeWidth: 0.8,
      titlePosition: [2, 11],
      proj: "32626",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "PT30",
      x: 64.34,
      y: 196.85,
      width: 53.34,
      height: 60.9,
      svgId: "inset-11-5249699a537288",
      title: "Madeira (PT)",
      position: { x: 323586, y: 3632706, z: 2600 },
      titlePosition: [4, 11],
      showScalebar: !0,
      scalebarPosition: [4, 41],
      scalebarMaxWidth: 25,
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      proj: "32628",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "LI",
      x: 123.18,
      y: 213.85,
      width: 48.34,
      height: 40.9,
      svgId: "inset-12-ed60ddd03ed088",
      position: { x: 4280060, y: 2669e3, z: 900 },
      showScalebar: !0,
      scalebarPosition: [4, 24],
      titlePosition: [2, 11],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      scalebarMaxWidth: 15,
      proj: "3035",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
    {
      geo: "SJ_SV",
      x: 177.02,
      y: 196.85,
      width: 53.34,
      height: 60.9,
      svgId: "inset-13-a867182e9de79",
      title: "Svalbard (NO)",
      position: { x: 457e4, y: 624e4, z: 12e3 },
      showScalebar: !0,
      scalebarPosition: [33, 41],
      scalebarMaxWidth: 17,
      titlePosition: [2, 11],
      scalebarTickHeight: 6,
      scalebarSegmentHeight: 6,
      scalebarFontSize: 7,
      scalebarUnits: "",
      scalebarTextOffset: [0, 8],
      proj: "3035",
      scale: "01M",
      footnote: "",
      showSourceLink: !1,
      zoomExtent: null,
      insets: [],
      insetTemplates: {},
    },
  ],
  labels: false,
  annotations: { annotations: [] },
};

function buildCoxcomb() {
  const map = eurostatmap
    .map("coxcomb")
    .svgId("europe-template-map")
    .containerId("europe-template")
    .position({ x: 4600000, y: 3420000, z: 6800 })
    .width(mapConfig.width)
    .height(mapConfig.height)
    .dorling(true)
    .scale("60M")
    .nutsLevel(1)
    .statCoxcomb({
      stat: {
          //data/tour_ce_omn12?format=JSON&unit=NR&indic_to=NGT_SP&c_resid=TOTAL&month=M01&lang=EN
          eurostatDatasetCode: 'tour_ce_omn12',
          filters: { unit: 'NR', indic_to: 'NGT_SP', TIME: 2023 }, // shared filters
          unitText: 'Nights spent',
      },
      timeParameter: 'month',
      times: ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12'],
      timeLabels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'],
      categoryParameter: 'c_resid',
      categoryCodes: ['DOM', 'FOR'],
      categoryLabels: ['Domestic', 'Foreign'],
      categoryColors: ['#1b9e77', '#d95f02'],
      totalCode: 'TOTAL',
    })
    .coxcombMinRadius(8)
    .coxcombMaxRadius(30)
    .transitionDuration(2000)
    .coxcombRings(true)
    .insets(mapConfig.insets)
    .legend({
      svgId: "eurostatmap-legend-europe-template",
      x: 5,
      y: 90,
      //noData: false,
      boxOpacity: 0.6,
      boxPadding: 8,
      noDataPadding: -5,
      sizeLegend: {
        title: "Total nights spent",
        titlePadding: 20,
        values: [20000000,  1000000],
      },
      colorLegend: {
        title: "Residence of guest",
        titlePadding: 9,
        marginTop: 40,
        noData: false,
      },
      monthLegend: {
        marginTop: 1,
      },
    })
    .zoomExtent([1, 100])
    .zoomButtons(true)
    .insetsButton(true)
    .footnote(false);

  map.build();
  return map;
}

function buildPropCircle(option) {
  const map = eurostatmap
    .map("ps")
    .svgId("europe-template-map")
    .containerId("europe-template")
    .position({ x: 47e5, y: 342e4, z: 6800 })
    .psMaxSize(30)
    .psMinSize(2)
    .psMinValue(0.1)
    .psMaxValue(24.6) // make sure all maps share the same size scale (same min and max values)
    .psFill("#33A033")
    .width(mapConfig.width)
    .height(mapConfig.height)
    .dorling(true)
    .scale("60M")
    .nutsLevel('mixed')
    .zoomExtent([1, 100])
    .zoomButtons(true)
    .insetsButton(true)
    .footnote(false)
    .insets(mapConfig.insets)
    .legend({ svgId: "eurostatmap-legend-europe-template", title: "Nights spent (million)", noDataShapeWidth:20, noDataShapeHeight:15, sizeLegend:{values:[25,0.1], noData:true }} );
  map.statData().setData(option.stats);
  map.updateStatValues();
  map.build();
  return map;
}

//initial map
buildCoxcomb();

// build select element
buildCustomDropdown(selectOptions);

// set initial titles
setTitles("Nights spent in tourist accommodation", "by month, 2023");

let selectedOption = selectOptions[0];
function updateMap(option) {
  if (option.stats) {
    //prop symbol maps of each quarter
    if (selectedOption.stats) {
      // if changing from prop symbol to prop symbol
      //we dont need to rebuild map completely
      propCircleMap.legend({ svgId: "eurostatmap-legend-europe-template", title: "Nights spent (million)" });
      propCircleMap.statData().setData(option.stats);
      propCircleMap.updateStatValues();
    } else {
      // coxcomb to prop symbol requires rebuild
      propCircleMap = buildPropCircle(option)
    }
  } else {
    //coxcomb map of whole year
    buildCoxcomb();
  }
  selectedOption = option;
  //inset button handler
  attachInsetHandlerWhenReady();
}

function setTitles(title, subtitle) {
  document.getElementById("title").innerHTML = title;
  document.getElementById("subtitle").innerHTML = subtitle;
}

//patch eurostat-map inset button because it looks inside map.svg
function attachInsetHandlerWhenReady() {
  const btn = document.querySelector("#em-insets-button");
  if (btn) return btn.addEventListener("click", handler, { once: false });
  setTimeout(attachInsetHandlerWhenReady, 200);
}
attachInsetHandlerWhenReady();

function handler(event) {
  event.preventDefault();
  event.stopPropagation();
  const container = document.querySelector("#europe-template-insets-layout-new");
  if (!container) return;
  const d = getComputedStyle(container).display;
  container.style.display = d === "none" || d === "" ? "block" : "none";
}
