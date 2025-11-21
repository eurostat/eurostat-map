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