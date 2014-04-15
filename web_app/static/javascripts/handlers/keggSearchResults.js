/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */


/**
 * screen scrape the search results page of the KEGG Pathway database.
 *
 * This allows returning which genes in your search set matched a pathway,
 * rather than all genes in that pathway.
 *
 * references FG_kegg in FG_keggSearchResults.getSpecies(...)
 */
var FG_keggSearchResults = new Object();


// this is a read-only handler
FG_keggSearchResults.dontDisplayInMenu = true;


FG_keggSearchResults.recognize = function(doc) {
	if (doc) {
		var url = doc.location.href;
		return url.indexOf("http://www.genome.jp/kegg-bin/search_pathway_www") >=0 ||
		url.indexOf("http://www.genome.jp/kegg-bin/search_pathway_object") >=0;
	}
	else
		return false;
}

FG_keggSearchResults.states = { INITIAL:0, FOUND_WARNING:1, FOUND_UNKNOWN_ITEMS:2, FOUND_LIST_ITEMS:3 };


/**
 * returns a list of FG_GaggleData objects
 */
FG_keggSearchResults.getPageData = function(doc) {
	dump("scraping kegg search results page...\n\n");
	
	var species = this.getSpecies(doc);
	dump("species = " + species + "\n");

	var results = [];

	// parse out genes not found in KEGG
	try {
	var unknowns = this._getUnknowns(doc);
	if (unknowns && unknowns.length > 0) {
		results.push(new FG_GaggleData(
		    "Items not found in KEGG Pathway",
		    "NameList",
			unknowns.length,
			species,
			unknowns));
	}
	}
	catch (e) {
		dump(e + "\n");
		FG_trace(e);
	}
	

	// Each <li> holds a pathway. Below that are genes in the pathway. 
	var listItems = doc.getElementsByTagName("li");
	var pathways = [];
	var pathway;
	for (i in listItems) {
		var pathway = new Object();
		var linkText = listItems[i].firstChild.text;
		pathway.keggCode = linkText.substring(0,linkText.indexOf(" "));
		pathway.name = linkText.substring(linkText.indexOf(" ")+1);;
		dump("pathname= " + pathway.keggCode + "::" + pathway.name + "\n");
		
		pathway.genes = [];
		pathway.names = [];
		pathways.push(pathway);

		try {
			// find div tag containing genes in pathway

			// I tried to use XPATH here, but I couldn't get the sibling nodes from the
			// resulting anchor tag nodes. node.nextSibling returned null.
//			var result = doc.evaluate("//div/a", listItems[i],
//				null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
//			if (result) {
//				var node;
//				while (node = result.iterateNext()) {

			var children = listItems[i].childNodes;
			for (j in children) {
				var li_child = children[j];
				if (ufmt.isTagName(li_child, "DIV")) {
					for (k in li_child.childNodes) {
						var node = li_child.childNodes[k];
						if (ufmt.isTagName(node, "A")) {
							// <a href=/dbget-bin/www_bget?hal:VNG0415G target=_bget>hal:VNG0415G</a> purB; adenylosuccinate lyase (EC:4.3.2.2); K01756 adenylosuccinate lyase [EC:4.3.2.2]
							var href = node.getAttribute("href");
							var linkText = node.text;
							var followingText = node.nextSibling.nodeValue;
			
							dump("link = " + href + "\n");
							dump("link text = " + linkText + "\n");
							dump("following text = " + followingText + "\n");
			
							var gene = this._parseGene(linkText, followingText);
							pathway.genes.push(gene);
							pathway.names.push(gene.name);
							dump("gene:" + gene.name + ", " + gene.commonName + ", " + gene.ec + ", anno=" + gene.annotation + "\n");
						}
					}
				}
			}
		}
		catch (e) {
			dump(e + "\n");
			FG_trace(e);
		}
	}

	// put an item in the broadcast menu for each pathway
	for (i in pathways) {
		pathway = pathways[i]
		results.push( new FG_GaggleData(
				pathway.name + " pathway",
				"NameList",
				pathway.names.length,
				species,
				pathway.names));
	}

	return results;
}



/**
 * get the species, if available, from the page. If query items match no
 * kegg pathway, then species is not in the page.
 */
FG_keggSearchResults.getSpecies = function(doc) {
	// use XPATH to grab the 3 letter species code
	var result = doc.evaluate("/html/body/form[@name='form1']/input[@name='org_name']/@value", doc,
		null, XPathResult.STRING_TYPE, null);
	if (result && result.stringValue) {
		// convert to standard species name
		return FG_kegg.toStandardSpeciesName(result.stringValue.substring(0,3));
	}
	else {
		return "unknown";
	}
}


/**
 * Navigates through DOM to the text node holding the identfiers not found in
 * KEGG and returns them as an array of strings.
 */
FG_keggSearchResults._getUnknowns = function(doc) {
	var names = [];
	var fontTags = doc.getElementsByTagName("font");
	if (fontTags && fontTags.length > 0) {
		var text = fontTags[0].nextSibling.nodeValue;
		var rawNames = text.split(/\s+/);
		for (var i in rawNames) {
			var m = rawNames[i].match(/.+:(\w+)/);
			if (m) {
				names.push(m[1]);
			}
			else {
				names.push(rawNames[i]);
			}
		}
	}
	return names;

// oops, there's an unclassified hidden input field, but it seems to contain
// all genes rather than just those that are not found.

//	var result = doc.evaluate("/html/body/form[@name='form1']/input[@name='unclassified']/@value", doc,
//			null, XPathResult.STRING_TYPE, null);
//	if (result && result.stringValue) {
//		// convert to standard species name
//		return result.stringValue.split(/\s+/);
//	}
//	else {
//		return null;
//	}
}


FG_keggSearchResults._parseGene = function(linkText, followingText) {
	var gene = new Object();

	// get gene canonical name
	var m = linkText.match(/.+:(\w+)/);
	if (m) {
		gene.name = m[1];
	}
	else {
		gene.name = linkText;
	}

	// find gene common name
	m = followingText.match(/(.+?);\s*(.*)/);
	if (m) {
		gene.commonName = m[1];
		gene.annotation = m[2].trim();
	}
	else {
		gene.commonName = null;
		gene.annotation = followingText;
	}

	// strip out EC numbers
	m = gene.annotation.match(/(\[EC:([\.\d]+)\])/);
	if (m) {
		gene.ec = m[1];
		gene.annotation = gene.annotation.replace(/(\[EC:([\.\d]+)\])/, "");
	}
	return gene;
}


// register handler
FG_addWebsiteHandler("KEGG Search Results", FG_keggSearchResults);


