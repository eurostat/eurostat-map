const airMapConfigs = {
  2024: {
    freight: {
      breaks: [-5, 0, 10, 15, 20, 25],
      colors: ["#cb181d", "#fcae91", ...d3.schemeBlues[7].slice(2)],
      legend: {
        title: `Change vs 2023 (%)`,
        labels: [
          "-6.4",
          "↓ -5 to 0",
          "↑ 0 to 10",
          "10 to 15",
          "18.5",
          "24.4",
          "47.5"
        ],
        sizeLegend: {
          values: [300000, 1000000, 2600000]
        }
      }
    },
  },
  2023: {
    freight: {
      breaks: [-20, -10, -5, 0, 5],
      colors: [
        "#cb181d", // strong red (large negative)
        "#fb6a4a", // medium red
        "#fcae91", // light red
        "#fee5d9", // pale red
        "#67a9cf", // medium blue
        "#2166ac" // strong blue (large positive)
      ],
      legend: {
        title: `Change vs 2022 (%)`,
        labels: [
          "-21",
          "-21 to -10",
          "-10 to -5",
          "↓ -5 to 0",
          "↑ 0 to 5",
          "> 5"
        ],
        sizeLegend: {
          values: [300000, 1000000, 2600000]
        }
      }
    },
  }
}