import { select } from "d3-selection";
import { scaleQuantile } from "d3-scale";
import { interpolateRgb } from "d3-interpolate";
import * as smap from '../core/stat-map';
//import * as lgch from '../legend/legend-choropleth';

/**
 * Return a bivariate choropleth map.
 * See: https://gistbok.ucgis.org/bok-topics/multivariate-mapping
 * 
 * @param {*} config 
 */
export const map = function (config) {

	//create map object to return, using the template
	const out = smap.statMap(config);

	out.clnb_ = 3;
	//stevens.greenblue
	out.startColor_ = "#e8e8e8";
	out.color1_ = "#73ae80";
	out.color2_ = "#6c83b5";
	out.endColor_ = "#2a5a5b";
	//a function returning the colors from the classes i,j
	out.classToFillStyle_ = undefined;

	//style for no data regions
	out.noDataFillStyle_ = "darkgray";
	//the classifier: a function which return a class number from a stat value.
	out.classifier1_ = undefined;
	out.classifier2_ = undefined;
	//specific tooltip text function
	out.tooltipText_ = tooltipTextFunBiv;


    /**
	 * Definition of getters/setters for all previously defined attributes.
	 * Each method follow the same pattern:
	 *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
	 *  - To get the attribute value, call the method without argument.
	 *  - To set the attribute value, call the same method with the new value as single argument.
	*/
	["clnb_", "startColor_", "color1_", "color2_", "endColor_", "classToFillStyle_", "noDataFillStyle_", "classifier1_", "classifier2_"]
		.forEach(function (att) {
			out[att.substring(0, att.length - 1)] = function(v) { if (!arguments.length) return out[att]; out[att] = v; return out; };
		});

	//override attribute values with config values
	if(config) ["clnb", "startColor", "color1", "color2", "endColor", "classToFillStyle", "noDataFillStyle"].forEach(function (key) {
		if(config[key]!=undefined) out[key](config[key]);
	});

	//@override
	out.updateClassification = function () {

		//make single classifiers
		const range = [...Array(out.clnb()).keys()];
		out.classifier1( scaleQuantile().domain(out.statData("v1").getArray()).range(range) );
		out.classifier2( scaleQuantile().domain(out.statData("v2").getArray()).range(range) );

		//assign class to nuts regions, based on their value
		out.svg().selectAll("path.nutsrg")
			.attr("ecl1", function (rg) {
				const sv = out.statData("v1").get(rg.properties.id);
				if (!sv) return "nd";
				const v = sv.value;
				if (v != 0 && !v) return "nd";
				return +out.classifier1()(+v);
			})
			.attr("ecl2", function (rg) {
				const sv = out.statData("v2").get(rg.properties.id);
				if (!sv) return "nd";
				const v = sv.value;
				if (v != 0 && !v) return "nd";
				return +out.classifier2()(+v);
			})

		//define bivariate scale
		const scale = scaleBivariate( out.clnb(), out.startColor(), out.color1(), out.color2(), out.endColor() );
		out.classToFillStyle(scale);

		return out;
	};


	//@override
	out.updateStyle = function () {

		//apply style to nuts regions depending on class
		out.svg().selectAll("path.nutsrg")
			.transition().duration(out.transitionDuration())
			.attr("fill", function () {
				const ecl1 = select(this).attr("ecl1");
				if (!ecl1 || ecl1 === "nd") return out.noDataFillStyle() || "gray";
				const ecl2 = select(this).attr("ecl2");
				if (!ecl2 || ecl2 === "nd") return out.noDataFillStyle() || "gray";
				return out.classToFillStyle()(+ecl1, +ecl2);
			});

		return out;
	};

	/*/@override
	out.getLegendConstructor = function() {
		return lgch.legendChoropleth;
	}*/

	return out;
}


const scaleBivariate = function(clnb, startColor, color1, color2, endColor) {

	//color ramps, by row
	const cs = [];
	//interpolate from first and last columns
	const rampS1 = interpolateRgb(startColor, color1);
	const ramp2E = interpolateRgb(color2, endColor);
	for(let i=0; i<clnb; i++) {
		const t = i/(clnb-1);
		const colFun = interpolateRgb( rampS1(t) , ramp2E(t));
		const row = [];
		for(let j=0; j<clnb; j++) row.push(colFun(j/(clnb-1)));
		cs.push(row);
	}

	return function(ecl1, ecl2) {
		return cs[ecl1][ecl2];
	}
  }

/*
const alpha = function(r,g,b) {
	return function(t) {
		return "rgba("+r+","+g+","+b+","+ Math.round(255*t) +")";
	}
}*/


/**
 * Specific function for tooltip text.
 * 
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */
const tooltipTextFunBiv = function (rg, map) {
	const buf = [];
	//region name
	buf.push("<b>" + rg.properties.na + "</b><br>");

	//stat 1 value
	const sv1 = map.statData("v1").get(rg.properties.id);
	if (!sv1 || (sv1.value != 0 && !sv1.value)) buf.push(map.noDataText_);
	else buf.push(sv1.value);
	//unit 1
	const unit1 = map.statData("v1").unitText();
	if (unit1) buf.push(" " + unit1);

	buf.push("<br>");

	//stat 2 value
	const sv2 = map.statData("v2").get(rg.properties.id);
	if (!sv2 || (sv2.value != 0 && !sv2.value)) buf.push(map.noDataText_);
	else buf.push(sv2.value);
	//unit 2
	const unit2 = map.statData("v2").unitText();
	if (unit2) buf.push(" " + unit2);

	return buf.join("");
};