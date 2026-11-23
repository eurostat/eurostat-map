mapConfigs = {
  2024: {
    breaks: [5, 10, 20, 25],
    colors: ["#C1C9EB", "#93A2DC", "#677CD2", "#3C57B0", "#15246B"],
    legend: {
      title: `Increase vs 2023`,
      labels: ["<5%", "5 - 10%", "10 - 20%", "20 - 25%", "25%"]
    },
    flowOrder: (a, b) => {
      // Helper: LPPT → LFPO incoming
      const isLPPTtoLFPOIn = (it) =>
        it.at === "in" &&
        it.link.source.id === "LPPT" &&
        it.link.target.id === "LFPO";

      // Hard priority: LPPT→LFPO on top
      const aTop = isLPPTtoLFPOIn(a);
      const bTop = isLPPTtoLFPOIn(b);
      if (aTop && !bTop) return -1; // a above b
      if (bTop && !aTop) return 1; // b above a

      // --- Rome (LIRF) incoming: Madrid vs Barcelona ---

      const isMadridToRomeIn = (it) =>
        it.at === "in" &&
        it.link.source.id === "LEMD" &&
        it.link.target.id === "LIRF";

      const isBarcelonaToRomeIn = (it) =>
        it.at === "in" &&
        it.link.source.id === "LEBL" &&
        it.link.target.id === "LIRF";

      const aMadridRome = isMadridToRomeIn(a);
      const bMadridRome = isMadridToRomeIn(b);
      const aBarcelonaRome = isBarcelonaToRomeIn(a);
      const bBarcelonaRome = isBarcelonaToRomeIn(b);

      // Madrid→Rome ABOVE Barcelona→Rome
      if (aMadridRome && bBarcelonaRome) return -1;
      if (aBarcelonaRome && bMadridRome) return 1;

      // --- Rome (LIRF) incoming: Catania vs Palermo ---

      const isCataniaToRomeIn = (it) =>
        it.at === "in" &&
        it.link.source.id === "LICC" && // Catania
        it.link.target.id === "LIRF";

      const isPalermoToRomeIn = (it) =>
        it.at === "in" &&
        it.link.source.id === "LICJ" && // Palermo
        it.link.target.id === "LIRF";

      const aCataniaRome = isCataniaToRomeIn(a);
      const bCataniaRome = isCataniaToRomeIn(b);
      const aPalermoRome = isPalermoToRomeIn(a);
      const bPalermoRome = isPalermoToRomeIn(b);

      // Catania→Rome ABOVE Palermo→Rome (so Palermo is below Catania)
      if (aCataniaRome && bPalermoRome) return -1;
      if (aPalermoRome && bCataniaRome) return 1;

      // Fallback: geometric ordering + tie-breaker by width
      return a.otherY - b.otherY || b.width - a.width;
    }
  },
  2023: {
    breaks: [0, 2, 15, 20, 30],
    colors: ["#cb181d", ...d3.schemeBlues[6].slice(1)],
    legend: {
      title: `Change vs 2022`,
      labels: [
        "↓ -9.5% decrease ",
        "↑ 1% increase ",
        "8 - 13%",
        "16%",
        "20 - 22%",
        "35%"
      ]
    },
    flowOrder: (a, b) => {
      // Is this the LPPT → LFPO incoming item?
      const isLPPTtoLFPOIn = (it) =>
        it.at === "in" &&
        it.link.source.id === "LPPT" &&
        it.link.target.id === "LFPO";

      // Hard priority: LPPT→LFPO should be on top
      const aTop = isLPPTtoLFPOIn(a);
      const bTop = isLPPTtoLFPOIn(b);
      if (aTop && !bTop) return -1; // a above b
      if (bTop && !aTop) return 1; // b above a

      // Otherwise sort by otherY (and tie-break by width for stability)
      return a.otherY - b.otherY || b.width - a.width;
    }
  }
}