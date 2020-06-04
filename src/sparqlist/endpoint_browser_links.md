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
({entry, limit, inv, bnode, b_p, b_t})=>{
  inv = parseInt(inv);
  let code = "";
  if(entry.match(/^https*:\/\/.+/) || entry.match(/^urn:\w+:/) || entry.match(/^ftp:/) || entry.match(/^mailto:/)) entry = "<" + entry + ">";
  else if(!entry.match(/^["'].+["']$/) && !entry.match(/^["'].+["']@\w+$/)) entry = '"' + entry + '"';
  if(parseInt(bnode) == 0){
    code = "  VALUES ?s { " + entry + " }\n";
    if(inv != 1) code += "  ?s ?p ?o .";
    else code += "  ?o ?p ?s ." // inverse 
  }else{
    let links = JSON.parse(b_p);
    code = "  {\n    SELECT ?s\n    WHERE {\n";
    let predicates = "<" + links.join(">/<") + ">";
    if(inv == 1) predicates = "<" + links.reverse().join(">/<") + ">";  // inverse
    predicates = predicates.replace(/\<inv-http/g, "^<http"); 
    code += "      " + entry + " " + predicates + " ?s .\n";
    if(b_t) code += "      ?s a <" + b_t + "> .\n";
    code += "    } LIMIT 1\n  }\n";
    if(inv != 1) code += "  ?s ?p ?o .";
    else code += "  ?o ?p ?s ." // inverse 
  }
  let limit_code = "LIMIT " + limit;
  if(limit == 0) limit_code  = "";
  return {subject: code, limit: limit_code};
};
```

## Endpoint

{{endpoint}}

## `links`

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?s ?p ?c ?c_label (SAMPLE(?o) AS ?o_sample) (COUNT(?o) AS ?o_count) ?p_label
WHERE {
{{add_code.subject}}
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
    ?p rdfs:label ?p_label .
  }
}
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
SELECT DISTINCT ?s ?o ?o_label (COUNT(?x) AS ?c)
WHERE {
{{add_code.subject}}
  ?s a ?o .
  ?x a ?o .
  OPTIONAL {
    ?o rdfs:label ?o_label .
  }
}
ORDER BY DESC(?c)
LIMIT {{limit}}
```

## `return`

```javascript
({links, types, label, inv})=>{
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
  
  for(elm of json){
    let obj = {s: elm.s, p: type_p, o_sample: elm.o, c: elm.o, o_count: type_o_count};
    if(elm.o_label) obj['c_label'] = elm.o_label;
    res.push(obj);
  }
  json = links.results.bindings;
  for(elm of json){
    if(elm.o_sample && object2label[elm.o_sample.value]) elm.o_label = object2label[elm.o_sample.value];
    if(elm.p.value != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") res.push(elm);
  }
  return {data: res, inv: parseInt(inv)};
};
```
