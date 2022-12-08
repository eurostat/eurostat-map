import { json } from "d3-fetch";
import { zoom, zoomTransform } from "d3-zoom";
import { select, event, selectAll, mouse } from "d3-selection";
import { formatDefaultLocale } from "d3-format";
import {
  geoIdentity,
  geoPath,
  geoGraticule,
  geoGraticule10,
  geoCentroid,
} from "d3-geo";
import { geoRobinson } from "d3-geo-projection";
import { feature } from "topojson-client";
import { getBBOXAsGeoJSON } from "../lib/eurostat-map-util";
import * as tp from "../lib/eurostat-tooltip";
import { defaultLabels } from "./labels";
import { kosovoBnFeatures } from "./kosovo";

// set default d3 locale
formatDefaultLocale({
  decimal: ".",
  thousands: " ",
  grouping: [3],
  currency: ["", "€"],
});

/**
 * The map template: only the geometrical part.
 * To be used as a base map for a statistical map.
 *
 * @param {*} withCenterPoints Set to true (or 1) to add regions center points to the map template, to be used for proportional symbols maps for example.
 */
export const mapTemplate = function (config, withCenterPoints) {
  //build map template object
  const out = {};

  //map
  out.svgId_ = "map";
  out.svg_ = undefined;
  out.width_ = Math.min(800, window.innerWidth);
  out.height_ = 0;
  out.containerId_ = undefined;

  //geographical focus
  out.nutsLvl_ = 3; // 0,1,2,3, or 'mixed'
  out.nutsYear_ = 2016;
  out.geo_ = "EUR";
  out.proj_ = "3035";
  out.scale_ = "20M"; //TODO choose automatically, depending on pixSize ?
  out.geoCenter_ = undefined;
  out.pixSize_ = undefined;
  out.zoomExtent_ = undefined;

  //common / shared styles
  out.fontFamily_ = "Helvetica, Arial, sans-serif";

  //map title
  out.title_ = "";
  out.titleFontSize_ = 20;
  out.titleFill_ = "black";
  out.titlePosition_ = undefined;
  out.titleFontWeight_ = "bold";
  out.titleStroke_ = "none";
  out.titleStrokeWidth_ = "none";

  //map subtitle
  out.subtitle_ = "";
  out.subtitleFontSize_ = 12;
  out.subtitleFill_ = "grey";
  out.subtitlePosition_ = undefined;
  out.subtitleFontWeight_ = "bold";
  out.subtitleStroke_ = "none";
  out.subtitleStrokeWidth_ = "none";

  //map frame (none by default)
  out.frameStroke_ = "grey";
  out.frameStrokeWidth_ = 0.5;

  //scalebar
  out.showScalebar_ = false;
  out.scalebarPosition_ = [];
  out.scalebarFontSize_ = 9; //px
  out.scalebarUnits_ = " km"; //label
  out.scalebarTextOffset_ = [0, 12];
  out.scalebarMaxWidth_ = 150; //px
  out.scalebarHeight_ = 90; //px
  out.scalebarStrokeWidth_ = 1; //px
  out.scalebarSegmentHeight_ = 6;
  out.scalebarTickHeight_ = 8;

  //tooltip
  //default config
  out.tooltip_ = {
    maxWidth: "200px",
    fontSize: "14px",
    background: "white",
    padding: "5px",
    border: "0px",
    borderRadius: "5px",
    boxShadow: "5px 5px 5px grey",
    transitionDuration: 200,
    xOffset: 0,
    yOffset: 0,
    textFunction: null,
    showFlags: false,
  }; //  See eurostat-tooltip.js for more details

  out.tooltipText_ = (rg) => {
    return rg.properties.na;
  }; //DEPRECATED use tooltip_.textFunction
  out.tooltipShowFlags_ = false; //DEPRECATED use tooltip_.textFunction

  //template default style
  //countries to include
  out.bordersToShow_ = ["eu", "efta", "cc", "oth", "co"];
  out.countriesToShow_ = [
    "AL",
    "AT",
    "BE",
    "BG",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "EL",
    "ES",
    "FI",
    "FR",
    "HR",
    "HU",
    "IE",
    "IS",
    "IT",
    "LI",
    "LT",
    "LU",
    "LV",
    "ME",
    "MK",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "RS",
    "SE",
    "SI",
    "SK",
    "TR",
    "UK",
  ];

  //nuts
  out.nutsrgFillStyle_ = "white";
  out.nutsrgSelFillSty_ = "#e0bcdf";
  out.nutsbnStroke_ = {
    0: "black",
    1: "black",
    2: "black",
    3: "black",
    oth: "grey",
    co: "black",
  };
  out.nutsbnStrokeWidth_ = { 0: 1, 1: 0.4, 2: 0.4, 3: 0.4, oth: 0, co: 0.3 };
  //country borders
  out.cntrgFillStyle_ = "#f4f4f4";
  out.cntbnStroke_ = {
    eu: "black",
    efta: "black",
    cc: "black",
    oth: "grey",
    co: "#7f7f7f",
  };
  out.cntbnStrokeWidth_ = { eu: 1, efta: 1, cc: 1, oth: 0.5, co: 0.2 };
  //world map
  out.worldFillStyle_ = "#E6E6E6";
  out.worldStroke_ = "black";
  out.worldStrokeWidth_ = 1;
  out.worldCoastStroke_ = "none";
  out.worldCoastStrokeWidth_ = 0.3;
  //sea
  out.seaFillStyle_ = "white";
  out.drawCoastalMargin_ = true;
  out.coastalMarginColor_ = "#c2daed";
  out.coastalMarginWidth_ = 5;
  out.coastalMarginStdDev_ = 2;
  //graticule
  out.drawGraticule_ = false;
  out.graticuleStroke_ = "lightgray";
  out.graticuleStrokeWidth_ = 1;

  //labelling (country names and geographical features)
  out.labelling_ = false;
  out.labelsConfig_ = defaultLabels; // allow user to override map labels | see ./labels.js for example config
  out.labelsToShow_ = ["countries", "seas"]; //accepted: "countries", "cc","seas", "values"
  out.labelFill_ = {
    seas: "#003399",
    countries: "black",
    cc: "black",
    values: "black",
  };
  out.labelStroke_ = {
    seas: "#003399",
    countries: "black",
    cc: "black",
    values: "black",
  };
  out.labelStrokeWidth_ = { seas: 0.5, countries: 0.5, cc: 0.5, values: 0.5 };
  out.labelOpacity_ = { seas: 1, countries: 0.8, cc: 0.8, values: 0.9 };
  out.labelValuesFontSize_ = 10; //when labelsToShow includes "values", this is their font size
  out.labelShadow_ = false;
  out.labelShadowWidth_ = { seas: 3, countries: 3, cc: 3, values: 1 };
  out.labelShadowColor_ = {
    seas: "white",
    countries: "white",
    cc: "white",
    values: "white",
  };

  //dataset source link
  out.showSourceLink_ = true;

  //default copyright and disclaimer text
  out.bottomText_ =
    "Administrative boundaries: \u00A9EuroGeographics \u00A9UN-FAO \u00A9INSTAT \u00A9Turkstat"; //"(C)EuroGeographics (C)UN-FAO (C)Turkstat";
  out.botTxtFontSize_ = 10;
  out.botTxtFill_ = "black";
  out.botTxtPadding_ = 10;
  out.botTxtTooltipTxt_ =
    "The designations employed and the presentation of material on this map do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence. Palestine*: This designation shall not be construed as recognition of a State of Palestine and is without prejudice to the individual positions of the Member States on this issue.";

  out.nuts2jsonBaseURL_ =
    "https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/";

  /**
   * Insets.
   * The map template has a recursive structure.
   */

  //insets to show, as a list of map template configs. Ex.: [{geo:"MT"},{geo:"LI"},{geo:"PT20"}]
  out.insets_ = [];
  //inset templates - each inset is a map-template instance.
  out.insetTemplates_ = {};

  out.insetBoxPosition_ = undefined;
  out.insetBoxPadding_ = 5;
  out.insetBoxWidth_ = 210;
  //out.insetZoomExtent_ = [1, 3];
  out.insetZoomExtent_ = null; //zoom disabled as default
  out.insetScale_ = "03M";

  //store the geometries of the map for future updates (e.g. coastal margin requires geometries)
  out._geom = {
    mixed: {
      // for 'mixed' nuts level
      rg0: undefined, // nuts 0 regions
      rg1: undefined,
      rg2: undefined,
      rg3: undefined,
    },
    cntbn: undefined,
    cntrg: undefined,
    nutsbn: undefined,
    nutsrg: undefined,
    gra: undefined,
    worldrg: undefined,
    worldbn: undefined,
    kosovo: undefined,
    path: undefined,
  };

  /**
   * Definition of getters/setters for all previously defined attributes.
   * Each method follow the same pattern:
   *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
   *  - To get the attribute value, call the method without argument.
   *  - To set the attribute value, call the same method with the new value as single argument.
   */
  for (const att in out)
    out[att.substring(0, att.length - 1)] = function (v) {
      if (!arguments.length) return out[att];
      out[att] = v;
      return out;
    };

  //special ones which affect also the insets
  ["tooltip_", "nuts2jsonBaseURL_"].forEach(function (att) {
    out[att.substring(0, att.length - 1)] = function (v) {
      if (!arguments.length) return out[att];

      if (typeof v === "object" && v !== null) {
        //override default properties
        for (const p in v) {
          out[att][p] = v[p];
        }
      } else {
        out[att] = v;
      }

      //recursive call to inset components
      setPropertyValueForAllInsets(att, v);

      return out;
    };
  });

  // sets a map setting(property) value for all map insets (e.g. set tooltip for all insets)
  const setPropertyValueForAllInsets = function (property, value) {
    if (out.insetTemplates_) {
      for (const geo in out.insetTemplates_) {
        // insets with same geo that share the same parent inset
        if (Array.isArray(out.insetTemplates_[geo])) {
          for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
            // insets with same geo that do not share the same parent inset
            if (Array.isArray(out.insetTemplates_[geo][i])) {
              // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
              for (var c = 0; c < out.insetTemplates_[geo][i].length; c++) {
                // set value of inset map property
                out.insetTemplates_[geo][i][c][property](value);
              }
            } else {
              // set value of inset map property
              out.insetTemplates_[geo][i][property](value);
            }
          }
        } else {
          out.insetTemplates_[geo][property](value);
        }
      }
    }
  };

  // override deprecated tooltipText
  out.tooltipText = function (v) {
    console.log(
      "map.tooltipText() is now deprecated. Please use map.tooltip(config.textFunction) instead. See API reference for details."
    );
    out.tooltip_.textFunction = v;
    return out;
  };

  //title getter and setter
  out.title = function (v) {
    if (!arguments.length) return out.title_;
    out.title_ = v;
    if (out.svg())
      out
        .svg()
        .select("#title" + out.geo())
        .text(v);
    return out;
  };

  //subtitle getter and setter
  out.subtitle = function (v) {
    if (!arguments.length) return out.subtitle_;
    out.subtitle_ = v;
    if (out.svg())
      out
        .svg()
        .select("#subtitle" + out.geo())
        .text(v);
    return out;
  };

  //insets getter/setter
  out.insets = function () {
    if (!arguments.length) return out.insets_;
    if (arguments.length == 1 && arguments[0] === "default")
      out.insets_ = "default";
    else if (arguments.length == 1 && Array.isArray(arguments[0]))
      out.insets_ = arguments[0];
    else out.insets_ = arguments;
    return out;
  };

  // dynamic draw graticule
  out.drawGraticule = function (v) {
    if (!arguments.length) return out.drawGraticule_;
    out.drawGraticule_ = v;

    //update graticule
    let graticule = select("#g_gra");
    let zg = out.svg_ ? out.svg_.select("#zoomgroup" + out.svgId_) : null;

    // if existing and argument is false
    if (graticule._groups[0][0] && v == false) {
      //remove graticule
      graticule.remove();

      // if map already created and argument is true
    } else if (out._geom.gra && out._geom.path && zg && v == true) {
      //remove existing graticule
      graticule.remove();
      // add new graticule
      zg.append("g")
        .attr("id", "g_gra")
        .style("fill", "none")
        .style("stroke", out.graticuleStroke())
        .style("stroke-width", out.graticuleStrokeWidth())
        .selectAll("path")
        .data(out._geom.gra)
        .enter()
        .append("path")
        .attr("d", out._geom.path)
        .attr("class", "gra");

      select("#g_gra").each(function () {
        // move graticule to back (in front of sea)
        out.geo_ == "WORLD"
          ? this.parentNode.insertBefore(this, this.parentNode.childNodes[3])
          : this.parentNode.insertBefore(this, this.parentNode.childNodes[1]);
      });
    }
    return out;
  };

  // sea color override
  out.seaFillStyle = function (v) {
    if (!arguments.length) return out.seaFillStyle_;
    out.seaFillStyle_ = v;

    //update existing sea
    if (out.geo_ == "WORLD") {
      let sea = select("#sphere");
      if (sea) sea.style("fill", out.seaFillStyle_);
    } else {
      let sea = selectAll("#sea");
      if (sea) sea.style("fill", out.seaFillStyle_);
    }

    //update insets
    for (const geo in out.insetTemplates_) {
      if (Array.isArray(out.insetTemplates_[geo])) {
        // check for insets within insets
        for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
          //check for insets within insets within insets
          if (Array.isArray(out.insetTemplates_[geo][i])) {
            for (var n = 0; n < out.insetTemplates_[geo][i].length; n++) {
              let inset = out.insetTemplates_[geo][i][n];
              //set
              inset.seaFillStyle_ = out.seaFillStyle_;
            }
          } else {
            let inset = out.insetTemplates_[geo][i];
            //set
            inset.seaFillStyle_ = out.seaFillStyle_;
          }
        }
      } else {
        let inset = out.insetTemplates_[geo];
        //set
        inset.seaFillStyle_ = out.seaFillStyle_;
      }
    }

    return out;
  };

  // cntrg land color override
  out.cntrgFillStyle = function (v) {
    if (!arguments.length) return out.cntrgFillStyle_;
    out.cntrgFillStyle_ = v;

    //update existing land
    if (out.geo_ == "WORLD") {
      let cntrg = selectAll(".worldrg");
      if (cntrg) cntrg.style("fill", out.cntrgFillStyle_);
    } else {
      let cntrg = selectAll(".cntrg");
      if (cntrg) cntrg.style("fill", out.cntrgFillStyle_);
    }

    //update insets
    for (const geo in out.insetTemplates_) {
      if (Array.isArray(out.insetTemplates_[geo])) {
        // check for insets within insets
        for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
          //check for insets within insets within insets
          if (Array.isArray(out.insetTemplates_[geo][i])) {
            for (var n = 0; n < out.insetTemplates_[geo][i].length; n++) {
              let inset = out.insetTemplates_[geo][i][n];
              //set
              inset.cntrgFillStyle_ = out.cntrgFillStyle_;
            }
          } else {
            let inset = out.insetTemplates_[geo][i];
            //set
            inset.cntrgFillStyle_ = out.cntrgFillStyle_;
          }
        }
      } else {
        let inset = out.insetTemplates_[geo];
        //set
        inset.cntrgFillStyle_ = out.cntrgFillStyle_;
      }
    }

    return out;
  };

  // nutsrg land color override
  out.nutsrgFillStyle = function (v) {
    if (!arguments.length) return out.nutsrgFillStyle_;
    out.nutsrgFillStyle_ = v;

    //update existing default nutsrg color
    let nutsrg = selectAll(".nutsrg");
    if (nutsrg) nutsrg.style("fill", out.nutsrgFillStyle_);

    //update insets
    for (const geo in out.insetTemplates_) {
      if (Array.isArray(out.insetTemplates_[geo])) {
        // check for insets within insets
        for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
          //check for insets within insets within insets
          if (Array.isArray(out.insetTemplates_[geo][i])) {
            for (var n = 0; n < out.insetTemplates_[geo][i].length; n++) {
              let inset = out.insetTemplates_[geo][i][n];
              //set
              inset.nutsrgFillStyle_ = out.nutsrgFillStyle_;
            }
          } else {
            let inset = out.insetTemplates_[geo][i];
            //set
            inset.nutsrgFillStyle_ = out.nutsrgFillStyle_;
          }
        }
      } else {
        let inset = out.insetTemplates_[geo];
        //set
        inset.nutsrgFillStyle_ = out.nutsrgFillStyle_;
      }
    }

    return out;
  };

  //coastal margin override
  out.drawCoastalMargin = function (v) {
    if (!arguments.length) return out.drawCoastalMargin_;
    out.drawCoastalMargin_ = v;

    //update existing
    let margin = selectAll("#g_coast_margin");
    let filter = select("#coastal_blur");
    let zg = out.svg_ ? out.svg_.select("#zoomgroup" + out.svgId_) : null;
    if (margin._groups[0][0] && v == false) {
      // remove existing
      margin.remove();
    } else if (v == true && out._geom.path && zg) {
      //remove existing graticule
      margin.remove();
      filter.remove();
      //add filter
      out.svg_
        .append("filter")
        .attr("id", "coastal_blur")
        .attr("x", "-200%")
        .attr("y", "-200%")
        .attr("width", "400%")
        .attr("height", "400%")
        .append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        .attr("stdDeviation", out.coastalMarginStdDev_);

      //draw for main map - geometries are still in memory so no rebuild needed
      const drawNewCoastalMargin = (map) => {
        const zoomGroup = out.svg().select("#zoomgroup" + map.svgId_);
        //draw new coastal margin
        const cg = zoomGroup
          .append("g")
          .attr("id", "g_coast_margin")
          .style("fill", "none")
          .style("stroke-width", map.coastalMarginWidth_)
          .style("stroke", map.coastalMarginColor_)
          .style("filter", "url(#coastal_blur)")
          .style("stroke-linejoin", "round")
          .style("stroke-linecap", "round");
        //countries bn
        if (map._geom.cntbn)
          cg.append("g")
            .attr("id", "g_coast_margin_cnt")
            .selectAll("path")
            .data(map._geom.cntbn)
            .enter()
            .filter(function (bn) {
              return bn.properties.co === "T";
            })
            .append("path")
            .attr("d", map._geom.path);
        //nuts bn
        if (map._geom.nutsbn)
          cg.append("g")
            .attr("id", "g_coast_margin_nuts")
            .selectAll("path")
            .data(map._geom.nutsbn)
            .enter()
            .filter(function (bn) {
              return bn.properties.co === "T";
            })
            .append("path")
            .attr("d", map._geom.path);
        //world bn
        if (map._geom.worldbn)
          cg.append("g")
            .attr("id", "g_coast_margin_nuts")
            .selectAll("path")
            .data(map._geom.worldbn)
            .enter()
            .filter(function (bn) {
              return bn.properties.COAS_FLAG === "T";
            })
            .append("path")
            .attr("d", map._geom.path);
      };

      //draw for insets - requires geometries so we have to rebuild base template
      for (const geo in out.insetTemplates_) {
        if (Array.isArray(out.insetTemplates_[geo])) {
          // check for insets within insets
          for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
            //check for insets within insets within insets
            if (Array.isArray(out.insetTemplates_[geo][i])) {
              for (var n = 0; n < out.insetTemplates_[geo][i].length; n++) {
                let inset = out.insetTemplates_[geo][i][n];
                //setter for inset margin
                inset.drawCoastalMargin_ = out.drawCoastalMargin_;
                // redraw
                const zoomGroup = out.svg().select("#zoomgroup" + inset.svgId_);
                if (out.drawCoastalMargin_) drawNewCoastalMargin(inset);
              }
            } else {
              let inset = out.insetTemplates_[geo][i];
              //setter for inset margin
              inset.drawCoastalMargin_ = out.drawCoastalMargin_;
              // redraw
              const zoomGroup = out.svg().select("#zoomgroup" + inset.svgId_);
              if (out.drawCoastalMargin_) drawNewCoastalMargin(inset);
            }
          }
        } else {
          let inset = out.insetTemplates_[geo];
          //setter for inset margin
          inset.drawCoastalMargin_ = out.drawCoastalMargin_;
          const zoomGroup = out.svg().select("#zoomgroup" + inset.svgId_);
          if (out.drawCoastalMargin_) drawNewCoastalMargin(inset);
        }
      }

      if (out.drawCoastalMargin_) drawNewCoastalMargin(out);

      // move margin to back (in front of sea)
      selectAll("#g_coast_margin").each(function () {
        out.geo_ == "WORLD"
          ? this.parentNode.insertBefore(this, this.parentNode.childNodes[3])
          : this.parentNode.insertBefore(this, this.parentNode.childNodes[1]);
      });
    }
    return out;
  };

  // coastal margin width override
  out.coastalMarginWidth = function (v) {
    if (!arguments.length) return out.coastalMarginWidth_;
    out.coastalMarginWidth_ = v;

    //update insets
    for (const geo in out.insetTemplates_) {
      if (Array.isArray(out.insetTemplates_[geo])) {
        // check for insets within insets
        for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
          //check for insets within insets within insets
          if (Array.isArray(out.insetTemplates_[geo][i])) {
            for (var n = 0; n < out.insetTemplates_[geo][i].length; n++) {
              let inset = out.insetTemplates_[geo][i][n];
              //set
              inset.coastalMarginWidth_ = out.coastalMarginWidth_;
              //redraw
              inset.drawCoastalMargin(true);
            }
          } else {
            let inset = out.insetTemplates_[geo][i];
            //set
            inset.coastalMarginWidth_ = out.coastalMarginWidth_;
            //redraw
            inset.drawCoastalMargin(true);
          }
        }
      } else {
        let inset = out.insetTemplates_[geo];
        //set
        inset.coastalMarginWidth_ = out.coastalMarginWidth_;
        //redraw
        inset.drawCoastalMargin(true);
      }
    }

    //redraw
    out.drawCoastalMargin(true);

    return out;
  };

  // coastal margin color override
  out.coastalMarginColor = function (v) {
    if (!arguments.length) return out.coastalMarginColor_;
    out.coastalMarginColor_ = v;

    //update insets
    for (const geo in out.insetTemplates_) {
      if (Array.isArray(out.insetTemplates_[geo])) {
        // check for insets within insets
        for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
          //check for insets within insets within insets
          if (Array.isArray(out.insetTemplates_[geo][i])) {
            for (var n = 0; n < out.insetTemplates_[geo][i].length; n++) {
              let inset = out.insetTemplates_[geo][i][n];
              //set
              inset.coastalMarginColor_ = out.coastalMarginColor_;
              //redraw
              inset.drawCoastalMargin(true);
            }
          } else {
            let inset = out.insetTemplates_[geo][i];
            //set
            inset.coastalMarginColor_ = out.coastalMarginColor_;
            //redraw
            inset.drawCoastalMargin(true);
          }
        }
      } else {
        let inset = out.insetTemplates_[geo];
        //set
        inset.coastalMarginColor_ = out.coastalMarginColor_;
        //redraw
        inset.drawCoastalMargin(true);
      }
    }

    //redraw
    out.drawCoastalMargin(true);

    return out;
  };

  /**
   * geo data, as the raw topojson object returned by nuts2json API
   */
  let geoData = undefined;

  /**
   * geo data of ALL NUTS LEVELS (for mixing NUTS), as the raw topojson objects returned by nuts2json API
   */
  let allNUTSGeoData = undefined;

  /**
   * NUTS2JSON centroids
   */
  let centroidsData = undefined;

  /** */
  out.isGeoReady = function () {
    if (!geoData) return false;
    //recursive call to inset components
    for (const geo in out.insetTemplates_) {
      // check for insets with same geo
      if (Array.isArray(out.insetTemplates_[geo])) {
        for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
          // insets with same geo that do not share the same parent inset
          if (Array.isArray(out.insetTemplates_[geo][i])) {
            // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
            for (var c = 0; c < out.insetTemplates_[geo][i].length; c++) {
              if (!out.insetTemplates_[geo][i][c].isGeoReady()) return false;
            }
          } else {
            if (!out.insetTemplates_[geo][i].isGeoReady()) return false;
          }
        }
      } else {
        if (!out.insetTemplates_[geo].isGeoReady()) return false;
      }
    }

    return true;
  };

  /**
   * Return promise for Nuts2JSON topojson data.
   */
  out.getGeoDataPromise = function () {
    // for mixing all NUTS levels (i.e IMAGE)

    if (out.nutsLvl_ == "mixed" && out.geo_ !== "WORLD") {
      const promises = [];
      [0, 1, 2, 3].forEach((lvl) => {
        const buf = [];
        buf.push(out.nuts2jsonBaseURL_);
        buf.push(out.nutsYear_);
        if (out.geo_ != "EUR") buf.push("/" + this.geo_);
        buf.push("/");
        buf.push(out.proj_);
        buf.push("/");
        buf.push(out.scale_);
        buf.push("/");
        buf.push(lvl);
        buf.push(".json");
        promises.push(json(buf.join("")));
      });

      //centroids nutspt_0.json

      if (withCenterPoints) {
        [0, 1, 2, 3].forEach((lvl) => {
          const buf = [];
          buf.push(out.nuts2jsonBaseURL_);
          buf.push(out.nutsYear_);
          if (out.geo_ != "EUR") buf.push("/" + this.geo_);
          buf.push("/");
          buf.push(out.proj_);
          buf.push("/nutspt_");
          buf.push(lvl);
          buf.push(".json");
          promises.push(json(buf.join("")));
        });
      }
      return promises;

      // world maps
    } else if (out.geo_ == "WORLD") {
      return [
        json(
          "https://raw.githubusercontent.com/eurostat/eurostat-map.js/master/src/assets/topojson/WORLD_4326.json"
        ),
      ];
    } else {
      // NUTS maps for eurobase data with a specific NUTS level

      let promises = [];
      const buf = [];
      buf.push(out.nuts2jsonBaseURL_);
      buf.push(out.nutsYear_);
      if (out.geo_ != "EUR") buf.push("/" + this.geo_);
      buf.push("/");
      buf.push(out.proj_);
      buf.push("/");
      buf.push(out.scale_);
      buf.push("/");
      buf.push(out.nutsLvl_);
      buf.push(".json");
      promises.push(json(buf.join("")));

      if (withCenterPoints) {
        const buf = [];
        buf.push(out.nuts2jsonBaseURL_);
        buf.push(out.nutsYear_);
        if (out.geo_ != "EUR") buf.push("/" + this.geo_);
        buf.push("/");
        buf.push(out.proj_);
        buf.push("/nutspt_");
        buf.push(out.nutsLvl_);
        buf.push(".json");
        promises.push(json(buf.join("")));
      }

      return promises;
    }
  };

  /**
   * Requests geographic data and builds the map template
   */
  out.updateGeoMT = function (callback) {
    //erase previous data
    geoData = null;
    allNUTSGeoData = null;
    centroidsData = null;

    //get geo data from Nuts2json API
    if (out.nutsLvl_ == "mixed" && out.geo_ !== "WORLD") {
      // mixed retrieves all NUTS levels, world doesnt
      let promises = out.getGeoDataPromise();
      Promise.all(promises).then(
        (geo___) => {
          allNUTSGeoData = geo___;
          geoData = geo___[0];
          if (withCenterPoints)
            centroidsData = [geo___[4], geo___[5], geo___[6], geo___[7]];
          //build map template
          out.buildMapTemplate();
          //callback
          if (callback) callback();
        },
        (err) => {
          // rejection
          console.error(err);
        }
      );
    } else {
      let promises = out.getGeoDataPromise();
      Promise.all(promises).then(
        (geo___) => {
          geoData = geo___[0];
          if (withCenterPoints) centroidsData = geo___[1];
          //build map template
          out.buildMapTemplate();
          //callback
          if (callback) callback();
        },
        (err) => {
          // rejection
          console.error(err);
        }
      );
    }

    //recursive call to inset components
    for (const geo in out.insetTemplates_) {
      // check for insets with same geo
      if (Array.isArray(out.insetTemplates_[geo])) {
        for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
          // insets with same geo that do not share the same parent inset
          if (Array.isArray(out.insetTemplates_[geo][i])) {
            // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
            for (var c = 0; c < out.insetTemplates_[geo][i].length; c++) {
              out.insetTemplates_[geo][i][c].updateGeoMT(callback);
            }
          } else {
            out.insetTemplates_[geo][i].updateGeoMT(callback);
          }
        }
      } else {
        out.insetTemplates_[geo].updateGeoMT(callback);
      }
    }
    return out;
  };

  /**
   * Build a map object, including container, frame, map svg, insets and d3 zoom
   */
  out.buildMapTemplateBase = function () {
    out.insetTemplates_ = {}; //  GISCO-2676

    //get svg element. Create it if it does not exists
    let svg = select("#" + out.svgId());
    if (svg.size() == 0)
      svg = select("body").append("svg").attr("id", out.svgId());
    out.svg(svg);

    //set container for cases where container contains various maps
    if (!out.containerId_) out.containerId_ = out.svgId_;
    //tooltip needs to know container to prevent overflow
    if (!out.tooltip_.containerId) {
      out.tooltip_.containerId = out.containerId_;
    }

    //clear SVG (to avoid building multiple svgs on top of each other during multiple build() calls)
    selectAll("#" + out.svgId() + " > *").remove();

    //set SVG dimensions
    if (out.geo_.toUpperCase() == "WORLD") {
      //if no height was specified, use 45% of the width.
      if (!out.height()) out.height(0.55 * out.width());
      svg.attr("width", out.width()).attr("height", out.height());

      //WORLD geo only accepts proj 54030 (robinson) at the moment
      out.proj_ = 54030;
    }
    //if no height was specified, use 85% of the width.
    if (!out.height()) out.height(0.85 * out.width());
    svg.attr("width", out.width()).attr("height", out.height());

    // each map template needs a clipPath to avoid overflow. See GISCO-2707
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", out.svgId_ + "_clipP")
      .append("path")
      .attr("d", convertRectangles(0, 0, out.width_, out.height_));

    if (out.drawCoastalMargin_)
      //define filter for coastal margin
      svg
        .append("filter")
        .attr("id", "coastal_blur")
        .attr("x", "-200%")
        .attr("y", "-200%")
        .attr("width", "400%")
        .attr("height", "400%")
        .append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        .attr("stdDeviation", out.coastalMarginStdDev_);

    //create drawing group, as first child
    const dg = svg
      .insert("g", ":first-child")
      .attr("id", "drawing" + out.svgId_)
      .attr("clip-path", "url(#" + out.svgId_ + "_clipP" + ")");

    //create main zoom group
    const zg = dg.append("g").attr("id", "zoomgroup" + out.svgId_); //out.geo changed to out.svgId in order to be unique

    //insets
    if (!out.insetBoxPosition_)
      out.insetBoxPosition_ = [
        out.width() - out.insetBoxWidth() - 2 * out.insetBoxPadding(),
        2 * out.insetBoxPadding(),
      ];
    const ing = dg
      .append("g")
      .attr("id", "insetsgroup")
      .attr(
        "transform",
        "translate(" +
          out.insetBoxPosition()[0] +
          "," +
          out.insetBoxPosition()[1] +
          ")"
      );
    //if needed, use default inset setting
    if (out.insets_ === "default")
      out.insets_ = defaultInsetConfig(
        out.insetBoxWidth(),
        out.insetBoxPadding()
      );
    for (let i = 0; i < out.insets_.length; i++) {
      const config = out.insets_[i];
      config.svgId =
        config.svgId ||
        "inset" + config.geo + Math.random().toString(36).substring(7);

      //get svg element. Create it if it as an embeded SVG if it does not exists
      let svg = select("#" + config.svgId);
      if (svg.size() == 0) {
        const x = config.x == undefined ? out.insetBoxPadding_ : config.x;
        const y =
          config.y == undefined
            ? out.insetBoxPadding_ +
              i * (out.insetBoxPadding_ + out.insetBoxWidth_)
            : config.y;
        const ggeo = ing
          .append("g")
          .attr("id", "insetzg" + config.svgId)
          .attr("transform", "translate(" + x + "," + y + ")");
        ggeo.append("svg").attr("id", config.svgId);
      }

      // build inset
      // GISCO-2676 - PT azores inset has 2 insets with the same Geo, so second was overriding first:
      if (out.insetTemplates_[config.geo]) {
        //if inset already exists in map with same geo, then push both to an array
        out.insetTemplates_[config.geo] = [
          out.insetTemplates_[config.geo],
          buildInset(config, out).buildMapTemplateBase(),
        ];
      } else {
        out.insetTemplates_[config.geo] = buildInset(
          config,
          out
        ).buildMapTemplateBase();
      }
    }

    //draw frame
    dg.append("rect")
      .attr("id", "frame" + out.geo_)
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", out.width_)
      .attr("height", out.height_)
      .style("stroke-width", out.frameStrokeWidth_)
      .style("stroke", out.frameStroke_)
      .style("fill", "none");

    //make drawing group zoomable
    if (out.zoomExtent()) {
      let xoo = zoom()
        .scaleExtent(out.zoomExtent())
        .on("zoom", function () {
          const k = event.transform.k;
          const cs = [
            "gra",
            "bn_0",
            /*"bn_1", "bn_2", "bn_3",*/ "bn_co",
            "cntbn",
            "symbol",
          ];
          for (let i = 0; i < cs.length; i++)
            out
              .svg()
              .selectAll("." + cs[i])
              .style("stroke-width", function (d) {
                return 1 / k + "px";
              });
          zg.attr("transform", event.transform);
        })
        .on("end", function () {
          let transform = zoomTransform(svg.node()); // get the current zoom
          let m = mouse(this);
          let xy = transform.invert([out.width_ / 2, out.height_ / 2]);
          let longlat = out._projection.invert(xy);
          //console.log('geoCenter: ', [parseInt(longlat[0]), parseInt(longlat[1])]);
          //console.log('pixSize:', parseInt(out.pixSize_ / transform.k))
        });
      svg.call(xoo);
    }

    // get projected coordinates on click
    // zg.on('click', function(e) {
    // 	let transform = zoomTransform(svg.node()); // get the current zoom
    // 	let xy = transform.invert(mouse(this));
    // 	let longlat = out._projection.invert(xy);
    // 	console.log('geoCenter: ', [parseInt(longlat[0]), parseInt(longlat[1])]);
    // 	console.log('pixSize:', out.pixSize_ / transform.k)
    // })

    return out;
  };

  /**
   * Buid an empty map template, based on the geometries only.
   */
  out.buildMapTemplate = function () {
    //prepare map tooltip
    if (out.tooltip_) {
      out._tooltip = tp.tooltip(out.tooltip_);
    } else {
      //no config specified, use default
      out._tooltip = tp.tooltip();
    }

    //geo center and extent: if not specified, use the default one, or the compute one from the topojson bbox
    const dp = _defaultPosition[out.geo() + "_" + out.proj()];
    if (!out.geoCenter())
      if (dp) out.geoCenter(dp.geoCenter);
      else
        out.geoCenter([
          0.5 * (geoData.bbox[0] + geoData.bbox[2]),
          0.5 * (geoData.bbox[1] + geoData.bbox[3]),
        ]);
    //pixel size (zoom level): if not specified, compute value from SVG dimensions and topojson geographical extent
    if (!out.pixSize())
      if (dp) out.pixSize((dp.pixSize * 800) / out.width());
      else
        out.pixSize(
          Math.min(
            (geoData.bbox[2] - geoData.bbox[0]) / out.width_,
            (geoData.bbox[3] - geoData.bbox[1]) / out.height_
          )
        );

    //SVG drawing function
    //compute geo bbox from geocenter, pixsize and SVG dimensions
    const bbox = [
      out.geoCenter_[0] - 0.5 * out.pixSize_ * out.width_,
      out.geoCenter_[1] - 0.5 * out.pixSize_ * out.height_,
      out.geoCenter_[0] + 0.5 * out.pixSize_ * out.width_,
      out.geoCenter_[1] + 0.5 * out.pixSize_ * out.height_,
    ];

    //WORLD geo uses 4326 geometries and reprojects to 54030 using d3
    if (out.geo_ == "WORLD") {
      if (out.proj_ == "54030") {
        out._projection = geoRobinson()
          // center and scale to container properly
          .translate([out.width_ / 2, out.height_ / 2])
          .scale((out.width_ - 20) / 2 / Math.PI);
      } else {
        console.error("unsupported projection");
      }
    } else {
      out._projection = geoIdentity()
        .reflectY(true)
        .fitSize([out.width_, out.height_], getBBOXAsGeoJSON(bbox));
    }

    out._geom.path = geoPath().projection(out._projection);

    //decode topojson to geojson

    if (out.geo_ == "WORLD") {
      out._geom.worldrg = feature(
        geoData,
        geoData.objects.CNTR_RG_20M_2020_4326
      ).features;
      out._geom.worldbn = feature(
        geoData,
        geoData.objects.CNTR_BN_20M_2020_4326
      ).features;
      out._geom.kosovo = feature(
        geoData,
        geoData.objects.NUTS_BN_20M_2021_RS_XK_border
      ).features;
      out._geom.gra = [geoGraticule().step([30, 30])()];
    } else {
      out._geom.gra = feature(geoData, geoData.objects.gra).features;
      out._geom.nutsrg = feature(geoData, geoData.objects.nutsrg).features;
      out._geom.nutsbn = feature(geoData, geoData.objects.nutsbn).features;
      out._geom.cntrg = feature(geoData, geoData.objects.cntrg).features;
      out._geom.cntbn = feature(geoData, geoData.objects.cntbn).features;
    }

    //prepare drawing group
    const zg = out.svg().select("#zoomgroup" + out.svgId_);
    zg.selectAll("*").remove();

    //draw background rectangle
    zg.append("rect")
      .attr("id", "sea")
      .attr("x", -5 * out.width_)
      .attr("y", -5 * out.height_)
      .attr("width", 11 * out.width_)
      .attr("height", 11 * out.height_)
      .style("fill", () => (out.geo_ == "WORLD" ? "white" : out.seaFillStyle_)); //for world templates sea colour is applied to the sphere

    //sphere for world map
    if (out.geo_ == "WORLD") {
      zg.append("path")
        .datum({ type: "Sphere" })
        .attr("id", "sphere")
        .attr("d", out._geom.path)
        .attr("stroke", out.graticuleStroke())
        .attr("stroke-width", out.graticuleStrokeWidth())
        .attr("fill", out.seaFillStyle_);
    }

    if (out.drawCoastalMargin_) {
      //draw coastal margin
      const cg = zg
        .append("g")
        .attr("id", "g_coast_margin")
        .style("fill", "none")
        .style("stroke-width", out.coastalMarginWidth_)
        .style("stroke", out.coastalMarginColor_)
        .style("filter", "url(#coastal_blur)")
        .style("stroke-linejoin", "round")
        .style("stroke-linecap", "round");
      //countries bn
      if (out._geom.cntbn)
        cg.append("g")
          .attr("id", "g_coast_margin_cnt")
          .selectAll("path")
          .data(out._geom.cntbn)
          .enter()
          .filter(function (bn) {
            return bn.properties.co === "T";
          })
          .append("path")
          .attr("d", out._geom.path);
      //nuts bn
      if (out._geom.nutsbn)
        cg.append("g")
          .attr("id", "g_coast_margin_nuts")
          .selectAll("path")
          .data(out._geom.nutsbn)
          .enter()
          .filter(function (bn) {
            return bn.properties.co === "T";
          })
          .append("path")
          .attr("d", out._geom.path);
      //world bn
      if (out._geom.worldbn)
        cg.append("g")
          .attr("id", "g_coast_margin_nuts")
          .selectAll("path")
          .data(out._geom.worldbn)
          .enter()
          .filter(function (bn) {
            return bn.properties.COAS_FLAG === "T";
          })
          .append("path")
          .attr("d", out._geom.path);
    }

    if (out._geom.gra && out.drawGraticule_) {
      //draw graticule
      zg.append("g")
        .attr("id", "g_gra")
        .style("fill", "none")
        .style("stroke", out.graticuleStroke())
        .style("stroke-width", out.graticuleStrokeWidth())
        .selectAll("path")
        .data(out._geom.gra)
        .enter()
        .append("path")
        .attr("d", out._geom.path)
        .attr("class", "gra");
    }

    //draw country regions
    if (out._geom.cntrg) {
      zg.append("g")
        .attr("id", "g_cntrg")
        .selectAll("path")
        .data(out._geom.cntrg)
        .enter()
        .append("path")
        .attr("d", out._geom.path)
        .attr("class", "cntrg")
        .style("fill", out.cntrgFillStyle());
    }

    //draw world map
    if (out._geom.worldrg) {
      zg.append("g")
        .attr("id", "g_worldrg")
        .selectAll("path")
        .data(out._geom.worldrg)
        .enter()
        .append("path")
        .attr("d", out._geom.path)
        .attr("class", "worldrg")
        .attr("fill", out.worldFillStyle_);
    }

    //draw NUTS regions
    if (out._geom.nutsrg) {
      if (out.nutsLvl_ == "mixed") {
        out._geom.mixed.rg0 = out._geom.nutsrg;
        out._geom.mixed.rg1 = feature(
          allNUTSGeoData[1],
          allNUTSGeoData[1].objects.nutsrg
        ).features;
        out._geom.mixed.rg2 = feature(
          allNUTSGeoData[2],
          allNUTSGeoData[2].objects.nutsrg
        ).features;
        out._geom.mixed.rg3 = feature(
          allNUTSGeoData[3],
          allNUTSGeoData[3].objects.nutsrg
        ).features;

        //for mixed NUTS, we add every NUTS region across all levels and hide level 1,2,3 by default, only showing them when they have stat data
        // see updateClassification and updateStyle in map-choropleth.js for hiding/showing

        [
          out._geom.mixed.rg0,
          out._geom.mixed.rg1,
          out._geom.mixed.rg2,
          out._geom.mixed.rg3,
        ].forEach((r, i) => {
          //append each nuts level to map
          zg.append("g")
            .attr("id", "g_nutsrg")
            .selectAll("path")
            .data(r)
            .enter()
            .append("path")
            .attr("d", out._geom.path)
            .attr("class", "nutsrg")
            .attr("lvl", i) //to be able to distinguish levels
            .attr("fill", out.nutsrgFillStyle_);
        });

        //add kosovo
        if (out.geo_ == "EUR") {
          // add kosovo manually
          let kosovoBn = feature(kosovoBnFeatures[out.scale_], "nutsbn_1")
            .features;
          if (out.bordersToShow_.includes("cc")) {
            zg.append("g")
              .attr("id", "g_kosovo")
              .style("fill", "none")
              //.style("stroke-linecap", "round").style("stroke-linejoin", "round")
              .selectAll("path")
              .data(kosovoBn)
              .enter()
              .append("path")
              .attr("d", out._geom.path)
              .style("stroke", "grey")
              .style("stroke-width", 0.3);
          }
        }
      } else {
        // when nutsLvl is not 'mixed'
        zg.append("g")
          .attr("id", "g_nutsrg")
          .selectAll("path")
          .data(out._geom.nutsrg)
          .enter()
          .append("path")
          .attr("d", out._geom.path)
          .attr("class", "nutsrg")
          .attr("fill", out.nutsrgFillStyle_);
      }
    }

    //draw country boundaries
    if (out._geom.cntbn) {
      zg.append("g")
        .attr("id", "g_cntbn")
        .style("fill", "none")
        //.style("stroke-linecap", "round").style("stroke-linejoin", "round")
        .selectAll("path")
        .data(out._geom.cntbn)
        .enter()
        .append("path")
        .filter(function (bn) {
          if (out.bordersToShow_.includes("eu") && bn.properties.eu == "T")
            return bn;
          if (out.bordersToShow_.includes("efta") && bn.properties.efta == "T")
            return bn;
          if (out.bordersToShow_.includes("cc") && bn.properties.cc == "T")
            return bn;
          if (out.bordersToShow_.includes("oth") && bn.properties.oth == "T")
            return bn;
          if (out.bordersToShow_.includes("co") && bn.properties.co == "T")
            return bn;
        })
        .attr("d", out._geom.path)
        .attr("class", function (bn) {
          return bn.properties.co === "T" ? "bn_co" : "cntbn";
        })
        .style("stroke", function (bn) {
          //coastal boundaries
          if (bn.properties.co === "T") return out.cntbnStroke_.co;
          //eu borders
          if (bn.properties.eu === "T") return out.cntbnStroke_.eu;
          //efta borders
          if (bn.properties.efta === "T") return out.cntbnStroke_.efta;
          //cc borders
          if (bn.properties.cc === "T") return out.cntbnStroke_.cc;
          //other borders
          if (bn.properties.oth === "T") return out.cntbnStroke_.oth;
        })
        .style("stroke-width", function (bn) {
          //coastal boundaries
          if (bn.properties.co === "T") return out.cntbnStrokeWidth_.co + "px";
          //eu borders
          if (bn.properties.eu === "T") return out.cntbnStrokeWidth_.eu + "px";
          //efta borders
          if (bn.properties.efta === "T")
            return out.cntbnStrokeWidth_.efta + "px";
          //cc borders
          if (bn.properties.cc === "T") return out.cntbnStrokeWidth_.cc + "px";
          //other borders
          if (bn.properties.oth === "T")
            return out.cntbnStrokeWidth_.oth + "px";
        });
    }

    //draw NUTS boundaries
    if (out._geom.nutsbn) {
      out._geom.nutsbn.sort(function (bn1, bn2) {
        return bn2.properties.lvl - bn1.properties.lvl;
      });
      zg.append("g")
        .attr("id", "g_nutsbn")
        .style("fill", "none")
        //.style("stroke-linecap", "round").style("stroke-linejoin", "round")
        .selectAll("path")
        .data(out._geom.nutsbn)
        .enter()
        .filter(function (bn) {
          if (out.bordersToShow_.includes("eu") && bn.properties.eu == "T")
            return bn;
          if (out.bordersToShow_.includes("efta") && bn.properties.efta == "T")
            return bn;
          if (out.bordersToShow_.includes("cc") && bn.properties.cc == "T")
            return bn;
          if (out.bordersToShow_.includes("oth") && bn.properties.oth == "T")
            return bn;
          if (out.bordersToShow_.includes("co") && bn.properties.co == "T")
            return bn;
        })
        .append("path")
        .attr("d", out._geom.path)
        .attr("class", function (bn) {
          bn = bn.properties;
          if (bn.co === "T") return "bn_co";
          const cl = ["bn_" + bn.lvl];
          //if (bn.oth === "T") cl.push("bn_oth");
          return cl.join(" ");
        })
        .style("stroke", function (bn) {
          bn = bn.properties;
          if (bn.co === "T") return out.nutsbnStroke_.co || "#1f78b4";
          //if (bn.oth === "T") return out.nutsbnStroke_.oth || "#444";
          return out.nutsbnStroke_[bn.lvl] || "#777";
        })
        .style("stroke-width", function (bn) {
          bn = bn.properties;
          if (bn.co === "T") return out.nutsbnStrokeWidth_.co;
          if (bn.lvl > 0) return out.nutsbnStrokeWidth_[bn.lvl];
          //if (bn.oth === "T") return out.nutsbnStrokeWidth_.oth || 1;
          return out.nutsbnStrokeWidth_[bn.lvl] || 0.2;
        });

      if (out.geo_ == "EUR") {
        // add kosovo manually
        let kosovoBn = feature(kosovoBnFeatures[out.scale_], "nutsbn_1")
          .features;
        if (out.bordersToShow_.includes("cc")) {
          zg.append("g")
            .attr("id", "g_kosovo")
            .style("fill", "none")
            //.style("stroke-linecap", "round").style("stroke-linejoin", "round")
            .selectAll("path")
            .data(kosovoBn)
            .enter()
            .append("path")
            .attr("d", out._geom.path)
            .style("stroke", "grey")
            .style("stroke-width", 0.3);
        }
      }
    }

    //draw world boundaries
    if (out._geom.worldbn)
      zg.append("g")
        .attr("id", "g_worldbn")
        .style("fill", "none")
        //.style("stroke-linecap", "round").style("stroke-linejoin", "round")
        .selectAll("path")
        .data(out._geom.worldbn)
        .enter()
        .append("path")
        .attr("d", out._geom.path)
        //.attr("class", function (bn) { return (bn.properties.COAS_FLAG === "F") ? "bn_co" : "worldbn" })
        //.attr("id", (bn) => bn.properties.CNTR_BN_ID)
        .style("stroke", function (bn) {
          if (bn.properties.POL_STAT > 0) {
            //disputed
            return "#b2b2b2";
          } else if (bn.properties.COAS_FLAG == "F") {
            return out.worldStroke_;
          } else if (bn.properties.COAS_FLAG == "T") {
            return out.worldCoastStroke_;
          }
        })
        .style("stroke-width", function (bn) {
          if (bn.properties.COAS_FLAG == "F") {
            return out.worldStrokeWidth_;
          } else if (bn.properties.COAS_FLAG == "T") {
            return out.worldCoastStrokeWidth_;
          }
        });

    if (out._geom.kosovo) {
      //add kosovo to world map
      zg.append("g")
        .attr("id", "g_worldbn")
        .style("fill", "none")
        .selectAll("path")
        .data(out._geom.kosovo)
        .enter()
        .append("path")
        .attr("d", out._geom.path)
        .style("stroke", "#4f4f4f")
        .style("stroke-width", function (bn) {
          return 0.3 + "px";
        });
    }

    //prepare group for proportional symbols, with nuts region centroids
    if (withCenterPoints) {
      let centroidFeatures;

      if (!centroidsData) {
        // if centroids data is absent (e.g. for world maps) then calculate manually
        if (out.geo_ == "WORLD") {
          centroidFeatures = [];
          out._geom.worldrg.forEach((feature) => {
            let newFeature = { ...feature };
            newFeature.geometry = {
              coordinates: geoCentroid(feature),
              type: "Point",
            };
            centroidFeatures.push(newFeature);
          });
        }
      } else {
        if (out.nutsLvl_ == "mixed") {
          centroidFeatures = [
            ...centroidsData[0].features,
            ...centroidsData[1].features,
            ...centroidsData[2].features,
            ...centroidsData[3].features,
          ];
        } else {
          centroidFeatures = centroidsData.features;
        }
      }

      const gcp = zg.append("g").attr("id", "g_ps");

      //allow for different symbols by adding a g element here, then adding the symbols in proportional-symbols.js
      gcp
        .selectAll("g")
        .data(centroidFeatures)
        .enter()
        .append("g")
        .attr("transform", function (d) {
          return "translate(" + out._projection(d.geometry.coordinates) + ")";
        })
        //.attr("r", 1)
        .attr("class", "symbol")
        .style("fill", "gray")
        .attr("id", (d) => "ps" + d.properties.id)
        .on("mouseover", function (rg) {
          const sel = select(this.childNodes[0]);
          sel.attr("fill___", sel.style("fill"));
          sel.style("fill", out.nutsrgSelFillSty_);
          if (out._tooltip)
            out._tooltip.mouseover(out.tooltip_.textFunction(rg, out));
        })
        .on("mousemove", function () {
          if (out._tooltip) out._tooltip.mousemove();
        })
        .on("mouseout", function () {
          const sel = select(this.childNodes[0]);
          sel.style("fill", sel.attr("fill___"));
          if (out._tooltip) out._tooltip.mouseout();
        });
    }

    // add geographical labels to map
    if (out.labelling_) {
      addLabelsToMap(out, zg);
    }

    //title
    if (out.title()) {
      //define default position
      if (!out.titlePosition())
        out.titlePosition([10, 5 + out.titleFontSize()]);
      //draw title
      out
        .svg()
        .append("text")
        .attr("id", "title" + out.geo_)
        .attr("x", out.titlePosition()[0])
        .attr("y", out.titlePosition()[1])
        .text(out.title())
        .style("font-family", out.fontFamily_)
        .style("font-size", out.titleFontSize() + "px")
        .style("font-weight", out.titleFontWeight())
        .style("fill", out.titleFill())
        .style("stroke", out.titleStroke())
        .style("stroke-width", out.titleStrokeWidth())
        .style("stroke-linejoin", "round")
        .style("paint-order", "stroke");
    }

    if (out.subtitle()) {
      //define default position
      if (!out.subtitlePosition())
        out.subtitlePosition([
          10,
          8 + out.titleFontSize() + 5 + out.subtitleFontSize(),
        ]);
      //draw subtitle
      out
        .svg()
        .append("text")
        .attr("id", "subtitle" + out.geo_)
        .attr("x", out.subtitlePosition()[0])
        .attr("y", out.subtitlePosition()[1])
        .text(out.subtitle())
        .style("font-family", out.fontFamily_)
        .style("font-size", out.subtitleFontSize() + "px")
        .style("font-weight", out.subtitleFontWeight())
        .style("fill", out.subtitleFill())
        .style("stroke", out.subtitleStroke())
        .style("stroke-width", out.subtitleStrokeWidth())
        .style("stroke-linejoin", "round")
        .style("paint-order", "stroke");
    }

    //bottom text
    if (out.bottomText())
      out
        .svg()
        .append("text")
        .attr("id", "bottomtext")
        .attr("x", out.botTxtPadding_)
        .attr("y", out.height_ - out.botTxtPadding_)
        .text(out.bottomText())
        .style("font-family", out.fontFamily_)
        .style("font-size", out.botTxtFontSize_ + "px")
        .style("fill", out.botTxtFill_)
        .on("mouseover", function () {
          out._tooltip.mw___ = out._tooltip.style("max-width");
          // tooltip.f___ = tooltip.style("font");
          out._tooltip.style("max-width", "400px");
          out._tooltip.style("font-size", out.botTxtFontSize_);
          if (out.botTxtTooltipTxt_)
            out._tooltip.mouseover(out.botTxtTooltipTxt_);
        })
        .on("mousemove", function () {
          if (out.botTxtTooltipTxt_) out._tooltip.mousemove();
        })
        .on("mouseout", function () {
          if (out.botTxtTooltipTxt_) out._tooltip.mouseout();
          out._tooltip.style("max-width", out._tooltip.mw___);
          // tooltip.style("font", tooltip.f___);
        });

    //source dataset URL
    if (out.showSourceLink_) {
      if (out.stat()) {
        if (out.stat().eurostatDatasetCode) {
          //dataset link
          let code = out.stat().eurostatDatasetCode;
          let url = `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`;
          let link = out
            .svg()
            .append("a")
            .attr("href", url)
            .attr("target", "_blank")
            .append("text")
            .attr("id", "source-dataset-link")
            .attr("x", out.width_ - out.botTxtPadding_)
            .attr("y", out.height_ - out.botTxtPadding_)
            .text("EUROSTAT")
            .style("font-family", out.fontFamily_)
            .style("font-size", out.botTxtFontSize_ + "px")
            .style("font-weight", "bold")
            .attr("text-anchor", "end")
            .on("mouseover", function () {
              const sel = select(this);
              sel.attr("fill", "lightblue");
              sel.style("cursor", "pointer");
              sel.style("text-decoration", "underline");
            })
            .on("mouseout", function () {
              const sel = select(this);
              sel.attr("fill", "black");
              sel.style("cursor", "default");
              sel.style("text-decoration", "none");
            });
          //.on("click", function() { window.open(`https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`); });

          //pretext "Source:"
          let linkW = link.node().getComputedTextLength();
          out
            .svg()
            .append("text")
            .attr("x", out.width_ - out.botTxtPadding_ - linkW - 2)
            .attr("y", out.height_ - out.botTxtPadding_)
            .text("Source:")
            .style("font-family", out.fontFamily_)
            .style("font-size", out.botTxtFontSize_ + "px")
            .style("stroke-width", "0.3px")
            .attr("text-anchor", "end");
        }
      }
    }

    //add scalebar
    if (out.showScalebar_) {
      if (out.scalebarPosition_.length !== 2) {
        out.scalebarPosition_[0] = 15;
        out.scalebarPosition_[1] = out.height_ - 50;
      }
      addScalebarToMap();
    }

    return out;
  };

  out.updateLabels = function () {
    //clear previous labels
    let prevLabels = out.svg_.selectAll("g.labels-container > *");
    if (prevLabels) prevLabels.remove();

    if (out.labelling_) {
      let zg = out.svg_.select("#zoomgroup" + out.svgId_);
      addLabelsToMap(out, zg);

      if (out.labelsToShow_.includes("values")) {
        out.updateValuesLabels();
      }
    }
  };

  /**
   * @function addLabelsToMap
   * @description appends text labels to the map. Labels can be countries, country codes, ocean names or statistical values
   */
  function addLabelsToMap(out, zg) {
    let labels = out.labelsConfig_;
    let language = out.lg_;
    let labelsArray = [];
    let labelsG = zg.append("g").attr("class", "labels-container");

    //define which labels to use (cc, countries, seas, values)
    if (
      out.labelsToShow_.includes("countries") ||
      out.labelsToShow_.includes("seas")
    ) {
      if (labels[out.geo_ + "_" + out.proj_][language]) {
        labelsArray = labels[out.geo_ + "_" + out.proj_][language];
      } else {
        //if geo doesnt have labels in the chosen language, fall back to english
        //this helps save space by not including labels in other languages that are spelt the same in english
        labelsArray = labels[out.geo_ + "_" + out.proj_].en;
      }
    }
    //add country codes to labels array
    if (out.labelsToShow_.includes("cc")) {
      labelsArray = labelsArray.concat(labels[out.geo_ + "_" + out.proj_].cc);
    }

    //for statistical values we need to add centroids, then add values later
    if (out.labelsToShow_.includes("values")) {
      if (out._geom.nutsrg) {
        //values label shadows parent <g>
        const gsls = labelsG
          .append("g")
          .attr("class", "g_stat_label_shadows")
          .style("font-size", out.labelValuesFontSize_ + "px")
          .attr("text-anchor", "middle")
          .style("opacity", (d) => out.labelOpacity_["values"])
          .style("fill", (d) => out.labelShadowColor_["values"])
          .attr("stroke", (d) => out.labelShadowColor_["values"])
          .attr(
            "stroke-width",
            (d) =>
              out.labelStrokeWidth_["values"] + out.labelShadowWidth_["values"]
          )
          .style("font-family", out.fontFamily_);

        // values labels parent <g>
        const gsl = labelsG
          .append("g")
          .attr("class", "g_stat_labels")
          .style("font-size", out.labelValuesFontSize_ + "px")
          .attr("text-anchor", "middle")
          .style("opacity", (d) => out.labelOpacity_["values"])
          .style("fill", (d) => out.labelFill_["values"])
          .attr("stroke", (d) => out.labelStroke_["values"])
          .attr("stroke-width", (d) => out.labelStrokeWidth_["values"])
          .style("font-family", out.fontFamily_);

        //allow for stat label positioning by adding a g element here, then adding the values in the mapType updateStyle() function
        let labelRegions;
        if (out.nutsLvl_ == "mixed") {
          out._geom.mixed.rg0 = out._geom.nutsrg;
          out._geom.mixed.rg1 = feature(
            allNUTSGeoData[1],
            allNUTSGeoData[1].objects.nutsrg
          ).features;
          out._geom.mixed.rg2 = feature(
            allNUTSGeoData[2],
            allNUTSGeoData[2].objects.nutsrg
          ).features;
          out._geom.mixed.rg3 = feature(
            allNUTSGeoData[3],
            allNUTSGeoData[3].objects.nutsrg
          ).features;
          labelRegions = out._geom.mixed.rg0.concat(
            out._geom.mixed.rg1,
            out._geom.mixed.rg2,
            out._geom.mixed.rg3
          );
        } else {
          labelRegions = out._geom.nutsrg;
        }

        gsl
          .selectAll("g")
          .data(labelRegions)
          .enter()
          .append("g")
          .attr("transform", function (d) {
            return "translate(" + out._geom.path.centroid(d) + ")";
          })
          .attr("class", "stat-label");

        //SHADOWS
        if (out.labelShadow_) {
          gsls
            .selectAll("g")
            .data(labelRegions)
            .enter()
            .append("g")
            .attr("transform", function (d) {
              return "translate(" + out._geom.path.centroid(d) + ")";
            })
            .attr("class", "stat-label-shadow");
        }
      }
    }

    // rest of label types (FROM LABELS.JS)
    if (labelsArray) {
      let data = labelsArray.filter((d) => {
        if (d.class == "countries") {
          if (out.labelsToShow_.includes("countries")) {
            return d;
          }
        }
        if (d.class == "seas") {
          if (out.labelsToShow_.includes("seas")) {
            return d;
          }
        }
        if (d.class == "cc") {
          if (out.labelsToShow_.includes("cc")) {
            return d;
          }
        }
      });

      //common styles between all label shadows
      const shadowg = labelsG
        .append("g")
        .attr("class", "g_labelShadows")
        .style("pointer-events", "none")
        .style("font-family", out.fontFamily_)
        .attr("text-anchor", "middle");

      //common styles between all labels
      const labelg = labelsG
        .append("g")
        .attr("class", "g_geolabels")
        .style("pointer-events", "none")
        .style("font-family", out.fontFamily_)
        .attr("text-anchor", "middle");

      //SHADOWS
      if (out.labelShadow_) {
        let shadows = shadowg
          .selectAll("text")
          .data(data)
          .enter()
          .append("text")
          .attr("class", (d) => {
            return "labelShadow_" + d.class;
          })
          .attr("x", function (d) {
            if (d.rotate) {
              return 0; //for rotated text, x and y positions must be specified in the transform property
            }
            return out._projection([d.x, d.y])[0];
          })
          .attr("y", function (d) {
            if (d.rotate) {
              return 0; //for rotated text, x and y positions must be specified in the transform property
            }
            return out._projection([d.x, d.y])[1];
          })
          .attr("dy", -7) // set y position of bottom of text
          .style("opacity", (d) => out.labelOpacity_[d.class])
          .style("letter-spacing", (d) =>
            d.letterSpacing ? d.letterSpacing : 0
          )
          .style("fill", (d) => out.labelShadowColor_[d.class])
          .attr("stroke", (d) => out.labelShadowColor_[d.class])
          .attr(
            "stroke-width",
            (d) =>
              out.labelStrokeWidth_[d.class] + out.labelShadowWidth_[d.class]
          )
          .style("font-size", (d) => d.size + "px")
          .style("font-style", (d) => (d.class == "seas" ? "italic" : "normal"))
          .attr("transform", (d) => {
            if (d.rotate) {
              let pos = out._projection([d.x, d.y]);
              let x = pos[0];
              let y = pos[1];
              return `translate(${x},${y}) rotate(${d.rotate})`;
            } else {
              return "rotate(0)";
            }
          })
          //.style("font-weight", d => d.class == "seas" ? "normal" : "bold")
          .style("font-style", (d) => (d.class == "seas" ? "italic" : "normal"))
          .text(function (d) {
            return d.text;
          }); // define the text to display
      }

      //LABELS
      let labels = labelg
        .selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .attr("class", (d) => {
          return "geolabel_" + d.class;
        })
        //position label
        .attr("x", function (d) {
          if (d.rotate) {
            return 0; //for rotated text, x and y positions must be specified in the transform property
          }
          return out._projection([d.x, d.y])[0];
        })
        .attr("y", function (d) {
          if (d.rotate) {
            return 0; //for rotated text, x and y positions must be specified in the transform property
          }
          return out._projection([d.x, d.y])[1];
        })
        .attr("dy", -7) // set y position of bottom of text
        .style("opacity", (d) => out.labelOpacity_[d.class])
        .style("letter-spacing", (d) => (d.letterSpacing ? d.letterSpacing : 0))
        .style("fill", (d) => out.labelFill_[d.class])
        .attr("stroke", (d) => out.labelStroke_[d.class])
        .attr("stroke-width", (d) => out.labelStrokeWidth_[d.class])
        //set label size
        .style("font-size", (d) => d.size + "px")
        //transform labels which have a "rotate" property in the labels config. For rotated labels, their X,Y must also be set in the transform.
        // note: dont apply to country code labels
        .attr("transform", (d) => {
          if (d.rotate) {
            let pos = out._projection([d.x, d.y]);
            let x = pos[0];
            let y = pos[1];
            return `translate(${x},${y}) rotate(${d.rotate})`;
          } else {
            return "rotate(0)";
          }
        })
        .text(function (d) {
          return d.text;
        }); // define the text to display
    }
  }

  /**
   * @function addScalebarToMap
   * @description appends an SVG scalebar to the map. Uses pixSize to calculate units in km
   */
  function addScalebarToMap() {
    let sb = out
      .svg()
      .append("svg")
      .attr("id", "scalebar")
      .attr("x", out.scalebarPosition_[0])
      .attr("y", out.scalebarPosition_[1]);

    let segmentHeight = out.scalebarSegmentHeight_;

    // Julien's nice scalebars
    const marginLeft = 5;
    const maxLengthPix = out.scalebarMaxWidth_;
    const textOffsetX = out.scalebarTextOffset_[0];
    const textOffsetY = out.scalebarTextOffset_[1];
    const pixelSizeM = out.pixSize_;
    const maxLengthM = maxLengthPix * pixelSizeM;
    const niceLengthM = niceScaleBarLength(maxLengthM);
    const niceLengthPixel = niceLengthM[0] / pixelSizeM;
    const scaleBarStartDigit = niceLengthM[1];
    const subdivisionNbs = {
      1: 4,
      2: 2,
      5: 5,
    };

    const scalebarSVG = out
      .svg()
      .append("svg")
      .attr("id", "scalebar")
      .attr("x", out.scalebarPosition_[0])
      .attr("y", out.scalebarPosition_[1])
      .attr("width", maxLengthPix + 20)
      .attr("height", out.scalebarHeight_);

    // top line full width
    scalebarSVG
      .append("line")
      .attr("x1", marginLeft)
      .attr("y1", 1)
      .attr("x2", niceLengthPixel + marginLeft)
      .attr("y2", 1)
      .style("stroke", "#000")
      .style("stroke-width", "0.8px");
    //bottom line full width
    scalebarSVG
      .append("line")
      .attr("x1", marginLeft)
      .attr("y1", out.scalebarSegmentHeight_)
      .attr("x2", niceLengthPixel + marginLeft)
      .attr("y2", out.scalebarSegmentHeight_)
      .style("stroke", "#000")
      .style("stroke-width", "0.8px");

    //first tick
    scalebarSVG
      .append("line")
      .attr("x1", marginLeft)
      .attr("y1", 1)
      .attr("x2", marginLeft)
      .attr("y2", out.scalebarTickHeight_)
      .style("stroke", "#000")
      .style("stroke-width", out.scalebarStrokeWidth_ + "px");
    scalebarSVG
      .append("text")
      .attr("x", marginLeft + textOffsetX)
      .attr("y", out.scalebarTickHeight_ + textOffsetY)
      .text("0")
      .style("font-size", out.scalebarFontSize_ + "px")
      .style("font-family", out.fontFamily_)
      .attr("text-anchor", "middle");

    //middle ticks
    const subdivisionNb = subdivisionNbs[scaleBarStartDigit];
    const divisionWidth = niceLengthPixel / subdivisionNb;
    const divisionMinWidth = 15;
    if (divisionWidth >= divisionMinWidth) {
      for (let i = 1; i < subdivisionNb; i++) {
        scalebarSVG
          .append("line")
          .attr(
            "x1",
            marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth
          )
          .attr("y1", 1)
          .attr(
            "x2",
            marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth
          )
          .attr("y2", out.scalebarTickHeight_)
          .style("stroke", "#000")
          .style("stroke-width", "0.8px")
          .style("stroke", "black")
          .style("stroke-width", out.scalebarStrokeWidth_);
        scalebarSVG
          .append("text")
          .attr("x", marginLeft + textOffsetX + i * divisionWidth)
          .attr("y", out.scalebarTickHeight_ + textOffsetY)
          .text(getScalebarLabel((niceLengthM[0] / subdivisionNb) * i))
          .style("font-size", out.scalebarFontSize_ + "px")
          .style("font-family", out.fontFamily_)
          .attr("text-anchor", "middle");
      }

      //every other segment mid-line
      for (let i = -1; i < subdivisionNb; i += 2) {
        if (i == 1) {
          sb.append("line")
            .attr("x1", marginLeft + out.scalebarStrokeWidth_ - 1)
            .attr("y1", out.scalebarSegmentHeight_ / 2)
            .attr(
              "x2",
              marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth
            )
            .attr("y2", out.scalebarSegmentHeight_ / 2)
            .style("stroke", "#000")
            .style("stroke-width", out.scalebarStrokeWidth_ + "px");
        } else {
          let x1 =
            marginLeft + out.scalebarStrokeWidth_ / 2 + (i - 1) * divisionWidth;
          if (x1 > 0) {
            sb.append("line")
              .attr("x1", x1)
              .attr("y1", out.scalebarSegmentHeight_ / 2)
              .attr(
                "x2",
                marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth
              )
              .attr("y2", out.scalebarSegmentHeight_ / 2)
              .style("stroke", "#000")
              .style("stroke-width", "0.8px");
          }
        }
      }
    } else {
      // single full-length horizontal mid-line
      sb.append("line")
        .attr("x1", marginLeft + out.scalebarStrokeWidth_ - 1)
        .attr("y1", out.scalebarSegmentHeight_ / 2)
        .attr(
          "x2",
          marginLeft +
            out.scalebarStrokeWidth_ / 2 +
            divisionWidth * subdivisionNb
        )
        .attr("y2", out.scalebarSegmentHeight_ / 2)
        .style("stroke", "#000")
        .style("stroke-width", out.scalebarStrokeWidth_ + "px");
    }

    //last tick
    scalebarSVG
      .append("line")
      .attr("x1", niceLengthPixel + marginLeft)
      .attr("y1", 1)
      .attr("x2", niceLengthPixel + marginLeft)
      .attr("y2", out.scalebarTickHeight_)
      .style("stroke", "#000")
      .style("stroke-width", out.scalebarStrokeWidth_ + "px");
    scalebarSVG
      .append("text")
      .attr("x", niceLengthPixel + marginLeft + textOffsetX)
      .attr("y", out.scalebarTickHeight_ + textOffsetY)
      .text(getScalebarLabel(niceLengthM[0]) + out.scalebarUnits_)
      .style("text-anchor", "middle")
      .style("font-size", out.scalebarFontSize_ + "px")
      .style("font-family", out.fontFamily_);
  }

  function niceScaleBarLength(scaleBarLength) {
    //compute the 'nice' power of ten
    const pow10 = Math.pow(
      10,
      Math.floor(Math.log(scaleBarLength) / Math.log(10))
    );

    //check if 5 times this value fits
    if (5 * pow10 <= scaleBarLength) return [5 * pow10, 5];

    //check if 2 times this value fits
    if (2 * pow10 <= scaleBarLength) return [2 * pow10, 2];

    //returns the power of ten
    return [pow10, 1];
  }

  function getScalebarLabel(valueM) {
    if (valueM < 0.01) return valueM * 1000 + "mm";
    if (valueM < 1) return valueM * 100 + "cm";
    if (valueM < 1000) return valueM * 1 + "m";
    return valueM / 1000;
  }

  //format scalebar value
  function formatScalebarValue(x) {
    return Math.trunc(x);
    //round to nearest 5
    //return (x % 5) >= 2.5 ? Math.trunc(x / 5) * 5 + 5 : Math.trunc(x / 5) * 5;
  }

  /** Build template for inset, based on main one */
  const buildInset = function (config, map) {
    //TODO find a better way to do that

    //copy map
    //for(let key__ in map) {
    //mt[key__] = map[key__];
    //}

    //const mt = Object.assign({}, map)

    const mt = mapTemplate(config, withCenterPoints);

    //define default values for inset configs
    config = config || {};
    config.proj = config.proj || _defaultCRS[config.geo];
    config.scale = config.scale || out.insetScale_;
    config.bottomText = config.bottomText || "";
    config.showSourceLink = config.showSourceLink || false;
    config.botTxtTooltipTxt = config.botTxtTooltipTxt || "";
    config.zoomExtent = config.zoomExtent || out.insetZoomExtent_;
    config.width = config.width || out.insetBoxWidth_;
    config.height = config.height || out.insetBoxWidth_;
    config.insets = config.insets || [];
    config.insetTemplates = config.insetTemplates || {};
    config.callback = config.callback || undefined;

    //copy template attributes
    [
      "nutsLvl_",
      "nutsYear_",
      "nutsrgFillStyle_",
      "nutsrgSelFillSty_",
      "nutsbnStroke_",
      "nutsbnStrokeWidth_",
      "cntrgFillStyle_",
      "cntbnStroke_",
      "cntbnStrokeWidth_",
      "seaFillStyle_",
      "drawCoastalMargin_",
      "coastalMarginColor_",
      "coastalMarginWidth_",
      "coastalMarginStdDev_",
      "graticuleStroke_",
      "graticuleStrokeWidth_",
      "labelling_",
      "labelFill_",
      "labelValuesFontSize_",
      "labelOpacity_",
      "labelStroke_",
      "labelStrokeWidth_",
      "labelShadowWidth_",
      "labelShadow_",
      "labelShadowColor_",
      "labelsToShow_",
      "fontFamily_",
      "lg_",
    ].forEach(function (att) {
      mt[att] = out[att];
    });

    //copy stat map attributes/methods
    [
      "stat",
      "statData",
      "legend",
      "legendObj",
      "noDataText",
      "lg",
      "transitionDuration",
      "tooltip_",
      "classToText_",
    ].forEach(function (att) {
      mt[att] = out[att];
    });

    //apply config values for inset
    for (let key in config) mt[key + "_"] = config[key];

    return mt;
  };

  return out;
};

/** Default geocenter positions and pixSize (for default width = 800px) for territories and projections. */
const _defaultPosition = {
  EUR_3035: { geoCenter: [4970000, 3350000], pixSize: 6800 },
  IC_32628: { geoCenter: [443468, 3145647], pixSize: 1000 },
  GP_32620: { geoCenter: [669498, 1784552], pixSize: 130 },
  MQ_32620: { geoCenter: [716521, 1621322], pixSize: 130 },
  GF_32622: { geoCenter: [266852, 444074], pixSize: 500 },
  RE_32740: { geoCenter: [348011, 7661627], pixSize: 130 },
  YT_32738: { geoCenter: [516549, 8583920], pixSize: 70 },
  MT_3035: { geoCenter: [4719755, 1441701], pixSize: 70 },
  PT20_32626: { geoCenter: [397418, 4271471], pixSize: 1500 },
  PT30_32628: { geoCenter: [333586, 3622706], pixSize: 150 },
  LI_3035: { geoCenter: [4287060, 2672000], pixSize: 40 },
  IS_3035: { geoCenter: [3011804, 4960000], pixSize: 700 },
  SJ_SV_3035: { geoCenter: [4570000, 6160156], pixSize: 800 },
  SJ_JM_3035: { geoCenter: [3647762, 5408300], pixSize: 100 },
  CARIB_32620: { geoCenter: [636345, 1669439], pixSize: 500 },
  WORLD_54030: { geoCenter: [14, 17], pixSize: 9000 },
};

/**
 * Default inset setting.
 * @param {*} s The width of the inset box
 * @param {*} p The padding
 */
const defaultInsetConfig = function (s, p) {
  const out = [
    { geo: "IC", x: 0, y: 0, width: s, height: 0.3 * s },
    { geo: "CARIB", x: 0, y: 0.3 * s + p, width: 0.5 * s, height: s },
    { geo: "GF", x: 0.5 * s, y: 0.3 * s + p, width: 0.5 * s, height: 0.75 * s },
    {
      geo: "YT",
      x: 0.5 * s,
      y: 1.05 * s + p,
      width: 0.25 * s,
      height: 0.25 * s,
    },
    {
      geo: "RE",
      x: 0.75 * s,
      y: 1.05 * s + p,
      width: 0.25 * s,
      height: 0.25 * s,
    },
    {
      geo: "PT20",
      x: 0,
      y: 1.3 * s + 2 * p,
      width: 0.75 * s,
      height: 0.25 * s,
    },
    {
      geo: "PT30",
      x: 0.75 * s,
      y: 1.3 * s + 2 * p,
      width: 0.25 * s,
      height: 0.25 * s,
    },
    { geo: "MT", x: 0, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s },
    {
      geo: "LI",
      x: 0.25 * s,
      y: 1.55 * s + 3 * p,
      width: 0.25 * s,
      height: 0.25 * s,
    },
    {
      geo: "SJ_SV",
      x: 0.5 * s,
      y: 1.55 * s + 3 * p,
      width: 0.25 * s,
      height: 0.25 * s,
    },
    {
      geo: "SJ_JM",
      x: 0.75 * s,
      y: 1.55 * s + 3 * p,
      width: 0.25 * s,
      height: 0.25 * s,
    },
    /*{geo:"IC", x:0, y:0}, {geo:"RE", x:dd, y:0}, {geo:"YT", x:2*dd, y:0},
		{geo:"GP", x:0, y:dd}, {geo:"MQ", x:dd, y:dd}, {geo:"GF",scale:"10M", x:2*dd, y:dd},
		{geo:"PT20", x:0, y:2*dd}, {geo:"PT30", x:dd, y:2*dd}, {geo:"MT", x:2*dd, y:2*dd},
		{geo:"LI",scale:"01M", x:0, y:3*dd}, {geo:"SJ_SV", x:dd, y:3*dd}, {geo:"SJ_JM",scale:"01M", x:2*dd, y:3*dd},*/
    //{geo:"CARIB", x:0, y:330}, {geo:"IS", x:dd, y:330}
  ];
  //hide graticule for insets
  for (let i = 0; i < out.length; i++) out[i].drawGraticule = false;
  return out;
};

/** Default CRS for each geo area */
const _defaultCRS = {
  EUR: "3035",
  IC: "32628",
  GP: "32620",
  MQ: "32620",
  GF: "32622",
  RE: "32740",
  YT: "32738",
  MT: "3035",
  PT20: "32626",
  PT30: "32628",
  LI: "3035",
  IS: "3035",
  SJ_SV: "3035",
  SJ_JM: "3035",
  CARIB: "32620",
  WORLD: "54030",
};

// convert rect attributes into an SVG path string
// used for workaround whereby clipPaths which use rect elements do not work in adobe illustrator
function convertRectangles(x, y, width, height) {
  var x = parseFloat(x, 10);
  var y = parseFloat(y, 10);
  var width = parseFloat(width, 10);
  var height = parseFloat(height, 10);

  if (x < 0 || y < 0 || width < 0 || height < 0) {
    return "";
  }

  return (
    "M" +
    x +
    "," +
    y +
    "L" +
    (x + width) +
    "," +
    y +
    " " +
    (x + width) +
    "," +
    (y + height) +
    " " +
    x +
    "," +
    (y + height) +
    "z"
  );
}
