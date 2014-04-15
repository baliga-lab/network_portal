/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */


/**
 * a handler for the EGRIN bicluster viewer web app. This will enable
 * easily broadcasting a list of identifiers to the search page
 * and retrieving the search results (lists of genes).
 */
var FG_egrinHandler = new Object();

FG_egrinHandler.runId = 1;

FG_egrinHandler.egrinUrl = "http://db.systemsbiology.net:8080/biclusterviewer/";


/**
 * check the given doc to see if we can scrape it
 */
FG_egrinHandler.recognize = function(doc) {
	return false;
	/*
	if (doc) {
		var result = doc.evaluate("html/head/title[1]", doc, null, XPathResult.STRING_TYPE, null);
		return result.stringValue == "Halobacterium EGRIN";
	}
	else
		return false;
	*/
}


FG_egrinHandler.show = function() {
	var newTab = getBrowser().addTab(this.egrinUrl);
	getBrowser().selectedTab = newTab;
}


FG_egrinHandler.getPageData = function(doc) {
	return null;
}


FG_egrinHandler.handleNameList = function(species, names) {
	// construct a URL to search
	// use the FG_util.join method because it works on both
	// js arrays and java arrays
	var url = this.egrinUrl
			+ "search?by=all"
			+ "&runId=" + this.runId
			+ "&searchTerms=" + FG_util.join(names, "+");

	// open the URL in a new tab
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}

function FG_EgrinHandler(runId) {
	this.runId = runId;
}
FG_EgrinHandler.prototype = FG_egrinHandler;

// create and register a websiteHandler
FG_addWebsiteHandler("EGRIN", new FG_EgrinHandler(1));

FG_addWebsiteHandler("EGRIN Redox", new FG_EgrinHandler(2));
