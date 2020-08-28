// name:    SPARQL support: Endpoint browser
// version: 0.2.3
// https://sparql-support.dbcls.js/
//
// Released under the MIT license
// http://opensource.org/licenses/mit-license.php
// Copyright (c) 2019 Yuki Moriya (DBCLS)

var epBrowser = epBrowser || {
    version: "0.2.3",
    api: "//localhost:3000/api/",
    getLinksApi: "endpoint_browser_links",
    findEndpointApi: "find_endpoint_from_uri",
    debug: false,
    clickableFlag: true,
    labelFlag: true,
    forceFlag: true,
    inverseFlag: false,
    subgraphMode: false,
    removeMode: false,
    rdfConfRenderFlag: false,
    prefixCount: 0,
    edgeZoomRate: 1,
    rdfConfSelectIndex: 0,
    prefixCc404: [],

    fetchReq: function(method, url, renderDiv, param, callback){
	//console.log(url);
	//console.log(param.apiArg);
	let gid, svg, hc, loadingTimer;
	if(renderDiv){
	    [gid, svg, hc] = epBrowser.loading.append(renderDiv, param);
	    loadingTimer = setInterval(function(){epBrowser.loading.anime(svg, gid, hc);}, 300);
	}
	let options = {method: method};
        if(method == "get" && param.apiArg[0]){
	    url += "?" + param.apiArg.join("&");
	}else if(method == "post"){
	    if(param.apiArg[0]) options.body = param.apiArg.join("&");
	    //console.log(options.body);
	    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'};
	    options.mode = 'cors';
	}
	// set timeout of fetch
	let fetch_timeout = function(ms, promise) {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    reject(new Error("timeout"))
                }, ms)
                promise.then(resolve, reject)
            })
        };
	try{
	    let res = fetch_timeout(600000, fetch(url, options)).then(res=>{
		if(res.ok) return res.json();
		else return false;
	    });
	    res.then(function(json){
		if(renderDiv) epBrowser.loading.remove(svg, gid, param, json);
		if(json) callback(json, renderDiv, param);
		if(renderDiv) clearInterval(loadingTimer);
	    });
	}catch(error){
	    console.log(error);
	    if(renderDiv) clearInterval(loadingTimer);
	    if(renderDiv) epBrowser.loading.error(svg, gid, width / 2);
	}
    },

    loading: {
	frame: 0,
	next: 0,
	count: function(){
	    this.frame++;
	    if(this.frame == 6) this.frame = 0;
	},
	append: function(renderDiv, param){
	    let gid = "l" + Math.floor(Math.random() * 10000 + 1);
	    let wc = param.width / 2;
	    let hc = param.height / 2;
	    let data = [{x: wc - 40, c: 1}, {x: wc - 20, c: 2}, {x: wc, c: 3}, {x: wc + 20, c: 4}];
	    let svg = renderDiv.select("svg");
	    let g = svg.append("g").attr("id", "l" + gid);
	    g.append("rect").attr("x", wc - 80).attr("y", hc - 10).attr("width", 140).attr("height", 60)
		.attr("fill", "#ffffff").attr("opacity", 0.8).attr("display", "none").attr("id", gid + "_bg");
	    g.selectAll("circle")
		.data(data)
		.enter()
		.append("circle")
		.attr("fill", "#2f7dad")
		.attr("id", function(d){ return gid + "_" + d.c; })
		.attr("cx", function(d){ return d.x; })
		.attr("cy", hc - 10 + 30).attr("r", 0);
	    return [gid, svg, hc];
	},
	anime: function(svg, gid, hc){
	    let f = this.frame;
	    let g = svg.select("#l" + gid);
	    g.select("#" + gid + "_bg").attr("display", "inline");
	    if(f == 0) g.selectAll("circle").transition().duration(240).attr("r", 8);
	    else if(f <= 4) g.select("#" + gid + "_" + f)
		.transition().duration(120).attr("cy", hc - 10 + 18)
		.transition().duration(120).attr("cy", hc - 10 + 35);
	    else g.selectAll("circle").transition().duration(240).attr("r", 0);
	},
	remove: function(svg, gid, param, json){
	    let g = svg.select("#l" + gid);
	    if(json.data && json.data[0]){
		g.remove();
	    }else{
		let message = "No leaves";
		if(!json) message = "endpoint error";
		g.selectAll("circle").remove();
		g.select("#" + gid + "_bg").attr("display", "inline");
		g.append("text").attr("x", param.width / 2).attr("y", param.height / 2 + 25).attr("fill", "#888888").attr("text-anchor", "middle").text(message);
		setTimeout(function(){  g.remove(); }, 2000);
	    }
	},
	error: function(svg, gid, center){
	    let g = svg.select("#l" + gid);
	    g.remove();
	    svg.append("text").attr("x", center).attr("y", 30).attr("text-anchor", "middle").text("error");
	}
    },

    initParam: function(stanza_params, renderDivId){
	let param = [];
	param.width = 0;
	if(renderDivId.offsetWidth > 0 && param.width < 100) param.width = renderDivId.offsetWidth; 
	if(param.width <= 300) param.width = 960;
	//set stanza args
	param.apiArg = [];
	for(let key in stanza_params){
	    if(stanza_params[key]) param.apiArg.push(key + "=" + encodeURIComponent(stanza_params[key]));
	}
	return param;
    },

    initDom: function(stanza_params, renderDivId){
	let param = epBrowser.initParam(stanza_params, renderDivId);
	param.height = 800;
	param.cx = param.width / 2;
	param.cy = param.height / 2;
	
	epBrowser.endpoint = stanza_params["endpoint"];
	
	// make DOM
	//// SVG DOM
	let renderDiv = d3.select(renderDivId).style("position", "relative");
	let svg = renderDiv.append("svg")
	    .attr("id", "epBrowser_svg")
	    .attr("width", param.width)
	    .attr("height", param.height)
	    .on("mouseover", function(){ epBrowser.onMouseSvg = true; })
	    .on("mouseout", function(){ epBrowser.onMouseSvg = false; });
	let g = svg.append('g').attr("id", "zoom_g"); // g for zoom
	g = g.append('g').attr("id", "drag_g");       // g for drag
	g.attr("transform", "translate(" + param.width / 2 +"," + param.height / 2 + ")"); // position init
	let edges_layer = g.append('g').attr("class", "edges_layer");
	let edges_label_layer = g.append('g').attr("class", "edges_label_layer");
	let nodes_layer = g.append('g').attr("class", "nodes_layer");
	let pop_edge_label = g.append('text').attr("id", "popup_label");
	let pop_mouse_eve_label = g.append('text').attr("id", "popup_mouse_event_label").attr("text-anchor", "middle").attr("font-size", "16");
	epBrowser.makeButton(renderDiv, param);
	g.append("g").attr("id", "popup_control");
	svg.append("g").attr("id", "prefix_g");
	svg.append("g").attr("id", "outer_ep_g");
	////// arrow marker
	let edge_colors = ["a", "b", "c", "d", "e", "red"];
	let defs = svg.append("defs");
	for(color of edge_colors){
	    defs.append("marker")
		.attr('id', "arrowhead_" + color)
		.attr('refX', 3.1).attr('refY', 2)
		.attr('markerWidth', 8).attr('markerHeight', 4)
		.attr("markerUnits", "strokeWidth")
		.attr('orient', "auto")
		.append("path")
		.attr("class", "arrow_" + color)
		.attr("d", "M 0,0 V 4 L4,2 Z");
	}
	//// SPARQL query DOM
	let sparqlDiv = renderDiv.append("div").attr("id", "sparql_run_div").style("display", "none");
	sparqlDiv.append("pre").attr("id", "query_dummy");
	sparqlDiv.append("pre").attr("id", "query").style("display", "none");
	sparqlDiv.append("input").attr("id", "sparql_limit").attr("type", "text").attr("size", "20").attr("value", "LIMIT 100")
	    .style("position", "relative").style("top", "-10px");
	sparqlDiv.append("br");
	sparqlDiv.append("input").attr("id", "sparql_run").attr("type", "button").attr("value", "run")
	    .on("click", function(){
		let query = sparqlDiv.select("#query").text();
		let limit = sparqlDiv.select("#sparql_limit").property("value");
		let url = "https://sparql-support.dbcls.jp/?query=" + encodeURIComponent(query + limit) + "&exec=1";
		window.open(url, "ss_target");
	    });
	// rdf confiog dom
	let rdfConfigWidth = renderDiv.node().offsetWidth;
	if(rdfConfigWidth > 1000) rdfConfigWidth = 1000;
	let rdfConfig = renderDiv.append("div").attr("id", "rdf_config").style("display", "none")
	    .style("background-color", "#ffffff").style("border", "solid 2px #888888")
	    .style("position", "absolute").style("top", "120px").style("width", rdfConfigWidth + "px").style("max-height", "750px")
	    .style("overflow", "hidden scroll").style("resize", "both");
	let sel = rdfConfig.append("select").attr("id", "rdf_config_select").style("margin-left", "20px").style("margin-top", "10px");
	sel.append("option").attr("class", "rdf_config_switch").attr("value", "prefix").text("prefix");
	sel.append("option").attr("class", "rdf_config_switch").attr("value", "model").text("model").attr("id", "rdf_conf_select_opt_model");
	sel.append("option").attr("class", "rdf_config_switch").attr("value", "sparql").text("sparql");
	sel.append("option").attr("class", "rdf_config_switch").attr("value", "rdf-conf-chk").text("--senbero");
	sel.append("option").attr("class", "rdf_config_switch").attr("value", "download").text("* download");
	sel.on("change", function(){
	    let value = this.value;
	    if(value == "download" || value == "rdf-conf-chk"){
		rdfConfig.select("#rdf_conf_form_endpoint").attr("value", "endpoint: " + epBrowser.endpoint);
		rdfConfig.select("#rdf_conf_form_prefix").attr("value", rdfConfig.select("#rdf_config_prefix").html().replace(/\<\/*span *[^\>]*\>/g, "").replace(/\&lt;/g, "<").replace(/\&gt;/g, ">"));
		rdfConfig.select("#rdf_conf_form_model").attr("value", rdfConfig.select("#rdf_config_model").html().replace(/> cardinality </g, "><").replace(/\<\/*span *[^\>]*\>/g, "").replace(/\&lt;/g, "<").replace(/\&gt;/g, ">").replace(/ +\{\{expand subject\}\}/, ""));
		rdfConfig.select("#rdf_conf_form_sparql").attr("value", rdfConfig.select("#rdf_config_sparql").html());
		if(value == "rdf-conf-chk") rdfConfig.select("#download_form").attr("action", "https://sparql-support.dbcls.jp/file/dl/rdf-conf-chk.php").attr("target", "check_model");
		else  rdfConfig.select("#download_form").attr("action", "https://sparql-support.dbcls.jp/file/dl/download.php").attr("target", "");
		rdfConfig.select("#download_form").node().submit();
		rdfConfig.select("#rdf_config_select").node().selectedIndex = epBrowser.rdfConfSelectIndex;
	    }else{
		rdfConfig.selectAll("pre").style("display", "none");
		rdfConfig.select("#rdf_config_" + value).style("display", "block");
		epBrowser.rdfConfSelectIndex = rdfConfig.select("#rdf_config_select").node().selectedIndex;
	    }
	});
	rdfConfig.append("pre").attr("id", "rdf_config_endpoint");
	let rdfConfigPrefix = rdfConfig.append("pre").attr("id", "rdf_config_prefix");
	rdfConfig.append("pre").attr("id", "rdf_config_model");
	rdfConfig.append("pre").attr("id", "rdf_config_metadata");
	rdfConfig.append("pre").attr("id", "rdf_config_sparql");
	rdfConfig.append("pre").attr("id", "rdf_config_stanza");
	rdfConfig.selectAll("pre").style("margin", "20px").style("display", "none");
	rdfConfigPrefix.style("display", "block");
	let form = rdfConfig.append("form").attr("id", "download_form").attr("action", "https://sparql-support.dbcls.jp/file/dl/download.php").attr("method", "post").style("display", "none");
	form.append("input").attr("type", "hidden").attr("name", "endpoint").attr("id", "rdf_conf_form_endpoint");
	form.append("input").attr("type", "hidden").attr("name", "prefix").attr("id", "rdf_conf_form_prefix");
	form.append("input").attr("type", "hidden").attr("name", "model").attr("id", "rdf_conf_form_model");
	form.append("input").attr("type", "hidden").attr("name", "sparql").attr("id", "rdf_conf_form_sparql");
	
	// popup input DOM
	let varNameDiv = renderDiv.append("div").attr("id", "var_name_form").style("display", "none");
	varNameDiv.append("input").attr("id", "var_name_node_id").attr("type", "hidden");
	// popup outer endpoints DOM
	let outerEpDiv = renderDiv.append("div").attr("id", "outer_endpoints").style("display", "none");
	outerEpDiv.append("input").attr("id", "outer_ep_click_uri").attr("type", "hidden");
	let outerEpSelect = outerEpDiv.append("select")
	    .attr("id", "outer_ep_select")
	    .on("change", function(d){
		let value = this.value;
		if(value.match(/^https*:\/\//)){
		    let [, ep_url, inv] = value.match(/^(.+)_([012])$/);
		    epBrowser.outerEp = ep_url;
		    renderDiv.select("#outer_ep").text(ep_url);
		    let entry = renderDiv.select("#outer_ep_click_uri").attr("value");
		    for(let i = 0; i < param.apiArg.length; i++){
			if(param.apiArg[i].match(/^entry=/)){
			    param.apiArg[i] = 'entry=' + encodeURIComponent(entry);
			}else if(param.apiArg[i].match(/^inv=/)){
			    param.apiArg.splice(i, 1)
			}else if(param.apiArg[i].match(/^endpoint=/)){
			    param.apiArg[i] = "endpoint=" + encodeURIComponent(epBrowser.outerEp);
			}
		    }
		    if(inv > 0) param.apiArg.push("inv=" + inv);
		    let url = epBrowser.api + epBrowser.getLinksApi;
		    console.log(param.apiArg.join(" "));
		    epBrowser.outerEpFlag = true;
		    epBrowser.fetchReq("post", url, renderDiv, param, epBrowser.updateGraph);
		}
		outerEpDiv.style("display", "none");
	    });
	// popup cardinality DOM
	let rdfConfCardDiv = renderDiv.append("div").attr("id", "rdf_conf_card_div").style("display", "none");
	let rdfConfCardSelect = rdfConfCardDiv.append("select").attr("id", "rdf_conf_card_select");
	
	// start svg zoom (off start)
/*	svg.call(d3.zoom().scaleExtent([0.3, 5])
                 .on("zoom", function(){
		     svg.select("#zoom_g").attr("transform", d3.event.transform);

		     epBrowser.hidePopupInputDiv(renderDiv);
		 } ))
	    .on("dblclick.zoom", null); */
	
	// start loding anime counter
	setInterval(function(){epBrowser.loading.count();}, 300);

	// get graph data from API
	let url = epBrowser.api + epBrowser.getLinksApi;
	epBrowser.fetchReq("post", url, renderDiv, param, epBrowser.initGraph);
    },
    
    initGraph: function(api_json, renderDiv, param){
	let json = api_json.data;

	// init graph and force simulation
	epBrowser.graphData = {nodes: [], edges: []};
	epBrowser.simulation = d3.forceSimulation(epBrowser.graphData.nodes);

	// make graph data
	//// add start entry
	epBrowser.selectNode = 0;
	epBrowser.selectLayer = 0;
	epBrowser.selectParent = [];
	let obj = {key: json[0].s.value,
		   type: json[0].s.type,
		   id: 0,
		   layer: 0,
		   parent: [],
		   edge_type: epBrowser.nodeColorType(json[0].s.type, 0, false),
		   endpoint: epBrowser.endpoint,
		   off_click: {},
		   off_click_inv: {},
		   rdf_conf_subject: 1
		  }
	if(api_json.inv) obj.off_click_inv[epBrowser.endpoint] = true;
	else obj.off_click[epBrowser.endpoint] = true;
	epBrowser.graphData.nodes.push(obj);
	//// params for graph data
	epBrowser.nodeKey2id = {[json[0].s.value]: 0};
	epBrowser.edgeList = {};
	epBrowser.edgeST2id = {};
	epBrowser.addPointIndex = [null, null];  // initial position of add-node in the svg
	epBrowser.endpointList = {};
	
	// prefix setting
	epBrowser.rdfType = epBrowser.prefix.rdf + "type";
	epBrowser.prefixTemp = {};
	epBrowser.usedPrefix = {};
	epBrowser.maxPrefixUrlLen = 0;
	//// user custom prefix
	epBrowser.prefixCustom = {};
	if(localStorage['epBrowser_stanza_custom_prefix']){
	    epBrowser.prefixCustom = JSON.parse(localStorage['epBrowser_stanza_custom_prefix']);
	    Object.assign(epBrowser.prefix, epBrowser.prefixCustom);
	    Object.assign(epBrowser.prefixTemp, epBrowser.prefixCustom);
	}

	// mk prefix for entry
	if(json[0].s.value.match(/^https*:\/\/.+/)) epBrowser.uriToShort(json[0].s.value, false, false, renderDiv, param);
	
	//// add data
	epBrowser.clickableFlag = true;
	epBrowser.addGraphData(api_json, renderDiv, param);
	epBrowser.forcegraph(renderDiv, param);
    },

    updateGraph: function(api_json, renderDiv, param){
//	console.log(api_json);
	epBrowser.clickableFlag = true;
	if(epBrowser.inverseFlag){
	    epBrowser.inverseFlag = false;
	    let g = renderDiv.select("#inverse_link_switch_g");
	    let cx = g.select("circle").attr("cx");
	    g.select("rect").attr("fill", "#c6c6c6").attr("stroke", "#c6c6c6");
	    g.select("circle").attr("cx", cx - 20);
	}
	renderDiv.select("#inverse_label_g").select("rect").attr("fill", "#ffffff").attr("stroke", "#c6c6c6");
	renderDiv.select("#inverse_label_g").select("text").attr("fill", "#c6c6c6");
	//epBrowser.usedPrefix = {};
	epBrowser.maxPrefixUrlLen = 0;
	epBrowser.addGraphData(api_json, renderDiv, param);
	if(api_json.inv == 2){
	    for(let i = 0; i < param.apiArg.length; i++){
		if(param.apiArg[i].match(/^inv=/)){
		    param.apiArg.splice(i, 1);
		    break;
		}
	    }param.apiArg.push("inv=1");
	    epBrowser.outerEpFlag = true;
	    let url = epBrowser.api + epBrowser.getLinksApi;
	    epBrowser.fetchReq("post", url, renderDiv, param, epBrowser.updateGraph);
	}else{
	    epBrowser.forcegraph(renderDiv, param);
	}
    },
    
    forcegraph: function(renderDiv, param) {
		console.log("force");
	let data = epBrowser.graphData;
	let simulation = epBrowser.simulation;
	let svg = renderDiv.select('svg');
	let url = epBrowser.api + epBrowser.getLinksApi;
	
	let edges_layer = svg.select(".edges_layer");
	let edges_label_layer = svg.select(".edges_label_layer");
	let nodes_layer = svg.select(".nodes_layer");
	let edge_g = edges_layer.selectAll(".edge_g");
	let edge_label_g = edges_label_layer.selectAll(".edge_label_g");
	let node_g = nodes_layer.selectAll(".node_g");

//	console.log(data);

	svg.select("#popup_mouse_event_label").attr("display", "none");
	
	// add
	edge_g = edge_g.data(data.edges, function(d) { return d.id; });
	edge_label_g = edge_label_g.data(data.edges, function(d) { return d.id; });
	node_g = node_g.data(data.nodes, function(d) { return d.id; });
	// remove
	edge_g.exit().remove();
	edge_label_g.exit().remove();
	node_g.exit().remove();
	// marge
	edge_g = edge_g
	    .enter()
	    .append("g")
	    .attr("class", function(d){
		let tmp = "edge_g";
		if(d.parent[0] != undefined) tmp += " parent_" + d.parent.join(" parent_");
		return tmp;})
	    .attr("id", function(d){ return "edge_g_id_" + d.id; })
	    .merge(edge_g);
	edge_label_g = edge_label_g
	    .enter()
	    .append("g")
	    .attr("class", function(d){
		let tmp = "edge_label_g";
		if(d.parent[0] != undefined) tmp += " parent_" + d.parent.join(" parent_");
		return tmp;})
	    .attr("id", function(d){ return "edge_label_g_id_" + d.id; })
	    .merge(edge_label_g);
	node_g = node_g
	    .enter()
	    .append("g")
	    .attr("class", function(d){
		let tmp = "node_g";
		if(d.parent[0] != undefined) tmp += " parent_" + d.parent.join(" parent_");
		return tmp;})
	    .attr("id", function(d){ return "node_g_id_" + d.id; })
	    .call(d3.drag()
		  .on("start", dragstarted)
		  .on("drag", dragged)
		  .on("end", dragended)) 
	    .merge(node_g)
	    .filter(function(d) { return d.skip != 1; });
	
	edges_layer.selectAll(".edge").remove();
	edges_label_layer.selectAll(".edge_label").remove();	
	nodes_layer.selectAll(".node_mouse_eve_g").remove();
	nodes_layer.selectAll(".sparql_node").remove();
	    
	// edge
	let edge = edge_g.append("path")
	    .attr("id", function(d){ return "edge_" + d.id; })
	    .attr("class", function(d){
		d.edge_type = epBrowser.edgeColorType(d.count);
		return "edge edge_" + d.edge_type;
	    })
	    .attr("marker-end", function(d){ return "url(#arrowhead_" + d.edge_type + ")"; })
	    .on("mouseover", function(d){
		let text = "";
		if(epBrowser.labelFlag == true) text = d.predicate_label;
		else text = "count: " + d.count;
		svg.select("#popup_label")
		    .attr("x", d3.mouse(this)[0] + 15)
		    .attr("y", d3.mouse(this)[1] - 10)
		    .text(text)
		    .style("display", "block");
		svg.select("#edge_label_" + d.id).attr("class", "edge_label edge_label_hl");
	    })
	    .on("mouseout", function(d){
		svg.select("#popup_label").style("display", "none");
		svg.select("#edge_label_" + d.id).attr("class", "edge_label");
	    });

	// edge label
	let edge_label = edge_label_g.append("text")
	    .text(function(d) { return d.predicate_label; })
	    .attr("id", function(d){ return "edge_label_" + d.id;} )
	    .attr("class", "edge_label")
	    .attr("text-anchor", function(){
		if(epBrowser.nodeGridFlag) return "end";
		else return "start";
	    })
	    .attr("display", function(){
		if(epBrowser.labelFlag == true) return "none";
		else return "block"});

	// node mouse event g
	let node_mouse_eve = node_g
//	    .filter(function(d) { return d.skip != 1; })
	    .append("g")
	    .attr("class", "node_mouse_eve_g")
	    .attr("id", function(d){ return "node_mouse_eve_g_" + d.id;} );
	
	// node
	let rect = node_mouse_eve.append("rect")
	    .attr("id", function(d) { return d.id; })
	    .attr("rx", "8px").attr("ry", "8px")   // for iOS browser
	    .attr("class", function(d){
		d.node_type = epBrowser.nodeColorType(d.type, d.predicate, d.endpoint);
		return "node node_" + d.node_type;
	    });

	// node label
	node_mouse_eve.append("text")
	    .text(function(d) {
		let text = "";
		if(d.type.match(/literal/)) text = d.key;
		else if(d.class_label) text = d.class_label;
		else if(d.predicate != epBrowser.rdfType && d.class) text = epBrowser.uriToShort(d.class, false, false, renderDiv, param);
		return truncate(text, 20);
	    })
	    .attr("class", "node_label")
	    .attr("dx", "0px")
	    .attr("dy", function(d){ if(d.type == "uri") return "-6px";
				     else return "4px"; })
	    .on("mouseover", function(d){
		svg.select("#popup_label_" + d.id)
		    .text(function(d) {
			let text = "";
			if(d.type.match(/literal/)) text = d.key;
			else if(d.class_label) text = d.class_label;
			else if(d.predicate != epBrowser.rdfType && d.class) text = epBrowser.uriToShort(d.class, false, false, renderDiv, param);
			if(text.length > 23) return text;
		    }).style("display", "block"); })
	    .on("mouseout", function(d){ svg.select("#popup_label_" + d.id).style("display", "none"); })
	node_mouse_eve.append("text")
	    .filter(function(d) { return d.type == "uri"; })
	    .text(function(d) { return truncate(epBrowser.uriToShort(d.key, false, false, renderDiv, param), 20); })
	    .attr("class", "node_label")
	    .attr("dx", "0px")
	    .attr("dy", "12px")
	    .on("mouseover", function(d){ svg.select("#popup_label_" + d.id).text(function(d) { return "<" + d.key + ">"; }).style("display", "block"); })
	    .on("mouseout", function(d){ svg.select("#popup_label_" + d.id).style("display", "none"); })
	node_mouse_eve.append("text")
	    .attr("id", function(d){ return "popup_label_" + d.id; })
	    .attr("class", "node_label")
	    .attr("dx", "0px")
	    .attr("dy", "32px")
	    .style("display", "none");
	let popup_sparql_node_g = node_g.append("g")
	    .attr("id", function(d){ return "popup_sparql_node_g_" + d.id; })
	    .attr("class", "sparql_node")
	    .style("display", "none");
	popup_sparql_node_g.append("rect")
	    .attr("class", "sparql_node_rect");
	popup_sparql_node_g.append("text")
	    .text("")
	    .attr("class", "node_label_sparql")
	    .attr("dx", "0px")
	    .attr("dy", "38px");

	// literal type
	let node_mouse_eve_literal = node_g.selectAll(".node_mouse_eve_g")
	    .filter(function(d) { return d.type == "literal" || d.type == "typed-literal"; });
	node_mouse_eve_literal.append("rect").attr("class", "literal_type_box");
	node_mouse_eve_literal.append("text").attr("class", "literal_type").attr("transform", "translate(76) rotate(-90)")
	    .text(function(d){
		let dtype = "str";
		if(d.type != "literal") {
		    if(d.datatype.match("http://www.w3.org/2001/XMLSchema")){
			dtype = d.datatype.replace("http://www.w3.org/2001/XMLSchema#", "");
			if(dtype == "string") dtype = "str";
			else if(dtype == "integer") dtype = "int";
			else if(dtype == "boolean") dtype = "bool";
			else if(dtype == "hexBinary") dtype = "hex";
			else if(dtype == "base64Binary") dtype = "base64";
		    }else{
			dtype = d.datatype.match(/.+[\/#:]([^\/#:]*)$/)[1];
		    }
		}
		return dtype;
	    });
	
	// node mouse event
	let endpoint = epBrowser.endpoint;
	if(epBrowser.outerEpFlag && epBrowser.outerEp && epBrowser.outerEp.match(/^https*:\/\//)) endpoint = epBrowser.outerEp;
	node_mouse_eve.filter(function(d) { return !d.type.match(/literal/) || epBrowser.inverseFlag; })
	    .filter(function(d) { return d.predicate != epBrowser.rdfType; })
	    .filter(function(d) { return (!epBrowser.inverseFlag && !d.off_click[endpoint]) || (epBrowser.inverseFlag && !d.off_click_inv[endpoint]); })
	    .filter(function(d) { return (!epBrowser.outerEpFlag && epBrowser.endpoint == d.endpoint)
				  || (epBrowser.outerEpFlag && d.type == "uri" && epBrowser.endpoint == d.endpoint)
				  || (epBrowser.outerEpFlag && epBrowser.outerEp == d.endpoint); })
	    .on("click", function(d){
		if(epBrowser.clickableFlag == true){
		    epBrowser.clickableFlag = false;
		    epBrowser.selectNode = d.id;
		    epBrowser.selectLayer = d.layer;
		    epBrowser.selectParent = Array.from(d.parent);
		    epBrowser.addPointIndex = [d.x, d.y];
		    let endpoint = epBrowser.endpoint;
		    for(let i = 0; i < param.apiArg.length; i++){
			if(param.apiArg[i].match(/^entry=/)){
			    param.apiArg[i] = 'entry=' + encodeURIComponent(d.key);
			    if(d.type == "bnode"){
				let [subject, link] = epBrowser.getBlankNodeLink(d.id, []);
				param.apiArg[i] = 'entry=' + encodeURIComponent(subject);
				param.apiArg[i] += "&bnode=1&b_p=" + encodeURIComponent(JSON.stringify(link));
				if(d.class) param.apiArg[i] += "&b_t=" + encodeURIComponent(d.class);
			    }
			}else if(param.apiArg[i].match(/^inv=/)){
			    param.apiArg.splice(i, 1)
			}else if(param.apiArg[i].match(/^endpoint=/)){
			    if(epBrowser.outerEpFlag){
				if(epBrowser.outerEp && epBrowser.outerEp.match(/^https*:\/\//)){
				    param.apiArg[i] = 'endpoint=' + encodeURIComponent(epBrowser.outerEp);
				    endpoint = epBrowser.outerEp;
				}else{
				    endpoint = false;
				}
			    }else{
				param.apiArg[i] = 'endpoint=' + encodeURIComponent(epBrowser.endpoint);
			    }
			}
		    }
		    if(endpoint){
			if(epBrowser.inverseFlag){
			    param.apiArg.push("inv=1");
			    d.off_click_inv[endpoint] = true;
			}
			else d.off_click[endpoint] = true;
			d3.select(this).on("click", null)
			    .on("mouseover", null)
			    .on("mouseout", null);
			epBrowser.fetchReq("post", url, renderDiv, param, epBrowser.updateGraph);
		    }
		}
	    })
	    .on("mouseover", function(d){
		if(epBrowser.clickableFlag){
		    d3.select(this).select("rect")
                        .attr("class", function(d){
			//    epBrowser.stopSimulation();
			    let mouse_eve_label = svg.select("#popup_mouse_event_label").text("expand").attr("display", "inline")
				.attr("x", d.x).attr("y", d.y - 26);
                            if(epBrowser.inverseFlag){
				mouse_eve_label.text("inverse expand").attr("class", "eve_hover_inverse");
				return "node node_" + d.node_type + " hover_inverse";
                            }else{
				mouse_eve_label.text("expand").attr("class", "eve_hover");
				return "node node_" + d.node_type + " hover";
			    }
			})
		} })
	    .on("mouseout", function(){
	//	epBrowser.startSimulation(edge, edge_label, node_g);
		svg.select("#popup_mouse_event_label").attr("display", "none");
		d3.select(this).select("rect").attr("class", function(d){ return "node node_" + d.node_type; });
	    })
	    .style("cursor", "pointer");

	// identifiers.org && http://purl.
	if(epBrowser.outerEpFlag && epBrowser.outerEp === undefined){
	    let federated_g = node_g.filter(function(d){
		return d.predicate != epBrowser.rdfType && (d.key.match(/http:\/\/identifiers\.org\//) || d.key.match(/http:\/\/purl\./));
	    })
		.append("g")
		.attr("class", "select_outer_endpoint")
		.style("cursor", "pointer")
		.on("click", function(d){
		    let element = this;
		    epBrowser.selectNode = d.id;
		    epBrowser.selectLayer = d.layer;
		    renderDiv.select("#outer_ep_click_uri").attr("value", d.key);
		    let outerSel = renderDiv.select("#outer_ep_select");
		    outerSel.selectAll(".outer_ep_opt").remove();
		    outerSel.selectAll(".outer_ep_opt")
			.data(epBrowser.endpointList[d.key])
			.enter()
			.append("option")
			.attr("class", "outer_ep_opt")
			.attr("value", function(d){ if(d.sparqlEndpoint) return d.sparqlEndpoint[0] + "_" + d.direction;
						    else return false; })
			.text(function(d){ return d.id;});
		    let popupEndpoint = renderDiv.select("#outer_endpoints").style("display", "block");
		    epBrowser.setPopupPosition(renderDiv, popupEndpoint, element, {y: 12});
		});
	    federated_g.append("rect")
		.attr("stroke", "#444444")
		.attr("stroke-width", "3px")
		.attr("fill", "#ffffff")
		.attr("x", 75).attr("y", -10).attr("width", 20).attr("height", 20).attr("rx", 5).attr("ry", 5);
	    federated_g.append("rect")
		.attr("x", 85).attr("y", -11.6).attr("width", 11.6).attr("height", 11.6)
		.attr("fill", "#ffffff")
		.attr("stroke", "none");
	    federated_g.append("polygon")
		.attr("points", "98,-13 85,-13 89.875,-8.125 81.75,0 85,3.25 93.125,-4.875 98,0")
		.attr("stroke", "none")
		.attr("fill", "#444444");
	}else{
	    node_g.selectAll(".select_outer_endpoint").remove();
	}
	
	svg.selectAll("text").style("user-select", "none");

	// rdf config
	epBrowser.makeRdfConfig(renderDiv, param, data);
	
	// simulation
	epBrowser.startSimulation(edge, edge_label, node_g);
	
	// node drag
	function dragstarted(d) {
	    if(!d3.event.active) simulation.alphaTarget(0.3).restart();
	    if(!epBrowser.nodeGridFlag) d.fx = d.x;
	    d.fy = d.y;
	}
	
	function dragged(d) {
	    if(!epBrowser.nodeGridFlag) d.fx = d3.event.x;
	    d.fy = d3.event.y;
	}
	
	function dragended(d) {
	    if (!d3.event.active) simulation.alphaTarget(0);
	    if(!epBrowser.nodeGridFlag) d.fx = null;
	    d.fy = null;
	}

	function truncate(str, len){
	    return str.length <= len + 3 ? str: (str.substr(0, len) + "...");
	}
    },

    // rdf config
    makeRdfConfig: function(renderDiv, param, data){
	//console.log(data.nodes);

	let rdfConfIndex = 0;
	
	//// rdf config prefix
	let rdfConfPrefix =[];
	let keys = Object.keys(epBrowser.usedPrefix);
	keys = keys.sort(function(a,b){
	    if(epBrowser.usedPrefix[a] < epBrowser.usedPrefix[b]) return -1;
	    if(epBrowser.usedPrefix[a] > epBrowser.usedPrefix[b]) return 1;
	    return 0;
	});
	for(let i = 0; i < keys.length; i++){ // custom prefix
	    if(epBrowser.prefixTemp[keys[i]]){
		rdfConfPrefix.push(epBrowser.uriToShort(epBrowser.prefixTemp[keys[i]], false, 1, renderDiv, param) + " &lt;" + epBrowser.prefixTemp[keys[i]] + "&gt;");
	    }
	}
	for(let i = 0; i < keys.length; i++){ // fixed prefix
	    if(!epBrowser.prefixTemp[keys[i]] && epBrowser.prefix[keys[i]] && keys[i] != ":"){
		rdfConfPrefix.push(keys[i] + ": &lt;" + epBrowser.prefix[keys[i]] + "&gt;");
	    }
	}
	// rdfConfPrefix.push(": &lt;" + epBrowser.usedPrefix[":"] + "&gt;"); // RDF-config not allow the prefix ':'
	renderDiv.select("#rdf_config_prefix").node().innerHTML = rdfConfPrefix.join("\n");
	renderDiv.select("#rdf_config_prefix").selectAll("span")
	    .filter(function(){ if(!this.classList.contains("rdf_conf_comment")) this.id = "rdf_conf_index_" + rdfConfIndex++; });
	    
	//// rdf config model
	let getRdfConfVarName = function(node, pre_object_name, subject){
	    if(node.pref_id){
		for(let i in data.nodes){
		    if(data.nodes[i].id == node.pref_id){
			node = data.nodes[i];
			break;
		    }
		}
	    }
	    let var_name = "node_" + node.id;
	    if(node.class_label && node.class != "http://www.w3.org/2002/07/owl#Class") var_name = node.class_label.toLowerCase().replace(/ /g, "_");
	    if(var_name.match(/^node_/) && node.key.match(/identifiers.org/)) var_name = node.key.match(/identifiers.org\/([^\/]+)/)[1];
	    if(node.sparql_var_name) var_name = node.sparql_var_name.replace(/^\?/, "");
	    if(subject && node.predicate == "http://www.w3.org/2000/01/rdf-schema#label") var_name = subject.toLowerCase() + "_label";
	    if(subject && node.predicate == "http://purl.org/dc/terms/identifier") var_name = subject.toLowerCase() + "_id";
	//    if(node.type == "uri" && node.class && node.predicate != "http://www.w3.org/2000/01/rdf-schema#seeAlso") var_name = var_name.charAt(0).toUpperCase() + var_name.slice(1);
	    if(!var_name.match(/^[Nn]ode_\d+$/)) epBrowser.sparqlVars[var_name] = 1;
	    if(var_name.match(/^[Nn]ode_\d+$/) && pre_object_name) var_name = pre_object_name;
	    if(var_name.match(/^[Nn]ode_\d+$/)) var_name = "<span class='rdf_conf_node_name' alt='" + node.id + "'>" + var_name + "</span>";
	    else var_name = "<span class='rdf_conf_node_name rdf_conf_custom_node_name' alt='" + node.id + "'>" + var_name + "</span>";
	    return var_name;
	}

	let snakeToCamel = function(snake){
	    let words = snake.split(/_/);
	    let camel = "";
	    for(let word of words){
		camel += word.charAt(0).toUpperCase() + word.slice(1);
	    }
	    return camel;
	}

	let getRdfConfClass = function(node, indent){
	    let config = "";
	    if(node.classes && node.classes.length > 1){
		config += indent + "  - a:\n";
		for(let j in node.classes){
		    let type = epBrowser.uriToShort(node.classes[j], false, 1, renderDiv, param);
		    let type_label = "";
		    if(type.match(/[:_]\d{2,}$/) && node.class_labels[j])  type_label = " <span class='rdf_conf_comment'># " + node.class_labels[j] + "</span>";
		    config += indent + "    - " + type + type_label + "\n";
		}
	    }else{
		let type = "<span class='rdf_conf_undef'>{{undefined}}</span>";
		let type_label = "";
		if(node.class){
		    type = epBrowser.uriToShort(node.class, false, 1, renderDiv, param);
		    if(type.match(/[:_]\d{2,}$/) && node.class_label) type_label = " <span class='rdf_conf_comment'># " + node.class_label + "</span>";
		}
		config += indent + "  - a: " + type + type_label + "\n";
	    }
	    return config;
	}
	
	let getRdfConfLeafObject = function(id, nest, pre_object_name, subject){
	    let indent = "  ";
	    for(let i = 0; i < nest; i++){
		indent += "    ";
	    }
	    let config = "";
	    let predicate_frag = 0;
	    for(let i = 0; i < data.nodes.length; i++){
		let node = data.nodes[i];
		if(node.subject_id == id){
		    if(node.predicate == epBrowser.rdfType) continue;
		    let object = getRdfConfVarName(node, pre_object_name, subject);
		    let cardinality = "";
		    let cardinality_f = 0;
		    for(let j in data.edges){
			if(data.edges[j].id == node.predicate_id){
			    if(data.edges[j].count > 1){
				cardinality = "+";
				cardinality_f = 1;
			    }
			    break;
			}
		    }
		    if(data.nodes[i+1]  && node.subject_id == data.nodes[i+1].subject_id && node.predicate == data.nodes[i+1].predicate){
			cardinality = "+";
			cardinality_f = 1;
		    }
		    if(node.cardinality != undefined) cardinality = node.cardinality;
		    let predicate = epBrowser.uriToShort(node.predicate, false, 1, renderDiv, param);
		    let predicate_label = "";
		    if(predicate.match(/[:_]\d{2,}$/) && node.predicate_label) predicate_label = " <span class='rdf_conf_comment'># " + node.predicate_label + "</span>";
		    if(!data.nodes[i-1] || node.subject_id != data.nodes[i-1].subject_id || node.predicate != data.nodes[i-1].predicate){
		//	config += indent + "- " + predicate + cardinality + ":" + predicate_label;
		//	config += " <span class='rdf_conf_cardinality' alt='" + node.id + "_" + cardinality_f + "'> cardinality </span>\n";
			let tmp = predicate.match(/(.+):([^\<\>]+)/);
			config += indent + "- " + tmp[1] + ":<span class='rdf_conf_cardinality' alt='" + node.id + "_" + cardinality_f + "'>" + tmp[2] + "</span>" + cardinality + ":" + predicate_label + "\n";
		    }
		    if(node.type == "uri"){
			config += indent + "  - " + object + ": ";
			let short_object_uri = epBrowser.uriToShort(node.key, false, 1, renderDiv, param);
			let object_label = "";
			if((short_object_uri.match(/[:_]\d{2,}$/) || node.key.match(/[\/_#/][A-Z]*\d{2,}$/)) && node.label) object_label = " <span class='rdf_conf_comment'># " + node.label + "</span>";
			//if(short_object_uri.match(/^:/)) config += "&lt;" + node.key + "&gt;" + object_label + "\n";
			//else config += short_object_uri + object_label + "\n";
			if(node.rdf_conf_subject == undefined){
			    let tmp = short_object_uri.match(/^(.*):([^:]+)$/);
			    short_object_uri = tmp[1] + ":<span class='rdf_conf_new_subject' alt='" + node.id + "'>" + tmp[2] + "</span>";
			}else if(node.rdf_conf_subject == 1){
			    let tmp = object.match(/^(<span.+>)(.+)(<\/span>)$/);
			  //  short_object_uri = tmp[1] + snakeToCamel(tmp[2]) + tmp[3];  // clickable
			    short_object_uri = snakeToCamel(tmp[2]);  // not clickable
			}
			config += short_object_uri + object_label + "\n";
		    }else if(node.type.match("literal")){
			let literal = node.key;
			if(node.type == "literal" || node.datatype.match(/#string$/)) literal = '"' + literal + '"';
			config += indent + "  - " + object + ": " + literal + "\n";
		    }else if(node.type == "bnode"){
			config += indent + "  - []:\n";
			config += getRdfConfClass(node, indent + "  ");
			let object_name = object.replace(/\<\/*span *[^\>]*\>/g, "").toLowerCase();
			if(object_name.match(/^node_\d+$/) || object_name == pre_object_name) object_name = undefined;
			let tmp = getRdfConfLeafObject(node.id, nest + 1, object_name, false);
			if(tmp) config += tmp;
			else config += indent + "    - " + object + ": <span class='rdf_conf_clickable' alt='" + node.id + "_" + i + "'>{{expand blank node}}</span>\n";
		    }
		}
	    }
	    return config;
	}

	let sparql_subject = [];
	epBrowser.sparqlVars = {};
	let rdfConf = {};
	let ids = [];
	for(let i in data.nodes){
	    let node = data.nodes[i];
	    if(node.skip == 1) continue;
	    if(node.type == "uri" && node.rdf_conf_subject == 1){
		let id = node.id;
		let subject = getRdfConfVarName(node);
		let tmp = subject.match(/^(<span.+>)(.+)(<\/span>)$/);
		sparql_subject.push(tmp[2]);
		let snake_subject = tmp[2];
		subject = tmp[1] + snakeToCamel(tmp[2]) + tmp[3];
		if(node.class || id == 0){
		    ids.push(id);
		    rdfConf[id] = "- " + subject;
		    if(node.off_click[epBrowser.endpoint]) rdfConf[id] += " " + epBrowser.uriToShort(node.key, false, 1, renderDiv, param) + ":\n";
		    else rdfConf[id] += " " + epBrowser.uriToShort(node.key, false, 1, renderDiv, param) + ": <span class='rdf_conf_clickable' alt='" + node.id + "_" + i + "'>{{expand subject}}</span>\n";
		    rdfConf[id] += getRdfConfClass(node, "");
		}
		let leaf = getRdfConfLeafObject(id, 0, false, snake_subject);
		if(leaf) rdfConf[id] += leaf;
	    }
	}

	let config = "";
	for(let i in ids){
	    config += rdfConf[ids[i]] + "\n";
	}
	renderDiv.select("#rdf_config_model").node().innerHTML = config;
	renderDiv.select("#rdf_config_model").selectAll("span")
	    .filter(function(){ if(!this.classList.contains("rdf_conf_comment")) this.id = "rdf_conf_index_" + rdfConfIndex++; });

	//// rdf config sparql
	renderDiv.select("#rdf_config_sparql").html("sparql:\n  description: SPARQL description.\n  variables: [" + sparql_subject.join(", ") + "]");
	
	//// on click
	renderDiv.selectAll(".rdf_conf_undef").style("color", "red");
	renderDiv.selectAll(".rdf_conf_comment").style("color", "darkgoldenrod");
	////// expand rdf
	let expandRdf = (element) => {
	    let tmp = d3.select(element).attr("alt").split("_");
	    let element_id = element.id;
	    epBrowser.rdfConfRenderFlag = false;
	    renderDiv.select("#epBrowser_svg").select("#node_mouse_eve_g_" + tmp[0]).on("click")(data.nodes[tmp[1]]);
	    let renderTimer;
	    let focusElement = () => {
		if(epBrowser.rdfConfRenderFlag){
		    clearInterval(renderTimer);
		    renderDiv.select("#" + element_id).node().focus();
		}
	    };
	    renderTimer = setInterval(focusElement, 100);
	}
	renderDiv.selectAll(".rdf_conf_clickable").attr("tabindex", "0")
	    .style("color", "darkorchid").style("font-weight", "bold").style("cursor", "pointer")
	    .on("click", function(){
		expandRdf(this);
	    }).on("keydown", function(){
		if(d3.event.key === 'Enter') expandRdf(this);
	    });
	////// edit prefix
	let editPrefix = (element) => {
	    let prefix_tmp = d3.select(element).text();
	    let varNameDiv = renderDiv.select("#var_name_form");
	    if(varNameDiv.style("display") == "block"){
		varNameDiv.style("display", "none");
		return 0;
	    }
	    epBrowser.hidePopupInputDiv(renderDiv);
	    varNameDiv.style("display", "block");
	    epBrowser.setPopupPosition(renderDiv, varNameDiv, element);
	    let input = varNameDiv.append("input").attr("id", "var_name").attr("type", "text")
		.attr("size", "20").style("border", "solid 3px #888888")
		.on("keydown", function(){
		    let prefix_new = this.value.replace(/[^\w]/g, "");
		    if(d3.event.key === 'Enter' && prefix_new && prefix_new.match(/\w+/)){
			prefix_new = prefix_new.match(/(\w+)/)[1];
			prefix_new = prefix_new.toLowerCase();
			let element_id = element.id;
			epBrowser.setCustomPrefix(renderDiv, param, prefix_tmp, prefix_new);
			renderDiv.select("#" + element_id).node().focus();
		    }else if(d3.event.key === 'Escape'){
			epBrowser.hidePopupInputDiv(renderDiv, param);
			element.focus();
		    }
		});
	    input.node().focus();      // focus -> value (move coursor to end of value)
	    input.attr("value", prefix_tmp);
	    input.node().select();
	};
	renderDiv.selectAll(".rdf_conf_prefix").attr("tabindex", "0")
	    .style("color", "darkorange").style("font-weight", "bold").style("cursor", "pointer")
	    .on("click", function(){
		editPrefix(this);
	    }).on("keydown", function(){
		if(d3.event.key === 'Enter') editPrefix(this);
	    });
	////// edit var name
	let editVarName = (element) => {
	    let node_name_tmp = d3.select(element).text();
	    let id = d3.select(element).attr("alt");
	    let varNameDiv = renderDiv.select("#var_name_form");
	    if(varNameDiv.style("display") == "block"){
		varNameDiv.style("display", "none");
		return 0;
	    }
	    epBrowser.hidePopupInputDiv(renderDiv);
	    varNameDiv.style("display", "block");
	    epBrowser.setPopupPosition(renderDiv, varNameDiv, element);
	    let input = varNameDiv.append("input").attr("id", "var_name").attr("type", "text")
		.attr("size", "20").style("border", "solid 3px #888888")
		.on("keydown", function(){
		    let var_name = this.value.replace(/[_\s]+/g, "_");
		    if(d3.event.key === 'Enter' && var_name && var_name.match(/\w+/)){
			var_name = var_name.toLowerCase();
			if(!var_name.match(/^\?/)) var_name = "?" + var_name;
			let element_id = element.id;
			epBrowser.setNodeVarName(renderDiv, param, id, var_name);
			epBrowser.forcegraph(renderDiv, param);
			renderDiv.select("#" + element_id).node().focus();
		    }else if(d3.event.key === 'Escape') {
			epBrowser.hidePopupInputDiv(renderDiv, param);
			element.focus();
		    }
		});
	    input.node().focus();      // focus -> value (move coursor to end of value)
	    input.attr("value", node_name_tmp);
	    input.node().select(); 
	    varNameDiv.select("#var_name_node_id").attr("value", id);
	};
	renderDiv.selectAll(".rdf_conf_node_name").attr("tabindex", "0")
	    .style("color", "darkorange").style("font-weight", "bold").style("cursor", "pointer")
	    .on("click", function(){
		editVarName(this);
	    }).on("keydown", function(){
		if(d3.event.key === 'Enter') editVarName(this);
	    });
	////// edit cardinality
	let editCardinality = (element) => {
	    let tmp = d3.select(element).attr("alt").split("_");
	    let predicate = d3.select(element).text();
	    let id = tmp[0];
	    let flag = tmp[1];
	    let cardDiv = renderDiv.select("#rdf_conf_card_div");
	    if(cardDiv.style("display") == "block"){
		cardDiv.style("display", "none");
		return 0;
	    }
	    epBrowser.hidePopupInputDiv(renderDiv);
	    cardDiv.style("display", "block");
	    epBrowser.setPopupPosition(renderDiv, cardDiv, element);
	    cardDiv.selectAll(".rdf_conf_card_opt").remove();
	    let select = cardDiv.select("#rdf_conf_card_select");
	    select.append("option").attr("class", "rdf_conf_card_opt").text("select");
	    if(flag == 0) select.append("option").attr("class", "rdf_conf_card_opt").attr("value", "").text(predicate);
	    select.append("option").attr("class", "rdf_conf_card_opt").attr("value", "+").text(predicate + " +");
	    if(flag == 0) select.append("option").attr("class", "rdf_conf_card_opt").attr("value", "?").text(predicate + " ?");
	    select.append("option").attr("class", "rdf_conf_card_opt").attr("value", "*").text(predicate + " *");
	    select.on("change", function(d){
		let value = this.value;
		for(let i in data.nodes){
		    if(data.nodes[i].id == id){
			data.nodes[i].cardinality = value;
			break;
		    }
		}
		cardDiv.style("display", "none");
		let element_id = element.id;
		epBrowser.forcegraph(renderDiv, param);
		renderDiv.select("#" + element_id).node().focus();
	    }).on("keydown", function(){
		if(d3.event.key === 'Escape' || d3.event.key === 'Enter'){
		    epBrowser.hidePopupInputDiv(renderDiv, param);
		    element.focus();
		}
	    });
	    select.node().focus();
	};
	renderDiv.selectAll(".rdf_conf_cardinality").attr("tabindex", "0")
	    .style("color", "saddlebrown").style("font-weight", "bold").style("cursor", "pointer")
	    .on("click", function(){
		editCardinality(this);
	    }).on("keydown", function(){
		if(d3.event.key === 'Enter') editCardinality(this);
	    });
	////// set new subject
	let setNewSubject = (element) => {
	    let id = d3.select(element).attr("alt");
	    let cardDiv = renderDiv.select("#rdf_conf_card_div");
	    if(cardDiv.style("display") == "block"){
		cardDiv.style("display", "none");
		return 0;
	    }
	    epBrowser.hidePopupInputDiv(renderDiv);
	    cardDiv.style("display", "block");
	    epBrowser.setPopupPosition(renderDiv, cardDiv, element);
	    cardDiv.selectAll(".rdf_conf_card_opt").remove();
	    let select = cardDiv.select("#rdf_conf_card_select");
	    select.append("option").attr("class", "rdf_conf_card_opt").text("select");
	    select.append("option").attr("class", "rdf_conf_card_opt").attr("value", "1").text("new subject");
	    select.append("option").attr("class", "rdf_conf_card_opt").attr("value", "0").text("object");
	    select.on("change", function(d){
		let value = this.value;
		if(value == 1){
		    for(let i in data.nodes){
			if(data.nodes[i].id == id){
			    data.nodes[i].rdf_conf_subject = value;
			    break;
			}
		    }
		}
		cardDiv.style("display", "none");
		let element_id = element.id;
		epBrowser.forcegraph(renderDiv, param);
		renderDiv.select("#" + element_id).node().focus();
	    }).on("keydown", function(){
		if(d3.event.key === 'Escape' || d3.event.key === 'Enter'){
		    epBrowser.hidePopupInputDiv(renderDiv, param);
		    element.focus();
		}
	    });
	    select.node().focus();
	}
	renderDiv.selectAll(".rdf_conf_new_subject").attr("tabindex", "0")
	    .style("color", "olivedrab").style("font-weight", "bold").style("cursor", "pointer")
	    .on("click", function(){
		setNewSubject(this);
	    }).on("keydown", function(){
		if(d3.event.key === 'Enter') setNewSubject(this);
	    });
	renderDiv.selectAll(".rdf_conf_custom_prefix").style("color", "#1680c4");
	renderDiv.selectAll(".rdf_conf_custom_node_name").style("color", "#1680c4");
	epBrowser.rdfConfRenderFlag = true;
    },

    setPopupPosition: function(renderDiv, popup, element, pos){
	let x = 0;
	let y = 14;
	if(pos){
	    if(pos.y) y += pos.y;
	    if(pos.x) x += pos.x;
	}
	popup.style("position", "absolute")
	    .style("top", (element.getBoundingClientRect().top + pageYOffset - renderDiv.node().offsetTop + y) + "px")
	    .style("left", (element.getBoundingClientRect().left + pageXOffset - renderDiv.node().offsetLeft + x) + "px");
    },
    
    startSimulation: function(edge, edge_label, node_g){
	let simulation = epBrowser.simulation;
	let data = epBrowser.graphData;
	
	if(epBrowser.nodeGridFlag){
	    simulation.nodes(data.nodes)
		.force("link", d3.forceLink(data.edges).id(d => d.id).distance(5000).strength(0).iterations(7))
		.force("collision", d3.forceCollide(25).strength(1.5))
	    	.force("charge", d3.forceManyBody().strength(0))
	    	.force("x", d3.forceX().strength(1))
	    	.force("y", d3.forceY().strength(0));
	}else{
	    simulation.nodes(data.nodes)
		.force("link", d3.forceLink(data.edges).id(d => d.id).distance(function(d){
		    let length = 200;
		    if(d.target.child_count == 0) length = Math.pow(d.source.child_count, 0.5) * 60 * epBrowser.edgeZoomRate;
		    else length = Math.pow(d.source.child_count * d.target.child_count, 0.39) * 60 * epBrowser.edgeZoomRate;
		    if(length < 200) length = 200;
		    return length;
		}).strength(2).iterations(3))
		.force("charge", d3.forceManyBody().strength(-1000))
		.force("x", d3.forceX().strength(0))
		.force("y", d3.forceY().strength(.2));
	}
	
//	simulation.force("link")
//	    .links(data.edges);
	simulation.on("tick", ticked);
	if(simulation.alpha() < 0.001) simulation.alpha(0.005)
	simulation.restart();
	
	// element position
	function ticked() {
	    // edge
	    edge.attr("d", function(d){
		if(epBrowser.nodeGridFlag){
		    d.source.x = d.source.layer * 360 + epBrowser.entryNodeIndex.x;
		    d.target.x = d.target.layer * 360 + epBrowser.entryNodeIndex.x;
		}
		return epBrowser.calcPath(d.source.x, d.source.y, d.target.x, d.target.y, d.has_reverse);
	    });
	    // edge label
	    edge_label.attr("dx", function(d) { return epBrowser.calcEdgeLabelPos(d.source.x, d.source.y, d.target.x, d.target.y, "x", d.has_reverse); })
		.attr("dy", function(d) { return epBrowser.calcEdgeLabelPos(d.source.x, d.source.y, d.target.x, d.target.y, "y", d.has_reverse); });
	    // node
	    node_g.attr("transform", function(d) {
		if(epBrowser.nodeGridFlag) d.x = d.layer * 360 + epBrowser.entryNodeIndex.x;
		return "translate(" + d.x + "," + d.y + ")";
	    });
	}

	if(!epBrowser.forceFlag){
	    let time = 500;
	    if(epBrowser.nodeGridFlag) time = 200;
	    setTimeout(epBrowser.stopSimulation, time);
	}
    },

    stopSimulation: function(){ // apparent stop
	epBrowser.simulation.force("link", d3.forceLink().id(d => d.id).strength(0))
	    .force("charge", d3.forceManyBody().strength(0))
	    .force("x", d3.forceX().strength(0))
	    .force("y", d3.forceY().strength(0))
	    .force("collision", d3.forceCollide(25).strength(1));
    },
    
    getBlankNodeLink: function(id, link){
	let nodes = epBrowser.graphData.nodes;
	for(let i = 0; i < nodes.length; i++){
	    if(nodes[i].id == id){
		let subject = nodes[i].subject;
		link.unshift(nodes[i].predicate);
		if(nodes[i].subject_type != "bnode") return [subject, link];
		else return epBrowser.getBlankNodeLink(nodes[i].subject_id, link);
		break;
	    }
	}
    },

    selectSubGraphMode: function(renderDiv, param){
	epBrowser.stopSimulation(); 
	renderDiv.select("#sparql_run_div").style("display", "block");
	
	let svg = renderDiv.select("svg");
	svg.selectAll(".node_mouse_eve_g")
	    .attr("class", function(d){
		let rect = d3.select(this).select("rect");
		let value = "off";
		if(d.sparql_label) value = d.sparql_label;
		changeNodeMode(renderDiv, param, d, rect, value);
		return "node_mouse_eve_g";
	    }) 
	    .on("click", function(d){
		let click_rect = d3.select(this).select("rect");
		if(d.sparql_label == undefined){
		    let next = "var";
		    if(d.predicate == epBrowser.rdfType) next = "const";
		    changeNodeMode(renderDiv, param, d, click_rect, next);
		}else if(d.sparql_label == "var"){
		    let next = "const";
		    if(d.type == "bnode") next = "path";
		    changeNodeMode(renderDiv, param, d, click_rect, next);
		}else if(d.sparql_label == "const"){
		    let next = "path";
		    if(d.predicate == epBrowser.rdfType || d.type.match(/literal/) || d.id == 0) next = "off";
		    changeNodeMode(renderDiv, param, d, click_rect, next);
		}else if(d.sparql_label == "path" || d.sparql_label == "blank"){
		    changeNodeMode(renderDiv, param, d, click_rect, "off");
		}
	    })
	    .on("mouseover", function(d){
		let rect = d3.select(this).select("rect");
		if(d.sparql_label == undefined) rect.attr("class", "node node_" + d.node_type + " hover_sparql");
	    })
	    .on("mouseout", function(d){
		let rect = d3.select(this).select("rect");
		if(d.sparql_label == undefined) rect.attr("class", "node node_" + d.node_type);
	    });

	
	function changeNodeMode(renderDiv, param, d, click_rect, value){
	    epBrowser.hidePopupInputDiv(renderDiv);
	    // reset blank (-> path)
	    for(elm of epBrowser.graphData.nodes){
		if(elm.sparql_label == "blank"){
		    elm.sparql_label = "path";
		    renderDiv.select("#popup_sparql_node_g_" + elm.id).select("text").text("/");
		}
	    }
	    
	    let sparql_node_g = renderDiv.select("#popup_sparql_node_g_" + d.id);
	    if(value == "off"){
		d.sparql_select = 0;
		d.sparql_label = undefined;
		click_rect.attr("class", "node node_" + d.node_type);
		sparql_node_g.style("display", "none");
	    }else{
		d.sparql_select = 1;
		d.sparql_label = value;
		click_rect.attr("stroke-width", "3px");
		let color = "";
		let text = "";
		let literal_flag = "";
		if(value == "var"){
		    text = "?n" + d.id;
		    if(d.sparql_var_name) text = d.sparql_var_name;
		}else if(value == "const"){
		    if(d.type.match(/literal/)){
			text = '"' + d.key + '"';
			literal_flag = "_literal";
		    }else text = "<URI> const.";
		}else if(value == "path"){
		    text = "/";
		}else if(value == "blank"){
		    text = "[ ]";
		}

		let id = d.id;
		click_rect.attr("class", "node node_" + d.node_type + " sparql_" + d.sparql_label + literal_flag);
		sparql_node_g.style("display", "block");
		sparql_node_g.select("rect").attr("class", "sparql_node_rect sparql_" + d.sparql_label + literal_flag);
		sparql_node_g.select("text").attr("class", "node_label_sparql sparql_" + d.sparql_label + literal_flag).text(text);
		sparql_node_g.select("rect").on("click", function(){
		    let element = this;
		    if(d.sparql_label == "var"){
			epBrowser.hidePopupInputDiv(renderDiv);
			let varNameDiv = renderDiv.select("#var_name_form").style("display", "block");
			epBrowser.setPopupPosition(renderDiv, varNameDiv, element, {y: 10});
			let input = varNameDiv.append("input").attr("id", "var_name").attr("type", "text")
			    .attr("size", "20").style("border", "solid 3px #888888")
			    .on("keypress", function(){
				let var_name = this.value.replace(/[_\s]+/g, "_");
				if(d3.event.key === 'Enter' && var_name && !var_name.match(/^\?$/)){
				    var_name = var_name.toLowerCase();
				    if(!var_name.match(/^\?/)) var_name = "?" + var_name;
				    let id = varNameDiv.select("#var_name_node_id").attr("value");
				   // console.log(id + " " + var_name);
				    epBrowser.setNodeVarName(renderDiv, param, id, var_name);
				}
			    }).on("keydown", function(){
				if(d3.event.key === 'Escape') epBrowser.hidePopupInputDiv(renderDiv, param);
			    });
			input.node().focus();      // focus -> value (move coursor to end of value)  
			input.attr("value", "?n" + id);
			input.node().select();

			varNameDiv.select("#var_name_node_id").attr("value", id);
		    }else return null;
		});
	    }
	    
	    epBrowser.traceGraph(renderDiv, param);
	}
    },

    // selected subgraph to SPARQL query
    traceGraph: function(renderDiv, param){
		console.log("trace");
	let data = epBrowser.graphData;
	epBrowser.queryPrefix = {};

	let triples = [];
	let blanks = {};
	let service = {};
	let p_ids = {};
	let vars = {};
	let paths = {};
	// make triples
	for(let i = data.nodes.length - 1; i >= 0; i--){
	    if(data.nodes[i].sparql_select == 1 && data.nodes[i].sparql_label != "path"){
		let triple = {};
		let predicates = [];
		let predicates_html = [];
		let nodes = searchNext(renderDiv, data.nodes[i].subject_id);
		if(nodes === false){
		    epBrowser.traceGraph(renderDiv, param);  // re-trace (hit 'path -> blank' node)
		    return 0;
		}
		if(nodes === undefined || !nodes[0]) continue;

		//// subject
		if(nodes[0].sparql_label == "var" || nodes[0].sparql_label == "blank"){
		    let variant = "?n" + nodes[0].id;
		    if(nodes[0].sparql_var_name && nodes[0].sparql_label == "var") variant = nodes[0].sparql_var_name;
		    triple.subject = variant;
		    if(nodes[0].sparql_label == "var") vars[variant] = 1;
		}else{
		    triple.subject = epBrowser.uriToShort(nodes[0].key, 1, false, renderDiv, param);
		}
		triple.subjectType = nodes[0].sparql_label;
		//// property path
		for(let j = 1; j < nodes.length; j++){
		    let p = nodes[j].predicate;
		    let hat = "";
		    if(p.match(/^inv-/)){
			p = p.replace(/^inv-/, "");
			hat = "^";
		    }
		    predicates.push(hat + epBrowser.uriToShort(p, 1, false, renderDiv, param));
		    predicates_html.push(hat + "<span style='color:#db7d25'>" + epBrowser.uriToShort(p, 1, false, renderDiv, param) + "</span>");
		    p_ids[nodes[j].predicate_id] = 1;
		}
		if(data.nodes[i].predicate){
		    let p = data.nodes[i].predicate;
		    let hat = "";
		    if(p.match(/^inv-/)){
			p = p.replace(/^inv-/, "");
			hat = "^";
		    }
		    predicates.push(hat + epBrowser.uriToShort(p, 1, false, renderDiv, param));
		    predicates_html.push(hat + "<span style='color:#db7d25'>" + epBrowser.uriToShort(p, 1, false, renderDiv, param) + "</span>");
		}
		if(data.nodes[i].predicate_id) p_ids[data.nodes[i].predicate_id] = 1;
		triple.predicates = predicates;
		//// object
		if(data.nodes[i].sparql_label == "var" || data.nodes[i].sparql_label == "blank"){
		    let variant = "?n" + data.nodes[i].id;
		    if(data.nodes[i].sparql_var_name && data.nodes[i].sparql_label == "var") variant = data.nodes[i].sparql_var_name;
		    triple.object = variant;
		    if(data.nodes[i].sparql_label == "var") vars[variant] = 1;
		}else if(data.nodes[i].type.match(/literal/)){
		    let lang = "";
		    if(data.nodes[i].lang){ lang = "@" + data.nodes[i].lang; triple.objectLang = data.nodes[i].lang; }
		    triple.object = data.nodes[i].key;
		}else{
		    triple.object = epBrowser.uriToShort(data.nodes[i].key, 1, false, renderDiv, param)
		}
		triple.objectType = data.nodes[i].sparql_label;
		triple.objectDataType = data.nodes[i].type;

		//// triple
		if(triple.subjectType == "blank"){
		    if(blanks[triple.subject]) blanks[triple.subject].push(triple);
		    else blanks[triple.subject] = [triple];
		}else if(data.nodes[i].endpoint == epBrowser.endpoint){
		    triples.unshift(triple);
		}else{
		    if(!service[data.nodes[i].endpoint]){
			service[data.nodes[i].endpoint] = [];
		    }
		    service[data.nodes[i].endpoint].unshift(triple);
		}
	    }
	}
	
	// set query
	renderDiv.selectAll(".edge")
	    .attr("class", function(d){
		if(p_ids[d.id]) d.edge_type = "red";
		else d.edge_type = epBrowser.edgeColorType(d.count);
		return "edge edge_" + d.edge_type;})
	    .attr("marker-end", function(d){ return "url(#arrowhead_" + d.edge_type + ")"; });
	let query = "# @endpoint " + epBrowser.endpoint + "\n";
	let html = "# @endpoint " + epBrowser.endpoint + "\n";
	let keys = Object.keys(epBrowser.queryPrefix);
	for(let i = 0; i < keys.length; i++){
	    query += "PREFIX " + keys[i] + ": <" + epBrowser.prefix[keys[i]] + ">\n";
	    html += "PREFIX <span class='sparql_prefix'>" + keys[i] + ":</span> <span class='sparql_uri'>&lt;" + epBrowser.prefix[keys[i]] + "&gt;</span>\n";
	}
	//// raw query
	// query += "PREFIX : <" + epBrowser.prefix[":"] + ">\n";  // RDF-config not allow the prefix ':'
	query += "SELECT DISTINCT " + Object.keys(vars).join(" ") + "\n";
	query += "WHERE {\n";
	query += mkQuery(triples, blanks, 0)[0];
	for(endpoint in service){
	    query += "  SERVICE <" + endpoint + "> {\n   ";
	    query += mkQuery(service[endpoint], blanks, 0)[0];
	    query += "  }\n";
	}
	query += "}\n";
	//// html format query
	// html += "PREFIX <span class='sparql_prefix'>:</span> <span class='sparql_uri'>&lt;" + epBrowser.prefix[":"] + "&gt;</span>\n";  // RDF-config not allow the prefix ':'
	html += "SELECT DISTINCT <span style='color:#1680c4'>" + Object.keys(vars).join(" ") + "</span>\n";
	html += "WHERE {\n"
	html += mkQuery(triples, blanks, 0)[1];
	for(endpoint in service){
	    html += "  SERVICE  <span class='sparql_uri'>&lt;" + endpoint + "&gt;</span> {\n   ";
	    html += mkQuery(service[endpoint], blanks, 0)[1];
	    html += "  }\n";
	}
	html += "}\n";
	renderDiv.select("#query").text(query);
	renderDiv.select("#query_dummy").node().innerHTML = html;

	//// make query code
	function mkQuery(triples, blanks, f){
	    let indent = "  ";
	    for(let i = 0; i < f; i++){
		indent += "  ";
	    }
	    let q = "";
	    let q_html = "";
	    for(let i = 0; i < triples.length; i++){
		if(triples[0] == undefined) return false;
		let triple = triples[i];
		q += indent;
		q_html += indent;
		if(triple.subjectType != "blank" ){
		    q += triple.subject;
		    q_html += "<span class='sparql_" + triple.subjectType + "'>" + triple.subject + "</span>";
		}
		q += " " + triple.predicates.join("/");
		q_html += " <span class='sparql_prefix'>" + triple.predicates.join("</span>/<span class='sparql_prefix'>") + "</span>";
		if(triple.objectType == "blank"){
		    q += " [\n";
		    q_html += " [\n";
		    let r = mkQuery(blanks[triple.object], blanks, f + 1);
		    if(r){
			q += r[0];
			q_html += r[1];
		    }
		    else return false;
		}else{
		    if(triple.objectType == "var"){
			q += " " + triple.object;
			q_html += " <span class='sparql_var'>" + triple.object + "</span>";
		    }else if(triple.objectDataType.match(/literal/)){
			let lang = "";
			if(triple.objectLang) lang = "@" + triple.objectLang;
			q += ' "' +  triple.object + '"' + lang;
			q_html += ' <span class="sparql_const_literal">"' + triple.object + '"</span>' + lang;
		    }else{
			q += " " + triple.object;
			q_html += " <span class='sparql_const'>" + triple.object + "</span>";
		    }
		}
		if(i == triples.length - 1){
		    if(f){
			q += "\n" + indent + "]";
			q_html += "\n" + indent + "]";
		    }else{
			q += " .\n";
			q_html += " .\n";
		    }
		}else{
		    if(f > 0){
			q += " ;\n";
			q_html += " ;\n";
		    }else{
			q += " .\n";
			q_html += " .\n";
		    }
		}
	    }

	    return [q, q_html];
	}
	
	function searchNext(renderDiv, id){
	    for(let i = data.nodes.length - 1; i >= 0; i--){
		if(data.nodes[i].id == id){
		    let nodes = [];
		    if(data.nodes[i].sparql_select == 1){
			if(data.nodes[i].sparql_label == "path"){
			    if(paths[id]){
				data.nodes[i].sparql_label = "blank"; // path -> blank
				renderDiv.select("#popup_sparql_node_g_" + id).select("text").text("[ ]");
				return false;
			    }
			    paths[id] = 1;
			    nodes = searchNext(renderDiv, data.nodes[i].subject_id);
			    if(nodes === false) return false;
			}
			nodes.push(data.nodes[i]);
		    }
		    return nodes;
		}
	    }
	};
    },
    
    makeButton: function(renderDiv, param){
	let svg = renderDiv.select("svg");
	let box = svg.append("g").attr("id", "browser_setting").attr("transform", "translate(50,20)");
	box.append("rect").attr("id", "ctrl_background").attr("width", "900px").attr("height", "80px").attr("fill", "#ffffff").attr("fill-opacity", "0.8");
	let opt = box.append("g").attr("id", "browsing_option").attr("transform", "translate(0,28)").style("display", "none");
	let ctrl = box.append("g").attr("id", "graph_control").attr("transform", "translate(0,28)");
	let optionalSearchFlag = false;
	let chageGraphTypeFlag = false;
	
	box.append("text").attr("x", 0).attr("y", 12).attr("fill", "#666666")
	    .attr("dominant-baseline", "middle").style("font-size", "16px").text("mode:");
	ctrl.append("text").attr("x", 0).attr("y", 12).attr("fill", "#666666")
	    .attr("dominant-baseline", "middle").style("font-size", "16px").text("control:");
	
	makeModeSwitch(90, "browsing", true);
	makeModeSwitch(260, "subgraph to SPARQL");
	makeModeSwitch(478, "remove node");

	//browsing option mode
	box.append("text").attr("x", 190).attr("y", 15).text("(").attr("font-size", "11px");
	box.append("text").attr("x", 200).attr("y", 15).text("opt.").attr("font-size", "11px").style("cursor", "pointer").attr("fill", "#1680c4")
	    .on("click", function(){
		if(optionalSearchFlag){
		    if(epBrowser.inverseFlag) changeSwitchColor(opt.select("#inverse_link_switch_g"), false);
		    if(epBrowser.outerEpFlag) changeSwitchColor(opt.select("#federated_search_switch_g"), false);
		    optionalSearchFlag = false;
		    epBrowser.inverseFlag = false;
		    epBrowser.outerEpFlag = false;
		    renderDiv.select("#browsing_option").style("display", "none");
		    box.select("#graph_control").attr("transform", "translate(0,28)");
		    renderDiv.select("#outer_ep_box").remove();
		    box.select("#ctrl_background").attr("height", "80px");
		}else if(!epBrowser.subgraphMode && !epBrowser.nodeRemoveMode){
		    optionalSearchFlag = true;
		    opt.style("display", "block");
		    ctrl.attr("transform", "translate(0,56)");
		    box.select("#ctrl_background").attr("height", "110px");
		}
	    });
	box.append("text").attr("x", 225).attr("y", 15).text(")").attr("font-size", "11px");
	
	makeBrowseOpt(80, "inverse link", optInverse);
	makeBrowseOpt(240, "federated search", optFederated);
	
	makeSwitch(80, "property", propertySwitch);
	makeSwitch(220, "RDF-config", prefixListSwitch);
	makeSwitch(376, "layer arrangement", gridGraphSwitch);
	makeSwitch(596, "force sim.", forceSwitch, true);
	makeSwitch(744, "scroll zoom", zoomSwitch, true);
	zoomSwitch(svg.select("#scroll_zoom_switch_g"), false);

	ctrl.append("text").attr("y", "46px").attr("fill", "#666666").text("edge length:");
	ctrl.append("path").attr("stroke", "#888888").attr("stroke-width", "4px").attr("d", "M 130 41 H 230");
	ctrl.append("circle").attr("id", "slider").attr("fill", "#86b9d9").attr("r", "10px").attr("cx", "130px").attr("cy", "41px").style("cursor", "pointer")
	    .call(d3.drag()
		  .on("drag", dragged));
 
	function dragged() {
	    let cx = d3.event.x;
	    if(cx > 230) cx = 230;
	    if(cx < 130) cx = 130;
	    box.select("#slider").attr("cx", cx + "px");
	    epBrowser.edgeZoomRate = (cx - 130) / 100 + 1;
	    epBrowser.forcegraph(renderDiv, param);
	}
	
	function makeModeSwitch(x, text, defaultOnFlag){
	    let id = text.replace(/[^\w]/g, "_").replace(/\./g, "_");
	    let g = box.append("g").attr("id", id + "_mode_switch_g").attr("class", "mode_switch").style("cursor", "pointer")
		.on("click", function(){
		    if((epBrowser.clickableFlag || (!epBrowser.clickableFlag && epBrowser.outerEp == undefined))
		       && !(epBrowser.subgraphMode && text == "subgraph to SPARQL")
		       && !(epBrowser.nodeRemoveMode && text == "remove node")
		       && !((!epBrowser.subgraphMode && !epBrowser.nodeRemoveMode) && text == "browsing")
		      ){
			   epBrowser.clickableFlag = true;
			   changeMode(g, text);
		       }
		      });
	    g.append("circle").attr("cx", x).attr("cy", 12).attr("r", 10)
		.attr("fill", "#ffffff").attr("stroke", "#c6c6c6").attr("stroke-width", "2px");
	    g.append("circle").attr("class", "marker").attr("cx", x).attr("cy", 12).attr("r", 7).attr("fill", "#ffffff");
	    g.append("text").attr("x", x + 18).attr("y", 12).attr("fill", "#666666")
		.attr("dominant-baseline", "middle").style("font-size", "16px").text(text);
	    if(defaultOnFlag) changeModeSwitchColor(g, true);
	}

	function makeBrowseOpt(x, text, callFunc){
	    let id = text.replace(/[^\w]/g, "_").replace(/\./g, "_");
	    let g = opt.append("g").attr("id", id + "_switch_g").attr("class", "visual_switch").style("cursor", "pointer")
		.on("click", function(){
		    let flag = false;
		    if(rect.attr("fill") == "#c6c6c6") flag = true;
		    callFunc(d3.select(this), flag); });
	    let rect = g.append("rect").attr("x", x).attr("y", 0).attr("width", 40).attr("height", 20).attr("rx", 10).attr("ry", 10)
		.attr("fill", "#c6c6c6").attr("stroke", "#c6c6c6");
	    let circle = g.append("circle").attr("cx", x + 10).attr("cy", 10).attr("r", 8).attr("fill", "#ffffff");
	    g.append("text").attr("x", x + 50).attr("y", 10).attr("fill", "#666666")
		.attr("dominant-baseline", "middle").style("font-size", "16px").text(text);
	}
	
	function makeSwitch(x, text, callFunc, defaultOnFlag){
	    let id = text.replace(/[^\w]/g, "_").replace(/\./g, "_");
	    let g = ctrl.append("g").attr("id", id + "_switch_g").attr("class", "visual_switch").style("cursor", "pointer")
		.on("click", function(){
		    let flag = false;
		    if(rect.attr("fill") == "#c6c6c6") flag = true;
		    callFunc(d3.select(this), flag); });
	    let rect = g.append("rect").attr("x", x).attr("y", 0).attr("width", 40).attr("height", 20).attr("rx", 10).attr("ry", 10)
		.attr("fill", "#c6c6c6").attr("stroke", "#c6c6c6");
	    let circle = g.append("circle").attr("cx", x + 10).attr("cy", 10).attr("r", 8).attr("fill", "#ffffff");
	    g.append("text").attr("x", x + 50).attr("y", 10).attr("fill", "#666666")
		.attr("dominant-baseline", "middle").style("font-size", "16px").text(text);
	    if(defaultOnFlag) changeSwitchColor(g, true);
	}

	function changeMode(g, text){
	    box.selectAll(".mode_switch").select("rect").attr("fill", "#ffffff").attr("stroke", "#c6c6c6");
	    if(epBrowser.inverseFlag) changeSwitchColor(opt.select("#inverse_link_switch_g"), false);
	    if(epBrowser.outerEpFlag) changeSwitchColor(opt.select("#federated_search_switch_g"), false);
	    renderDiv.select("#sparql_run_div").style("display", "none");
	    renderDiv.select("#browsing_option").style("display", "none");
	    box.select("#graph_control").attr("transform", "translate(0,28)");
	    renderDiv.select("#outer_ep_box").remove();
	    epBrowser.inverseFlag = false;
	    epBrowser.subgraphMode = false;
	    epBrowser.nodeRemoveMode = false;
	    epBrowser.outerEpFlag = false;

	    if(text == "subgraph to SPARQL") epBrowser.subgraphMode = true;
	    if(text == "remove node") epBrowser.nodeRemoveMode = true;
	    
	    reDrawGraph();
	    changeModeSwitchColor(g, true);
	}

	function optInverse(g, flag){
	    changeSwitchColor(g, flag);
	    if(flag){
		epBrowser.inverseFlag = true;
		reDrawGraph();

	    }else{
		epBrowser.inverseFlag = false;
		reDrawGraph();
	    }
	}

	function optFederated(g, flag){
	    changeSwitchColor(g, flag);
	    if(flag){
		epBrowser.outerEpFlag = true;
		box.select("graph_control").attr("transform", "translate(0,56)");
		let outer_ep_box = opt.append("g").attr("id", "outer_ep_box");
		outer_ep_box.append("rect").attr("width", 600).attr("height", 20)
		    .attr("x", 440).attr("y", 0)
		    .attr("fill", "#ffffff").attr("stroke", "#666666").attr("stroke-width", "2px");
		outer_ep_box.append("text").attr("x", 450).attr("y", 10).text("endpoint:")
		    .attr("font-size", "13px").style("cursor", "pointer").attr("fill", "#666666").attr("dominant-baseline", "middle");
		outer_ep_box.append("text").attr("id", "outer_ep").attr("x", 530).attr("y", 10)
		    .attr("font-size", "13px").style("cursor", "pointer").attr("fill", "#1680c4").attr("dominant-baseline", "middle")
		    .text(function(){
			if(epBrowser.outerEp){
			    epBrowser.clickableFlag = true;
			    return epBrowser.outerEp;
			}else{
			    epBrowser.clickableFlag = false;
			    return "undefined";
			}
		    })
		    .on("click", function(){
			let textElm = d3.select(this);
			epBrowser.hidePopupInputDiv(renderDiv);
			let varNameDiv = renderDiv.select("#var_name_form").style("display", "block");
			epBrowser.setPopupPosition(renderDiv, varNameDiv, outer_ep_box.node(), {y: 10});
			let input = varNameDiv.append("input").attr("id", "var_name").attr("type", "text")
			    .attr("size", "80").style("border", "solid 3px #888888").attr("value", "http://")
			    .on("keypress", function(){
				let outerEp = this.value;
				if(d3.event.key === 'Enter' && outerEp.match(/^https*:\/\//)){
				    if(outerEp.match(/^https*:\/\/.+/)){
					epBrowser.outerEp = outerEp;
					epBrowser.outerEpFlag = true;
					epBrowser.clickableFlag = true;
					outer_ep_box.select("#outer_ep").text(outerEp);
				    }else{
					epBrowser.outerEpFlag = false;
					changeModeSwitchColor(renderDiv.select("#browsing_mode_switch_g"), true);
				    }
				    epBrowser.hidePopupInputDiv(renderDiv);
				    reDrawGraph();
				}
			    }).on("keydown", function(){
				if(d3.event.key === 'Escape') epBrowser.hidePopupInputDiv(renderDiv, param);
			    });
			input.node().focus();
			input.node().select();
		    });
		outer_ep_box.append("text").attr("x", 980).attr("y", 15).text("(").attr("font-size", "11px");
		outer_ep_box.append("text").attr("x", 990).attr("y", 15).text("clear").attr("font-size", "11px").style("cursor", "pointer").attr("fill", "#1680c4")
		    .on("click", function(){
			epBrowser.outerEp = undefined;
			epBrowser.clickableFlag = false;
			outer_ep_box.select("#outer_ep").text("undefined");
			reDrawGraph();
		    });
		outer_ep_box.append("text").attr("x", 1022).attr("y", 15).text(")").attr("font-size", "11px");
		
		reDrawGraph();
	    }else{
		epBrowser.outerEpFlag = false;
		epBrowser.clickableFlag = true;
		opt.select("#outer_ep_box").remove();
		reDrawGraph();
	    }
	}

	function propertySwitch(g, flag){
	    changeSwitchColor(g, flag);
	    if(flag){
		epBrowser.labelFlag = false;
		svg.selectAll(".edge_label").attr("display", "block");
		reDrawGraph();
	    }else{
		epBrowser.labelFlag = true;
		svg.selectAll(".edge_label").attr("display", "none");
		reDrawGraph();
	    }
	}
	
	function prefixListSwitch(g, flag){
	    changeSwitchColor(g, flag);
	    if(flag){
		renderDiv.select("#rdf_config").style("display", "block");
		renderDiv.select("#rdf_config_select").node().focus();
	    }else{
		renderDiv.select("#rdf_config").style("display", "none");
	    }
	}

/*	function makePrefixLine(prefix_box, key, x, y, line_num, custom){ // old code
	    let label = key + ":";
	    label = label.replace(/::/, ":");
	    prefix_box.append("text").text(label).attr("id", "prefix_id_" + label)
		.attr("fill", function(){
		    if(custom) return "#1680c4";
		    else return "#666666";
		})
		.attr("font-size", "13px")
		.attr("x", x + 40).attr("y",  y + (line_num * 20) + 40)
		.filter(function(){return custom;})
		.on("click", function(){
		    let textElm = d3.select(this);
		    let prefix_tmp = textElm.text().replace(/:/, "");
		    epBrowser.hidePopupInputDiv(renderDiv);
		    let mouse = d3.mouse(d3.select('body').node());
		    let varNameDiv = renderDiv.select("#var_name_form")
			.style("position", "absolute")
			.style("top", mouse[1] + "px")
			.style("left", (mouse[0] + 20) + "px")
			.style("display", "block");
		    let input = varNameDiv.append("input").attr("id", "var_name").attr("type", "text")
			.attr("size", "20").style("border", "solid 3px #888888")
			.on("keypress", function(){
			    let prefix_new = this.value;
			    if(d3.event.key === 'Enter' && prefix_new && prefix_new.match(/\w+/)){
				prefix_new = prefix_new.match(/(\w+)/)[1];
				prefix_new = prefix_new.toLowerCase();
				let id = varNameDiv.select("#var_name_node_id").attr("value");
				textElm.text(prefix_new + ":");
				epBrowser.setCustomPrefix(renderDiv, param, prefix_tmp, prefix_new);
			    }
			}).on("keydown", function(){
			    if(d3.event.key === 'Escape') epBrowser.hidePopupInputDiv(renderDiv, param);
			});
		    input.node().focus();      // focus -> value (move coursor to end of value)
		    input.attr("value", prefix_tmp);
		    input.node().select();
		})
		.style("cursor", "pointer");
	    prefix_box.append("text").text("<" + epBrowser.usedPrefix[key] + ">").attr("fill", "#666666")
		.attr("font-size", "13px").attr("x", x + 120).attr("y", y + (line_num * 20) + 40);
	}
*/
	function zoomSwitch(g, flag){
	    changeSwitchColor(g, flag);
	    if(flag){
		svg.on(".drag", null);
		svg.call(d3.zoom().scaleExtent([0.3, 5])
			 .on("zoom", function(){
			     renderDiv.select("#zoom_g").attr("transform", d3.event.transform);
			     epBrowser.hidePopupInputDiv(renderDiv);
			 } ))
		    .on("dblclick.zoom", null);
	    }else{	
		svg.on(".zoom", null);
		svg.call(d3.drag()
			 .on("start", function(){
			     let trans = renderDiv.select("#drag_g").attr("transform");
			     if(trans) epBrowser.dragPos = [parseFloat(trans.match(/\(([\-\d\.]+),/)[1]) - d3.event.x,
							    parseFloat(trans.match(/,([\-\d\.]+)\)/)[1]) - d3.event.y];
			     else epBrowser.dragPos = [-1 * d3.event.x ,-1 * d3.event.y];
			 })
			 .on("drag", function(){
			     renderDiv.select("#drag_g").attr("transform", function(){
				 return "translate(" + (d3.event.x + epBrowser.dragPos[0]) + "," + (d3.event.y + epBrowser.dragPos[1]) + ")";
			     });
			     epBrowser.hidePopupInputDiv(renderDiv);
			 } ));
	    }
	}

	function gridGraphSwitch(g, flag){
	    changeSwitchColor(g, flag);
	    chageGraphTypeFlag = true;
	    if(flag){
		epBrowser.hidePopupInputDiv(renderDiv);
		epBrowser.entryNodeIndex = {x: epBrowser.graphData.nodes[0].x, y:epBrowser.graphData.nodes[0].y};
		epBrowser.nodeGridFlag = true;
		forceSwitch(box.select("#force_sim__switch_g"), true);
	    }else{
		epBrowser.nodeGridFlag = false;
		forceSwitch(box.select("#force_sim__switch_g"), true);
	    }
	    chageGraphTypeFlag = false;
	}
	
	function forceSwitch(g, flag){
	    if(g.select("rect").attr("fill") !=  "#86b9d9" || !flag) changeSwitchColor(g, flag)
	    if(flag){
		epBrowser.forceFlag = true;
		reDrawGraph();
	    }else{
		epBrowser.forceFlag = false;
		epBrowser.stopSimulation();
	    }
	}
	
	function changeSwitchColor(g, flag){
	    let rect = g.select("rect");
	    let circle = g.select("circle");
	    let cx = parseInt(circle.attr("cx"));
	    if(flag){
		rect.attr("fill", "#86b9d9").attr("stroke", "#86b9d9");
		circle.attr("cx", cx + 20);
	    }else{
		rect.attr("fill", "#c6c6c6").attr("stroke", "#c6c6c6");
		circle.attr("cx", cx - 20);
	    }
	}
	
	function changeModeSwitchColor(g){
	    box.selectAll(".mode_switch").select(".marker").attr("fill", "#ffffff");
	    g.select(".marker").attr("fill", "#86b9d9");
	}

	function reDrawGraph(){  // pre-save & post-set line positions
	    // save index
	    epBrowser.edgeIndex = {};
	    for(elm of epBrowser.graphData.edges){
		epBrowser.edgeIndex[elm.id] = {x1: elm.source.x, y1: elm.source.y, x2: elm.target.x, y2: elm.target.y, l1: elm.source.layer, l2: elm.target.layer, has_reverse: elm.has_reverse};
	    }

	    //re-draw
	    epBrowser.forcegraph(renderDiv, param);

	    // set edge
	    svg.selectAll(".edge").attr("d", function(d){
		let data = epBrowser.edgeIndex;
		if(epBrowser.nodeGridFlag){
		    let s_x = data[d.id].l1 * 360 + 150;
		    let t_x = data[d.id].l2 * 360 + 150;
		}
		return epBrowser.calcPath(data[d.id].x1, data[d.id].y1, data[d.id].x2, data[d.id].y2, data[d.id].has_reverse);
	    });
	    // set edge label
	    svg.selectAll(".edge_label").attr("dx", function(d){ return epBrowser.calcEdgeLabelPos(d.source.x, d.source.y, d.target.x, d.target.y, "x", d.has_reverse); })
		.attr("dy", function(d) { return epBrowser.calcEdgeLabelPos(d.source.x, d.source.y, d.target.x, d.target.y, "y", d.has_reverse); });

	    // restart
	    if(chageGraphTypeFlag){
		epBrowser.simulation.alpha(.2);
		epBrowser.simulation.restart();
	    }

	    // mode check
	    if(epBrowser.subgraphMode){  //// subgraph mode
		epBrowser.selectSubGraphMode(renderDiv, param);
	    }else if(epBrowser.nodeRemoveMode){  //// remove mode
		let node_g = svg.selectAll(".node_mouse_eve_g");
		node_g.on("click", function(d){ epBrowser.removeGraphData(renderDiv, param, d); })
		    .on("mouseover", function(d){ 
			if(d.child){
			    let childs = svg.selectAll(".parent_" + d.id);
			    childs.selectAll("rect.node").attr("class", function(d){ return "node node_" + d.node_type + " node_red";} );
			    childs.selectAll("path").attr("class", "edge edge_red").attr("marker-end", "url(#arrowhead_red)");
			}else{
			    if(d.id > 0){
				d3.select(this).select("rect").attr("class", function(d){ return "node node_" + d.node_type + " node_red";} );
				svg.select("#edge_" + d.predicate_id).attr("class", "edge edge_red").attr("marker-end", "url(#arrowhead_red)");
			    }
			} })
		    .on("mouseout", function(){
			svg.selectAll(".node").attr("class", function(d){ return "node node_" + d.node_type;} );
			svg.selectAll(".edge").attr("class", function(d){return "edge edge_" + d.edge_type; })
			    .attr("marker-end", function(d){ return "url(#arrowhead_" + d.edge_type + ")"; }) })
		    .style("cursor", "pointer");
	    }
	}

	// temporaly mode change by key press
	document.addEventListener('keydown', (e) => {
	    let flag = false;
	    if(e.key == "r" || e.key == "s" || e.key == "b" || e.key == "i" || e.key == "f") flag = true;
	    if(renderDiv.select("#var_name_form").style("display") == "block"
	       || renderDiv.select("#outer_endpoints").style("display") == "block") flag = false;
	    if(epBrowser.keyPressFlag || !epBrowser.onMouseSvg) flag = false;
	    if(flag){
		if(e.key == "r" || e.key == "s" || e.key == "b"){ // mode change
		    let text = false;
		    if(e.key == "b") text = "browsing";
		    else if(e.key == "s") text = "subgraph to SPARQL";
		    else if(e.key == "r") text = "remove node";
		    let id = text.replace(/[^\w]/g, "_").replace(/\./g, "_");
		    let g = svg.select("#" + id + "_mode_switch_g");
		    
		    if(!e.ctrlKey){
			if(epBrowser.subgraphMode) epBrowser.preModeText = "subgraph to SPARQL";
			else if(epBrowser.nodeRemoveMode) epBrowser.preModeText = "remove node";
			else epBrowser.preModeText = "browsing";
			if(text != epBrowser.preModeText){
			    epBrowser.keyPressFlag = true;
			    changeMode(g, text);
			}
		    }else changeMode(g, text);
		}else if(e.ctrlKey){  // optional mode
		    if(opt.style("display") == "none"){
			changeMode(svg.select("#browsing_mode_switch_g"), "browsing");
			opt.style("display", "block");
			ctrl.attr("transform", "translate(0,56)");
		    }
		    let flag = true;
		    if(e.key == "i"){
			if(epBrowser.inverseFlag) flag = false;
			optInverse(svg.select("#inverse_link_switch_g"), flag);
		    }else if(e.key == "f"){
			if(epBrowser.outerEpFlag) flag = false;
			optFederated(svg.select("#federated_search_switch_g"), flag);
		    }
		}
	    }
	});

	document.addEventListener('keyup', (e) => {
	    if(epBrowser.keyPressFlag && (e.key == "r" || e.key == "s" || e.key == "b")){
		epBrowser.keyPressFlag = false;
		let text = epBrowser.preModeText;
		let id = text.replace(/[^\w]/g, "_").replace(/\./g, "_");
		let g = svg.select("#" + id + "_mode_switch_g");
		changeMode(g, text);
	    }
	});
    },
    
    hidePopupInputDiv: function(renderDiv){
	let div = renderDiv.select("#var_name_form").style("display", "none");
	div.select("#var_name").remove();
	renderDiv.select("#outer_endpoints").style("display", "none");
	renderDiv.select("#rdf_conf_card_div").style("display", "none");
    },

    setNodeVarName: function(renderDiv, param, id, var_name){
	let nodes = epBrowser.graphData.nodes;
	for(elm of nodes){
	    if(elm.id == id){
		elm.sparql_var_name = var_name;
		break;
	    }
	}
	console.log("setVar");
	let sparql_node_g = renderDiv.select("#popup_sparql_node_g_" + id);
	sparql_node_g.select("text").text(var_name);
	epBrowser.hidePopupInputDiv(renderDiv);
	epBrowser.traceGraph(renderDiv, param);
    },

    setCustomPrefix: function(renderDiv, param, prefix_tmp, prefix_new){
	let value = epBrowser.prefix[prefix_tmp];
	delete(epBrowser.prefix[prefix_tmp]);
	delete(epBrowser.prefixTemp[prefix_tmp]);
	epBrowser.prefix[prefix_new] = value;
	for(key in epBrowser.prefixCustom){
	    if(epBrowser.prefixCustom[key] == value) delete(epBrowser.prefixCustom[key]);
	}
	epBrowser.prefixCustom[prefix_new] = value;
	epBrowser.prefixTemp[prefix_new] = value;
	localStorage['epBrowser_stanza_custom_prefix'] = JSON.stringify(epBrowser.prefixCustom);
	epBrowser.hidePopupInputDiv(renderDiv, param);
	for(elm of epBrowser.graphData.edges){
	    let regex = new RegExp(prefix_tmp + ":", "g");
	    elm.predicate_label = elm.predicate_label.replace(regex, prefix_new + ":");
	}
	renderDiv.select("#prefix_id_" + prefix_tmp).text(prefix_new + ":");
	epBrowser.forcegraph(renderDiv, param);
    },

    calcPath: function(x1, y1, x2, y2, reverse){
	if(!epBrowser.nodeGridFlag){
	    let margin = 5;
	    let bi_dir_margin = 6;
	    let rect_w = 160/2 + margin;
	    let rect_h = 40/2 + margin;
	    let rate = rect_w / rect_h;
	    let w = x2 - x1;
	    let h = y2 - y1;
	    let sign_x = w / Math.abs(w);
	    let sign_y = h / Math.abs(h);
	    if(Math.abs(h) * rate > Math.abs(w)){
		x2 = x2 - (sign_x * rect_h * Math.abs(w) / Math.abs(h));
		y2 = y2 - (sign_y * rect_h);
	    }else{
		x2 = x2 - (sign_x * rect_w);
		y2 = y2 - (sign_y * rect_w * Math.abs(h) / Math.abs(w));
	    }
	    if(reverse != undefined){
		if(Math.abs(h) * (rate + bi_dir_margin / 2 / rect_h) > Math.abs(w)){
		    x1 += bi_dir_margin * (w ** 2 + h ** 2) ** 0.5 / h;
		    x2 += bi_dir_margin * (w ** 2 + h ** 2) ** 0.5 / h;
		}else{
		    y1 -= bi_dir_margin * (w ** 2 + h ** 2) ** 0.5 / w;
		    y2 -= bi_dir_margin * (w ** 2 + h ** 2) ** 0.5 / w;
		}
	    }
	    return "M" + x1 + "," + y1 + " L" + x2 + "," + y2;
	}else{
	    let x_margin = 85;
	    let y_margin = 25;
	    let cx_margin = 80;
	    let cy_margin = 200;
	    if(x1 == x2){ // same layer (Bezier curve)
		x1 += x_margin;
		x2 += x_margin;
		return "M" + x1 + "," + y1 + " C" + (x1 + cx_margin) + "," +　y1 + " " + (x2 + cx_margin) + "," + y2 + " " + x2 + "," + y2;
	    }else{
		if(x2 > x1){ // normal
		    x1 += x_margin;
		    x2 -= x_margin;
		    return "M" + x1 + "," + y1  + " L" + x2 + "," + y2;
		}else{ // reverse (Bezier curve)
		    let cy = y2;
		    if(y1 < y2){ // reverse lower
			cy_margin *= -1;
			y1 -= y_margin;
			y2 -= y_margin;
		    }else{ // reverse upper
			y1 += y_margin;
			y2 += y_margin;
		    }
		    return "M" + x1 + "," + y1  + " C" + x1 + "," + (y1 + cy_margin)  + " " + x2 + "," + (y2 + cy_margin) + " " + x2 + "," + y2;
		}
	    }
	}
    },

    calcEdgeLabelPos: function(x1, y1, x2, y2, label, reverse){
	if(!epBrowser.nodeGridFlag){
	    if(label == "x"){
		if(x1 > x2 || reverse) return (x1 + x2 * 2) / 3 + 6; // left direction edge
		else return (x1 * 2 + x2) / 3 + 6;        // right direction edge
	    }else{
		if(x1 > x2 || reverse) return (y1 + y2 * 2) / 3;     // left direction edge
		else return (y1 * 2 + y2) / 3;            // right direction edge
	    }
	}else{
	    let x_margin = 85;
	    let y_margin = 25;
	    let cx_margin = 80;
	    let cy_margin = 200;
	    if(x1 == x2){ // same layer
		if(label == "x") return x1 + x_margin + cx_margin;
		else return (y1 + y2) / 2;
	    }else{ // reverse
		if(x2 > x1){ // normal
		    x1 += x_margin;
		    x2 -= x_margin;
		    if(label == "x") return (x1 + x2 * 9) / 10;
		    else return (y1 + y2 * 9) / 10;
		}else{
		    if(y1 < y2){ // reverse lower
			if(label == "x") return x1;
			else return y1 - y_margin - 20;
		    }else{ // reverse upper
			if(label == "x") return x1;
			else return y1 + y_margin + 30;
		    }
		}
	    }
	}
    },
    
    addGraphData: function(api_json, renderDiv, param){
	// console.log(api_json);
	let json = api_json.data;

	if(!json[0]) return 0;
	   
	let inverse = false;
	if(api_json.inv == 1) inverse = true;
	let data = epBrowser.graphData;
	let nodeKey2id = epBrowser.nodeKey2id;
	let parent = Array.from(epBrowser.selectParent);
	let edgeList = epBrowser.edgeList;
	let edgeST2id = epBrowser.edgeST2id;
	let nodeId = data.nodes[data.nodes.length - 1].id + 1;
	let edgeId = 0;
	parent.push(epBrowser.selectNode);

	// replace blank node ID for childs
	if(json[0].s.type == "bnode" && epBrowser.graphData.nodes[epBrowser.selectNode]) epBrowser.graphData.nodes[epBrowser.selectNode].key = json[0].s.value;

	// hub node check (+1 for each edge push)
	let hub_node = epBrowser.graphData.nodes[epBrowser.selectNode];
	if(hub_node && !hub_node.child_count) hub_node.child_count = 0;

	// replace type label of select node (for multi type)
	if(!inverse && json[0].p.value == epBrowser.rdfType && json[0].c){
	    for(let elm of epBrowser.graphData.nodes){
		if(elm.id == epBrowser.selectNode){
		    elm.class = json[0].c.value;
		    elm.class_type = json[0].c.type;
		    if(json[0].c_label){
			elm.class_label = json[0].c_label.value;
			elm.class_label_type = json[0].c_label.type;
		    }
		    elm.classes = [];
		    elm.class_labels = [];
		    for(let i in json){
			if(json[i].p.value == epBrowser.rdfType && json[i].c){
			    elm.classes.push(json[i].c.value);
			    let label = "";
			    if(json[i].c_label) label = json[i].c_label.value;
			    elm.class_labels.push(label);
			}else if(json[i].p.value != epBrowser.rdfType){
			    break;
			}
		    }
		    break;
		}
	    }
	}

	// child flag
	if(json[0]){
	    for(let i = 0; i < data.nodes.length; i++){
		if(data.nodes[i].id == epBrowser.selectNode){
		    data.nodes[i].child = true;
		    break;
		}
	    }
	}

	// next layer
	let next_layer = epBrowser.selectLayer + 1;
	if(inverse) next_layer = epBrowser.selectLayer - 1;
	let endpoint = epBrowser.endpoint;
	if(epBrowser.outerEpFlag) endpoint = epBrowser.outerEp;
	if(data.edges[data.edges.length - 1]) edgeId = data.edges[data.edges.length - 1].id + 1;
	for(let i = 0; i < json.length; i++){
	    let obj = {
		key: json[i].o_sample.value,
		type: json[i].o_sample.type,
		subject: json[i].s.value,
		subject_id: epBrowser.selectNode,
		subject_type: json[i].s.type,
		predicate: json[i].p.value,
		predicate_id: edgeId,
		id: nodeId,
		parent: parent,
		layer: next_layer,
		endpoint: endpoint,
		child_count: 0,
		off_click: {},
		off_click_inv: {}
	    };
	    if(json[i].o_sample.datatype) obj.datatype = json[i].o_sample.datatype;
	    if(json[i].o_label) obj.label = json[i].o_label.value;
	    if(json[i].p_label) obj.predicate_label = json[i].p_label.value;
	    if(inverse) obj.predicate = "inv-" + obj.predicate;
	    if(epBrowser.addPointIndex[0]) obj.x = epBrowser.addPointIndex[0];
	    if(epBrowser.addPointIndex[1]) obj.y = epBrowser.addPointIndex[1];
	    if(json[i].o_sample["xml:lang"]) obj.lang = json[i].o_sample["xml:lang"];
	    if(json[i].c){
		obj.class = json[i].c.value;
		obj.class_type = json[i].c.type;
		if(json[i].c_label){
		    obj.class_label = json[i].c_label.value;
		    obj.class_label_type = json[i].c_label.type;
		}
	    }

	    let source = epBrowser.selectNode;
	    let target = nodeId;
	    if(inverse){
	    	source = nodeId;
		target = epBrowser.selectNode;
	    }
	    let edge_key = source + "_" + target + "_" + json[i].p.value;
	    
	    if(!(obj.type.match(/literal/) || (json[i].o_sample.datatype && json[i].o_sample.datatype.match(/string/)))
	       && obj.predicate != epBrowser.rdfType && nodeKey2id[obj.key] != undefined){ // don't add same instance
		if(inverse) source = nodeKey2id[obj.key];
		else target = nodeKey2id[obj.key];
		edge_key = source + "_" + target + "_" + json[i].p.value;
		if(!edgeList[edge_key]){
		    //// add edge
		    //  data.edges.push({id: edgeId, source: epBrowser.selectNode, target: nodeKey2id[obj.key], predicate: json[i].p.value,  predicate_label: epBrowser.uriToShort(json[i].p.value), count: json[i].o_count.value});
		    //	edgeId++;
		    // 	if(hub_node) hub_node.child_count++;
		    //// don't add edge, add predicate label
		    let flag = 1;
		    let add_predicate = epBrowser.uriToShort(json[i].p.value, false, false, renderDiv, param);
		    for(elm of data.edges){
			if(elm.target == nodeKey2id[obj.key]){
			    elm.predicate_label += ", " + add_predicate;
			    flag = 0;
			    // add graph skip flag
			    obj.skip = 1;
			    obj.pref_id = nodeKey2id[obj.key];
			    data.nodes.push(obj);
			    nodeId++;
			    break;
			}
		    }
		    ////
		    if(flag){ // add edge
			data.edges.push({id: edgeId, source: source, target: target, predicate: json[i].p.value, predicate_label: epBrowser.uriToShort(json[i].p.value, false, false, renderDiv, param), count: json[i].o_count.value, parent: parent, edge_key: edge_key});
			edgeST2id[source + "_" + target] = edgeId;
			// add bi-directional flag
			if(edgeST2id[target + "_" + source]){
			    data.edges[data.edges.length - 1].has_reverse = edgeST2id[target + "_" + source];
			    for(let edge of data.edges){
				if(edge.id == edgeST2id[target + "_" + source]){
				    edge.has_reverse = edgeId;
				    break;
				}
			    }
			}
			edgeId++;
			if(hub_node) hub_node.child_count++;
		    }
		    edgeList[edge_key] = 1;
		}
	    }else{
		nodeKey2id[obj.key] = nodeId;
		data.nodes.push(obj);
		data.edges.push({id: edgeId, source: source, target: target, predicate: json[i].p.value, predicate_label: epBrowser.uriToShort(json[i].p.value, false, false, renderDiv, param), count: json[i].o_count.value, parent: parent, edge_key: edge_key});
		edgeList[edge_key] = 1;
		edgeST2id[source + "_" + target] = edgeId;
		nodeId++;
		edgeId++;
		if(hub_node) hub_node.child_count++;
		if((obj.key.match(/^http:\/\/identifiers.org\//) || obj.key.match(/^http:\/\/purl\./)) && !epBrowser.endpointList[obj.key]){
		    let url = epBrowser.api + epBrowser.findEndpointApi;
		    epBrowser.fetchReq("post", url, false, {"apiArg": ["uri=" + encodeURIComponent(obj.key)]}, epBrowser.addEndpointToUri);
		}
	    }
	}
//	console.log(data);
//	console.log(epBrowser.nodeGridPos);
    },

    addEndpointToUri: function(json, notUse, param){
	let tmp = param.apiArg[0].split(/=/);
	json.unshift({id: "-- select endpoint"});
	epBrowser.endpointList[decodeURIComponent(tmp[1])] = json;
    },
    
    removeGraphData: function(renderDiv, param, clickData){
	let removeReverseFlag = function(source, target, reverse){
	    if(reverse != undefined){
		for(let edge of epBrowser.graphData.edges){
		    if(edge.id == reverse){
			edge.has_reverse = undefined;
			break;
		    }
		}
		for(let edge of newData.edges){
		    if(edge.id == reverse){
			edge.has_reverse = undefined;
			break;
		    }
		}
	    }
	    epBrowser.edgeST2id[source + "_" + target] = undefined;	
	}
	let svg = renderDiv.select("svg");
	let newData = {nodes: [], edges: []};
	if(clickData.child){
	    svg.selectAll(".parent_" + clickData.id).remove();
	    clickData.child = false;
	    clickData.off_click[clickData.endpoint] = false;
	    clickData.off_click_inv[clickData.endpoint] = false;
	    for(let i = 0; i < epBrowser.graphData.nodes.length; i++){
		let parent_s = "_" + epBrowser.graphData.nodes[i].parent.join("_") + "_";
		let regex = new RegExp("_" + clickData.id + "_");
		if(!parent_s.match(regex)) newData.nodes.push(epBrowser.graphData.nodes[i]);
		else epBrowser.nodeKey2id[epBrowser.graphData.nodes[i].key] = undefined;
	    }
	    for(let i = 0; i < epBrowser.graphData.edges.length; i++){
		let parent_s = "_" + epBrowser.graphData.edges[i].parent.join("_") + "_";
		let regex = new RegExp("_" + clickData.id + "_");
		if(!parent_s.match(regex)) newData.edges.push(epBrowser.graphData.edges[i]);
		else{
		    epBrowser.edgeList[epBrowser.graphData.edges[i].edge_key] = undefined;
		    removeReverseFlag(epBrowser.graphData.edges[i].source, epBrowser.graphData.edges[i].target, epBrowser.graphData.edges[i].has_reverse);
		    // epBrowser.edgeST2id[epBrowser.graphData.edges[i].source + "_" + epBrowser.graphData.edges[i].target] = undefined;
		}
	    }
	}else if(clickData.id > 0){
	    svg.select("#node_g_id_" + clickData.id).remove();
	    epBrowser.nodeKey2id[clickData.key] = undefined;
	    for(let i = 0; i < epBrowser.graphData.nodes.length; i++){
		if(epBrowser.graphData.nodes[i].id != clickData.id) newData.nodes.push(epBrowser.graphData.nodes[i]);
	    }
	    for(let i = 0; i < epBrowser.graphData.edges.length; i++){
		let id = epBrowser.graphData.edges[i].target.id;
		if(clickData.predicate.match(/^inv-/)) id = epBrowser.graphData.edges[i].source.id;
		if(id != clickData.id) newData.edges.push(epBrowser.graphData.edges[i]);
		else{
		    epBrowser.edgeList[epBrowser.graphData.edges[i].edge_key] = undefined;
		    removeReverseFlag(epBrowser.graphData.edges[i].source, epBrowser.graphData.edges[i].target, epBrowser.graphData.edges[i].has_reverse);
		    // epBrowser.edgeST2id[epBrowser.graphData.edges[i].source + "_" + epBrowser.graphData.edges[i].target] = undefined;
		    svg.select("#edge_g_id_" + epBrowser.graphData.edges[i].id).remove();
		    svg.select("#edge_label_g_id_" + epBrowser.graphData.edges[i].id).remove();
		    // when remove last edge,  (##### dev ##### not apply to inv edge)
		    let source_link_count = 0;
		    for(let j = 0; j < epBrowser.graphData.edges.length; j++){
			if(epBrowser.graphData.edges[j].source.id == epBrowser.graphData.edges[i].source.id) source_link_count++;
		    }
		    if(source_link_count == 1){ // change click flag of source node
			for(let j = 0; j < epBrowser.graphData.nodes.length; j++){
			    if(epBrowser.graphData.nodes[j].id == epBrowser.graphData.edges[i].source.id){
				epBrowser.graphData.nodes[j].off_click[clickData.endpoint] = false;
				epBrowser.graphData.nodes[j].off_click_inv[clickData.endpoint] = false;
				epBrowser.graphData.nodes[j].child = undefined;
			    }
			}
		    }
		}
	    } 
	}
//	console.log(epBrowser.graphData);
//	console.log(newData);
	
	if(newData.nodes[0]) epBrowser.graphData = newData;
    },
    
    nodeColorType: function(type, p, endpoint){
	if(type != "uri" && type != "bnode") type = "literal";
	if(p == epBrowser.rdfType) type = "class";
	if((!epBrowser.outerEpFlag && epBrowser.endpoint == endpoint)
	   || (epBrowser.outerEpFlag && (epBrowser.outerEp == endpoint || epBrowser.outerEp == undefined ))){
	    // through
	}else{
	    type += "_l";
	}
	return type;
    },

    edgeColorType: function(count){
	let type = "e";
	if(count == 1) type = "a";
	else if(count <= 2) type = "b";
	else if(count <= 10) type = "c";
	else if(count <= 50) type = "d";
	return type;
    },

    uriToShort: function(uri, sparql, config, renderDiv, param){
	let f = 0;
	let prefix = "";
	let [ , prefix_uri, postfix]  = uri.match(/(.+[\/#:])([^\/#:]*)$/);
	if(!uri.match(/^urn:/)){
	    for(key of Object.keys(epBrowser.prefix)){
		if(uri.match(epBrowser.prefix[key]) && prefix_uri == epBrowser.prefix[key]){
		    prefix = key;
		    if(prefix.match(/^:$/)) uri = uri.replace(epBrowser.prefix[key], prefix); //enrtry
		    else{
			uri = uri.replace(epBrowser.prefix[key], prefix + ":");
			if(config){
			    if(epBrowser.prefixTemp[prefix] && prefix.match(/^p\d+/)) uri = uri.replace(prefix + ":", "<span class='rdf_conf_prefix' alt='" + epBrowser.prefixTemp[prefix] + "'>" + prefix + "</span>:");
			    else if(epBrowser.prefixTemp[prefix]) uri = uri.replace(prefix + ":", "<span class='rdf_conf_prefix rdf_conf_custom_prefix' alt='" + epBrowser.prefixTemp[prefix] + "'>" + prefix + "</span>:");
			}
		    }
		    f = 1;
		    break;
		}
	    }
	}
	if(f == 0){
	    if(uri.match(/^urn:/)){
		[ , prefix, postfix] = uri.match(/^urn:(\w+):(.*)/);
		prefix_uri = "urn:" + prefix + ":";
	    }else{
		prefix = "p" + epBrowser.prefixCount;
		epBrowser.prefixCount++;

		// fetch prefix.cc
		if(!epBrowser.prefixCc404[prefix_uri]){
		    let url = "https://prefix.cc/reverse?format=json&uri=" + encodeURIComponent(prefix_uri);
		    fetch(url, {method: 'get', redirect: 'follow'}).then(res => {
			if(res.ok) return res.json();
			else{
			    epBrowser.prefixCc404[prefix_uri] = true;
			    return false;
			}
		    }).then(json => { epBrowser.setPrefixFromCc(json, renderDiv, param) });
		}
	    }
	    epBrowser.prefix[prefix] = prefix_uri;
	    epBrowser.prefixTemp[prefix] = prefix_uri;
	    uri = prefix + ":" + postfix;
	}
	epBrowser.usedPrefix[prefix] = prefix_uri;
	if(prefix_uri.length > epBrowser.maxPrefixUrlLen) epBrowser.maxPrefixUrlLen = prefix_uri.length;
	if(sparql) epBrowser.queryPrefix[prefix] = 1;
	return uri;      
    },

    setPrefixFromCc: function(json, renderDiv, param){
	let prefix_new = Object.keys(json)[0];
	if(prefix_new){
	    for(let prefix_tmp of Object.keys(epBrowser.prefixTemp)){
		if(epBrowser.prefixTemp[prefix_tmp] == json[prefix_new]){
		    epBrowser.setCustomPrefix(renderDiv, param, prefix_tmp, prefix_new);
		    break;
		}
	    }
	}
    },
    
    prefix: {
	"rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	"yago": "http://yago-knowledge.org/resource/",
	"foaf": "http://xmlns.com/foaf/0.1/",
	"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
	"dbo": "http://dbpedia.org/ontology/",
	"dbp": "http://dbpedia.org/property/",
	"gr": "http://purl.org/goodrelations/v1#",
	"dc": "http://purl.org/dc/elements/1.1/",
	"spacerel": "http://data.ordnancesurvey.co.uk/ontology/spatialrelations/",
	"owl": "http://www.w3.org/2002/07/owl#",
	"geo": "http://www.opengis.net/ont/geosparql#",
	"dcat": "http://www.w3.org/ns/dcat#",
	"xsd": "http://www.w3.org/2001/XMLSchema#",
	"ont": "http://purl.org/net/ns/ontology-annot#",
	"xtypes": "http://purl.org/xtypes/",
	"qb": "http://purl.org/linked-data/cube#",
	"sioc": "http://rdfs.org/sioc/ns#",
	"onto": "http://www.ontotext.com/",
	"org": "http://www.w3.org/ns/org#",
	"sio": "http://semanticscience.org/resource/",
	"skos": "http://www.w3.org/2004/02/skos/core#",
	"obo": "http://purl.obolibrary.org/obo/",
	"dct": "http://purl.org/dc/terms/",
	"void": "http://rdfs.org/ns/void#",
	"prov": "http://www.w3.org/ns/prov#",
	"dbpedia": "http://dbpedia.org/resource/",
	"faldo": "http://biohackathon.org/resource/faldo#"
    }
    
}
