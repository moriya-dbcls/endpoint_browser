# find_same_type_nodes (for SPARQL support: Endpoint browser)

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
* `target_predicate`
  * default: http://rdf.jpostdb.org/ontology/jpost.owl#hasIsoform
* `target_class`
  * default: http://rdf.jpostdb.org/ontology/jpost.owl#ProteinIsoform
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
({entry, limit, inv, bnode, b_p, b_t, target_predicate, target_class, graphs})=>{
  inv = parseInt(inv);
  let code = "";
  if(entry.match(/^https*:\/\/.+/) || entry.match(/^urn:\w+:/) || entry.match(/^ftp:/) || entry.match(/^mailto:/)) entry = "<" + entry + ">";
  else if(!entry.match(/^["'].+["']$/) && !entry.match(/^["'].+["']@\w+$/)) entry = '"' + entry + '"';
  if(parseInt(bnode) == 0){
    code = "  VALUES ?s { " + entry + " }\n";
    code += "  VALUES ?p { <" + target_predicate + "> }\n";
    if(inv != 1) code += "  ?s ?p ?o .";
    else code += "  ?o ?p ?s ." // inverse 
  }else{
    let links = JSON.parse(b_p);
    code = "  VALUES ?p { <" + target_predicate + "> }\n";
    code += "  {\n    SELECT ?s\n    WHERE {\n";
    let predicates = "<" + links.join(">/<") + ">";
    if(inv == 1) predicates = "<" + links.reverse().join(">/<") + ">";  // inverse
    predicates = predicates.replace(/\<inv-http/g, "^<http"); 
    code += "      " + entry + " " + predicates + " ?s .\n";
    if(b_t) code += "      ?s a <" + b_t + "> .\n";
    code += "    }\n  }\n";
    if(inv != 1) code += "  ?s ?p ?o .";
    else code += "  ?o ?p ?s ." // inverse 
  }
  let class_code = ""
  if(target_class){
     class_code = "FILTER( ?c = <" + target_class + "> )";
  }
  let limit_code = "LIMIT " + limit;
  if(limit == 0) limit_code  = "";
  let graph_code = "";
  if(graphs){	
    for(let uri of graphs.split(/, /)){
      if(uri.match(/^https*:\/\/.+/)) graph_code += "FROM <" + uri + ">\n";
    }
  }
  return {subject: code, limit: limit_code, class: class_code, graph: graph_code};
};
```

## Endpoint

{{endpoint}}

## `nodes`

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?o
{{add_code.graph}}
WHERE {
{{add_code.subject}}
  OPTIONAL {
    ?o a ?c .
    {{add_code.class}}
  }
}
ORDER BY ?o
```

## `return`

```javascript
({nodes})=>{
  let res = [];
  for(let elm of nodes.results.bindings){
    res.push(elm.o.value);
  }
  return {data: res};
};
```
