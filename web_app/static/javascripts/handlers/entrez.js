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
function FG_Entrez(db) {
	if (db)
		this.db = db;
	else
		this.db = "gene";
}


/**
 * doesn't broadcast out
 */
FG_Entrez.prototype.recognize = function(doc) {
	return false;
}

FG_Entrez.prototype.getPageData = function(doc) {
	return null;
}


FG_Entrez.prototype.show = function() {
	var url = "http://www.ncbi.nlm.nih.gov/entrez/query.fcgi?db=" + this.db;
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}

/**
 * search in Entrez Gene
 */
FG_Entrez.prototype.handleNameList = function(species, names) {

	if (names && names.length > 0) {
	
		// For Entrez Gene, GeneIDs are considered UIDs.
		// For Entrez Protein, GI numbers are the UIDs.
		// 
		// I don't know of a practical way to tell these two apart, so we just assume
		// that numeric identifiers are UIDs and non-numberic identifiers aren't.

		if (isNaN(parseInt(names[0]))) {
		    var delimiter = "+OR+";
			var queryString = FG_util.join(names, delimiter);
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
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}

// register a website handler each for Entrez gene and Entrez protein
FG_addWebsiteHandler("Entrez Gene", new FG_Entrez("gene"));
FG_addWebsiteHandler("Entrez Protein", new FG_Entrez("protein"));
