const airMapConfigs = {
  2024: {
    passengers: {
      breaks: [5, 10, 15, 20, 40],
      colors: [ ...d3.schemeBlues[9].slice(3)],
      legend: {
        title: `Increase vs 2023 (%)`,
        labels: [
          "< 5",
          "< 10",
          "< 15",
          "< 20",
          "< 30",
          "> 40",
        ],
        sizeLegend: {
          values: [290000, 50000000, 290000000]
        }
      }
    }
  }
}