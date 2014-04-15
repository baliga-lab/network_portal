/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

//
// a generic template for a script that transfers data
// between the Gaggle and a website.
//


/**
 * constructors aren't necessary for website handlers as they are usually singleton instances.
 */
// function FG_WebsiteHandler() {
// }


/**
 * There are 2 notations in js for creating objects. Creating an object, as we do here,
 * and adding properties to it and "object literal" notation. They are equivalent. I'm
 * inconsistent with their usage only because I was trying them out to see which was
 * more convenient.
 */
var FG_websiteHandler = new Object();


/**
 * check the given doc to see if we can parse it.
 */
FG_websiteHandler.recognize = function(doc) {
	return false;
}


/**
 * open the website in a browser tab
 */
FG_websiteHandler.show = function() {
	var url = "http://gaggle.systemsbiology.net/docs/geese/firegoose";
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}


/**
 * Retrieve the data from the page. Returns a list of GaggleData objects.
 * (see firefox/chrome/content/gaggleData.js).
 */
FG_websiteHandler.getPageData = function(doc) {
	var results = [];

	// get the species and list of genes in the pathway
	var species = "Moose";
	var names = ["abc", "xyz", "123"];
	var title = "Bogus Moose Genes";

	results.push(
		new FG_GaggleData(
		    title,
		    "NameList",
			names.length,
			species,
			names));

	return results;
}


/**
 * takes a species and a Java Array of names and submits them for
 * processing by the website.
 */
FG_websiteHandler.handleNameList = function(species, names) {
	alert("Website handler got namelist(" + names.length + ") species=" + species + ".");
}



// create and register website handler
FG_addWebsiteHandler("test", FG_websiteHandler);

