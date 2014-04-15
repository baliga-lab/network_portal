/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

//
// a website handler for the Gaggle microformat for embedding
// gaggle data types in valid HTML.
//


/**
 * constructor.
 */
function FG_GaggleMicroformatHandler() {
}


FG_GaggleMicroformatHandler.prototype.dontDisplayInMenu = true;


/**
 * check the given doc to see if we can parse it.
 */
FG_GaggleMicroformatHandler.prototype.recognize = function (doc) {
    alert("start...");
    alert(gaggleMicroformat);
    result = gaggleMicroformat.hasGaggleData(doc);
    if (result) dump("Recognized Gaggle microformat data!\n");
    return result;
}


/**
 * retrieve the data from the page.
 */
FG_GaggleMicroformatHandler.prototype.getPageData = function(doc) {
	var gaggleDataElements = gaggleMicroformat.scan(doc);
	var results = [];

	// wrap each gaggle data object to allow parsing the data lazily.
	for (var i=0; i<gaggleDataElements.length; i++) {
		// gaggleMicroFormat.scan returns js objects for networks and matrices, which
		// have to be converted to Java objects before being broadcast to the Boss.
		results.push(gaggleDataElements[i].setConvertToJavaOnGetData());
	}
	return results;
}


/**
 * takes a species and a Java Array of names and submits them for
 * processing by the website.
 */
FG_GaggleMicroformatHandler.prototype.handleNameList = function(species, names) {
	alert("Gaggle microformat handler got namelist(" + names.length + ") species=" + species + ".");
}


// create and register a websiteHandler
FG_addWebsiteHandler("Embedded Gaggle Data", new FG_GaggleMicroformatHandler());

