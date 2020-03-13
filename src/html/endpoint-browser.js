// name:    SPARQL support: Endpoint browser
// version: 0.0.12
// https://sparql-support.dbcls.js/
//
// Released under the MIT license
// http://opensource.org/licenses/mit-license.php
// Copyright (c) 2019 Yuki Moriya (DBCLS)

var epBrowser = epBrowser || {
    version: "0.0.12",
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
    prefixCount: 0,

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
	try{
	    let res = fetch(url, options).then(res=>res.json());
	    res.then(function(json){
		if(renderDiv) epBrowser.loading.remove(svg, gid);
		callback(json, renderDiv, param);
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
	    g.selectAll("circle")
		.data(data)
		.enter()
		.append("circle")
		.attr("fill", "#888888")
		.attr("id", function(d){ return gid + "_" + d.c; })
		.attr("cx", function(d){ return d.x; })
		.attr("cy", hc - 10 + 30).attr("r", 0);
	    return [gid, svg, hc];
	},
	anime: function(svg, gid, hc){
	    let f = this.frame;
	    let g = svg.select("#l" + gid);
	    if(f == 0) g.selectAll("circle").transition().duration(240).attr("r", 8);
	    else if(f <= 4) g.select("#" + gid + "_" + f)
		.transition().duration(120).attr("cy", hc - 10 + 18)
		.transition().duration(120).attr("cy", hc - 10 + 35);
	    else g.selectAll("circle").transition().duration(240).attr("r", 0);
	},
	remove: function(svg, gid){
	    svg.select("#l" + gid).remove();
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
	if(stanza_params["entry"].match(/^https*:\/\/.+/)) epBrowser.prefix[":"] = stanza_params["entry"].match(/(.+[\/#:])[^\/#:]+$/)[1];
	
	// make DOM
	//// SVG DOM
	let renderDiv = d3.select(renderDivId);
	let svg = renderDiv.append("svg")
	    .attr("id", "epBrowser_svg")
	    .attr("width", param.width)
	    .attr("height", param.height);
	let g = svg.append('g').attr("id", "zoom_g"); // g for zoom
	g = g.append('g').attr("id", "drag_g");       // g for drag
	g.attr("transform", "translate(" + param.width / 2 +"," + param.height / 2 + ")"); // position init
	let edges_layer = g.append('g').attr("class", "edges_layer");
	let edges_label_layer = g.append('g').attr("class", "edges_label_layer");
	let nodes_layer = g.append('g').attr("class", "nodes_layer");
	let pop_edge_label = g.append('text').attr("id", "popup_label");
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
		    epBrowser.outerEp = value;
		    renderDiv.select("#outer_ep").text(value);
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
		    if(epBrowser.inverseFlag) param.apiArg.push("inv=1");
		    let url = epBrowser.api + epBrowser.getLinksApi;
		    console.log(param.apiArg.join(" "));
		    epBrowser.outerEpFlag = true;
		    epBrowser.fetchReq("post", url, renderDiv, param, epBrowser.updateGraph);
		}
		outerEpDiv.style("display", "none");
	    });
	
	// start svg zoom
	svg.call(d3.zoom().scaleExtent([0.1, 5])
                 .on("zoom", function(){
		     svg.select("#zoom_g").attr("transform", d3.event.transform);

		     epBrowser.hideVarNameDiv(renderDiv);
		 } ))
	    .on("dblclick.zoom", null);
	
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
		   off_click_inv: {}
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
	
	//// add data
	epBrowser.clickableFlag = true;
	epBrowser.addGraphData(api_json);
	epBrowser.forcegraph(renderDiv, param);
    },

    updateGraph: function(api_json, renderDiv, param){
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
	epBrowser.usedPrefix = {};
	epBrowser.maxPrefixUrlLen = 0;
	epBrowser.addGraphData(api_json);
	epBrowser.forcegraph(renderDiv, param);
    },
    
    forcegraph: function(renderDiv, param) {
	let data = epBrowser.graphData;
	let simulation = epBrowser.simulation;
	let svg = renderDiv.select('svg');
	let url = epBrowser.api + epBrowser.getLinksApi;
	    
//	console.log(JSON.stringify(epBrowser.graphData));
	
	let edges_layer = svg.select(".edges_layer");
	let edges_label_layer = svg.select(".edges_label_layer");
	let nodes_layer = svg.select(".nodes_layer");
	let edge_g = edges_layer.selectAll(".edge_g");
	let edge_label_g = edges_label_layer.selectAll(".edge_label_g");
	let node_g = nodes_layer.selectAll(".node_g");

//	console.log(data);
	
	// add
	edge_g = edge_g.data(data.edges, function(d) { return d.id; })
	edge_label_g = edge_label_g.data(data.edges, function(d) { return d.id; })
	node_g = node_g.data(data.nodes, function(d) { return d.id; })
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
	    .merge(node_g);
	
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
	let node_mouse_eve = node_g.append("g")
	    .attr("class", "node_mouse_eve_g");
	
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
		else if(d.predicate != epBrowser.rdfType && d.class) text = epBrowser.uriToShort(d.class);
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
			else if(d.predicate != epBrowser.rdfType && d.class) text = epBrowser.uriToShort(d.class);
			if(text.length > 23) return text;
		    }).style("display", "block"); })
	    .on("mouseout", function(d){ svg.select("#popup_label_" + d.id).style("display", "none"); })
	node_mouse_eve.append("text")
	    .filter(function(d) { return d.type == "uri"; })
	    .text(function(d) { return truncate(epBrowser.uriToShort(d.key), 20); })
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
                            if(epBrowser.inverseFlag) return "node node_" + d.node_type + " hover_inverse";
                            else return "node node_" + d.node_type + " hover";
			})
		} })
	    .on("mouseout", function(){
		d3.select(this).select("rect").attr("class", function(d){ return "node node_" + d.node_type; });
	    })
	    .style("cursor", "pointer");

	// identifiers.org && http://purl.
	if(epBrowser.outerEpFlag && epBrowser.outerEp === undefined){
	    node_g.filter(function(d){ return d.predicate != epBrowser.rdfType && (d.key.match(/http:\/\/identifiers\.org\//) || d.key.match(/http:\/\/purl\./)); })
		.append("polygon")
		.attr("class", "select_outer_endpoint")
		.attr("points", "85,-10 85,10 90,10 100,0 90,-10") 
		.attr("fill", "#888888")
		.style("cursor", "pointer")
		.on("click", function(d){
		    epBrowser.selectNode = d.id;
		    epBrowser.selectLayer = d.layer;
		    renderDiv.select("#outer_ep_click_uri").attr("value", d.key);
		    let mouse = d3.mouse(d3.select('body').node());
		    let outerSel = renderDiv.select("#outer_ep_select");
		    outerSel.selectAll(".outer_ep_opt").remove();
		    outerSel.selectAll(".outer_ep_opt")
			.data(epBrowser.endpointList[d.key].docs)
			.enter()
			.append("option")
			.attr("class", "outer_ep_opt")
			.attr("value", function(d){ return d.uri;})
			.text(function(d){ return d.id;});
		    renderDiv.select("#outer_endpoints")
			.style("position", "absolute")
			.style("top", mouse[1] + "px")
			.style("left", (mouse[0] + 20) + "px")
			.style("display", "block");
		});
	}else{
	    node_g.selectAll(".select_outer_endpoint").remove();
	}
	
	svg.selectAll("text").style("user-select", "none");

	// simulation
	epBrowser.startSimulation(edge, edge_label, node_g);
	
	// node drag
	function dragstarted(d) {
	    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
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
		.force("link", d3.forceLink(data.edges).id(d => d.id).distance(200).strength(2).iterations(3))
		.force("charge", d3.forceManyBody().strength(-1000))
		.force("x", d3.forceX().strength(0))
		.force("y", d3.forceY().strength(.2));
	}
	
//	simulation.force("link")
//	    .links(data.edges);
	
	simulation.on("tick", ticked);

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

    selectSubGraphMode: function(renderDiv){
	epBrowser.stopSimulation();
	renderDiv.select("#sparql_run_div").style("display", "block");
	
	let svg = renderDiv.select("svg");
	svg.selectAll(".node_mouse_eve_g")
	    .attr("class", function(d){
		let rect = d3.select(this).select("rect");
		let value = "off";
		if(d.sparql_label) value = d.sparql_label;
		changeNodeMode(renderDiv, d, rect, value);
		return "node_mouse_eve_g";
	    }) 
	    .on("click", function(d){
		let click_rect = d3.select(this).select("rect");
		if(d.sparql_label == undefined){
		    let next = "var";
		    if(d.predicate == epBrowser.rdfType) next = "const";
		    changeNodeMode(renderDiv, d, click_rect, next);
		}else if(d.sparql_label == "var"){
		    let next = "const";
		    if(d.type == "bnode") next = "path";
		    changeNodeMode(renderDiv, d, click_rect, next);
		}else if(d.sparql_label == "const"){
		    let next = "path";
		    if(d.predicate == epBrowser.rdfType || d.type.match(/literal/) || d.id == 0) next = "off";
		    changeNodeMode(renderDiv, d, click_rect, next);
		}else if(d.sparql_label == "path" || d.sparql_label == "blank"){
		    changeNodeMode(renderDiv, d, click_rect, "off");
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

	
	function changeNodeMode(renderDiv, d, click_rect, value){
	    epBrowser.hideVarNameDiv(renderDiv);
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
		    if(d.sparql_label == "var"){
			epBrowser.hideVarNameDiv(renderDiv);
			let mouse = d3.mouse(d3.select('body').node());
			let varNameDiv = renderDiv.select("#var_name_form")
			    .style("position", "absolute")
			    .style("top", mouse[1] + "px")
			    .style("left", (mouse[0] + 20) + "px").
			    style("display", "block");
			let input = varNameDiv.append("input").attr("id", "var_name").attr("type", "text")
			    .attr("size", "20").style("border", "solid 3px #888888")
			    .on("keypress", function(){
				let var_name = this.value;
				if(d3.event.keyCode === 13 && var_name && !var_name.match(/^\?$/)){
				    var_name = var_name.toLowerCase();
				    if(!var_name.match(/^\?/)) var_name = "?" + var_name;
				    let id = varNameDiv.select("#var_name_node_id").attr("value");
				   // console.log(id + " " + var_name);
				    epBrowser.setNodeVarName(renderDiv, id, var_name);
				}
			    });
			input.node().focus();      // focus -> value (move coursor to end of value)
			input.attr("value", "?n" + id);

			varNameDiv.select("#var_name_node_id").attr("value", id);
		    }else return null;
		});
	    }
	    
	    epBrowser.traceGraph(renderDiv);
	}
    },

    // selected subgraph to SPARQL query
    traceGraph: function(renderDiv){
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
		    epBrowser.traceGraph(renderDiv);  // re-trace (hit 'path -> blank' node)
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
		    triple.subject = epBrowser.uriToShort(nodes[0].key);
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
		    predicates.push(hat + epBrowser.uriToShort(p, 1));
		    predicates_html.push(hat + "<span style='color:#db7d25'>" + epBrowser.uriToShort(p, 1) + "</span>");
		    p_ids[nodes[j].predicate_id] = 1;
		}
		if(data.nodes[i].predicate){
		    let p = data.nodes[i].predicate;
		    let hat = "";
		    if(p.match(/^inv-/)){
			p = p.replace(/^inv-/, "");
			hat = "^";
		    }
		    predicates.push(hat + epBrowser.uriToShort(p, 1));
		    predicates_html.push(hat + "<span style='color:#db7d25'>" + epBrowser.uriToShort(p, 1) + "</span>");
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
		    triple.object = epBrowser.uriToShort(data.nodes[i].key, 1)
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
	query += "PREFIX : <" + epBrowser.prefix[":"] + ">\n";
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
	html += "PREFIX <span class='sparql_prefix'>:</span> <span class='sparql_uri'>&lt;" + epBrowser.prefix[":"] + "&gt;</span>\n";
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
		}else if(!epBrowser.subgraphMode && !epBrowser.nodeRemoveMode){
		    optionalSearchFlag = true;
		    opt.style("display", "block");
		    ctrl.attr("transform", "translate(0,56)");
		}
	    });
	box.append("text").attr("x", 225).attr("y", 15).text(")").attr("font-size", "11px");
	
	makeBrowseOpt(80, "inverse link", optInverse);
	makeBrowseOpt(240, "federated search", optFederated);
	
	makeSwitch(80, "property", propertySwitch);
	makeSwitch(220, "prefix list", prefixListSwitch);
	makeSwitch(366, "layer arrangement", gridGraphSwitch);
	makeSwitch(586, "force sim.", forceSwitch, true);
	makeSwitch(734, "scroll zoom", zoomSwitch, true);

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

	    if(text == "browsing"){
		reDrawGraph();
	    }else if(text == "subgraph to SPARQL"){
		reDrawGraph();
		epBrowser.subgraphMode = true;
		epBrowser.selectSubGraphMode(renderDiv);
	    }else if(text == "remove node"){
		epBrowser.nodeRemoveMode = true;
		reDrawGraph();
		let node_g = svg.selectAll(".node_mouse_eve_g");
		node_g.on("click", function(d){ epBrowser.removeGraphData(renderDiv, param, d); })
		    .on("mouseover", function(d){ 
			if(d.child){
			    let childs = svg.selectAll(".parent_" + d.id);
			    childs.selectAll("rect").attr("class", function(d){ return "node node_" + d.node_type + " node_red";} );
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
			epBrowser.hideVarNameDiv(renderDiv);
			let mouse = d3.mouse(d3.select('body').node());
			let varNameDiv = renderDiv.select("#var_name_form")
			    .style("position", "absolute")
			    .style("top", mouse[1] + "px")
			    .style("left", (mouse[0] + 20) + "px")
			    .style("display", "block");
			let input = varNameDiv.append("input").attr("id", "var_name").attr("type", "text")
			    .attr("size", "80").style("border", "solid 3px #888888")
			    .on("keypress", function(){
				let outerEp = this.value;
				if(d3.event.keyCode === 13 && outerEp.match(/^https*:\/\//)){
				    if(outerEp.match(/^https*:\/\//)){
					epBrowser.outerEp = outerEp;
					epBrowser.outerEpFlag = true;
					epBrowser.clickableFlag = true;
					outer_ep_box.select("#outer_ep").text(outerEp);
				    }else{
					epBrowser.outerEpFlag = false;
					changeModeSwitchColor(renderDiv.select("#browsing_mode_switch_g"), true);
				    }
				    epBrowser.hideVarNameDiv(renderDiv);
				    reDrawGraph();
				}
			    });
			input.node().focus();
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
		let prefix_g = svg.select("#prefix_g");
		let prefix_box = prefix_g.append("g").attr("id", "prefix_box");
		let x = 190;
		let y = 120;
		prefix_box.append("rect").attr("width", epBrowser.maxPrefixUrlLen * 8 + 160)
		    .attr("height", Object.keys(epBrowser.usedPrefix).length * 20 + 100)
		    .attr("x", x).attr("y", y)
		    .attr("fill", "#f8f8f8").attr("stroke", "#cccccc").attr("stroke-width", "3px");
		let keys = Object.keys(epBrowser.usedPrefix);
		let count = 0;
		for(let i = 0; i < keys.length; i++){ // custom prefix
		    if(epBrowser.prefixTemp[keys[i]]) makePrefixLine(prefix_box, keys[i], x, y, count++, true);
		}
		makePrefixLine(prefix_box, ":", x, y, count++, false);
		for(let i = 0; i < keys.length; i++){ // fixed prefix
		    if(!epBrowser.prefixTemp[keys[i]] && keys[i] != ":") makePrefixLine(prefix_box, keys[i], x, y, count++, false);
		}
		prefix_box.append("text").text("< close >").attr("x", x + 40).attr("y",  y + keys.length * 20 + 60)
		    .attr("font-size", "13px").style("cursor", "pointer").attr("fill", "#1680c4")
		    .on("click", function(){
			prefixListSwitch(box.select("#prefix_list_switch_g"), false)
		    });
	    }else{
		svg.select("#prefix_box").remove();
		epBrowser.hideVarNameDiv(renderDiv);
	    }
	}

	function makePrefixLine(prefix_box, key, x, y, line_num, custom){
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
		    epBrowser.hideVarNameDiv(renderDiv);
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
			    if(d3.event.keyCode === 13 && prefix_new && prefix_new.match(/\w+/)){
				prefix_new = prefix_new.match(/(\w+)/)[1];
				prefix_new = prefix_new.toLowerCase();
				let id = varNameDiv.select("#var_name_node_id").attr("value");
				textElm.text(prefix_new + ":");
				epBrowser.setCustomPrefix(renderDiv, param, prefix_tmp, prefix_new);
			    }
			});
		    input.node().focus();      // focus -> value (move coursor to end of value)
		    input.attr("value", prefix_tmp);
		})
		.style("cursor", "pointer");
	    prefix_box.append("text").text("<" + epBrowser.usedPrefix[key] + ">").attr("fill", "#666666")
		.attr("font-size", "13px").attr("x", x + 120).attr("y", y + (line_num * 20) + 40);
	}
	
	function zoomSwitch(g, flag){
	    changeSwitchColor(g, flag);
	    if(flag){
		svg.on(".drag", null);
		svg.call(d3.zoom().scaleExtent([0.1, 5])
			 .on("zoom", function(){
			     renderDiv.select("#zoom_g").attr("transform", d3.event.transform);
			     epBrowser.hideVarNameDiv(renderDiv);
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
			     epBrowser.hideVarNameDiv(renderDiv);
			 } ));
	    }
	}

	function gridGraphSwitch(g, flag){
	    changeSwitchColor(g, flag);
	    chageGraphTypeFlag = true;
	    if(flag){
		epBrowser.hideVarNameDiv(renderDiv);
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
	}
	
	// temporaly mode change by key press
	document.addEventListener('keydown', (e) => {
	    let flag = false;
	    if(e.key == "r" || e.key == "s" || e.key == "b" || e.key == "i" || e.key == "f") flag = true;
	    if(renderDiv.select("#var_name_form").style("display") == "block"
	       || renderDiv.select("#outer_endpoints").style("display") == "block") flag = false;
	    if(epBrowser.keyPressFlag) flag = false;
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
    
    hideVarNameDiv: function(renderDiv){
	let div = renderDiv.select("#var_name_form").style("display", "none");
	div.select("#var_name").remove();
	renderDiv.select("#outer_endpoints").style("display", "none");
    },

    setNodeVarName: function(renderDiv, id, var_name){
	let nodes = epBrowser.graphData.nodes;
	for(elm of nodes){
	    if(elm.id == id){
		elm.sparql_var_name = var_name;
		break;
	    }
	}
	let sparql_node_g = renderDiv.select("#popup_sparql_node_g_" + id);
	sparql_node_g.select("text").text(var_name);
	epBrowser.hideVarNameDiv(renderDiv);
	epBrowser.traceGraph(renderDiv);
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
	epBrowser.hideVarNameDiv(renderDiv, param);
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
    
    addGraphData: function(api_json){
	//console.log(api_json);
	let json = api_json.data;
	
	if(!json[0]) return 0;
	   
	let inverse = api_json.inv;
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

	// replace type label of select node (for multi type)
	if(!inverse && json[0].p.value == epBrowser.rdfType && json[0].c){
	    epBrowser.graphData.nodes[epBrowser.selectNode].class = json[0].c.value;
	    epBrowser.graphData.nodes[epBrowser.selectNode].class_type = json[0].c.type;
	    if(json[0].c_label){
		epBrowser.graphData.nodes[epBrowser.selectNode].class_label = json[0].c_label.value;
		epBrowser.graphData.nodes[epBrowser.selectNode].class_label_type = json[0].c_label.type;
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
		off_click: {},
		off_click_inv: {}
	    };
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
		    //// don't add edge, add predicate label
		    let flag = 1;
		    let add_predicate = epBrowser.uriToShort(json[i].p.value);
		    for(elm of data.edges){
			if(elm.target == nodeKey2id[obj.key]){
			    elm.predicate_label += ", " + add_predicate;
			    flag = 0;
			    break;
			}
		    }
		    ////
		    if(flag){
			data.edges.push({id: edgeId, source: source, target: target, predicate: json[i].p.value, predicate_label: epBrowser.uriToShort(json[i].p.value), count: json[i].o_count.value, parent: parent, edge_key: edge_key});
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
		    }
		    edgeList[edge_key] = 1;
		}
	    }else{
		nodeKey2id[obj.key] = nodeId;
		data.nodes.push(obj);
		data.edges.push({id: edgeId, source: source, target: target, predicate: json[i].p.value, predicate_label: epBrowser.uriToShort(json[i].p.value), count: json[i].o_count.value, parent: parent, edge_key: edge_key});
		edgeList[edge_key] = 1;
		edgeST2id[source + "_" + target] = edgeId;
		nodeId++;
		edgeId++;
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
	json.docs.unshift({id: "-- select endpoint", uri: false });
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

    uriToShort: function(uri, sparql){
	let f = 0;
	let prefix = "";
	let [ , prefix_uri, postfix]  = uri.match(/(.+[\/#:])([^\/#:]*)$/);
	if(!uri.match(/^urn:/)){
	    for(key of Object.keys(epBrowser.prefix)){
		if(uri.match(epBrowser.prefix[key]) && prefix_uri == epBrowser.prefix[key]){
		    prefix = key;
		    if(prefix.match(/^:$/)) uri = uri.replace(epBrowser.prefix[key], prefix); //enrtry
		    else uri = uri.replace(epBrowser.prefix[key], prefix + ":");
		    f = 1;
		    break;
		}
	    }
	}
	if(f == 0){
	    if(uri.match(/^urn:/)){
		[ , prefix, postfix] = uri.match(/^urn:(\w+):(.+)/);
		prefix_uri = "urn:" + prefix + ":";
	    }else{
		prefix = "p" + epBrowser.prefixCount;
		epBrowser.prefixCount++;
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
