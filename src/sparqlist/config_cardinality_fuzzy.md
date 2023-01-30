# rdf config cardinality set (for SPARQL support: Endpoint browser)

* 'subject_class を rdf:type に持つ主語' にぶら下がる 'predicate' の cardinarity 

## Parameters

* `endpoint`
  * default: https://sparql.uniprot.org/
* `subject_class`
  * default: http://purl.uniprot.org/core/Protein
* `predicate`
  * default: http://purl.uniprot.org/core/mnemonic
* `limit`
  * default: 1000000
* `id`
  * default: 1

## Endpoint 

{{endpoint}}

## `query1`

```sparql
SELECT ?s
WHERE {
  {
    SELECT ?s
    WHERE {
      ?s a <{{subject_class}}> .
    }
    LIMIT {{limit}}
  }
  MINUS { ?s <{{predicate}}> [] }
}
LIMIT 1
```

## `query2`

```sparql
SELECT ?s
WHERE {
  {
    SELECT DISTINCT ?s
    WHERE {
      ?s a <{{subject_class}}> ;
         <{{predicate}}> [] .
    }
    LIMIT {{limit}}
  }
  ?s <{{predicate}}> ?o1, ?o2 .
   FILTER (?o1 != ?o2)
}
LIMIT 1
```

## `query3`

```sparql
SELECT (COUNT (?s) AS ?c)
WHERE {
  {
    SELECT DISTINCT ?s
    WHERE {
      ?s a <{{subject_class}}> ;
         <{{predicate}}> ?o .
    }
    LIMIT {{limit}}
  }
}
```

## `return`

```javascript
({query1, query2, query3, limit, id})=>{
  let r1 = false;
  let r2 = false;
  if (query1.results.bindings[0]) {
    r1 = true;
  }
  if (query2.results.bindings[0]) {
    r2 = true;
  }
  let f = "f ";
  if (parseInt(query3.results.bindings[0].c.value) < limit) {
    f = "";
  }
  let r;
  if (r1) {
    if (r2) {
      r = f + "*";
    } else {
      r = f + "?";
    }
  } else {
    if (r2) {
      r = f + "+";	
    } else {
      r = f + "";
    }
  }
  return {"cardinality": r, "id": parseInt(id)};
}
```

