/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * Handle broadcasts to and from Kegg Pathway database
 */
var FG_kegg = new Object();


/**
 * This handler can scrape graphical pathway view pages. We also scrape search results
 * in a seperate handler.
 */
FG_kegg.recognize = function(doc) {
	if (doc) {
		var url = doc.location.href;
		return url.indexOf("http://www.genome.jp/kegg-bin/mark_pathway_www") >=0 ||
			url.indexOf("http://www.genome.jp/dbget-bin/get_pathway") >=0 ||
			url.indexOf("http://www.genome.jp/dbget-bin/show_pathway?") >=0 ||
			url.indexOf("http://www.genome.jp/kegg-bin/show_pathway?") >=0 ||
			url.indexOf("http://www.genome.jp/kegg/pathway/") >=0 ||
			url.indexOf("http://www.genome.ad.jp/kegg-bin/mark_pathway_www") >=0 ||
			url.indexOf("http://www.genome.ad.jp/dbget-bin/get_pathway") >=0 ||
			url.indexOf("http://www.genome.ad.jp/dbget-bin/show_pathway?") >=0 ||
			url.indexOf("http://www.genome.ad.jp/kegg/pathway/") >=0;
            
            // this might be worth doing, but, the actual KEGG pathway is just a click away
            // || url.indexOf("http://david.abcc.ncifcrf.gov/kegg.jsp") >=0;
	}
	else
		return false;
}


FG_kegg.show = function() {
	var url = "http://www.genome.jp/kegg/pathway.html";
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}


/**
 * return an object with a list of names and a species
 */
FG_kegg.getPageData = function(doc) {
	var results = [];

	// get the species and list of genes in the pathway
	var species = this.getSpecies(doc);
	var names = this.getNameList(doc);
	var pathway = this.getPathwayName(doc);

	results.push(
		new FG_GaggleData(
		    "Genes in " + pathway + " Pathway",
		    "NameList",
			names.length,
			species,
			names));

	results.push(this.getNetworkGaggleData(doc, pathway, species));

	return results;
}


FG_kegg.getNetworkGaggleData = function(doc, pathway, species) {
	var gaggleData = new FG_GaggleData(
		    "Kegg Pathway",
		    "Network",
		    null,
			species,
			null);

	var organismCode = this.getOrganismCode(doc);
	var kegg = this;
	
	gaggleData.isAsynch = true;
	gaggleData.asynchronouslyFetchData = function(callback) {
		if (!this._data) {
			this._callback = callback;
			kegg.getNetworkXml(organismCode, this);
			gaggleData.isAsynch = false;
		}
		else {
			callback();
		}
	}
	
	return gaggleData;
}


/**
 * scrape scpecies name from drop-down menu
 */
FG_kegg.getSpecies = function(doc) {
	if (doc) {
		// pull species out of select drop-down
		var species = "unknown";
		elements = doc.getElementsByName("org_name");
		if (elements.length > 0) {
			var element = elements.item(0);
			species = this.toStandardSpeciesName(element.value);
			return species;
		}
	}
	return "unknown";
}


FG_kegg.getOrganismCode = function(doc) {
	elements = doc.getElementsByName("org_name");
	if (elements.length > 0)
		return elements.item(0).value;
	else
		// the generic KEGG pathway
		return "map";	
}


FG_kegg.getPathwayName = function(doc) {
	try {
		var title = ufmt.getText(ufmt.first(doc.getElementsByTagName("title")));
		return title.substring(0,title.indexOf(" - "));
	}
	catch (e) {
		FG_trace(e);
		return "KEGG";
	}
}


/**
 * scrape a KEGG pathway page and return a
 * list of gene names found in the page.
 */
FG_kegg.getNameList = function(doc) {
	if (doc) {

		var url = doc.location.href;

		var elements = doc.getElementsByName("mapno");
		if (elements && elements[0]) {
			var mapno = elements[0].value;
			elements = doc.getElementsByName("org_name");
			if (elements.length > 0)
				var organism = elements.item(0).value;
			dump("kegg:"+organism+ ":" + mapno + "\n");
		}

		// array of names
		var names = [];

		// tack on the ability to test for membership in the array
		names.contains = function(a) {
			for (var n in this) {
				if (this[n] == a)
					return true;
			}
			return false;
		}

		// grab the query string of urls that look like this
		var re = /\/dbget-bin\/www_bget\?(.*)/;

//		var reCompound = /C\d+/;
		var reGene = new RegExp(organism + ":(\\w+)");

	    // these pages have an image map. The area tags of the image
	    // map have the genes in their urls.
		var elements = doc.getElementsByTagName("area");

		// scrape gene names out of links in the image map
		for (var i=0; i < elements.length; i++) {
			var element = elements.item(i);
			var href = element.getAttribute("href");
			var m = re.exec(href);
			if (m) {
				var namesInQueryString = m[1].split("+");
				if (namesInQueryString[0] != "compound" && namesInQueryString[0]!="pathway") {
					for (var n in namesInQueryString) {
						m = reGene.exec(namesInQueryString[n])
						if (m) {
							var name = m[1];
							if (!names.contains(name)) {
								names.push(name);
							}
						}
					}
				}
			}
		}
		names.sort();
		return names;
	}
}


/**
 * given a pathway (ex: 'path:eco00520'), retrieves the genes in that pathway
 * organism is specified in the name of the pathway (eco = e. coli)
 */
FG_kegg.get_genes_by_pathway = function(pathway)
{
	var p  = new Array();
	p[0]   = new SOAPParameter(pathway,'pathway_id');

	var method    = "get_genes_by_pathway";
	var soapCall  = new SOAPCall();
	var endPoint = "http://soap.genome.jp/keggapi/request_v6.1.cgi";

	soapCall.transportURI = endPoint;

	soapCall.encode(0,method,"SOAP/KEGG",0,null,p.length,p);
	var returnValue = soapCall.invoke();

	// process return value
	//print( (new XMLSerializer()).serializeToString(returnValue.message));
	if (returnValue.fault) {
		alert(returnValue.fault.faultString);
	}
	else {
		genes = []
		var body = returnValue.body;
		var elements = body.getElementsByTagName("item");
		for (var i=0; i<elements.length; i++) {
			genes.push(this._removePrefix(elements[i].firstChild.textContent));
		}
		return genes;
	}
}


/**
 * returns the part of the string after the semicolon.
 * Kegg returns genes like this: eco:b2038, we just
 * want b2038
 */
FG_kegg._removePrefix = function(s) {
	var pos = s.indexOf(":");
	if (pos>-1)
		return s.substring(pos+1);
	else
		return s;
}


/**
 * takes a species and a Java Array of names, searches using KEGG form at:
 * http://www.genome.jp/kegg/tool/search_pathway.html
 */
FG_kegg.handleNameList = function(species, names) {
	// construct a query string out of the name list
	var queryString = "";
	if (names.length > 0) {
		queryString += names[0];
	}
	for (var i=1; i<names.length; i++) {
		queryString += "+";
		queryString += names[i];
	}

	// construct a URL to search kegg
	var url =	"http://www.genome.jp/kegg-bin/search_pathway_object?"
			+ "org_name=" + this.toKeggSpeciesCode(species) 
			+ "&warning=yes"
			+ "&submit=Exec"
			+ "&unclassified=" + queryString;

	// open the kegg URL in a new tab
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}


/**
 * gets an XML representation of the currently viewed pathway
 * from KEGG and converts it to a network.
 */
FG_kegg.getNetworkXml = function(organismCode, gaggleData) {
	var doc = window.content.document;
	var elements = doc.getElementsByName("mapno");
	if (elements && elements[0]) {
		var mapno = elements[0].value;
//		var url = "http://www.genome.jp/kegg/KGML/KGML_v0.6.1/" + organismCode
//		          + "/" + organismCode + mapno + ".xml";
		var url = "http://www.genome.jp/kegg-bin/download?entry=" + organismCode + mapno + "&format=kgml";
		FG_trace("making kegg ws request url = " + url);

		var request = new XMLHttpRequest();

		request.onreadystatechange = this.createRequestCallback(request, gaggleData);

		request.open("GET", url);
		request.setRequestHeader("User-Agent", "XMLHttpRequest");
		request.setRequestHeader("Accept-Language", "en");

		request.send(null);
	}
	else {
		dump("Error in FG_kegg: couldn't find mapno.\n")
	}
}


/**
 * creates a closure to be notified when the request for
 * an XML document has completed.
 */
FG_kegg.createRequestCallback = function(request, gaggleData) {
	var kegg = this;
	return function() {
		if (request.readyState == 4) {
			if (request.status == 200) {
				// parse the xml and build a network
				var network = kegg.processKeggXml(request.responseXML);
				FG_trace("kegg ws request completed!!");

				// store the network in GaggleData object and notify callback.
				gaggleData._data = network;
				if (gaggleData._callback())
					gaggleData._callback();
			}
			else {
				kegg._requestFailed(request);
			}
		}
	}
}


/**
 * takes a KEGG Markup Language XML document and
 * creates a gaggle network.
 */
FG_kegg.processKeggXml = function(xml) {
	if (xml) {
		var entries = {};
		var enzymes = {};
		var relations = [];
		var groups = [];
		var network = javaFiregooseLoader.createNetwork();

		// get entries
		var elements = xml.getElementsByTagName("entry");
		var attrs = ["id", "name", "type", "link", "reaction", "map"];
		for (var i=0; i<elements.length; i++) {
			FG_trace("i = " + i);

			// process an entry element
			var element = elements[i];
			var entry = this._attributesToObject(element, attrs);
			if (entry.type && entry.type=="gene")
				entry = this._stripNames(entry);
			entries[entry.id] = entry;
			if (entry.reaction) {
				enzymes[entry.reaction] = entry;
				FG_trace("ezymes[" + entry.reaction + "] = " + entry.name);
			}

			// entries can be "grouped" which seems to mean they form a complex
			if (entry.type=="group") {
				FG_trace("ezymes[" + entry.type + "] = " + entry.name);
				var components = element.getElementsByTagName("component");
				var group = [];
				for (var j=0; j<components.length; j++) {
					group.push(components[j].getAttribute("id"));
				}
				groups.push(group);
			}
			else {
				// if an entry isn't a group, it becomes a node in the network
				network.add(entry.name);
				FG_trace("entry[" + entry.type + "] = " + entry.name);

				// add attributes to node
				if (entry.type)
					network.addNodeAttribute(entry.name, "type", entry.type);
				if (entry.link)
					network.addNodeAttribute(entry.name, "link", entry.link);
				if (entry.reaction)
					network.addNodeAttribute(entry.name, "reaction", entry.reaction);
				if (entry.map)
					network.addNodeAttribute(entry.name, "map", entry.map);
				var graphicsElements = element.getElementsByTagName("graphics");
				if (graphicsElements && graphicsElements.length > 0) {
					var graphics = graphicsElements[0];
					if (graphics.hasAttribute("name"))
						network.addNodeAttribute(entry.name, "common name", graphics.getAttribute("name"));
				}
			}
		}
		
		FG_trace("looking for groups");

		// add edges between all members of groups
		for (var j=0; j<groups.length; j++) {
			var group = groups[j];
			for (var m=0; m<group.length-1; m++) {
				for (var n=m+1; n<group.length; n++) {
					var g1 = group[m];
					var g2 = group[n];
					if (entries[g1] && entries[g2]) {
						FG_trace(">>> " + g1 + ", " + g2 + " :: " +  entries[g1].name + ", " +  entries[g2].name);
						var interaction = javaFiregooseLoader.createInteraction(entries[g1].name, entries[g2].name, "group");
						network.add(interaction);
					}
				}
			}
		}
		
		FG_trace("looking for relations");

		// get relations
		elements = xml.getElementsByTagName("relation");
		attrs = ["entry1", "entry2", "type"];
		for (var i=0; i<elements.length; i++) {
			var relation = this._attributesToObject(elements[i], attrs);
			FG_trace(" relation >>> " + entries[relation.entry1].name + ", " + entries[relation.entry2].name + " :: " +  relation.type);
			relations.push(relation);
			var interaction = javaFiregooseLoader.createInteraction(entries[relation.entry1].name, entries[relation.entry2].name, relation.type);
			network.add(interaction);
			// TODO get subtype
		}
		
		FG_trace("looking for reactions");

		// get reactions
		elements = xml.getElementsByTagName("reaction");
		attrs = ["name", "type"];
		for (var i=0; i<elements.length; i++) {
			var element = elements[i];
			var reaction = this._attributesToObject(element, attrs);
			FG_trace("reaction.name  >>>>  " + reaction.name);
			var enzyme = enzymes[reaction.name];
			
			// may be more than one of these
			var substrates = element.getElementsByTagName("substrate");
			var products = element.getElementsByTagName("product");
			
			if (enzyme) {
				for (var j=0; j<substrates.length; j++) {
					for (var k=0; k<products.length; k++) {
						var substrate = substrates[j].getAttribute("name");
						var product = products[k].getAttribute("name");
						FG_trace(">>>> " + substrate + " " + enzyme.name + " " + product);
						var interaction = javaFiregooseLoader.createInteraction(substrate, enzyme.name, "reaction");
						network.add(interaction);
						network.addEdgeAttribute(interaction.toString(), "type", reaction.type);
						var interaction = javaFiregooseLoader.createInteraction(enzyme.name, product, "reaction");
						network.add(interaction);
						network.addEdgeAttribute(interaction.toString(), "type", reaction.type);
					}
				}
			}
			// Seems like this shouldn't happen, but it does sometimes
			else {
				FG_trace("KEGG XML: reaction without associated enzyme.");
				for (var j=0; j<substrates.length; j++) {
					for (var k=0; k<products.length; k++) {
						var substrate = substrates[j].getAttribute("name");
						var product = products[k].getAttribute("name");
						FG_trace(">>>> " + substrate + " " + product);
						var interaction = javaFiregooseLoader.createInteraction(substrate, product, "reaction");
						network.add(interaction);
						network.addEdgeAttribute(interaction.toString(), "type", reaction.type);
					}
				}
			}
		}
		
		return network;
	}
}


/**
 * read properties from the attributes of an xml element
 * into a javascript object.
 */
FG_kegg._attributesToObject = function(element, attrs) {
	var object = {};
	for (var i in attrs) {
		var attr = attrs[i];
		if (element.hasAttribute(attr))
			object[attr] = element.getAttribute(attr);
	}
	return object;
}


FG_kegg._geneNamePattern = /\w+:(\w*)/;


/**
 * strip the prefix off of KEGG node names
 */
FG_kegg._strip = function(s) {
	var m = this._geneNamePattern.exec(s);
	if (m)
		return m[1];
	else
		return s;
}


FG_kegg._stripNames = function(obj) {
	if (obj.name) {
		var s = "";
		var names = obj.name.split(" ");
		if (names.length > 0)
			s = this._strip(names[0]);
		for (var i=1; i<names.length; i++)
			s += " " + this._strip(names[i]);
		obj.name = s;
	}
	return obj;
}


FG_kegg._requestFailed = function(request) {
	var status = "?";
	try {
		status = request.status;
	}
	catch (e) {
		FG_trace("failed KEGG request = " + request);
	}

	alert("Failed to retrieve KEGG pathway. (" + status + ") KEGG doesn't make all their pathways available as XML.");
}


/**
 * convert a standard species name to a KEGG
 * species code
 */
FG_kegg.toKeggSpeciesCode = function(s) {
    // if no species, return "map" which means reference pathway
    // NOTE: this fails 'cause the gene names aren't recognized
	if (!s) return "map";

	// make sure we're dealing with a javascript string, not a java string
	s = "" + s;
	s = s.toLowerCase();

	s = s.replace(" str. ", " ");
	s = s.replace(" substr. ", " ");
	dump("converting species: " + s + "\n");

	// fudge for species synonyms
	if (s in this.speciesSynonyms) {
		return this.speciesSynonyms[s];
	}

	// linear search through the list of species names
	// NOTE: that we're using "starts with" to be liberal
	for (var code in this.speciesCodes) {
		if (FG_util.startsWith(this.speciesCodes[code], s)) {
			return code;
		}
	}

	// return "map" which means get the reference pathway
	return "map";
}


/**
 * special hack to be liberal about names
 */
FG_kegg.speciesSynonyms = {
"halobacterium sp.": "hal",
"halobacterium nrc-1": "hal",
"halobacterium salinarum": "hal",
"halobacterium salinarum nrc-1": "hal",
"halobacterium": "hal",
"human": "hsa",
"h. sapiens": "hsa",
"escherichia coli": "eco",
"escherichia coli k12": "eco",
"escherichia coli k12 mg1655": "eco",
"escherichia coli k12 w3110": "ecj",
"escherichia coli k12 dh10b": "ecd",
"e. coli": "eco",
"chimpanzee": "ptr",
"rhesus monkey": "mcc",
"mouse": "mmu",
"rat": "rno",
"rattus": "rno",
"dog": "cfa",
"cow": "bta",
"pig": "ssc",
"opossum": "mdo",
"chicken": "gga",
"african clawed frog": "xla",
"western clawed frog": "xtr",
"zebrafish": "dre",
"purple sea urchin": "spu",
"sea anemone": "nve",
"fruit fly": "dme",
"mosquito": "aga",
"nematode": "cel",
"thale cress": "ath",
"japanese rice": "osa",
"eremothecium gossypii": "ago",
"methanococcus maripaludis": "mmp",
"m. maripaludis": "mmp",
"rhodopseudomonas palustris": "rpa",
"prochlorococcus marinus": "pmn",
"pyrococcus furiosus dsm 3638": "pfu",
"sulfolobus solfataricus p2": "sso",
"synechococcus elongatus pcc 7942": "syf"
}


/**
 * convert a KEGG species code to standard species name
 */
FG_kegg.toStandardSpeciesName = function(code) {
	var species = this.speciesCodes[code];
	if (!species)
		return code;
	else
		return species;
}


FG_kegg.speciesCodes = {
"hsa": "homo sapiens",
"ptr": "pan troglodytes",
"mcc": "macaca mulatta",
"mmu": "mus musculus",
"rno": "rattus norvegicus",
"cfa": "canis familiaris",
"bta": "bos taurus",
"ssc": "sus scrofa",
"mdo": "monodelphis domestica",
"gga": "gallus gallus",
"xla": "xenopus laevis",
"xtr": "xenopus tropicalis",
"dre": "danio rerio",
"spu": "strongylocentrotus purpuratus",
"nve": "nematostella vectensis",
"dme": "drosophila melanogaster",
"dpo": "drosophila pseudoobscura",
"aga": "anopheles gambiae",
"cel": "caenorhabditis elegans",
"ath": "arabidopsis thaliana",
"osa": "oryza sativa japonica",
"ppp": "physcomitrella patens subsp. patens",
"cme": "cyanidioschyzon merolae",
"olu": "ostreococcus lucimarinus",
"cre": "chlamydomonas reinhardtii",
"sce": "saccharomyces cerevisiae",
"ago": "ashbya gossypii",
"kla": "kluyveromyces lactis",
"dha": "debaryomyces hansenii",
"pic": "pichia stipitis",
"cal": "candida albicans",
"cgr": "candida glabrata",
"yli": "yarrowia lipolytica",
"spo": "schizosaccharomyces pombe",
"ncr": "neurospora crassa",
"mgr": "magnaporthe grisea",
"fgr": "fusarium graminearum",
"ani": "aspergillus nidulans",
"afm": "aspergillus fumigatus",
"aor": "aspergillus oryzae",
"ang": "aspergillus niger",
"cne": "cryptococcus neoformans jec21",
"cnb": "cryptococcus neoformans b-3501a",
"uma": "ustilago maydis",
"mgl": "malassezia globosa",
"ecu": "encephalitozoon cuniculi",
"mbr": "monosiga brevicollis",
"ddi": "dictyostelium discoideum",
"pfa": "plasmodium falciparum",
"pyo": "plasmodium yoelii",
"cpv": "cryptosporidium parvum",
"cho": "cryptosporidium hominis",
"tan": "theileria annulata",
"tpv": "theileria parva",
"tet": "tetrahymena thermophila",
"tbr": "trypanosoma brucei",
"tcr": "trypanosoma cruzi",
"lma": "leishmania major",
"ehi": "entamoeba histolytica",
"tva": "trichomonas vaginalis",
"eco": "escherichia coli k-12 mg1655",
"ecj": "escherichia coli k-12 w3110",
"ecd": "escherichia coli k-12 dh10b",
"ece": "escherichia coli o157 edl933",
"ecs": "escherichia coli o157 sakai",
"ecc": "escherichia coli cft073",
"eci": "escherichia coli uti89",
"ecp": "escherichia coli 536",
"ecv": "escherichia coli apec o1",
"ecw": "escherichia coli e24377a",
"ecx": "escherichia coli hs",
"ecm": "escherichia coli secec",
"ecl": "escherichia coli atcc 8739",
"sty": "salmonella enterica serovar typhi ct18",
"stt": "salmonella enterica serovar typhi ty2",
"spt": "salmonella enterica serovar paratyphi a",
"spq": "salmonella enterica serovar paratyphi b",
"sec": "salmonella enterica serovar choleraesuis",
"stm": "salmonella typhimurium lt2",
"ses": "salmonella enterica subsp. arizonae",
"ype": "yersinia pestis co92",
"ypk": "yersinia pestis kim",
"ypm": "yersinia pestis mediaevails",
"ypa": "yersinia pestis antiqua",
"ypn": "yersinia pestis nepal516",
"ypp": "yersinia pestis pestoides",
"ypg": "yersinia pestis angola",
"yps": "yersinia pseudotuberculosis ip32953",
"ypi": "yersinia pseudotuberculosis ip31758",
"ypy": "yersinia pseudotuberculosis ypiii",
"yen": "yersinia enterocolitica",
"sfl": "shigella flexneri 301",
"sfx": "shigella flexneri 2457t",
"sfv": "shigella flexneri 8401",
"ssn": "shigella sonnei",
"sbo": "shigella boydii",
"sbc": "shigella boydii cdc 3083-94",
"sdy": "shigella dysenteriae",
"eca": "erwinia carotovora",
"plu": "photorhabdus luminescens",
"buc": "buchnera aphidicola aps",
"bas": "buchnera aphidicola sg",
"bab": "buchnera aphidicola bp",
"bcc": "buchnera aphidicola cc",
"wbr": "wigglesworthia glossinidia",
"sgl": "sodalis glossinidius",
"ent": "enterobacter sp. 638",
"esa": "enterobacter sakazakii",
"kpn": "klebsiella pneumoniae",
"cko": "citrobacter koseri atcc baa-895",
"spe": "serratia proteamaculans",
"bfl": "candidatus blochmannia floridanus",
"bpn": "candidatus blochmannia pennsylvanicus",
"hin": "haemophilus influenzae",
"hit": "haemophilus influenzae 86-028np",
"hip": "haemophilus influenzae pittee",
"hiq": "haemophilus influenzae pittgg",
"hdu": "haemophilus ducreyi",
"hso": "haemophilus somnus",
"hsm": "haemophilus somnus 2336",
"pmu": "pasteurella multocida",
"msu": "mannheimia succiniciproducens",
"apl": "actinobacillus pleuropneumoniae",
"apj": "actinobacillus pleuropneumoniae serovar 3 jl03",
"asu": "actinobacillus succinogenes",
"xfa": "xylella fastidiosa 9a5c",
"xft": "xylella fastidiosa temecula1",
"xfm": "xylella fastidiosa m12",
"xfn": "xylella fastidiosa m23",
"xcc": "xanthomonas campestris pv. campestris atcc 33913",
"xcb": "xanthomonas campestris pv. campestris 8004",
"xcv": "xanthomonas campestris pv. vesicatoria",
"xac": "xanthomonas axonopodis",
"xoo": "xanthomonas oryzae kacc10331",
"xom": "xanthomonas oryzae maff311018",
"vch": "vibrio cholerae o1",
"vco": "vibrio cholerae o395",
"vvu": "vibrio vulnificus cmcp6",
"vvy": "vibrio vulnificus yj016",
"vpa": "vibrio parahaemolyticus",
"vfi": "vibrio fischeri",
"vha": "vibrio harveyi",
"ppr": "photobacterium profundum",
"pae": "pseudomonas aeruginosa pao1",
"pau": "pseudomonas aeruginosa ucbpp-pa14",
"pap": "pseudomonas aeruginosa pa7",
"ppu": "pseudomonas putida kt2440",
"ppf": "pseudomonas putida f1",
"ppg": "pseudomonas putida gb-1",
"ppw": "pseudomonas putida w619",
"pst": "pseudomonas syringae pv. tomato dc3000",
"psb": "pseudomonas syringae pv. syringae b728a",
"psp": "pseudomonas syringae pv. phaseolicola 1448a",
"pfl": "pseudomonas fluorescens pf-5",
"pfo": "pseudomonas fluorescens pfo-1",
"pen": "pseudomonas entomophila",
"pmy": "pseudomonas mendocina",
"psa": "pseudomonas stutzeri",
"par": "psychrobacter arcticum",
"pcr": "psychrobacter cryohalolentis",
"prw": "psychrobacter sp. prwf-1",
"aci": "acinetobacter sp. adp1",
"acb": "acinetobacter baumannii",
"abm": "acinetobacter baumannii sdf",
"aby": "acinetobacter baumannii aye",
"son": "shewanella oneidensis",
"sdn": "shewanella denitrificans",
"sfr": "shewanella frigidimarina",
"saz": "shewanella amazonensis",
"sbl": "shewanella baltica os155",
"sbm": "shewanella baltica os185",
"sbn": "shewanella baltica os195",
"slo": "shewanella loihica",
"spc": "shewanella putrefaciens",
"sse": "shewanella sediminis",
"spl": "shewanella pealeana",
"she": "shewanella sp. mr-4",
"shm": "shewanella sp. mr-7",
"shn": "shewanella sp. ana-3",
"shw": "shewanella sp. w3-18-1",
"shl": "shewanella halifaxensis",
"swd": "shewanella woodyi atcc51908",
"ilo": "idiomarina loihiensis",
"cps": "colwellia psychrerythraea",
"pha": "pseudoalteromonas haloplanktis",
"pat": "pseudoalteromonas atlantica",
"sde": "saccharophagus degradans",
"pin": "psychromonas ingrahamii",
"maq": "marinobacter aquaeolei",
"cbu": "coxiella burnetii rsa 493",
"cbs": "coxiella burnetii rsa 331",
"cbd": "coxiella burnetii dugway 5j108-111",
"lpn": "legionella pneumophila philadelphia 1",
"lpf": "legionella pneumophila lens",
"lpp": "legionella pneumophila paris",
"lpc": "legionella pneumophila corby",
"mca": "methylococcus capsulatus",
"ftu": "francisella tularensis subsp. tularensis schu s4",
"ftf": "francisella tularensis subsp. tularensis fsc 198",
"ftw": "francisella tularensis subsp. tularensis wy96-3418",
"ftl": "francisella tularensis subsp. holarctica lvs",
"fth": "francisella tularensis subsp. holarctica osu18",
"fta": "francisella tularensis subsp. holarctica ftnf002-00",
"ftn": "francisella tularensis subsp. novicida u112",
"ftm": "francisella tularensis subsp. mediasiatica fsc147",
"fph": "francisella philomiragia",
"tcx": "thiomicrospira crunogena",
"noc": "nitrosococcus oceani",
"aeh": "alkalilimnicola ehrlichei",
"hha": "halorhodospira halophila",
"hch": "hahella chejuensis",
"csa": "chromohalobacter salexigens",
"abo": "alcanivorax borkumensis",
"mmw": "marinomonas sp. mwyl1",
"aha": "aeromonas hydrophila",
"asa": "aeromonas salmonicida",
"dno": "dichelobacter nodosus",
"bci": "baumannia cicadellinicola",
"rma": "candidatus ruthia magnifica",
"vok": "candidatus vesicomyosocius okutanii",
"nme": "neisseria meningitidis mc58",
"nma": "neisseria meningitidis z2491",
"nmc": "neisseria meningitidis fam18",
"nmn": "neisseria meningitidis 053442",
"ngo": "neisseria gonorrhoeae",
"cvi": "chromobacterium violaceum",
"rso": "ralstonia solanacearum",
"reu": "ralstonia eutropha jmp134",
"reh": "ralstonia eutropha h16",
"rme": "ralstonia metallidurans",
"bma": "burkholderia mallei atcc 23344",
"bmv": "burkholderia mallei savp1",
"bml": "burkholderia mallei nctc 10229",
"bmn": "burkholderia mallei nctc 10247",
"bxe": "burkholderia xenovorans",
"bvi": "burkholderia vietnamiensis",
"bur": "burkholderia sp. 383",
"bcn": "burkholderia cenocepacia au1054",
"bch": "burkholderia cenocepacia hi2424",
"bcm": "burkholderia cenocepacia mc0-3",
"bam": "burkholderia cepacia",
"bac": "burkholderia ambifaria mc40-6",
"bmu": "burkholderia multivorans",
"bps": "burkholderia pseudomallei k96243",
"bpm": "burkholderia pseudomallei 1710b",
"bpl": "burkholderia pseudomallei 1106a",
"bpd": "burkholderia pseudomallei 668",
"bte": "burkholderia thailandensis",
"pnu": "polynucleobacter sp. qlw-p1dmwa-1",
"pne": "polynucleobacter necessarius",
"bpe": "bordetella pertussis",
"bpa": "bordetella parapertussis",
"bbr": "bordetella bronchiseptica",
"bpt": "bordetella petrii",
"bav": "bordetella avium",
"rfr": "rhodoferax ferrireducens",
"pol": "polaromonas sp. js666",
"pna": "polaromonas naphthalenivorans",
"aav": "acidovorax avenae",
"ajs": "acidovorax sp. js42",
"vei": "verminephrobacter eiseniae",
"dac": "delftia acidovorans",
"mpt": "methylibium petroleiphilum",
"har": "herminiimonas arsenicoxydans",
"mms": "minibacterium massiliensis",
"lch": "leptothrix cholodnii",
"neu": "nitrosomonas europaea",
"net": "nitrosomonas eutropha",
"nmu": "nitrosospira multiformis",
"eba": "azoarcus sp. ebn1",
"azo": "azoarcus sp. bh72",
"dar": "dechloromonas aromatica",
"tbd": "thiobacillus denitrificans",
"mfa": "methylobacillus flagellatus",
"hpy": "helicobacter pylori 26695",
"hpj": "helicobacter pylori j99",
"hpa": "helicobacter pylori hpag1",
"hhe": "helicobacter hepaticus",
"hac": "helicobacter acinonychis",
"wsu": "wolinella succinogenes",
"tdn": "thiomicrospira denitrificans",
"cje": "campylobacter jejuni nctc11168",
"cjr": "campylobacter jejuni rm1221",
"cjj": "campylobacter jejuni 81-176",
"cju": "campylobacter jejuni 81116",
"cjd": "campylobacter jejuni subsp. doylei 269.97",
"cff": "campylobacter fetus",
"ccv": "campylobacter curvus",
"cha": "campylobacter hominis atcc baa-381",
"cco": "campylobacter concisus 13826",
"abu": "arcobacter butzleri",
"nis": "nitratiruptor sp. sb155-2",
"sun": "sulfurovum sp. nbc37-1",
"gsu": "geobacter sulfurreducens",
"gme": "geobacter metallireducens",
"gur": "geobacter uraniumreducens",
"pca": "pelobacter carbinolicus",
"ppd": "pelobacter propionicus",
"dvu": "desulfovibrio vulgaris hildenborough",
"dvl": "desulfovibrio vulgaris dp4",
"dde": "desulfovibrio desulfuricans",
"lip": "lawsonia intracellularis",
"bba": "bdellovibrio bacteriovorus",
"dps": "desulfotalea psychrophila",
"dol": "candidatus desulfococcus oleovorans",
"ade": "anaeromyxobacter dehalogenans",
"afw": "anaeromyxobacter sp. fw109-5",
"mxa": "myxococcus xanthus",
"scl": "sorangium cellulosum",
"sat": "syntrophus aciditrophicus",
"sfu": "syntrophobacter fumaroxidans",
"rpr": "rickettsia prowazekii",
"rty": "rickettsia typhi",
"rco": "rickettsia conorii",
"rfe": "rickettsia felis",
"rbe": "rickettsia bellii",
"rak": "rickettsia akari hartford",
"rbo": "rickettsia bellii osu 85-389",
"rcm": "rickettsia canadensis mckiel",
"rri": "rickettsia rickettsii",
"rrj": "rickettsia rickettsii iowa",
"rms": "rickettsia massiliae",
"ots": "orientia tsutsugamushi",
"wol": "wolbachia wmel",
"wbm": "wolbachia wbm",
"ama": "anaplasma marginale",
"aph": "anaplasma phagocytophilum",
"eru": "ehrlichia ruminantium welgevonden",
"erw": "ehrlichia ruminantium welgevonden",
"erg": "ehrlichia ruminantium gardel",
"ecn": "ehrlichia canis",
"ech": "ehrlichia chaffeensis",
"nse": "neorickettsia sennetsu",
"pub": "candidatus pelagibacter ubique",
"mlo": "mesorhizobium loti",
"mes": "mesorhizobium sp. bnc1",
"pla": "parvibaculum lavamentivorans",
"sme": "sinorhizobium meliloti",
"smd": "sinorhizobium medicae",
"atu": "agrobacterium tumefaciens c58 (uwash/dupont)",
"atc": "agrobacterium tumefaciens c58",
"ret": "rhizobium etli",
"rle": "rhizobium leguminosarum",
"bme": "brucella melitensis",
"bmf": "brucella melitensis biovar abortus",
"bms": "brucella suis",
"bmt": "brucella suis atcc 23445",
"bmb": "brucella abortus",
"bov": "brucella ovis",
"bcs": "brucella canis",
"oan": "ochrobactrum anthropi",
"bja": "bradyrhizobium japonicum",
"bra": "bradyrhizobium sp. ors278",
"bbt": "bradyrhizobium sp. btai1",
"rpa": "rhodopseudomonas palustris cga009",
"rpb": "rhodopseudomonas palustris haa2",
"rpc": "rhodopseudomonas palustris bisb18",
"rpd": "rhodopseudomonas palustris bisb5",
"rpe": "rhodopseudomonas palustris bisa53",
"nwi": "nitrobacter winogradskyi",
"nha": "nitrobacter hamburgensis",
"bhe": "bartonella henselae",
"bqu": "bartonella quintana",
"bbk": "bartonella bacilliformis",
"btr": "bartonella tribocorum",
"xau": "xanthobacter autotrophicus",
"azc": "azorhizobium caulinodans",
"mex": "methylobacterium extorquens",
"mrd": "methylobacterium radiotolerans",
"met": "methylobacterium sp. 4-46",
"bid": "beijerinckia indica",
"ccr": "caulobacter crescentus",
"cak": "caulobacter sp. k31",
"sil": "silicibacter pomeroyi",
"sit": "silicibacter sp. tm1040",
"rsp": "rhodobacter sphaeroides 2.4.1",
"rsh": "rhodobacter sphaeroides atcc 17029",
"rsq": "rhodobacter sphaeroides atcc 17025",
"jan": "jannaschia sp. ccs1",
"rde": "roseobacter denitrificans",
"pde": "paracoccus denitrificans",
"dsh": "dinoroseobacter shibae",
"mmr": "maricaulis maris",
"hne": "hyphomonas neptunium",
"zmo": "zymomonas mobilis",
"nar": "novosphingobium aromaticivorans",
"sal": "sphingopyxis alaskensis",
"swi": "sphingomonas wittichii",
"eli": "erythrobacter litoralis",
"gox": "gluconobacter oxydans",
"gbe": "granulobacter bethesdensis",
"acr": "acidiphilium cryptum jf-5",
"gdi": "gluconacetobacter diazotrophicus",
"rru": "rhodospirillum rubrum",
"mag": "magnetospirillum magneticum",
"mgm": "magnetococcus sp. mc-1",
"aba": "acidobacteria bacterium",
"sus": "solibacter usitatus",
"swo": "syntrophomonas wolfei",
"csc": "caldicellulosiruptor saccharolyticus",
"bsu": "bacillus subtilis",
"bha": "bacillus halodurans",
"ban": "bacillus anthracis ames",
"bar": "bacillus anthracis ames 0581",
"baa": "bacillus anthracis a2012",
"bat": "bacillus anthracis sterne",
"bce": "bacillus cereus atcc 14579",
"bca": "bacillus cereus atcc 10987",
"bcz": "bacillus cereus zk",
"bcy": "bacillus cereus subsp. cytotoxis nvh 391-98",
"btk": "bacillus thuringiensis 97-27",
"btl": "bacillus thuringiensis al hakam",
"bwe": "bacillus weihenstephanensis",
"bli": "bacillus licheniformis atcc 14580",
"bld": "bacillus licheniformis dsm13",
"bcl": "bacillus clausii",
"bay": "bacillus amyloliquefaciens",
"bpu": "bacillus pumilus",
"oih": "oceanobacillus iheyensis",
"gka": "geobacillus kaustophilus",
"gtn": "geobacillus thermodenitrificans",
"lsp": "lysinibacillus sphaericus",
"esi": "exiguobacterium sibiricum",
"sau": "staphylococcus aureus n315",
"sav": "staphylococcus aureus mu50",
"saw": "staphylococcus aureus mu3",
"sam": "staphylococcus aureus mw2",
"sar": "staphylococcus aureus mrsa252",
"sas": "staphylococcus aureus mssa476",
"sac": "staphylococcus aureus col",
"sab": "staphylococcus aureus rf122",
"saa": "staphylococcus aureus usa300",
"sax": "staphylococcus aureus usa300 tch1516",
"sao": "staphylococcus aureus nctc8325",
"saj": "staphylococcus aureus jh9",
"sah": "staphylococcus aureus jh1",
"sae": "staphylococcus aureus newman",
"sep": "staphylococcus epidermidis atcc 12228",
"ser": "staphylococcus epidermidis rp62a",
"sha": "staphylococcus haemolyticus",
"ssp": "staphylococcus saprophyticus",
"lmo": "listeria monocytogenes egd-e",
"lmf": "listeria monocytogenes f2365",
"lin": "listeria innocua",
"lwe": "listeria welshimeri slcc5334",
"lla": "lactococcus lactis subsp. lactis il1403",
"llc": "lactococcus lactis subsp. cremoris sk11",
"llm": "lactococcus lactis subsp. cremoris mg1363",
"spy": "streptococcus pyogenes sf370",
"spz": "streptococcus pyogenes mgas5005",
"spm": "streptococcus pyogenes mgas8232",
"spg": "streptococcus pyogenes mgas315",
"sps": "streptococcus pyogenes ssi-1",
"sph": "streptococcus pyogenes mgas10270",
"spi": "streptococcus pyogenes mgas10750",
"spj": "streptococcus pyogenes mgas2096",
"spk": "streptococcus pyogenes mgas9429",
"spf": "streptococcus pyogenes manfredo",
"spa": "streptococcus pyogenes mgas10394",
"spb": "streptococcus pyogenes mgas6180",
"spn": "streptococcus pneumoniae tigr4",
"spr": "streptococcus pneumoniae r6",
"spd": "streptococcus pneumoniae d39",
"spv": "streptococcus pneumoniae hungary19a 6",
"spw": "streptococcus pneumoniae cgsp14",
"sag": "streptococcus agalactiae 2603",
"san": "streptococcus agalactiae nem316",
"sak": "streptococcus agalactiae a909",
"smu": "streptococcus mutans",
"stc": "streptococcus thermophilus cnrz1066",
"stl": "streptococcus thermophilus lmg18311",
"ste": "streptococcus thermophilus lmd-9",
"ssa": "streptococcus sanguinis",
"ssu": "streptococcus suis 05zyh33",
"ssv": "streptococcus suis 98hah33",
"lpl": "lactobacillus plantarum",
"ljo": "lactobacillus johnsonii",
"lac": "lactobacillus acidophilus",
"lsa": "lactobacillus sakei",
"lsl": "lactobacillus salivarius",
"ldb": "lactobacillus delbrueckii atcc 11842",
"lbu": "lactobacillus delbrueckii atcc baa-365",
"lbr": "lactobacillus brevis",
"lca": "lactobacillus casei",
"lga": "lactobacillus gasseri",
"lre": "lactobacillus reuteri",
"lhe": "lactobacillus helveticus",
"lfe": "lactobacillus fermentum",
"ppe": "pediococcus pentosaceus",
"efa": "enterococcus faecalis",
"ooe": "oenococcus oeni",
"lme": "leuconostoc mesenteroides",
"lci": "leuconostoc citreum",
"sth": "symbiobacterium thermophilum",
"cac": "clostridium acetobutylicum",
"cpe": "clostridium perfringens 13",
"cpf": "clostridium perfringens atcc 13124",
"cpr": "clostridium perfringens sm101",
"ctc": "clostridium tetani e88",
"cno": "clostridium novyi",
"cth": "clostridium thermocellum",
"cdf": "clostridium difficile",
"cbo": "clostridium botulinum a",
"cba": "clostridium botulinum a atcc 19397",
"cbh": "clostridium botulinum a hall",
"cbl": "clostridium botulinum a3 loch maree",
"cbk": "clostridium botulinum b eklund 17b",
"cbb": "clostridium botulinum b1",
"cbf": "clostridium botulinum f",
"cbe": "clostridium beijerinckii",
"ckl": "clostridium kluyveri",
"cpy": "clostridium phytofermentans",
"amt": "alkaliphilus metalliredigens",
"aoe": "alkaliphilus oremlandii",
"chy": "carboxydothermus hydrogenoformans",
"dsy": "desulfitobacterium hafniense",
"drm": "desulfotomaculum reducens",
"pth": "pelotomaculum thermopropionicum",
"dau": "candidatus desulforudis audaxviator",
"hmo": "heliobacterium modesticaldum",
"fma": "finegoldia magna",
"tte": "thermoanaerobacter tengcongensis",
"tex": "thermoanaerobacter sp. x514",
"tpd": "thermoanaerobacter pseudethanolicus",
"mta": "moorella thermoacetica",
"mge": "mycoplasma genitalium",
"mpn": "mycoplasma pneumoniae",
"mpu": "mycoplasma pulmonis",
"mpe": "mycoplasma penetrans",
"mga": "mycoplasma gallisepticum",
"mmy": "mycoplasma mycoides",
"mmo": "mycoplasma mobile",
"mhy": "mycoplasma hyopneumoniae 232",
"mhj": "mycoplasma hyopneumoniae j",
"mhp": "mycoplasma hyopneumoniae 7448",
"msy": "mycoplasma synoviae",
"mcp": "mycoplasma capricolum",
"maa": "mycoplasma agalactiae",
"uur": "ureaplasma urealyticum",
"upa": "ureaplasma parvum",
"poy": "phytoplasma oy",
"ayw": "phytoplasma aywb",
"acl": "acholeplasma laidlawii",
"mfl": "mesoplasma florum",
"mtu": "mycobacterium tuberculosis h37rv",
"mtc": "mycobacterium tuberculosis cdc1551",
"mra": "mycobacterium tuberculosis h37ra",
"mtf": "mycobacterium tuberculosis f11",
"mbo": "mycobacterium bovis af2122/97",
"mbb": "mycobacterium bovis bcg pasteur 1173p2",
"mle": "mycobacterium leprae",
"mpa": "mycobacterium avium paratuberculosis",
"mav": "mycobacterium avium 104",
"msm": "mycobacterium smegmatis",
"mul": "mycobacterium ulcerans",
"mva": "mycobacterium vanbaalenii",
"mgi": "mycobacterium gilvum",
"mab": "mycobacterium abscessus atcc 19977t",
"mmc": "mycobacterium sp. mcs",
"mkm": "mycobacterium sp. kms",
"mjl": "mycobacterium sp. jls",
"mmi": "mycobacterium marinum m",
"cgl": "corynebacterium glutamicum atcc 13032",
"cgb": "corynebacterium glutamicum atcc 13032",
"cgt": "corynebacterium glutamicum r",
"cef": "corynebacterium efficiens",
"cdi": "corynebacterium diphtheriae",
"cjk": "corynebacterium jeikeium",
"cur": "corynebacterium urealyticum",
"nfa": "nocardia farcinica",
"rha": "rhodococcus sp. rha1",
"sco": "streptomyces coelicolor",
"sma": "streptomyces avermitilis",
"sgr": "streptomyces griseus",
"twh": "tropheryma whipplei twist",
"tws": "tropheryma whipplei tw08/27",
"lxx": "leifsonia xyli xyli ctcb07",
"cmi": "clavibacter michiganensis",
"cms": "clavibacter michiganensis subsp. sepedonicus",
"art": "arthrobacter sp. fb24",
"aau": "arthrobacter aurescens",
"rsa": "renibacterium salmoninarum",
"krh": "kocuria rhizophila",
"pac": "propionibacterium acnes",
"nca": "nocardioides sp. js614",
"tfu": "thermobifida fusca",
"fra": "frankia sp. cci3",
"fre": "frankia sp. ean1pec",
"fal": "frankia alni",
"ace": "acidothermus cellulolyticus",
"kra": "kineococcus radiotolerans",
"sen": "saccharopolyspora erythraea",
"stp": "salinispora tropica",
"saq": "salinispora arenicola",
"blo": "bifidobacterium longum",
"bad": "bifidobacterium adolescentis",
"rxy": "rubrobacter xylanophilus",
"fnu": "fusobacterium nucleatum",
"rba": "rhodopirellula baltica",
"ote": "opitutus terrae",
"ctr": "chlamydia trachomatis serovar d",
"cta": "chlamydia trachomatis serovar a",
"ctb": "chlamydia trachomatis 434/bu",
"ctl": "chlamydia trachomatis l2b/uch-1/proctitis",
"cmu": "chlamydia muridarum",
"cpn": "chlamydophila pneumoniae cwl029",
"cpa": "chlamydophila pneumoniae ar39",
"cpj": "chlamydophila pneumoniae j138",
"cpt": "chlamydophila pneumoniae tw183",
"cca": "chlamydophila caviae",
"cab": "chlamydophila abortus",
"cfe": "chlamydophila felis",
"pcu": "candidatus protochlamydia amoebophila",
"bbu": "borrelia burgdorferi",
"bga": "borrelia garinii",
"baf": "borrelia afzelii",
"tpa": "treponema pallidum",
"tde": "treponema denticola",
"lil": "leptospira interrogans serovar lai",
"lic": "leptospira interrogans serovar copenhageni",
"lbj": "leptospira borgpetersenii jb197",
"lbl": "leptospira borgpetersenii l550",
"lbi": "leptospira biflexa serovar patoc patoc 1",
"syn": "synechocystis sp. pcc6803",
"syw": "synechococcus sp. wh8102",
"syc": "synechococcus elongatus pcc6301",
"syf": "synechococcus elongatus pcc7942",
"syd": "synechococcus sp. cc9605",
"sye": "synechococcus sp. cc9902",
"syg": "synechococcus sp. cc9311",
"syr": "synechococcus sp. rcc307",
"syx": "synechococcus sp. wh7803",
"syp": "synechococcus sp. pcc7002",
"cya": "cyanobacteria yellowstone a-prime",
"cyb": "cyanobacteria yellowstone b-prime",
"tel": "thermosynechococcus elongatus",
"mar": "microcystis aeruginosa",
"cyt": "cyanothece sp. atcc 51142",
"gvi": "gloeobacter violaceus",
"ana": "anabaena sp. pcc7120",
"ava": "anabaena variabilis",
"pma": "prochlorococcus marinus ss120",
"pmm": "prochlorococcus marinus med4",
"pmt": "prochlorococcus marinus mit 9313",
"pmn": "prochlorococcus marinus natl2a",
"pmi": "prochlorococcus marinus mit 9312",
"pmb": "prochlorococcus marinus as9601",
"pmc": "prochlorococcus marinus mit 9515",
"pmf": "prochlorococcus marinus mit 9303",
"pmg": "prochlorococcus marinus mit 9301",
"pmh": "prochlorococcus marinus mit 9215",
"pmj": "prochlorococcus marinus mit 9211",
"pme": "prochlorococcus marinus natl1a",
"ter": "trichodesmium erythraeum",
"amr": "acaryochloris marina",
"bth": "bacteroides thetaiotaomicron",
"bfr": "bacteroides fragilis ych46",
"bfs": "bacteroides fragilis nctc9343",
"bvu": "bacteroides vulgatus",
"pgi": "porphyromonas gingivalis",
"pdi": "parabacteroides distasonis",
"sru": "salinibacter ruber",
"chu": "cytophaga hutchinsonii",
"gfo": "gramella forsetii",
"fjo": "flavobacterium johnsoniae",
"fps": "flavobacterium psychrophilum",
"smg": "candidatus sulcia muelleri",
"cte": "chlorobaculum tepidum",
"cch": "chlorobium chlorochromatii",
"cph": "chlorobium phaeobacteroides",
"pvi": "prosthecochloris vibrioformis",
"plt": "pelodictyon luteolum",
"det": "dehalococcoides ethenogenes",
"deh": "dehalococcoides sp. cbdb1",
"deb": "dehalococcoides sp. bav1",
"rrs": "roseiflexus sp. rs-1",
"rca": "roseiflexus castenholzii dsm13941",
"cau": "chloroflexus aurantiacus",
"hau": "herpetosiphon aurantiacus",
"dra": "deinococcus radiodurans",
"dge": "deinococcus geothermalis",
"tth": "thermus thermophilus hb27",
"ttj": "thermus thermophilus hb8",
"aae": "aquifex aeolicus",
"tma": "thermotoga maritima",
"tpt": "thermotoga petrophila",
"tle": "thermotoga lettingae",
"tme": "thermosipho melanesiensis",
"fno": "fervidobacterium nodosum",
"pmo": "petrotoga mobilis",
"mja": "methanococcus jannaschii",
"mmp": "methanococcus maripaludis s2",
"mmq": "methanococcus maripaludis c5",
"mmx": "methanococcus maripaludis c6",
"mmz": "methanococcus maripaludis c7",
"mae": "methanococcus aeolicus",
"mvn": "methanococcus vannielii",
"mac": "methanosarcina acetivorans",
"mba": "methanosarcina barkeri",
"mma": "methanosarcina mazei",
"mbu": "methanococcoides burtonii",
"mtp": "methanosaeta thermophila",
"mhu": "methanospirillum hungatei",
"mla": "methanocorpusculum labreanum",
"mem": "methanoculleus marisnigri",
"mbn": "candidatus methanoregula boonei",
"mth": "methanobacterium thermoautotrophicum",
"mst": "methanosphaera stadtmanae",
"msi": "methanobrevibacter smithii atcc 35061",
"mka": "methanopyrus kandleri",
"afu": "archaeoglobus fulgidus",
"hal": "halobacterium sp. nrc-1",
"hsl": "halobacterium salinarum r1",
"hma": "haloarcula marismortui",
"hwa": "haloquadratum walsbyi",
"nph": "natronomonas pharaonis",
"tac": "thermoplasma acidophilum",
"tvo": "thermoplasma volcanium",
"pto": "picrophilus torridus",
"pho": "pyrococcus horikoshii",
"pab": "pyrococcus abyssi",
"pfu": "pyrococcus furiosus",
"tko": "thermococcus kodakaraensis",
"rci": "uncultured methanogenic archaeon rc-i",
"ape": "aeropyrum pernix",
"smr": "staphylothermus marinus",
"iho": "ignicoccus hospitalis",
"hbu": "hyperthermus butylicus",
"sso": "sulfolobus solfataricus",
"sto": "sulfolobus tokodaii",
"sai": "sulfolobus acidocaldarius",
"mse": "metallosphaera sedula",
"pai": "pyrobaculum aerophilum",
"pis": "pyrobaculum islandicum",
"pcl": "pyrobaculum calidifontis",
"pas": "pyrobaculum arsenaticum",
"cma": "caldivirga maquilingensis",
"tne": "thermoproteus neutrophilus",
"tpe": "thermofilum pendens",
"nmr": "nitrosopumilus maritimus",
"kcr": "candidatus korarchaeum cryptofilum",
"neq": "nanoarchaeum equitans"
}


// register website handler
FG_addWebsiteHandler("KEGG Pathway", FG_kegg);
