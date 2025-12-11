// Requires d3 (v5+ or v6+)
const countryNames = {
  NL: "Netherlands",
  TR: "Türkiye",
  IT: "Italy",
  ES: "Spain",
  BE: "Belgium",
  DE: "Germany",
  FR: "France",
  NO: "Norway",
  GR: "Greece",
  SE: "Sweden",
  PL: "Poland",
  DK: "Denmark",
  FI: "Finland",
  PT: "Portugal",
  RO: "Romania",
  IE: "Ireland",
  LT: "Lithuania",
  LV: "Latvia",
  BG: "Bulgaria",
  SI: "Slovenia"
}

const sums = {
  NL: 538119805,
  TR: 524711145,
  IT: 488555725,
  ES: 485995823,
  BE: 274894445,
  DE: 273907907,
  FR: 269749807,
  NO: 212081153,
  GR: 173190413,
  SE: 163757127,
  PL: 124238426,
  DK: 93755257,
  FI: 93023995,
  PT: 85669179,
  RO: 59553853,
  IE: 51162680,
  LT: 39492591,
  LV: 33577482,
  BG: 29522559,
  SI: 21779651,
  EE: 21721978,
  HR: 20853544,
  CY: 8944881,
  IS: 7223088,
  MT: 4479015,
  ME: 2464492
}

const rankingX = portsWidth - 230;
const rankingY = 10;

function createTopCountriesOverlay(svgSelector, sums, x, y) {
  const svg = d3.select(svgSelector);
  if (svg.empty()) throw new Error("SVG not found: " + svgSelector);
  if (!sums || typeof sums !== "object")
    throw new Error("sums object required");

  // --- params ---
  const max = 10;
  const padding = 8;
  const cardWidth = 220;
  const fontSize = 12;
  const titleFontSize = 13;
  const rowGap = 4;
  const lineHeight = fontSize + 4;
  const cornerRadius = 0;
  const title = "Tonnes by country";

  // --- prepare sorted data ---
  const sorted = Object.entries(sums)
    .map(([iso, total]) => ({ iso, total: Number(total) || 0 }))
    .filter((d) => d.iso && String(d.iso).trim() !== "")
    .sort((a, b) => b.total - a.total)
    .slice(0, max);

  // --- format number ---
  const fmt = (n) =>
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // --- compute card height ---
  const titleHeight = title ? titleFontSize + 6 : 0;
  const rowsHeight = sorted.length * lineHeight + (sorted.length - 1) * rowGap;
  const cardHeight = padding * 2 + titleHeight + rowsHeight + 8;

  // --- clear any existing overlay with same class to avoid duplicates ---
  svg.selectAll("g.map-ranking").remove();

  // --- build group ---
  const g = svg
    .append("g")
    .attr("class", "map-ranking")
    .attr("transform", `translate(${x},${y})`);

  // background rect
  g.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("rx", cornerRadius)
    .attr("ry", cornerRadius)
    .attr("width", cardWidth)
    .attr("height", cardHeight)
    .attr("fill", "white");

  // title
  let curY = padding + titleFontSize;
  if (title) {
    g.append("text")
      .attr("class", "em-legend-title")
      .attr("x", padding)
      .attr("y", curY)
      .attr("font-size", titleFontSize)
      .text(title);
    curY += 18 + rowGap;
  }

  // rows
  sorted.forEach((d, i) => {
    // rank
    g.append("text")
      .attr("class", "em-legend-label")
      .attr("x", padding)
      .attr("y", curY)
      .attr("font-size", fontSize)
      .text(`${i + 1}.`);

    // iso/name (we output ISO; replace or map externally if you want full name)
    g.append("text")
      .attr("class", "em-legend-label")
      .attr("x", padding + 28)
      .attr("y", curY)
      .attr("font-size", fontSize)
      .attr("style", "pointer-events:none;")
      .text(countryNames[d.iso]);

    // total (right aligned)
    g.append("text")
      .attr("class", "em-legend-label")
      .attr("x", cardWidth - padding)
      .attr("y", curY)
      .attr("font-size", fontSize)
      .attr("text-anchor", "end")
      .text(fmt(d.total));

    curY += lineHeight + rowGap;
  });

  // return the d3 selection
  return g;
}