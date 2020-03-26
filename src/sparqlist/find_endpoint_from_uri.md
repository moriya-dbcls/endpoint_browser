# find_endpoint_from_uri (for SPARQL support: Endpoint browser)

* Yamamoto's find endpoint API from instance URI
* for Endpoint browser (https://sparql-support.dbcls.jp/endpoint-browser.html)

## parameters

* `uri`
  * default: http://identifiers.org/uniprot/Q9NYF8

## `rdfs`

```javascript
async ({uri}) => {
   let findUri = (api) => {
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
   let res = fetch(api, options).then(res=>res.json());
    return res;
  }
  let params = ["rows=20", "fl=id,score", "wt=json"];
  uri =uri.replace(/^https*:\/\//, "");
  let elements = uri.split(/\//);
  let q = "";
  let pe = [];
  for(let i = 0; i < elements.length; i++){
    if(i == 0) q += "+hostNames:" + elements[i] + " ";
    else pe.push(i + "_" + elements[i]); 
  }
   if(pe[0]) q += "+pathElements:(" + pe.join(" ") + ")";
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
	"BMRB":	"http://bmrbpub.protein.osaka-u.ac.jp/search/rdf",
//	"BMSE":
	"BioPortal":	"https://integbio.jp/rdf/mirror/bioportal/sparql",
	"DisGeNET":	"https://integbio.jp/rdf/mirror/disgenet/sparql",
	"JPOST":	"https://integbio.jp/rdf/sparql",
	"LSD":	"http://lsd.dbcls.jp/sparql",
	"OpenTGGates":	"https://integbio.jp/rdf/sparql",
	"PRO":	"http://sparql.proconsortium.org/virtuoso/sparql",
	"PathwayCommons":	"http://rdf.pathwaycommons.org/sparql/",
	"RefEx":	"https://integbio.jp/rdf/sparql",
	"Rhea":	"https://sparql.rhea-db.org/sparql",
	"UniProtAll":	"https://integbio.jp/rdf/mirror/uniprot/sparql",
	"UniProt_Bacteria":	"https://integbio.jp/rdf/mirror/uniprot/sparql",
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

  for(let ep of rdfs.docs){
    if(endpointList[ep.id]) ep.uri = endpointList[ep.id];
  }
  return rdfs;
}
```

