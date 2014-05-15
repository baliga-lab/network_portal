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
function GaggleMicroformatParser() {
}



/**
 * check the given doc to see if we can parse it.
 */
GaggleMicroformatParser.prototype.recognize = function (doc) {
    console.log("GaggleMicroformatParser recognizing page");
    result = gaggleMicroformat.hasGaggleData(doc);
    if (result)
        console.log("Recognized Gaggle microformat data!\n");
    return result;
}


/**
 * retrieve the data from the page.
 */
GaggleMicroformatParser.prototype.getPageData = function(doc) {
	var gaggleDataElements = gaggleMicroformat.scan(doc);
	console.log("GaggleMicroformatParser got " + gaggleDataElements.length + " items");
	var results = [];

	// wrap each gaggle data object to allow parsing the data lazily.
	for (var i=0; i<gaggleDataElements.length; i++) {
		// gaggleMicroFormat.scan returns js objects for networks and matrices, which
		// have to be converted to Java objects before being broadcast to the Boss.
		var pagedata = {};
		pagedata.data = gaggleDataElements[i];
		pagedata.guid = cg_util.generateUUID();
        var jsondata = JSON.stringify(pagedata);
        console.log("GaggleMicroformatParser JSON data: " + jsondata);
        pagedata.jsondata = jsondata;
        pagedata.source = "Page";
        //alert(pagedata.source);
		pageGaggleData.push(pagedata); //.setConvertToJavaOnGetData());
	}
	//return results;
}


/**
 * takes a species and a Java Array of names and submits them for
 * processing by the website.
 */
GaggleMicroformatParser.prototype.handleNameList = function(species, names) {
	alert("Gaggle microformat handler got namelist(" + names.length + ") species=" + species + ".");
}

var gaggleMicroformatParser = new GaggleMicroformatParser();
gaggleMicroformatParser.getPageData(document);



