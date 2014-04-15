/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * don't remember what the @#$% this is
 */
var FG_apiGoose = new Object();


FG_apiGoose.recognize = function(doc) {
	var pageScope = doc.defaultView.wrappedJSObject;
	if (pageScope && pageScope.goose) {
		dump("set goose.boss... " + FG_boss + "\n");
		pageScope.goose.boss = FG_boss;
		dump("goose name = " + pageScope.goose.name + "\n");
	}

	// would it be any safer to pass a wrapper object
}


FG_apiGoose.show = function() {
}


/**
 * read data out of a variable in the page.
 */
FG_apiGoose.getPageData = function(doc) {
	return null;
}



// register websiteHandler
FG_addWebsiteHandler("api", FG_apiGoose);

