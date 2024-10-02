# endpoint browser links (for SPARQL support: Endpoint browser)

* get properties (or inverse properties) and object classes of an instance
* for Endpoint browser (https://sparql-support.dbcls.jp/endpoint-browser.html)

## Parameters

* `endpoint`
  * default: https://tools.jpostdb.org/proxy/sparql
  * example: https://tools.jpostdb.org/proxy/sparql
* `entry`
  * default: http://rdf.jpostdb.org/entry/PRT810_1_Q9NYF8
  * example: http://rdf.jpostdb.org/entry/PRT810_1_Q9NYF8
* `graphs`
  * example: http://jpost.org/graph/database, http://jpost.org/graph/ontology
* `limit`
  * default: 50
* `inv`
  * default: 0
  * example: 0=subject, 1=object, 2=subject(for both repeat api)
* `bnode`
  * default: 0
* `b_p`
  * example: ["http://rdf.jpostdb.org/ontology/jpost.owl#hasPeptideEvidence"]
* `b_t`
  * example: http://rdf.jpostdb.org/ontology/jpost.owl#PeptideEvidence

## `add_code`

```javascript
({entry, limit, inv, bnode, b_p, b_t, graphs})=>{
  inv = parseInt(inv);
  let code = "";
  let spo_code = "";
  let class_flag = false;
  let multi_subject = false;
  if (entry.match(/^\s*https*:\/\/.+/) || entry.match(/^\s*urn:\w+:/) || entry.match(/^\s*ftp:/) || entry.match(/^\s*mailto:/)) {
    let nodes = entry.split(/,/);
    entry = "";
    for (const node of nodes) {
      entry += "<" + node.replace(/ /g, '') + "> ";
    }
    if (nodes.length > 1) multi_subject = true;
  } else if (entry.match(/^\s*a:https*:\/\/.+/) || entry.match(/^\s*class:https*:\/\/.+/)) {
    class_flag = true;
    multi_subject = true;
    entry = "<" + entry.replace(/ /g, '').replace(/^a:/, '').replace(/^class:/, '') + ">";                                                     
  } else if (!entry.match(/^["'].+["']$/) && !entry.match(/^["'].+["']@\w+$/) && !entry.match(/^["'].+["']\^\^xsd:\w+$/)) {
    entry = '"' + entry + '"';
  }
  if(parseInt(bnode) == 0){
    if (class_flag) code = "  ?s a " + entry + " .\n";
    else code = "  VALUES ?s { " + entry + " }";
  }else{
    let links = JSON.parse(b_p);
    code = "  {\n    SELECT ?s\n    WHERE {\n";
    let predicates = "<" + links.join(">/<") + ">";
    if(inv == 1) predicates = "<" + links.reverse().join(">/<") + ">";  // inverse
    predicates = predicates.replace(/\<inv-http/g, "^<http"); 
    code += "      " + entry + " " + predicates + " ?s .\n";
    if(b_t) code += "      ?s a <" + b_t + "> .\n";
    code += "    } LIMIT 1\n  }";
  }
  if(inv != 1) spo_code += "  ?s ?p ?o .";
  else spo_code += "  ?o ?p ?s ." // inverse 
  let limit_code = "LIMIT " + limit;
  if(limit == 0) limit_code  = "";
  let graph_code = "";
  if(graphs){
    for(let uri of graphs.split(/, /)){
      if(uri.match(/^https*:\/\/.+/)) graph_code += "FROM <" + uri + ">\n";
    }
  }

  return {subject: code, spo_code: spo_code, limit: limit_code, graph: graph_code, multi_subject: multi_subject};
};
```

## Endpoint

{{endpoint}}

## `subject`

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?s
{{add_code.graph}}
WHERE {
{{add_code.subject}}
{{add_code.spo_code}}
}
LIMIT 1
```

## `links`

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT DISTINCT ?p ?c ?c_label (SAMPLE(?o) AS ?o_sample) (COUNT(?o) AS ?o_count) (SAMPLE(?p_label_pre) AS ?p_label)
{{add_code.graph}}
WHERE {
{{add_code.subject}}
{{add_code.spo_code}}
  OPTIONAL {
    ?o a ?c .
    OPTIONAL {
      ?c rdfs:label ?c_label .
    }
  }
  OPTIONAL {
    ?o rdfs:label ?o_label .
  }
  OPTIONAL {
    ?p rdfs:label ?p_label_pre .
  }
  FILTER (LANG(?p_label_pre) = 'en' || LANG(?p_label_pre) = '') 
}
GROUP BY ?p ?c ?c_label ?p_label_pre
ORDER BY ?p
{{add_code.limit}}
```

## `o_sample_list`

```javascript
({links})=>{
  let list = links.results.bindings;
  let code = "";
  for(let i in list){
    if(list[i].o_sample.value.match(/^https*:\/\//)) code += "<" + list[i].o_sample.value + "> ";
  }
  return code;
};
```

## `label`

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?o ?label
{{add_code.graph}}
WHERE {
  VALUES ?o { {{o_sample_list}} }
  OPTIONAL {
    ?o rdfs:label ?label .
  }
}
```

## `types`

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?o ?o_label (COUNT(?x) AS ?c)
{{add_code.graph}}
WHERE {
{{add_code.subject}}
  ?s a ?o .
  ?x a ?o .
  OPTIONAL {
    ?o rdfs:label ?o_label .
  }
}
GROUP BY ?o ?o_label
ORDER BY DESC(?c)
LIMIT {{limit}}
```

## `return`

```javascript
({subject, links, types, label, inv})=>{
  let list = label.results.bindings;
  let object2label = [];
  for(let i in list){
    if(list[i].label) object2label[list[i].o.value] = list[i].label;
  }
  
  let res = [];
  let type_p = {type: "uri", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"};
  let type_o_count = {type: "typed-literal", datatype: "http://www.w3.org/2001/XMLSchema#integer", value: "1"};
  let json = types.results.bindings;

  /////// to unique class label (pref lang = "en")
  let type_uniq = {};
  for(elm of json){
    if(type_uniq[elm.o.value] && elm.o_label["xml:lang"] && elm.o_label["xml:lang"] == "en") type_uniq[elm.o.value] = elm;
    else if(!type_uniq[elm.o.value]) type_uniq[elm.o.value] = elm;  
  }
  json = [];
  for(key of Object.keys(type_uniq)){
    json.push(type_uniq[key]);
  }
  ////////
  
  let s = '';
  if (subject.results.bindings[0]) s = subject.results.bindings[0].s;
//  if (add_code.multi_subject) s = {type: "uri", value: "http://dummy.uri/dummy_multi_node"}
  for(elm of json){
    let obj = {s: s, p: type_p, o_sample: elm.o, c: elm.o, o_count: type_o_count};
    if(elm.o_label) obj['c_label'] = elm.o_label;
    res.push(obj);
  }
  json = links.results.bindings;
  for(elm of json){
    elm.s = s;
    if(elm.o_sample && object2label[elm.o_sample.value]) elm.o_label = object2label[elm.o_sample.value];
    if(elm.p.value != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") res.push(elm);
  }
  return {data: res, inv: parseInt(inv)};
};
```
