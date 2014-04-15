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
 * constructor.
 */
function FG_WebsiteHandler() {
}


/**
 * check the given doc to see if we can parse it.
 */
FG_WebsiteHandler.prototype.recognize = function(doc) {
	return false;
}


/**
 * retrieve the data from the page.
 */
FG_WebsiteHandler.prototype.getPageData = function(doc) {
	var results = [];

	// get the species and list of genes in the pathway
	var species = "Moose";
	var names = ["abc", "xyz", "123"];

	results.push(
		new FG_GaggleData(
		    "Fake Gene Names",
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
FG_WebsiteHandler.prototype.handleNameList = function(species, names) {
	alert("Website handler got namelist(" + names.length + ") species=" + species + ".");
	var queryString = FG_util.join(names, ',');
	
	// construct a URL to search sbeams halo annotations
	var today=new Date();
	var new_list_name='firegoose_upload of '+today;
	var url = 'http://www.t1dbase.org/page/WorkbenchPage/display/command/upload/?new_list_name='+new_list_name+'&gene_id='+queryString;

	// open the URL in a new tab
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;

}



// create and register a websiteHandler
FG_addWebsiteHandler("t1dbase", new FG_WebsiteHandler());

