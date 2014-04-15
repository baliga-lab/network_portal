/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

//
// Handler for interacting with the SBEAMS Peptide Atlas
//


// create and register a websiteHandler
FG_addWebsiteHandler("Peptide Atlas", {

	recognize : function(doc) {
		return false;
	},

	show : function() {
		var url = "http://db.systemsbiology.net/sbeams/cgi/PeptideAtlas/Search";
		var newTab = getBrowser().addTab(url);
		getBrowser().selectedTab = newTab;
	},
	
	getPageData : function(doc) {
		return null;
	},
	
	handleNameList : function(species, names) {
		var url = "https://db.systemsbiology.net/sbeams/cgi/PeptideAtlas/Search?action=GO&search_key=";

		// semi-colon delimited list of gene names
		url += FG_util.join(names, "%3B");

		var newTab = getBrowser().addTab(url);
		getBrowser().selectedTab = newTab;
	}

});

