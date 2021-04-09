import { json } from "d3-fetch";
import { zoom } from "d3-zoom";
import { select, event, selectAll } from "d3-selection";
import { geoIdentity, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { getBBOXAsGeoJSON } from '../lib/eurostat-map-util';
import * as tp from '../lib/eurostat-tooltip';
import { defaultLabels } from './labels';

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
	out.width_ = 800;
	out.height_ = 0;

	//geographical focus
	out.nutsLvl_ = 3;
	out.nutsYear_ = 2016;
	out.geo_ = "EUR";
	out.proj_ = "3035";
	out.scale_ = "20M"; //TODO choose automatically, depending on pixSize ?
	out.geoCenter_ = undefined;
	out.pixSize_ = undefined;
	out.zoomExtent_ = undefined;

	//map title
	out.title_ = "";
	out.titleFontSize_ = 20;
	out.titleFill_ = "black";
	out.titlePosition_ = undefined;
	out.titleFontFamily_ = "Helvetica, Arial, sans-serif";
	out.titleFontWeight_ = "bold";

	//map subtitle
	out.subtitle_ = "";
	out.subtitleFontSize_ = 12;
	out.subtitleFill_ = "grey";
	out.subtitlePosition_ = undefined;
	out.subtitleFontFamily_ = "Helvetica, Arial, sans-serif";
	out.subtitleFontWeight_ = "bold";

	//map frame
	out.frameStroke_ = "#222";
	out.frameStrokeWidth_ = 2;

	//tooltip
	//the function returning the tooltip text
	out.tooltipText_ = (rg => { return rg.properties.na; });
	out.tooltipShowFlags_ = "short"; //"short" "long"

	//template default style
	//countries to include
	out.bordersToShow_ = ["eu", "efta", "cc", "oth", "co"];
	out.countriesToShow_ = ["DE","DK","FR","ES","CH","CZ","PL","PT","SE","BE","NL","LU","IT","SI","SK","HR","FI","LT","LV","EE","HU","AT","BG","RO","EL","MT","IE","CY","UK","RS","TR","LI"];

	//nuts
	out.nutsrgFillStyle_ = "white";
	out.nutsrgSelFillSty_ = "purple";
	out.nutsbnStroke_ = { 0: "black", 1: "grey", 2: "grey", 3: "grey", oth: "grey", co: "black" };
	out.nutsbnStrokeWidth_ = { 0: 0.5, 1: 0.4, 2: 0.4, 3: 0.4, oth: 0.4, co: 0.5 };
	//land
	out.landFillStyle_ = "#f4f4f4";
	out.landStroke_ = "#ccc";
	out.landStrokeWidth_ = 1;
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
	out.labelsToShow_ = ["countries", "seas"]; //accepted: "countries", "cc","seas", "values"
	out.labelFill_ = { "seas": "#003399", "countries": "#383838", "cc": "black", "values": "black" };
	out.labelStroke_ = { "seas": "#003399", "countries": "#383838", "cc": "black", "values": "black" };
	out.labelStrokeWidth_ = { "seas": 0.5, "countries": 0.5, "cc": 0.5, "values": 0.5 };
	out.labelOpacity_ = { "seas": 1, "countries": 0.8, "cc": 0.7, "values": 0.9 };
	out.labelFontFamily_ = "Helvetica, Arial, sans-serif";
	out.labelValuesFontSize_ = 10; //when labelsToShow includes "values", this is their font size
	out.labelShadow_ = false;
	out.labelShadowWidth_ = { "seas": 3, "countries": 3, "cc": 3, "values": 1 };
	out.labelShadowColor_ = { "seas": "white", "countries": "white", "cc": "white", "values": "white" };

	//dataset source link
	out.showSourceLink_ = true;

	//default copyright and disclaimer text
	out.bottomText_ = "Administrative boundaries: \u00A9EuroGeographics \u00A9UN-FAO \u00A9INSTAT \u00A9Turkstat"; //"(C)EuroGeographics (C)UN-FAO (C)Turkstat";
	out.botTxtFontSize_ = 10;
	out.botTxtFill_ = "black";
	out.botTxtFontFamily_ = "Helvetica, Arial, sans-serif";
	out.botTxtPadding_ = 10;
	out.botTxtTooltipTxt_ = "The designations employed and the presentation of material on this map do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence. Palestine*: This designation shall not be construed as recognition of a State of Palestine and is without prejudice to the individual positions of the Member States on this issue.";

	out.nuts2jsonBaseURL_ = "https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v1/";


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

	/**
	 * Definition of getters/setters for all previously defined attributes.
	 * Each method follow the same pattern:
	 *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
	 *  - To get the attribute value, call the method without argument.
	 *  - To set the attribute value, call the same method with the new value as single argument.
	*/
	for (const att in out)
		out[att.substring(0, att.length - 1)] = function (v) { if (!arguments.length) return out[att]; out[att] = v; return out; };

	//special ones which affect also the insets
	["tooltipText_"]
		.forEach(function (att) {
			out[att.substring(0, att.length - 1)] = function (v) {
				if (!arguments.length) return out[att];
				out[att] = v;
				//recursive call to inset components
				for (const geo in out.insetTemplates_) {
					out.insetTemplates_[geo][att.substring(0, att.length - 1)](v);
				}
				return out;
			};
		}
		);

	//title getter and setter
	out.title = function (v) {
		if (!arguments.length) return out.title_;
		out.title_ = v;
		if (out.svg()) out.svg().select("#title" + out.geo()).text(v);
		return out;
	};

	//subtitle getter and setter
	out.subtitle = function (v) {
		if (!arguments.length) return out.subtitle_;
		out.subtitle_ = v;
		if (out.svg()) out.svg().select("#subtitle" + out.geo()).text(v);
		return out;
	};

	//insets getter/setter
	out.insets = function () {
		if (!arguments.length) return out.insets_;
		if (arguments.length == 1 && arguments[0] === "default") out.insets_ = "default";
		else if (arguments.length == 1 && Array.isArray(arguments[0])) out.insets_ = arguments[0];
		else out.insets_ = arguments;
		return out;
	}


	/**
	 * geo data, as the raw topojson object returned by nuts2json API
	 */
	let geoData = undefined;

	/** */
	out.isGeoReady = function () {
		if (!geoData) return false;
		//recursive call to inset components
		for (const geo in out.insetTemplates_)
			if (!out.insetTemplates_[geo].isGeoReady()) return false;
		return true;
	}

	/**
	 * Return promise for Nuts2JSON topojson data.
	 */
	out.getGeoDataPromise = function () {
		const buf = [];
		buf.push(out.nuts2jsonBaseURL_);
		buf.push(out.nutsYear_);
		if (out.geo_ != "EUR") buf.push("/" + this.geo_);
		buf.push("/"); buf.push(out.proj_);
		buf.push("/"); buf.push(out.scale_);
		buf.push("/"); buf.push(out.nutsLvl_);
		buf.push(".json");
		return json(buf.join(""));
	}

	/**
	 * 
	 */
	out.updateGeoMT = function (callback) {

		//erase previous data
		geoData = null;

		//get geo data from Nuts2json API
		out.getGeoDataPromise().then(function (geo___) {
			geoData = geo___;

			//build map template
			out.buildMapTemplate();

			//callback
			callback();
		});

		//recursive call to inset components
		for (const geo in out.insetTemplates_)
			out.insetTemplates_[geo].updateGeoMT(callback);

		return out;
	}



	/**
	 * Build a map object.
	 */
	out.buildMapTemplateBase = function () {

		//get svg element. Create it if it does not exists
		let svg = select("#" + out.svgId());
		if (svg.size() == 0)
			svg = select("body").append("svg").attr("id", out.svgId())
		out.svg(svg);

		//clear SVG (to avoid building multiple svgs on top of each other during multiple build() calls)
		selectAll("#" + out.svgId() + " > *").remove();

		//set SVG dimensions
		//if no height was specified, use 85% of the width.
		if (!out.height()) out.height(0.85 * out.width());
		svg.attr("width", out.width()).attr("height", out.height());

		if (out.drawCoastalMargin_)
			//define filter for coastal margin
			svg.append("filter").attr("id", "coastal_blur").attr("x", "-200%").attr("y", "-200%").attr("width", "400%")
				.attr("height", "400%").append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", out.coastalMarginStdDev_);

		//create drawing group, as first child
		const dg = svg.insert("g", ":first-child").attr("id", "drawing");

		//create main zoom group
		const zg = dg.append("g").attr("id", "zoomgroup" + out.geo_);

		//insets
		if (!out.insetBoxPosition_) out.insetBoxPosition_ = [out.width() - out.insetBoxWidth() - 2 * out.insetBoxPadding(), 2 * out.insetBoxPadding()];
		const ing = dg.append("g").attr("id", "insetsgroup").attr("transform", "translate(" + out.insetBoxPosition()[0] + "," + out.insetBoxPosition()[1] + ")")
		//if needed, use default inset setting
		if (out.insets_ === "default") out.insets_ = defaultInsetConfig(out.insetBoxWidth(), out.insetBoxPadding());
		for (let i = 0; i < out.insets_.length; i++) {
			const config = out.insets_[i];
			config.svgId = config.svgId || "inset" + config.geo + (Math.random().toString(36).substring(7));

			//get svg element. Create it if it as an embeded SVG if it does not exists
			let svg = select("#" + config.svgId);
			if (svg.size() == 0) {
				const x = config.x == undefined ? out.insetBoxPadding_ : config.x;
				const y = config.y == undefined ? out.insetBoxPadding_ + i * (out.insetBoxPadding_ + out.insetBoxWidth_) : config.y;
				const ggeo = ing.append("g").attr("id", "zoomgroup" + config.geo).attr("transform", "translate(" + x + "," + y + ")");
				ggeo.append("svg").attr("id", config.svgId);
			}

			//build inset
			out.insetTemplates_[config.geo] = buildInset(config, out).buildMapTemplateBase();

		}

		//draw frame
		dg.append("rect").attr("id", "frame" + out.geo_).attr("x", 0).attr("y", 0)
			.attr("width", out.width_).attr("height", out.height_)
			.style("stroke-width", out.frameStrokeWidth_)
			.style("stroke", out.frameStroke_)
			.style("fill", "none");

		//make drawing group zoomable
		if (out.zoomExtent()) {
			svg.call(zoom()
				.scaleExtent(out.zoomExtent())
				.on('zoom', function () {
					const k = event.transform.k;
					const cs = ["gra", "bn_0", /*"bn_1", "bn_2", "bn_3",*/ "bn_co", "cntbn", "symbol"];
					for (let i = 0; i < cs.length; i++)
						out.svg().selectAll("." + cs[i]).style("stroke-width", function (d) {
							return (1 / k) + "px";
						});
					zg.attr("transform", event.transform);
				}));
		}

		return out;
	};




	/** 
	 * Buid an empty map template, based on the geometries only.
	*/
	out.buildMapTemplate = function () {

		//geo center and extent: if not specified, use the default one, or the compute one from the topojson bbox
		const dp = _defaultPosition[out.geo() + "_" + out.proj()];
		if (!out.geoCenter())
			if (dp) out.geoCenter(dp.geoCenter);
			else out.geoCenter([0.5 * (geoData.bbox[0] + geoData.bbox[2]), 0.5 * (geoData.bbox[1] + geoData.bbox[3])]);
		//pixel size (zoom level): if not specified, compute value from SVG dimensions and topojson geographical extent
		if (!out.pixSize())
			if (dp) out.pixSize(dp.pixSize * 800 / out.width());
			else out.pixSize(Math.min((geoData.bbox[2] - geoData.bbox[0]) / out.width_, (geoData.bbox[3] - geoData.bbox[1]) / out.height_));

		//SVG drawing function
		//compute geo bbox from geocenter, pixsize and SVG dimensions
		const bbox = [out.geoCenter_[0] - 0.5 * out.pixSize_ * out.width_, out.geoCenter_[1] - 0.5 * out.pixSize_ * out.height_, out.geoCenter_[0] + 0.5 * out.pixSize_ * out.width_, out.geoCenter_[1] + 0.5 * out.pixSize_ * out.height_];
		const projection = geoIdentity().reflectY(true).fitSize([out.width_, out.height_], getBBOXAsGeoJSON(bbox));
		const path = geoPath().projection(projection);


		//decode topojson to geojson
		const gra = feature(geoData, geoData.objects.gra).features;
		const nutsRG = feature(geoData, geoData.objects.nutsrg).features;
		const nutsbn = feature(geoData, geoData.objects.nutsbn).features;
		const cntrg = feature(geoData, geoData.objects.cntrg).features;
		const cntbn = feature(geoData, geoData.objects.cntbn).features;

		/*/RS
		if (cntrg && (out.nutsYear() + "" === "2016" || out.nutsYear() + "" === "2021"))
			for (let i = 0; i < cntrg.length; i++) {
				const c = cntrg[i];
				if (c.properties.id == "RS") c.properties.na = "Kosovo (UNSCR 1244/1999 & ICJ)";
			}*/

		//prepare drawing group
		const zg = out.svg().select("#zoomgroup" + out.geo_);
		zg.selectAll("*").remove();

		//draw background rectangle
		zg.append("rect").attr("id", "sea").attr("x", -5 * out.width_).attr("y", -5 * out.height_)
			.attr("width", 11 * out.width_).attr("height", 11 * out.height_)
			.style("fill", out.seaFillStyle_);

		if (out.drawCoastalMargin_) {
			//draw coastal margin
			const cg = zg.append("g").attr("id", "g_coast_margin")
				.style("fill", "none")
				.style("stroke-width", out.coastalMarginWidth_)
				.style("stroke", out.coastalMarginColor_)
				.style("filter", "url(#coastal_blur)")
				.style("stroke-linejoin", "round")
				.style("stroke-linecap", "round");
			//countries bn
			if (cntbn)
				cg.append("g").attr("id", "g_coast_margin_cnt")
					.selectAll("path").data(cntbn).enter().filter(function (bn) { return bn.properties.co === "T"; })
					.append("path").attr("d", path);
			//nuts bn
			if (nutsbn)
				cg.append("g").attr("id", "g_coast_margin_nuts")
					.selectAll("path").data(nutsbn).enter().filter(function (bn) { return bn.properties.co === "T"; })
					.append("path").attr("d", path);
		}

		if (gra && out.drawGraticule_) {
			//draw graticule
			zg.append("g").attr("id", "g_gra")
				.style("fill", "none")
				.style("stroke", out.graticuleStroke())
				.style("stroke-width", out.graticuleStrokeWidth())
				.selectAll("path").data(gra)
				.enter().append("path").attr("d", path).attr("class", "gra")
		}

		//draw country regions
		if (cntrg) {
			zg.append("g").attr("id", "g_cntrg").selectAll("path").data(cntrg)
				.enter().append("path").attr("d", path)
				.attr("class", "cntrg")
				.style("fill", out.landFillStyle())
		}

		//draw NUTS regions
		if (nutsRG)
			zg.append("g").attr("id", "g_nutsrg").selectAll("path").data(nutsRG)
				.enter().append("path")
				.attr("d", path)
				.attr("class", "nutsrg")
				.attr("fill", out.nutsrgFillStyle_)
				.on("mouseover", function (rg) {
					const sel = select(this);
					sel.attr("fill___", sel.attr("fill"));
					sel.attr("fill", out.nutsrgSelFillSty_);
					if (tooltip) tooltip.mouseover(out.tooltipText_(rg, out))
				}).on("mousemove", function () {
					if (tooltip) tooltip.mousemove();
				}).on("mouseout", function () {
					const sel = select(this);
					sel.attr("fill", sel.attr("fill___"));
					if (tooltip) tooltip.mouseout();
				});

		//draw country boundaries
		if (cntbn)
			zg.append("g").attr("id", "g_cntbn")
				.style("fill", "none").style("stroke-linecap", "round").style("stroke-linejoin", "round")
				.selectAll("path").data(cntbn)
				.enter().append("path")
				.filter(function (bn) {
					if (out.bordersToShow_.includes("eu") && bn.properties.eu == "T") return bn;
					if (out.bordersToShow_.includes("efta") && bn.properties.efta == "T") return bn;
					if (out.bordersToShow_.includes("cc") && bn.properties.cc == "T") return bn;
					if (out.bordersToShow_.includes("oth") && bn.properties.oth == "T") return bn;
					if (out.bordersToShow_.includes("co") && bn.properties.co == "T") return bn;
				})
				.attr("d", path)
				.attr("class", function (bn) { return (bn.properties.co === "T") ? "bn_co" : "cntbn" })
				.style("stroke", function (bn) { return (bn.properties.co === "T") ? out.landStroke() : "none" })
				.style("stroke-width", function (bn) { (bn.properties.co === "T") ? out.landStrokeWidth() : 0 });

		//draw NUTS boundaries
		if (nutsbn) {
			nutsbn.sort(function (bn1, bn2) { return bn2.properties.lvl - bn1.properties.lvl; });
			zg.append("g").attr("id", "g_nutsbn")
				.style("fill", "none").style("stroke-linecap", "round").style("stroke-linejoin", "round")
				.selectAll("path")
				.data(nutsbn).enter()
				.filter(function (bn) {
					if (out.bordersToShow_.includes("eu") && bn.properties.eu == "T") return bn;
					if (out.bordersToShow_.includes("efta") && bn.properties.efta == "T") return bn;
					if (out.bordersToShow_.includes("cc") && bn.properties.cc == "T") return bn;
					if (out.bordersToShow_.includes("oth") && bn.properties.oth == "T") return bn;
					if (out.bordersToShow_.includes("co") && bn.properties.co == "T") return bn;
				})
				.append("path")
				.attr("d", path)
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
		}

		//prepare group for proportional symbols, with nuts region centroids
		if (withCenterPoints) {
			if (nutsRG) {
				const gcp = zg.append("g").attr("id", "g_ps");

				//allow for different symbols by adding a g element here, then adding the symbols in proportional-symbols.js
				gcp.selectAll("g")
					.data(nutsRG/*.sort(function (a, b) { return b.properties.val - a.properties.val; })*/)
					.enter() //.filter(function (d) { return d.properties.val; })
					.append("g")
					.attr("transform", function (d) { return "translate(" + path.centroid(d) + ")"; })
					//.attr("r", 1)
					.attr("class", "symbol")
					.style("fill", "gray")
					.on("mouseover", function (rg) {
						select(this).style("fill", out.nutsrgSelFillSty_);
						if (tooltip) tooltip.mouseover(out.tooltipText_(rg, out))
					}).on("mousemove", function () {
						if (tooltip) tooltip.mousemove();
					}).on("mouseout", function () {
						select(this).style("fill", out.psFill_);
						if (tooltip) tooltip.mouseout();
					});
			}
		}

		// add geographical labels to map
		if (out.labelling_) {
			addLabelsToMap(out, zg, projection, nutsRG, path)
		}

		//title
		if (out.title()) {
			//define default position
			if (!out.titlePosition()) out.titlePosition([10, 5 + out.titleFontSize()]);
			//draw title
			out.svg().append("text").attr("id", "title" + out.geo_).attr("x", out.titlePosition()[0]).attr("y", out.titlePosition()[1])
				.text(out.title())
				.style("font-family", out.titleFontFamily())
				.style("font-size", out.titleFontSize() + "px")
				.style("font-weight", out.titleFontWeight())
				.style("fill", out.titleFill())

				//.style("stroke-width", 3)
				//.style("stroke", "lightgray"/*out.seaFillStyle()*/)
				.style("stroke-linejoin", "round")
				.style("paint-order", "stroke")
		}

		if (out.subtitle()) {
			//define default position
			if (!out.subtitlePosition()) out.subtitlePosition([10, 8 + out.titleFontSize() + 5 + out.subtitleFontSize()]);
			//draw subtitle
			out.svg().append("text").attr("id", "subtitle" + out.geo_).attr("x", out.subtitlePosition()[0]).attr("y", out.subtitlePosition()[1])
				.text(out.subtitle())
				.style("font-family", out.subtitleFontFamily())
				.style("font-size", out.subtitleFontSize() + "px")
				.style("font-weight", out.subtitleFontWeight())
				.style("fill", out.subtitleFill())

				//.style("stroke-width", 3)
				//.style("stroke", "lightgray"/*out.seaFillStyle()*/)
				.style("stroke-linejoin", "round")
				.style("paint-order", "stroke")
		}

		//bottom text
		if (out.bottomText())
			out.svg().append("text").attr("id", "bottomtext").attr("x", out.botTxtPadding_).attr("y", out.height_ - out.botTxtPadding_)
				.text(out.bottomText())
				.style("font-family", out.botTxtFontFamily_)
				.style("font-size", out.botTxtFontSize_ + "px")
				.style("fill", out.botTxtFill_)
				.on("mouseover", function () {
					tooltip.mw___ = tooltip.style("max-width");
					tooltip.f___ = tooltip.style("font");
					tooltip.style("max-width", "800px");
					tooltip.style("font", "6px");
					if (out.botTxtTooltipTxt_) tooltip.mouseover(out.botTxtTooltipTxt_);
				}).on("mousemove", function () {
					if (out.botTxtTooltipTxt_) tooltip.mousemove();
				}).on("mouseout", function () {
					if (out.botTxtTooltipTxt_) tooltip.mouseout();
					tooltip.style("max-width", tooltip.mw___);
					tooltip.style("font", tooltip.f___);
				});

		//source dataset URL
		if (out.showSourceLink_) {
			if (out.stat().eurostatDatasetCode) {

				//dataset link
				let code = out.stat().eurostatDatasetCode;
				let url = `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`;
				let link = out.svg().append("a").attr("xlink:href", url).attr("target", "_blank").append("text").attr("id", "source-dataset-link").attr("x", out.width_ - out.botTxtPadding_).attr("y", out.height_ - out.botTxtPadding_)
					.text("EUROSTAT")
					.style("font-family", out.botTxtFontFamily_)
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
					})
				//.on("click", function() { window.open(`https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`); }); 

				//pretext "Source:"
				let linkW = link.node().getComputedTextLength();
				out.svg().append("text").attr("x", out.width_ - out.botTxtPadding_ - linkW - 2).attr("y", out.height_ - out.botTxtPadding_).text("Source:").style("font-family", out.botTxtFontFamily_)
					.style("font-size", out.botTxtFontSize_ + "px")
					.style("stroke-width", "0.3px")
					.attr("text-anchor", "end")
			}
		}

		//prepare map tooltip
		const tooltip = (out.tooltipText_ || out.botTxtTooltipTxt_) ? tp.tooltip() : null;

		return out;
	};


	/**
	 * @function addLabelsToMap 
	 * @description appends text labels to the map. Labels can be countries, country codes, ocean names or statistical values
	*/
	function addLabelsToMap(out, zg, projection, nutsRG, path) {
		let labels = out.labelsConfig_ || defaultLabels;
		let language = out.lg_;
		let labelsArray = [];
		let labelsG = zg.append("g").attr("class", "labels-container");

		//define which labels to use (cc, countries, seas, values)
		if (out.labelsToShow_.includes("countries") || out.labelsToShow_.includes("seas")) {
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
			if (nutsRG) {
				const gsls = labelsG.append("g").attr("id", "g_stat_label_shadows");
				const gsl = labelsG.append("g").attr("id", "g_stat_labels");

				//allow for stat label positioning by adding a g element here, then adding the values in the mapType updateStyle() function
				gsl.selectAll("g")
					.data(nutsRG)
					.enter()
					.append("g")
					.attr("transform", function (d) { return "translate(" + path.centroid(d) + ")"; })
					.attr("class", "stat-label")
					.style("font-size", out.labelValuesFontSize_ + "px")
					// .attr("font-weight", "bold")
					.attr("text-anchor", "middle")
					.style("opacity", d => out.labelOpacity_["values"])
					.style("fill", d => out.labelFill_["values"])
					.attr("stroke", d => out.labelStroke_["values"])
					.attr("stroke-width", d => out.labelStrokeWidth_["values"])
					.style("font-family", out.labelFontFamily_)

				//SHADOWS
				if (out.labelShadow_) {
					gsls.selectAll("g")
						.data(nutsRG)
						.enter()
						.append("g")
						.attr("transform", function (d) { return "translate(" + path.centroid(d) + ")"; })
						.attr("class", "stat-label-shadow")
						.style("font-size", out.labelValuesFontSize_ + "px")
						// .attr("font-weight", "bold")
						.attr("text-anchor", "middle")
						.style("opacity", d => out.labelOpacity_["values"])
						.style("fill", d => out.labelShadowColor_["values"])
						.attr("stroke", d => out.labelShadowColor_["values"])
						.attr("stroke-width", d => out.labelStrokeWidth_["values"] + out.labelShadowWidth_["values"])
						.style("font-family", out.labelFontFamily_)
				}
			}
		}

		//ADD REST OF LABELS (FROM LABELS.JS)
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
			})

			const shadowg = labelsG.append("g").attr("id", "g_labelShadows");
			const labelg = labelsG.append("g").attr("id", "g_geolabels");

			//SHADOWS
			if (out.labelShadow_) {
				let shadows = shadowg.selectAll("text")
					.data(data)
					.enter()
					.append("text")
					.attr("class", (d) => { return "labelShadow_" + d.class })
					.attr("x", function (d) {
						if (d.rotate) {
							return 0; //for rotated text, x and y positions must be specified in the transform property
						}
						return projection([d.x, d.y])[0];
					})
					.attr("y", function (d) {
						if (d.rotate) {
							return 0; //for rotated text, x and y positions must be specified in the transform property
						}
						return projection([d.x, d.y])[1];
					})
					.attr("dy", -7) // set y position of bottom of text
					.style("opacity", d => out.labelOpacity_[d.class])
					.style("letter-spacing", d => d.letterSpacing ? d.letterSpacing : 0)
					.style("fill", d => out.labelShadowColor_[d.class])
					.attr("stroke", d => out.labelShadowColor_[d.class])
					.attr("stroke-width", d => out.labelStrokeWidth_[d.class] + out.labelShadowWidth_[d.class])
					.style("font-size", (d) => d.size + "px")
					.attr("transform", (d) => {
						if (d.rotate) {
							let pos = projection([d.x, d.y])
							let x = pos[0];
							let y = pos[1];
							return `translate(${x},${y}) rotate(${d.rotate})`
						} else {
							return "rotate(0)"
						}
					})
					//.style("font-weight", d => d.class == "seas" ? "normal" : "bold")
					.style("font-style", d => d.class == "seas" ? "italic" : "normal")
					.style("pointer-events", "none")
					.style("font-family", out.labelFontFamily_)
					.attr("text-anchor", "middle") // set anchor y justification
					.text(function (d) { return d.text; }); // define the text to display
			}

			//LABELS
			let labels = labelg.selectAll("text")
				.data(data)
				.enter()
				.append("text")
				.attr("class", (d) => { return "geolabel_" + d.class })
				//position label
				.attr("x", function (d) {
					if (d.rotate) {
						return 0; //for rotated text, x and y positions must be specified in the transform property
					}
					return projection([d.x, d.y])[0];
				})
				.attr("y", function (d) {
					if (d.rotate) {
						return 0; //for rotated text, x and y positions must be specified in the transform property
					}
					return projection([d.x, d.y])[1];
				})
				.attr("dy", -7) // set y position of bottom of text
				.style("opacity", d => out.labelOpacity_[d.class])
				.style("letter-spacing", d => d.letterSpacing ? d.letterSpacing : 0)
				.style("fill", d => out.labelFill_[d.class])
				.attr("stroke", d => out.labelStroke_[d.class])
				.attr("stroke-width", d => out.labelStrokeWidth_[d.class])

				//set label size
				.style("font-size", (d) => d.size + "px")
				//transform labels which have a "rotate" property in the labels config. For rotated labels, their X,Y must also be set in the transform.
				// note: dont apply to country code labels
				.attr("transform", (d) => {
					if (d.rotate) {
						let pos = projection([d.x, d.y])
						let x = pos[0];
						let y = pos[1];
						return `translate(${x},${y}) rotate(${d.rotate})`
					} else {
						return "rotate(0)"
					}
				})
				//.style("font-weight", d => d.class == "seas" ? "normal" : "bold")
				.style("font-style", d => d.class == "seas" ? "italic" : "normal")
				.style("pointer-events", "none")
				.style("font-family", out.labelFontFamily_)
				.attr("text-anchor", "middle") // set anchor y justification
				.text(function (d) { return d.text; }); // define the text to display


		}
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

		/*
		mt.stat_ = null;
		mt.legend_ = null;
		mt.filtersDefinitionFun_ = null;
		mt.tooltipText_ = null;*/

		//copy template attributes
		["nutsLvl_", "nutsYear_", "nutsrgFillStyle_", "nutsrgSelFillSty_", "nutsbnStroke_", "nutsbnStrokeWidth_", "landFillStyle_", "landStroke_", "landStrokeWidth_", "seaFillStyle_", "drawCoastalMargin_", "coastalMarginColor_", "coastalMarginWidth_", "coastalMarginStdDev_", "graticuleStroke_", "graticuleStrokeWidth_", "labelling_",
			"labelFill_", "labelValuesFontSize_", "labelOpacity_", "labelStroke_", "labelStrokeWidth_", "labelShadowWidth_", "labelShadow_", "labelShadowColor_", "labelsToShow_", "labelFontFamily_", "lg_"]
			.forEach(function (att) { mt[att] = out[att]; });

		//copy stat map attributes/methods
		["stat", "statData", "legend", "legendObj", "noDataText", "lg", "transitionDuration", "tooltipText_", "classToText_"]
			.forEach(function (att) { mt[att] = out[att]; });

		//apply config values for inset
		for (let key in config) mt[key + "_"] = config[key];

		return mt;
	}


	return out;
}


/** Default geocenter positions and pixSize (for default width = 800px) for territories and projections. */
const _defaultPosition = {
	"EUR_3035": { geoCenter: [4970000, 3350000], pixSize: 6800 },
	"IC_32628": { geoCenter: [443468, 3145647], pixSize: 1000 },
	"GP_32620": { geoCenter: [669498, 1784552], pixSize: 130 },
	"MQ_32620": { geoCenter: [716521, 1621322], pixSize: 130 },
	"GF_32622": { geoCenter: [266852, 444074], pixSize: 500 },
	"RE_32740": { geoCenter: [348011, 7661627], pixSize: 130 },
	"YT_32738": { geoCenter: [516549, 8583920], pixSize: 70 },
	"MT_3035": { geoCenter: [4719755, 1441701], pixSize: 70 },
	"PT20_32626": { geoCenter: [397418, 4271471], pixSize: 1500 },
	"PT30_32628": { geoCenter: [333586, 3622706], pixSize: 150 },
	"LI_3035": { geoCenter: [4287060, 2672000], pixSize: 40 },
	"IS_3035": { geoCenter: [3011804, 4960000], pixSize: 700 },
	"SJ_SV_3035": { geoCenter: [4570000, 6160156], pixSize: 800 },
	"SJ_JM_3035": { geoCenter: [3647762, 5408300], pixSize: 100 },
	"CARIB_32620": { geoCenter: [636345, 1669439], pixSize: 500 },
}

/**
 * Default inset setting.
 * @param {*} s The width of the inset box
 * @param {*} p The padding
 */
const defaultInsetConfig = function (s, p) {
	const out = [
		{ geo: "IC", x: 0, y: 0, width: s, height: 0.3 * s },
		{ geo: "CARIB", x: 0, y: 0.3 * s + p, width: 0.5 * s, height: s },
		{ geo: "GF", x: 0.5 * s, y: 0.3 * s + p, width: 0.5 * s, height: 0.75 * s }, { geo: "YT", x: 0.5 * s, y: 1.05 * s + p, width: 0.25 * s, height: 0.25 * s }, { geo: "RE", x: 0.75 * s, y: 1.05 * s + p, width: 0.25 * s, height: 0.25 * s },
		{ geo: "PT20", x: 0, y: 1.3 * s + 2 * p, width: 0.75 * s, height: 0.25 * s }, { geo: "PT30", x: 0.75 * s, y: 1.3 * s + 2 * p, width: 0.25 * s, height: 0.25 * s },
		{ geo: "MT", x: 0, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s }, { geo: "LI", x: 0.25 * s, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s },
		{ geo: "SJ_SV", x: 0.5 * s, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s }, { geo: "SJ_JM", x: 0.75 * s, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s },
		/*{geo:"IC", x:0, y:0}, {geo:"RE", x:dd, y:0}, {geo:"YT", x:2*dd, y:0},
		{geo:"GP", x:0, y:dd}, {geo:"MQ", x:dd, y:dd}, {geo:"GF",scale:"10M", x:2*dd, y:dd},
		{geo:"PT20", x:0, y:2*dd}, {geo:"PT30", x:dd, y:2*dd}, {geo:"MT", x:2*dd, y:2*dd},
		{geo:"LI",scale:"01M", x:0, y:3*dd}, {geo:"SJ_SV", x:dd, y:3*dd}, {geo:"SJ_JM",scale:"01M", x:2*dd, y:3*dd},*/
		//{geo:"CARIB", x:0, y:330}, {geo:"IS", x:dd, y:330}
	];
	//hide graticule for insets
	for (let i = 0; i < out.length; i++) out[i].drawGraticule = false;
	return out;
}



/** Default CRS for each geo area */
const _defaultCRS = {
	"EUR": "3035",
	"IC": "32628",
	"GP": "32620",
	"MQ": "32620",
	"GF": "32622",
	"RE": "32740",
	"YT": "32738",
	"MT": "3035",
	"PT20": "32626",
	"PT30": "32628",
	"LI": "3035",
	"IS": "3035",
	"SJ_SV": "3035",
	"SJ_JM": "3035",
	"CARIB": "32620",
};
