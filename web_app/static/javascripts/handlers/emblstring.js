/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * Handle broadcasts to and from EMBL's String database.
 *
 * Updated for String version 7.1
 * Updated for String version 8.0 (not compatible w/ previous versions)
 *
 * Notes: There are a couple cases here of some awkwardness because I haven't
 *        figured out how to do a POST and show the results in a browser tab.
 */
var FG_emblString = {
	
	progressCounter: 0,

    /**
     * Are we browsing to a page we can deal with?
     */
	recognize: function(doc) {
		if (doc) {
			var url = doc.location.href;
			if ((url.indexOf("http://string.embl.de/newstring_cgi/show_network_section.pl") >=0)
			||  (url.indexOf("http://string.embl.de/newstring_cgi/show_network_direct.pl") >=0)) {
				// We can only get species the first time String displays a network.
				// The networks produced by "+ more" and "- less" don't have species
				// in the page, so we keep it here for later.
				this._defaultSpecies = this.getSpecies(doc);
				return true;
			}
		}
		return false;
	},


	/**
	 * open STRING in a new browser tab
	 */
	show: function() {
		var url = "http://string.embl.de/?" + this.callerIdentity();
		var newTab = getBrowser().addTab(url);
		getBrowser().selectedTab = newTab;
	},


	/**
	 * Create a closure which will be called on the page "load" event that
	 * fills in String's List Input form and submits it.
	 *
	 * Yes, it would be much cleaner to just send a post
	 * request and show the results in a browser tab, but
	 * can XUL/javascript do that?? Not as far as I could
	 * figure out.
	 */
	createOnloadFormFiller: function(stringSpeciesName, names) {

		// this function removes itself as an event listener, so it's necessary to assign it to a variable
		var onLoadFormFiller = function(aEvent) {
			FG_trace("STRING: species = " + stringSpeciesName);
			FG_trace("STRING: names = " + names);
			FG_trace("STRING: names.length = " + names.length);
	
			if (aEvent.originalTarget.nodeName == "#document" && names && names.length>1) {
	
				// remove the event listener
				var browser = getBrowser().getBrowserForTab(getBrowser().selectedTab);
				if (browser)
					browser.removeEventListener("load", onLoadFormFiller, true);

				var doc = window.content.document;

				// set the species chooser
				var organism_select_box = doc.getElementById("organism_select_box");
				if (organism_select_box) {
					// String went to an ajaxified name-completion type thing, so
					// this no longer works
//					for (var i = 0; i < organism_select_box.length; ++i)
//	  					if (organism_select_box[i].value.toLowerCase() == stringSpeciesName)
//							organism_select_box.selectedIndex = i;
				}
				else {
					dump("String handler couldn't find organism_select_box\n");
				}
	
				// construct a string out of the name list
				var queryString = "";
				if (names.length > 0) {
					queryString += names[0];
				}
				for (var i=1; i<names.length; i++) {
					queryString += "\n";
					queryString += names[i];
				}
	
				var multiple_identifiers = doc.getElementById("multiple_identifiers");
				if (multiple_identifiers) {
					multiple_identifiers.value = queryString;
	
					var input_form = doc.getElementById("input_form");
					if (input_form) {
						input_form.submit();
					}
				}
			}
		};
		return onLoadFormFiller;
	},


	/**
	 * get species by scraping hidden field
	 */
	getSpecies: function(doc) {
		var code = "unknown";

		var identifier = doc.getElementsByName("input_query_species");
		if (identifier && identifier[0]) {
			var speciesCode = identifier[0].getAttribute("value");
			code = this.codeToSpecies(speciesCode);
		}

		if (code == "unknown" && this._defaultSpecies) {
			return this._defaultSpecies;
		}

		return code;
	},

	/**
	 * find the taskId (STRING's session id), which helps
	 * us link to xml download.
	 */
	getTaskId: function(doc) {
		// thank you, string, for making this easy to get at
		var element = doc.getElementById("link_summary");
		return ufmt.getText(element);
	},

	startProgressTimer: function() {
		// set up timer to report progress
		if (this.progressTimer) clearInterval(this.progressTimer);
		this.progressCounter = 0;
		var emblstring = this;
		this.progressTimer = setInterval(function() {
			emblstring.progressDialog.document.setProgress(emblstring.progressCounter);
		}, 500);
	},



	/**
	 * return an object with a list of names, a network, and a species
	 */
	getPageData: function(doc) {
		var results = [];
		var species = this.getSpecies(doc);
		var taskId = this.getTaskId(doc);
	
		var namelistGaggleData = new FG_GaggleData(
				"Genes from STRING",
				"NameList",
				null,
				species,
				null);

		namelistGaggleData.isAsynch = true;
		namelistGaggleData.emblstring = this;
		namelistGaggleData.taskId = taskId;

		// this will be called by FG_broadcast() and passed a function
		// which will do the broadcast when called.
		namelistGaggleData.asynchronouslyFetchData = function(callback) {
			if (!this._data) {
				this._callback = callback;
				this.emblstring.getNameList(this);
				this.isAsynch = false;
			}
			else {
				callback();
			}
		}

		results.push(namelistGaggleData);
		
	// comment out for now 'cause nothing accepts a broadcast of a map
	/*
		var annotations = this.getMap(map);
		var len = 0;
		for (var i in annotations) len++;
		results.push(
			new FG_GaggleData(
			    "Gene annotations",
			    "Map",
				"Map(" + len + ")",
				species,
				annotations));
	*/

		var networkGaggleData = new FG_GaggleData(
			    "Protein interactions from STRING XML",
			    "Network",
			    null,
				species,
				null);

		networkGaggleData.isAsynch = true;
		networkGaggleData.emblstring = this;
		networkGaggleData.taskId = taskId;

		// this will be called by FG_broadcast() and passed a function
		// which will do the broadcast when called.
		networkGaggleData.asynchronouslyFetchData = function(callback) {
			if (!this._data) {
				this._callback = callback;
				this.emblstring.getNetworkXml(this);
				this.isAsynch = false;
			}
			else {
				callback();
			}
		}

		results.push(networkGaggleData);

		return results;
	},

	/**
	 * takes the map produced by getStringIdToOrfMap
	 * return an array of orf names as Strings
	 */
	getNameList: function(gaggleData) {
		dump("emblstring.getNameList() from STRING API\n");
		var params = {inn:{message:"Downloading interactors list from STRING; please wait..."}, out:null};
		this.progressDialog = window.openDialog('chrome://firegoose/content/progress.xul','Progress','chrome,centerscreen,alwaysRaised,resizable', params);

		// set up timer to report progress
		this.startProgressTimer();

		var emblstring = this;

		this._getNameListFromApi(gaggleData, function(tsv) {
			return emblstring.processInteractorsList(tsv);
		});
	},

	_getNameListFromApi: function(gaggleData, processResponseFunction) {
		var url = "http://string.embl.de/api/tsv/interactors?taskId=" + gaggleData.taskId  + "&" + this.callerIdentity();
		var emblstring = this;

		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			dump("getNetworkXml readyState = " + request.readyState + "\n");
			emblstring.progressCounter = Math.min(59, emblstring.progressCounter + 1);
			if (request.readyState == 4) {
				if (request.status == 200) {
					emblstring.progressCounter = 60

					var data = processResponseFunction(request.responseText);
					FG_trace("processing STRING interactors list completed!!");
					emblstring.progressCounter = 100;
					clearInterval(emblstring.progressTimer);

					if (emblstring.progressDialog)
						emblstring.progressDialog.close();

					// store the data in GaggleData object and notify callback.
					gaggleData._data = data;
					if (gaggleData._callback())
						gaggleData._callback();
				}
				else {
					if (gaggleData.emblstring.progressDialog)
						gaggleData.emblstring.progressDialog.close();
					gaggleData.emblstring._requestFailed(request);
				}
			}
		}

		request.open("GET", url);
		request.setRequestHeader("User-Agent", "XMLHttpRequest");
		request.setRequestHeader("Accept-Language", "en");

		request.send(null);
	},
	
	processInteractorsList: function(tsv) {
		var lines = tsv.split("\n");
		var interactors = [];
		for (var i=1; i<lines.length; i++) {
			var a = lines[i];
			var b = a.substring(a.indexOf(".")+1);
			dump(b + "\n");
			interactors.push(b);
		}
		return interactors;
	},

	getNetworkXml: function(gaggleData) {
		dump("emblstring.getNetworkXml(...)\n");
		var params = {inn:{message:"Downloading network XML from STRING; please wait..."}, out:null};
		this.progressDialog = window.openDialog('chrome://firegoose/content/progress.xul','Progress','chrome,centerscreen,alwaysRaised,resizable', params);

		// set up timer to report progress
		this.startProgressTimer();

		var emblstring = this;

		this._getNetworkXmlFromApi(gaggleData, function(xml) {
			return emblstring.processNetworkXml(xml);
		});
	},

	_getNetworkXmlFromApi: function(gaggleData, processResponseFunction) {
		var url = "http://string.embl.de/api/psi-mi/interactions?taskId=" + gaggleData.taskId + "&" + this.callerIdentity();
		FG_trace("getting xml from STRING url = " + url);
		dump("getting xml from STRING url = " + url + "\n");

		var request = new XMLHttpRequest();
		var emblstring = this;

		// define the callback that will run when the request completes
		request.onreadystatechange = function() {
			emblstring.progressCounter = Math.min(59, emblstring.progressCounter + 1)
			if (request.readyState == 4) {
				if (request.status == 200) {
					emblstring.progressCounter = 60;

					// parse the xml and build a network
					var data = processResponseFunction(request.responseXML);
					FG_trace("processing STRING XML completed!!");
					emblstring.progressCounter = 100;
					clearInterval(emblstring.progressTimer);

					if (emblstring.progressDialog)
						emblstring.progressDialog.close();

					// store the data in GaggleData object and notify callback.
					gaggleData._data = data;
					if (gaggleData._callback())
						gaggleData._callback();
				}
				else {
					if (gaggleData.emblstring.progressDialog)
						gaggleData.emblstring.progressDialog.close();
					gaggleData.emblstring._requestFailed(request);
				}
			}
		}

		request.open("GET", url);
		request.setRequestHeader("User-Agent", "XMLHttpRequest");
		request.setRequestHeader("Accept-Language", "en");

		request.send(null);
	},

	/**
	 * take an xml document in PSI - Proteomics Standards Initative format
	 * and return a (java) gaggle network object
	 */ 
	processNetworkXml: function(xml) {

		// create the java network object
		var network = javaFiregooseLoader.createNetwork();
		network.setName("STRING Network");

		var namespaces = { "psi":"net:sf:psidev:mi" };
		var nsmapper = function(ns) { return namespaces[ns]; };

		// these are used to define the types of edges. Each edge is based on a
		// type of evidence: textmining, experiments, coexpression, cooccurence,
		// gene_fusion, and gene neighborhoods. There will be an additional edge for
		// combined_confidence.
		var experimentDescriptions = this._readExperimentList(xml, nsmapper);
		this.progressCounter = 70;

		// get nodes (called interactors in PSI-MI) and node attributes
		var interactors = this._readInteractors(xml, nsmapper, network);
		this.progressCounter = 80;

		// now get interactions (edges) and edge attributes
		this._readInteractions(xml, nsmapper, network, experimentDescriptions, interactors);
		this.progressCounter = 90;

		dump("\n\n\n");
		dump(network);
		dump("\n\n\n");

		return network;
	},

	/**
	 * Read experimentList (edge evidence types) from PSI-MI XML
	 */
	_readExperimentList: function(xml, nsmapper) {
		var results = xml.evaluate("/psi:entrySet/psi:entry/psi:experimentList/psi:experimentDescription", xml,
				nsmapper, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

		var experimentDescriptions = {};
		experimentDescriptions.getNameForId = function(i) {
			var ed = this[i];
			if (!ed) return "";
			if (!ed.name) return ed.method;
			return ed.name;
		}

		var experimentDescriptionElement = results.iterateNext();
		while (experimentDescriptionElement != null) {
			var ed = new Object();
			ed.id = (xml.evaluate("@id", experimentDescriptionElement, nsmapper, XPathResult.NUMBER_TYPE, null)).numberValue;
			ed.name = (xml.evaluate("psi:names/psi:shortLabel", experimentDescriptionElement, nsmapper, XPathResult.STRING_TYPE, null)).stringValue;
			ed.desc = (xml.evaluate("psi:names/psi:fullName", experimentDescriptionElement, nsmapper, XPathResult.STRING_TYPE, null)).stringValue;
			ed.method = (xml.evaluate("psi:interactionDetectionMethod/psi:names/psi:shortLabel", experimentDescriptionElement, nsmapper, XPathResult.STRING_TYPE, null)).stringValue;
			experimentDescriptions[ed.id] = ed;
			experimentDescriptionElement = results.iterateNext();
		}

		return experimentDescriptions;
	},

	/**
	 * read network nodes (interactors) from PSI-MI XML
	 */
	_readInteractors: function(xml, nsmapper, network) {
		var results = xml.evaluate("/psi:entrySet/psi:entry/psi:interactorList/psi:interactor", xml,
			nsmapper, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

		// first get all interactors (nodes) and their attributes
		var interactors = {};
		var interactorElement = results.iterateNext();
		while (interactorElement != null) {

			var node = new Object();
			node.id = (xml.evaluate("@id", interactorElement, nsmapper, XPathResult.NUMBER_TYPE, null)).numberValue;
			interactors[node.id] = node;
            
            var primaryRef, primaryRefDb, shortLabel;

            // extract primaryRef for node
            var primaryRefResults = xml.evaluate("psi:xref/psi:primaryRef", interactorElement, nsmapper, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if (primaryRefResults && primaryRefResults.singleNodeValue) {
                var primaryRefElement = primaryRefResults.singleNodeValue;
				primaryRefDb = (xml.evaluate("@db", primaryRefElement, nsmapper, XPathResult.STRING_TYPE, null)).stringValue;
				primaryRef = (xml.evaluate("@id", primaryRefElement, nsmapper, XPathResult.STRING_TYPE, null)).stringValue;
                dump("primaryRef=" + primaryRef + " db=" + db + "\n");
            }
            else {
                dump("primaryRef not found.\n");
            }

            // extract shortLabel for node
            var shortLabelResults = xml.evaluate("psi:names/psi:shortLabel", interactorElement, nsmapper, XPathResult.STRING_TYPE, null);
            if (shortLabelResults && shortLabelResults.stringValue) {
                shortLabel = shortLabelResults.stringValue;
            }
            else {
                dump("shortLabel not found.\n");
            }

            // It's debatable whether to use shortLabel or primaryRef as the node name.
            // We'll try primaryRef, to see how it goes.
			node.name = primaryRef ? primaryRef : shortLabel;
            
			// add node to network
			network.add(node.name);

            if (shortLabel) network.addNodeAttribute(node.name, "shortLabel", shortLabel);
            if (primaryRef) network.addNodeAttribute(node.name, primaryRefDb, primaryRef);

			// add annotation as an attribute
			network.addNodeAttribute(node.name, "annotation", 
				(xml.evaluate("psi:names/psi:fullName", interactorElement, nsmapper, XPathResult.STRING_TYPE, null)).stringValue);

			var secondaryRefResults = xml.evaluate("psi:xref/psi:secondaryRef", interactorElement,
				nsmapper, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

			var secondaryRefElement = secondaryRefResults.iterateNext();
			while (secondaryRefElement != null) {
				var db = (xml.evaluate("@db", secondaryRefElement, nsmapper, XPathResult.STRING_TYPE, null)).stringValue;
				var id = (xml.evaluate("@id", secondaryRefElement, nsmapper, XPathResult.STRING_TYPE, null)).stringValue;

				// special hack for halo VNG numbers. For Halo there are two identifiers
				// both with db = GenomeReviews. One is the VNG number and one is a protein_id.
				// Doesn't matter that much 'cause the shortLabel will be the VNG number as well.
				if (db == "GenomeReviews" && FG_util.startsWith(id, "VNG")) db = "VNG";
				// ?? if (db == "GenomeReviews" && id.startsWith("AA")) db = "protein_id";

				network.addNodeAttribute(node.name, db, id);
				secondaryRefElement = secondaryRefResults.iterateNext();
			}

			interactorElement = results.iterateNext();
		}

		return interactors;
	},

	/**
	 * read edges (interactions) from PSI-MI XML
	 */
	_readInteractions: function(xml, nsmapper, network, experimentDescriptions, interactors) {
		var results = xml.evaluate("/psi:entrySet/psi:entry/psi:interactionList/psi:interaction", xml,
				nsmapper, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

		var interactionElement = results.iterateNext();
		while (interactionElement != null) {

			var type = (xml.evaluate("psi:experimentList/psi:experimentRef", interactionElement, nsmapper, XPathResult.NUMBER_TYPE, null)).numberValue;
			var participants = [];

			var participantResults = xml.evaluate("psi:participantList/psi:participant", interactionElement, nsmapper, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
			var i=0;
			var participantElement = participantResults.iterateNext();
			while (participantElement != null) {
				var ref = (xml.evaluate("psi:interactorRef", participantElement, nsmapper, XPathResult.NUMBER_TYPE, null)).numberValue;
				participants[i++] = interactors[ref];
				participantElement = participantResults.iterateNext();
			}

			// I'm assuming there will be exactly two participants, so warn if that's not the case
			if (i != 2) {
				FG_trace("Warning from emblstring.processNetworkXml(): Interacton has " + i + " participants. Expected 2.");
			}

			if (i > 1) {
				var interaction = javaFiregooseLoader.createInteraction(participants[0].name, participants[1].name, experimentDescriptions.getNameForId(type));
				network.add(interaction);

				// add confidence as edge attributes
				var confidenceElements = xml.evaluate("psi:confidenceList/psi:confidence", interactionElement, nsmapper, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
				var confidence = confidenceElements.iterateNext();
				while (confidence != null) {
					var name = (xml.evaluate("psi:unit/psi:names/psi:shortLabel", confidence, nsmapper, XPathResult.STRING_TYPE, null)).stringValue;
					var value = (xml.evaluate("psi:value", confidence, nsmapper, XPathResult.NUMBER_TYPE, null)).numberValue;
					network.addEdgeAttribute(interaction.toString(), name, value);
					confidence = confidenceElements.iterateNext();
				}
			}

			interactionElement = results.iterateNext();
		}
	},

	/**
	 * report failure of XMLHttpRequest
	 */
	_requestFailed: function(request) {

		clearInterval(this.progressTimer);
		if (this.progressDialog)
			this.progressDialog.close();

		try {
			FG_trace("failed STRING request = " + request);
		}
		catch (e) {}

		alert("Failed to retrieve STRING network as XML.");
	},


	/**
	 * create a caller identity URL param that String can use to log hits
	 */
	callerIdentity: function() {
		return "caller_identity=firegoose_v_" + FG_getString("version").replace(/\./g, "_");
	},


	/**
	 * In the input page, string uses species names in which periods appear to
	 * have been replaced by underscores. Also, converts species to all lower case.
	 */
	toStringSpeciesName: function(species) {
		// HACK: make sure we're dealing with a javascript string, not a java string.
		species = "" + species;

		var speciesLowerCase = species.toLowerCase();

		// fudge for Halo synonyms
		if (speciesLowerCase in this.speciesSynonyms) {
			speciesLowerCase = this.speciesSynonyms[speciesLowerCase];
		}

		// replace periods with underscores
		return speciesLowerCase.replace("\.", "_");
	},


	/**
	 * when we receive a namelist, open the input form with a formFiller
	 * event listener that fills out the input form and submits it.
	 */
	handleNameList: function(species, names) {

		// String's input page no longer uses numeric species codes. The species names are
		// text, but periods seem to have been converted to underscores.
		var stringSpeciesName = this.toStringSpeciesName(species);

		var newTab = getBrowser().addTab();
		var browser = getBrowser().getBrowserForTab(newTab);

		browser.addEventListener("load", this.createOnloadFormFiller(stringSpeciesName, names), true);

		var url = "http://string.embl.de/newstring_cgi/show_input_page.pl?input_page_type=multiple_identifiers"
			+ "&" + this.callerIdentity();
		getBrowser().selectedTab = newTab;
		browser.loadURI(url);
	},


	/**
	 * special hack to be liberal about names for halo
	 */
	speciesSynonyms: {
		"halobacterium sp.": "halobacterium sp. nrc-1",
		"halobacterium nrc1": "halobacterium sp. nrc-1",
		"halobacterium nrc-1": "halobacterium sp. nrc-1",
		"h. salinarum": "halobacterium sp. nrc-1",
		"halobacterium salinarum": "halobacterium sp. nrc-1",
		"halobacterium salinarum nrc-1": "halobacterium sp. nrc-1"
	},


	/**
	 * returns an integer given a species name. Used prior to
	 * String 7.1 to set species in the input page. Replaced by
	 * toStringSpecies because String changed to using text names
	 * rather than numeric codes.
	 */
	speciesToCode: function(species) {
		// HACK: make sure we're dealing with a javascript string, not a java string.
		species = "" + species;

		var speciesLowerCase = species.toLowerCase();

		// fudge for Halo synonyms
		if (speciesLowerCase in this.speciesSynonyms) {
			speciesLowerCase = this.speciesSynonyms[speciesLowerCase];
		}

		// linear search through the list of species names
		for (var n in this.speciesNames) {
			if (FG_util.startsWith(this.speciesNames[n], speciesLowerCase))
				return n;
		}
		return null;
	},


	codeToSpecies: function(code) {
		if (typeof(code) == "string")
			code = parseInt(code);
		if (code in this.speciesNames) {
			return this.speciesNames[code];
		}
		else {
			return "unknown";
		}
	},

	speciesNames: {
	   117: "rhodopirellula baltica",
	   235: "brucella melitensis abortus",
	   341: "xanthomonas campestris vesicat.",
	   518: "bordetella bronchiseptica",
	   520: "bordetella pertussis",
	   601: "salmonella typhi ct18",
	   882: "desulfovibrio vulgaris",
	   959: "bdellovibrio bacteriovorus",
	  1140: "synechococcus elongatus pcc7942",
	  1148: "synechocystis sp. pcc6803",
	  2287: "sulfolobus solfataricus",
	  3702: "arabidopsis thaliana",
	  4896: "schizosaccharomyces pombe",
	  4932: "saccharomyces cerevisiae",
	  4952: "yarrowia lipolytica",
	  4959: "debaryomyces hansenii",
	  5085: "aspergillus fumigatus",
	  5207: "filobasidiella neoformans",
	  5478: "candida glabrata",
	  5833: "plasmodium falciparum",
	  6035: "encephalitozoon cuniculi",
	  6239: "caenorhabditis elegans",
	  7165: "anopheles gambiae",
	  7227: "drosophila melanogaster",
	  7460: "apis mellifera",
	  7719: "ciona intestinalis",
	  7955: "danio rerio",
	  8364: "xenopus tropicalis",
	  9031: "gallus gallus",
	  9544: "macaca mulatta",
	  9598: "pan troglodytes",
	  9606: "homo sapiens",
	  9615: "canis familiaris",
	  9913: "bos taurus",
	 10090: "mus musculus",
	 10116: "rattus norvegicus",
	 13616: "monodelphis domestica",
	 13773: "pyrobaculum aerophilum",
	 28985: "kluyveromyces lactis",
	 31033: "takifugu rubripes",
	 32046: "synechococcus elongatus bp1",
	 33169: "eremothecium gossypii",
	 36870: "wigglesworthia glossinidia",
	 38323: "bartonella henselae",
	 39152: "methanococcus maripaludis",
	 44689: "dictyostelium discoideum",
	 45157: "cyanidioschyzon merolae",
	 56780: "syntrophus aciditrophicus",
	 59919: "prochlorococcus marinus ccmp1986",
	 59920: "prochlorococcus marinus natl2a",
	 62977: "acinetobacter sp. adp1",
	 64091: "halobacterium sp. nrc-1",
	 66077: "wolbachia sp. wmel",
	 66692: "bacillus clausii",
	 69014: "thermococcus kodakarensis",
	 70601: "pyrococcus horikoshii",
	 71421: "haemophilus influenzae rd kw20",
	 74109: "photobacterium profundum",
	 74546: "prochlorococcus marinus mit9312",
	 74547: "prochlorococcus marinus mit9313",
	 76114: "azoarcus sp. ebn1",
	 83331: "mycobact. tuberculosis cdc1551",
	 83332: "mycobact. tuberculosis h37rv",
	 83333: "escherichia coli k12",
	 83334: "escherichia coli o157h7",
	 84588: "synechococcus sp. wh8102",
	 85962: "helicobacter pylori 26695",
	 85963: "helicobacter pylori j99",
	 93061: "staphylococcus aureus 8325",
	 93062: "staphylococcus aureus col",
	 99287: "salmonella typhimurium",
	 99883: "tetraodon nigroviridis",
	100226: "streptomyces coelicolor",
	103690: "nostoc sp. pcc7120",
	106370: "frankia sp. cci3",
	107806: "buchnera aphidicola aps",
	110662: "synechococcus sp. cc9605",
	115711: "chlamydophila pneum. ar39",
	115713: "chlamydophila pneum. cwl029",
	119857: "francisella tularensis holarctica",
	122586: "neisseria meningitidis mc58",
	122587: "neisseria meningitidis z2491",
	138119: "desulfitobacterium hafniense",
	138677: "chlamydophila pneum. j138",
	155864: "escherichia coli o157h7 edl933",
	158878: "staphylococcus aureus mu50",
	158879: "staphylococcus aureus n315",
	159087: "dechloromonas aromatica",
	160488: "pseudomonas putida",
	160490: "streptococcus pyogenes 700294",
	160492: "xylella fastidiosa 9a5c",
	167539: "prochlorococcus marinus ccmp1375",
	167879: "colwellia psychrerythraea",
	169963: "listeria monocytogenes egd-e",
	170187: "streptococcus pneumoniae tigr4",
	171101: "streptococcus pneumoniae r6",
	176279: "staphylococcus epidermidis rp62a",
	176280: "staphylococcus epidermidis 12228",
	176299: "agrobacterium tumefaciens",
	177416: "francisella tularensis schu s4",
	177439: "desulfotalea psychrophila",
	182082: "chlamydophila pneum. tw-183",
	183190: "xylella fastidiosa temecula1",
	184922: "giardia lamblia",
	186103: "streptococcus pyogenes mgas8232",
	186497: "pyrococcus furiosus",
	187410: "yersinia pestis kim",
	187420: "methanothermobacter thermautotr.",
	188937: "methanosarcina acetivorans",
	189518: "leptospira interrogans lai",
	190192: "methanopyrus kandleri",
	190304: "fusobacterium nucleatum",
	190485: "xanthomonas campestris 33913",
	190486: "xanthomonas axonopodis",
	190650: "caulobacter crescentus",
	192222: "campylobacter jejuni 11168",
	192952: "methanosarcina mazei",
	193567: "streptococcus pyogenes ssi1",
	194439: "chlorobium tepidum",
	195099: "campylobacter jejuni rm1221",
	195102: "clostridium perfringens",
	196164: "corynebacterium efficiens",
	196600: "vibrio vulnificus yj016",
	196620: "staphylococcus aureus mw2",
	196627: "corynebacterium glutamicum",
	198094: "bacillus anthracis porton",
	198214: "shigella flexneri 301",
	198215: "shigella flexneri 2457t",
	198466: "streptococcus pyogenes mgas315",
	198804: "buchnera aphidicola sg",
	199310: "escherichia coli cft073",
	203122: "saccharophagus degradans",
	203267: "tropheryma whipplei twist",
	203907: "blochmannia floridanus",
	204669: "acidobacterium sp. ellin345",
	204722: "brucella suis",
	205918: "pseudomonas syringae b728a",
	205921: "streptococcus agalactiae a909",
	205922: "pseudomonas fluorescens pfo1",
	206672: "bifidobacterium longum",
	207559: "desulfovibrio desulfuricans",
	208435: "streptococcus agalactiae 2603vr",
	208964: "pseudomonas aeruginosa",
	209261: "salmonella enterica ty2",
	210007: "streptococcus mutans ua159",
	211110: "streptococcus agalactiae nem316",
	211586: "shewanella oneidensis",
	212042: "anaplasma phagocytophilum",
	212717: "clostridium tetani",
	214092: "yersinia pestis co92",
	216895: "vibrio vulnificus cmcp6",
	217992: "escherichia coli o6",
	218491: "erwinia carotovora",
	218496: "tropheryma whipplei tw0827",
	218497: "chlamydophila abortus",
	220664: "pseudomonas fluorescens pf5",
	220668: "lactobacillus plantarum",
	221109: "oceanobacillus iheyensis",
	221988: "mannheimia succiniciproducens",
	222523: "bacillus cereus 10987",
	222891: "neorickettsia sennetsu",
	223283: "pseudomonas syringae dc3000",
	223926: "vibrio parahaemolyticus",
	224308: "bacillus subtilis",
	224324: "aquifex aeolicus",
	224325: "archaeoglobus fulgidus",
	224326: "borrelia burgdorferi",
	224911: "bradyrhizobium japonicum",
	224914: "brucella melitensis 16m",
	224915: "buchnera aphidicola bp",
	226185: "enterococcus faecalis",
	226186: "bacteroides thetaiotaomicron",
	226900: "bacillus cereus 14579",
	227377: "coxiella burnetii",
	227882: "streptomyces avermitilis",
	227941: "chlamydophila caviae",
	228410: "nitrosomonas europaea",
	228908: "nanoarchaeum equitans",
	229193: "yersinia pestis 91001",
	233150: "mycoplasma gallisepticum",
	233412: "haemophilus ducreyi",
	233413: "mycobacterium bovis",
	234267: "solibacter usitatus",
	234826: "anaplasma marginale",
	235279: "helicobacter hepaticus",
	235909: "geobacillus kaustophilus",
	237895: "cryptosporidium hominis",
	240292: "anabaena variabilis",
	242231: "neisseria gonorrhoeae",
	242619: "porphyromonas gingivalis",
	243160: "burkholderia mallei",
	243161: "chlamydia muridarum",
	243164: "dehalococcoides ethenogenes",
	243230: "deinococcus radiodurans",
	243231: "geobacter sulfurreducens",
	243232: "methanocaldococcus jannaschii",
	243233: "methylococcus capsulatus",
	243265: "photorhabdus luminescens",
	243273: "mycoplasma genitalium",
	243274: "thermotoga maritima",
	243275: "treponema denticola",
	243276: "treponema pallidum",
	243277: "vibrio cholerae",
	243365: "chromobacterium violaceum",
	246194: "carboxydothermus hydrogenoform.",
	246200: "silicibacter pomeroyi",
	247156: "nocardia farcinica",
	251221: "gloeobacter violaceus",
	254945: "ehrlichia ruminantium welgev.",
	255470: "dehalococcoides sp. cbdb1",
	257309: "corynebacterium diphtheriae",
	257311: "bordetella parapertussis 12822",
	257314: "lactobacillus johnsonii",
	257363: "rickettsia typhi",
	258594: "rhodopseudom. palustris cga009",
	259536: "psychrobacter arcticus",
	259564: "methanococcoides burtonii",
	260799: "bacillus anthracis sterne",
	261594: "bacillus anthracis 0581",
	262316: "mycobacterium avium",
	262698: "brucella abortus",
	262719: "mycoplasma hyopneumoniae j",
	262722: "mycoplasma hyopneumoniae 7448",
	262723: "mycoplasma synoviae",
	262724: "thermus thermophilus hb27",
	262768: "onion yellows phytoplasma",
	263820: "picrophilus torridus",
	264198: "ralstonia eutropha",
	264199: "streptococcus thermoph. lmg18311",
	264201: "protochlamydia amoebophila",
	264202: "chlamydophila felis",
	264203: "zymomonas mobilis",
	264730: "pseudomonas syringae 1448a",
	264732: "moorella thermoacetica",
	265072: "methylobacillus flagellatus",
	265311: "mesoplasma florum",
	265669: "listeria monocytogenes f2365",
	266264: "ralstonia metallidurans",
	266265: "burkholderia xenovorans",
	266834: "sinorhizobium meliloti",
	266835: "mesorhizobium loti",
	267608: "ralstonia solanacearum",
	267671: "leptospira interrogans copenh.",
	267747: "propionibacterium acnes",
	267748: "mycoplasma mobile",
	269084: "synechococcus elongatus pcc6301",
	269483: "burkholderia sp. 383",
	269484: "ehrlichia canis",
	269796: "rhodospirillum rubrum",
	269797: "methanosarcina barkeri",
	269799: "geobacter metallireducens",
	269800: "thermobifida fusca",
	271848: "burkholderia thailandensis",
	272557: "aeropyrum pernix",
	272558: "bacillus halodurans",
	272559: "bacteroides fragilis 9343",
	272560: "burkholderia pseudomallei k96243",
	272561: "chlamydia trachomatis d/uw-3/cx",
	272562: "clostridium acetobutylicum",
	272569: "haloarcula marismortui",
	272621: "lactobacillus acidophilus",
	272623: "lactococcus lactis",
	272624: "legionella pneumophila philad.",
	272626: "listeria innocua",
	272631: "mycobacterium leprae tn",
	272632: "mycoplasma mycoides",
	272633: "mycoplasma penetrans",
	272634: "mycoplasma pneumoniae",
	272635: "mycoplasma pulmonis",
	272843: "pasteurella multocida",
	272844: "pyrococcus abyssi",
	272943: "rhodobacter sphaeroides",
	272944: "rickettsia conorii",
	272947: "rickettsia prowazekii",
	273036: "staphylococcus aureus rf122",
	273063: "sulfolobus tokodaii",
	273068: "thermoanaerobacter tengcongensis",
	273075: "thermoplasma acidophilum",
	273116: "thermoplasma volcanium",
	273119: "ureaplasma parvum",
	273121: "wolinella succinogenes",
	273123: "yersinia pseudotuberculosis",
	279010: "bacillus licheniformis",
	279238: "novosphingobium aromaticivorans",
	279808: "staphylococcus haemolyticus",
	281090: "leifsonia xyli",
	281309: "bacillus thuringiensis",
	281310: "haemophilus influenzae 86-028np",
	282458: "staphylococcus aureus mrsa252",
	282459: "staphylococcus aureus mssa476",
	283165: "bartonella quintana",
	283942: "idiomarina loihiensis",
	286636: "streptococcus pyogenes mgas10394",
	288681: "bacillus cereus e33l",
	290397: "anaeromyxobacter dehalogenans",
	290398: "chromohalobacter salexigens",
	290400: "jannaschia sp. ccs1",
	290434: "borrelia garinii",
	290633: "gluconobacter oxydans",
	291272: "blochmannia pennsylvanicus",
	291331: "xanthomonas oryzae kacc10331",
	292414: "silicibacter sp. tm1040",
	292415: "thiobacillus denitrificans",
	292459: "symbiobacterium thermophilum",
	292805: "wolbachia endosymbiont",
	293653: "streptococcus pyogenes mgas5005",
	295319: "salmonella enterica 9150",
	295358: "mycoplasma hyopneumoniae 232",
	295405: "bacteroides fragilis ych46",
	296543: "thalassiosira pseudonana",
	296591: "polaromonas sp. js666",
	297245: "legionella pneumophila lens",
	297246: "legionella pneumophila paris",
	299768: "streptococcus thermoph. cnrz1066",
	300267: "shigella dysenteriae",
	300268: "shigella boydii",
	300269: "shigella sonnei",
	300852: "thermus thermophilus hb8",
	302409: "ehrlichia ruminantium gardel",
	306537: "corynebacterium jeikeium",
	309807: "salinibacter ruber",
	312309: "vibrio fischeri",
	314225: "erythrobacter litoralis",
	314315: "lactobacillus sakei",
	314565: "xanthomonas campestris 8004",
	315277: "chlamydia trachomatis a/har-13",
	315456: "rickettsia felis",
	316056: "rhodopseudom. palustris bisb18",
	316057: "rhodopseudom. palustris bisb5",
	316058: "rhodopseudom. palustris haa2",
	316279: "synechococcus sp. cc9902",
	316407: "escherichia coli w3110",
	317025: "thiomicrospira crunogena",
	317655: "sphingopyxis alaskensis",
	318161: "shewanella denitrificans",
	319225: "pelodictyon luteolum",
	319701: "streptococcus pyogenes mgas6180",
	319795: "deinococcus geothermalis",
	320372: "burkholderia pseudomallei 1710b",
	321314: "salmonella enterica scb67",
	322098: "aster yellows phytoplasma",
	323097: "nitrobacter hamburgensis",
	323098: "nitrobacter winogradskyi",
	323261: "nitrosococcus oceani",
	323848: "nitrosospira multiformis",
	326298: "thiomicrospira denitrificans",
	326442: "pseudoalteromonas haloplanktis5",
	330779: "sulfolobus acidocaldarius",
	331114: "cyanobacterium yellowstone a",
	331115: "cyanobacterium yellowstone b",
	335284: "psychrobacter cryohalolentis",
	335992: "pelagibacter ubique",
	336407: "rickettsia bellii",
	338963: "pelobacter carbinolicus",
	338969: "rhodoferax ferrireducens",
	339860: "methanosphaera stadtmanae",
	340047: "mycoplasma capricolum",
	340177: "chlorobium chlorochromatii",
	342108: "magnetospirillum magneticum",
	342451: "staphylococcus saprophyticus",
	343509: "sodalis glossinidius",
	347834: "rhizobium etli",
	348780: "natronomonas pharaonis",
	349521: "hahella chejuensis",
	362948: "lactobacillus salivarius",
	363253: "lawsonia intracellularis",
	364106: "escherichia coli uti89",
	367830: "staphylococcus aureus usa300",
	370551: "streptococcus pyogenes mgas9429",
	370552: "streptococcus pyogenes mgas10270",
	370553: "streptococcus pyogenes mgas2096",
	370554: "streptococcus pyogenes mgas10750",
	374463: "baumannia cicadellinicola"
	}
}


FG_addWebsiteHandler("EMBL String", FG_emblString); 
