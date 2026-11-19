const airMapConfigs = {
  2024: {
    passengers: {
      breaks: [5, 10, 15, 20, 40],
      colors: ["#C7CFED", "#A1AEE3", "#7C90D6", "#586FC5", "#3551AD", "#15246B"],
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