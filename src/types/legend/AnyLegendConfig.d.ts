import type { LegendConfig } from './LegendConfig'
import type { CategoricalLegendConfig } from './CategoricalLegendConfig'
import type { MushroomLegendConfig } from './MushroomLegendConfig'
import type { PatternFillLegendConfig } from './PatternFillLegendConfig'
import type { BivariateLegendConfig } from './choropleth/BivariateLegendConfig'
import type { ChoroplethLegendConfig } from './choropleth/ChoroplethLegendConfig'
import type { TrivariateLegendConfig } from './choropleth/TrivariateLegendConfig'
import type { BarChartLegendConfig } from './composition/BarChartLegendConfig'
import type { CoxcombLegendConfig } from './composition/CoxcombLegendConfig'
import type { PieChartLegendConfig } from './composition/PieChartLegendConfig'
import type { SparklineLegendConfig } from './composition/SparklineLegendConfig'
import type { StripeCompositionLegendConfig } from './composition/StripeCompositionLegendConfig'
import type { WaffleLegendConfig } from './composition/WaffleLegendConfig'
import type { FlowMapLegendConfig } from './flow/FlowMapLegendConfig'
import type { ProportionalSymbolsLegendConfig } from './proportional-symbol/ProportionalSymbolsLegendConfig'

/** A legend() config of any map type: what a map accepts when its type is not known to TypeScript. */
export type AnyLegendConfig =
    | LegendConfig
    | CategoricalLegendConfig
    | MushroomLegendConfig
    | PatternFillLegendConfig
    | BivariateLegendConfig
    | ChoroplethLegendConfig
    | TrivariateLegendConfig
    | BarChartLegendConfig
    | CoxcombLegendConfig
    | PieChartLegendConfig
    | SparklineLegendConfig
    | StripeCompositionLegendConfig
    | WaffleLegendConfig
    | FlowMapLegendConfig
    | ProportionalSymbolsLegendConfig
