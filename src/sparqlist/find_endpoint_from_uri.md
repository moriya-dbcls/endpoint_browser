# find_endpoint_from_uri (for SPARQL support: Endpoint browser)

* Yamamoto's find endpoint API from instance URI
* for Endpoint browser (https://sparql-support.dbcls.jp/endpoint-browser.html)

## parameters

* `uri`
  * default: http://identifiers.org/uniprot/Q9NYF8
* `object`
  * example: true

## `rdfs`

```javascript
async ({uri, object}) => {
   let findUri = (api) => {
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
     let res = fetch(api, options).then(res=>{
       if(res.ok) return res.json();
       else return {response: false};
     });
     return res;
   }
  let params = ["rows=20", "fl=id,score,sparqlEndpoint", "wt=json"];
  uri =uri.replace(/^https*:\/\//, "");
  let elements = uri.split(/\//);
  let q = "";
  let pe = [];
  for(let i = 0; i < elements.length; i++){
    if(i == 0) q += "+hostNames:" + elements[i] + " ";
    else pe.push(i + "_" + encodeURIComponent(elements[i])); 
  }
  if(pe[0]) q += "+pathElements:(" + pe.join(" ") + ")";
  if(object == "true") q += "\n+isObject:true";
  else if(object == "false") q += "\n+isObject:false";
  params.push("q=" + encodeURIComponent(q));
  console.log(params);
  var res = await findUri("http://ep6.dbcls.jp:8983/solr/epsearch/select/?" + params.join("&"));
  return res.response; 
}
```

## `to_endpoint`

```javascript
({rdfs})=>{
  let endpointList = {
	"bmrb":	"http://bmrbpub.protein.osaka-u.ac.jp/search/rdf",
//	"bmse":
	"bioportal":	"https://integbio.jp/rdf/mirror/bioportal/sparql",
	"disgenet":	"https://integbio.jp/rdf/mirror/disgenet/sparql",
	"jpost":	"https://integbio.jp/rdf/sparql",
	"lsd":	"http://lsd.dbcls.jp/sparql",
	"opentggates":	"https://integbio.jp/rdf/sparql",
	"pro":	"http://sparql.proconsortium.org/virtuoso/sparql",
	"pathwaycommons":	"http://rdf.pathwaycommons.org/sparql/",
	"refEx":	"https://integbio.jp/rdf/sparql",
	"rhea":	"https://sparql.rhea-db.org/sparql",
	"uniprotall":	"https://integbio.jp/rdf/mirror/uniprot/sparql",
	"uniprot_bacteria":	"https://integbio.jp/rdf/mirror/uniprot/sparql",
	"allie":	"http://data.allie.dbcls.jp/sparql",
	"biomodels":	"https://integbio.jp/rdf/mirror/ebi/sparql",
	"biosamples":	"https://integbio.jp/rdf/mirror/ebi/sparql",
	"chebi":	"https://integbio.jp/rdf/mirror/ebi/sparql",
	"chembl":	"https://integbio.jp/rdf/mirror/ebi/sparql",
	"colil":	"http://colil.dbcls.jp/sparql",
//	"dbcatalog":	
	"eagle-i_harvard":	"https://harvard.eagle-i.net/sparqler/sparql",
	"eagle-i_upenn":	"https://eagle-i.itmat.upenn.edu/sparqler/sparql",
	"ensembl":	"https://integbio.jp/rdf/mirror/ebi/sparql",
	"expressionatlas":	"https://integbio.jp/rdf/mirror/ebi/sparql",
	"fa":	"http://navi.first.lifesciencedb.jp/fanavi/sparql",
//	"med2rdf":
	"mesh2019":	"https://id.nlm.nih.gov/mesh/sparql",	
	"nextprot":	"https://integbio.jp/rdf/mirror/misc/sparql",
	"ols":	"https://integbio.jp/rdf/mirror/ebi/sparql",
	"open-tggates":	"https://integbio.jp/rdf/sparql",
	"ordo":	"http://www.orpha.net/sparql",
//	"pubchem":	
	"reactome":	"https://integbio.jp/rdf/mirror/ebi/sparql"
 }

  let list = {};
  for(let ep of rdfs.docs){
    let [, id, direction] = ep.id.match(/^(.+)_([01])$/, "");
    id = id.toLowerCase();
    if(ep.sparqlEndpoint || endpointList[id]){
      if(list[id]){
        if(list[id].score < ep.score) list[id].score = ep.score;
        list[id].direction = 2;
      }else{
        if(ep.sparqlEndpoint && 
           (ep.sparqlEndpoint[0] == "http://sparql.bioontology.org/" || ep.sparqlEndpoint[0] == "https://www.ebi.ac.uk/rdf/services/sparql")){
          delete(ep.sparqlEndpoint);
        }
        if(!ep.sparqlEndpoint && endpointList[id]) ep.sparqlEndpoint = [ endpointList[id] ];	
        if(ep.sparqlEndpoint){
          list[id] = ep;
          list[id].id = id;
          list[id].direction = direction;
        }
      }
    }
  }
  return Object.values(list).sort(function(a,b){
           if( a.score > b.score ) return -1;
           if( a.score < b.score ) return 1;
           return 0;
         });
}
```
