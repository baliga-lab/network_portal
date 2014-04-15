/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */


var FG_gaggleStore = new Object();

FG_gaggleStore.recognize = function(doc) {
	return false;
}

FG_gaggleStore.getPageData = function(doc) {
	return null;
}

FG_gaggleStore.handleNameList = function(species, names) {
	if (names) {
		var queryString = FG_util.join(names, "+");
		var url = "http://db.systemsbiology.net:8080/halo/gaggleStore.py?" + queryString;

		// open the URL in a new tab
		var newTab = getBrowser().addTab(url);
		getBrowser().selectedTab = newTab;
	}
}


// register website handler
FG_addWebsiteHandler("GaggleStore", FG_gaggleStore);
