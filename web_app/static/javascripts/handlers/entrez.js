/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * search for genes or proteins in the Entrez database at NCBI.
 * db = gene|protein
 */

function Entrez(db)
{
    if (db)
        this.db = db;
    else
    	this.db = "gene";
    handler_base.call(this, ("Entrez " + this.db), true, "handlers/entrez.js", ("http://www.ncbi.nlm.nih.gov/entrez/query.fcgi?db=" + this.db));
}

Entrez.prototype = new handler_base();

Entrez.prototype.constructor = Entrez;

/**
 * search in Entrez Gene
 */
Entrez.prototype.handleNameList = function(namelist) {

    if (namelist == null)
        return;
    var species = namelist.getSpecies();
    var names = namelist.getData();
	if (names && names.length > 0) {
	
		// For Entrez Gene, GeneIDs are considered UIDs.
		// For Entrez Protein, GI numbers are the UIDs.
		// 
		// I don't know of a practical way to tell these two apart, so we just assume
		// that numeric identifiers are UIDs and non-numberic identifiers aren't.

		if (isNaN(parseInt(names[0]))) {
		    var delimiter = "+OR+";
			var queryString = cg_util.join(names, delimiter);
		}
		else {
			if (names.length >0) {
			    var queryString = names[0] + "[uid]";
				for (var i=1; i<names.length; i++) {
				   queryString += "+OR+" + names[i] + "[uid]";
				} 
			}
		}

		// construct a URL to search sbeams halo annotations
		var url = "http://www.ncbi.nlm.nih.gov/entrez/query.fcgi?"
				+ "cmd=PureSearch"
				+ "&db=" + this.db
				+ "&details_term=" + queryString;
	}
	else {
		var url = "http://www.ncbi.nlm.nih.gov/entrez/query.fcgi?db=" + this.db;
	}

	// open the URL in a new tab
	console.log("Entrez open url: " + url);
	var iframeid = cg_util.generateUUID();
    //cg_util.createIFrame(url, iframeid, ".divResultIFrames", "iframediv", "gaggleiframe");

    var scope = angular.element($("#divGeneInfo")).scope();
    cg_util.addIframeToAngularJS(scope, HANDLER_SEARCH_RESULT_TITLE, HANDLER_SEARCH_RESULT_TITLE, this._name, url, this._name, iframeid);
}

var entrezGene = new Entrez("gene");
var entrezProtein = new Entrez("protein");

// register a website handler each for Entrez gene and Entrez protein
//FG_addWebsiteHandler("Entrez Gene", new FG_Entrez("gene"));
//FG_addWebsiteHandler("Entrez Protein", new FG_Entrez("protein"));
