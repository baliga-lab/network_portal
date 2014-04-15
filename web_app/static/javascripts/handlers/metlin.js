/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

//
// handles interaction with http://metlin.scripps.edu/.
//
// At this time, the METLIN batch search feature is limited to
// returning results for about 50 masses at a time. We fill the
// text box and allow the user to select additional options
// (positive, neutral, or negative) then submit the query.
//
// Kegg compound IDs are returned as a list by screen-scraping.
//


/**
 * constructor.
 */
function FG_Metlin() {
}


/**
 * check the given doc to see if we can parse it.
 */
FG_Metlin.prototype.recognize = function(doc) {
	if (doc) {
		var url = doc.location.href;
		return url.indexOf("http://metlin.scripps.edu/metabo_batch_list") >=0 ||
			   url.indexOf("http://metlin.scripps.edu/metabo_list") >=0;
	}
	else
		return false;
}


FG_Metlin.prototype.show = function() {
	var url = "http://metlin.scripps.edu/";
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}


/**
 * retrieve the data from the page.
 */
FG_Metlin.prototype.getPageData = function(doc) {
	var results = [];

	// read kegg compound ids
	var names = [];

	// add a function that takes another list and
	// pushes all it's members into this list.
	names.pushAll = function(list) {
		for (var i=0; i<list.length; i++) {
			this.push(list[i]);
		}
	}

	var tableElements = doc.getElementsByTagName("table");
	for (var i=0; i<tableElements.length; i++) {
		names.pushAll(this.readTableColumn(tableElements[i], "KEGG"));
	}

	results.push(
		new FG_GaggleData(
		    "KEGG Compounds from Metlin",
		    "NameList",
			names.length,
			"unknown",
			names));

	return results;
}


/**
 * takes a species and a Java Array of names and submits them for
 * processing by the website.
 */
FG_Metlin.prototype.handleNameListDammit = function(species, names) {
	var masses = FG_util.join(names, "%0D%0A");

	// construct a URL to search kegg
	var url = "http://metlin.scripps.edu/metabo_batch_list.php?masses="
	        + masses +
			+ "&chargestate=-1"
			+ "&ppm=500"
			+ "&metabolite_fields%5B%5D=molid&metabolite_fields%5B%5D=mass&metabolite_fields%5B%5D=name&metabolite_fields%5B%5D=formula&metabolite_fields%5B%5D=cas&metabolite_fields%5B%5D=kegg"
			+ "&figsize=240x160"
			+ "&find=TRUE"

	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}


FG_Metlin.prototype.handleNameList = function(species, names) {
	var url = "http://metlin.scripps.edu/metabo_batch.php";

	var newTab = getBrowser().addTab();
	var browser = getBrowser().getBrowserForTab(newTab);
	getBrowser().selectedTab = newTab;

	// create a closure which preserves a reference to this
	// so the listener can remove itself after being called.
	// If the user browses away in the new browser, we don't
	// want to keep performing the onPageLoad action.
	var metlin = this;
	var onPageLoadClosure = function(aEvent) {
		metlin.onPageLoad(aEvent, names);
		// listener removes itself
		browser.removeEventListener("load", metlin.onPageLoadClosure, true);
	}
	this.onPageLoadClosure = onPageLoadClosure;

	// register the closure as a listener
	browser.addEventListener("load", onPageLoadClosure, true);
	browser.loadURI(url);
}


FG_Metlin.prototype.onPageLoad = function(aEvent, names) {
	if (aEvent.originalTarget.nodeName == "#document") {
		var doc = window.content.document;
		this.insertNamelistIntoPasteBox(doc, names);
	}
}


FG_Metlin.prototype.insertNamelistIntoPasteBox = function(doc, names) {
	try {
		var textArea = ufmt.first(doc.getElementsByName("masses"));
		if (textArea) {
			textArea.value = FG_util.join(names, "\n");
		}
	}
	catch (exception) {
		FG_trace(exception);
	}
}


/**
 * read a column of a table with the given title (in the first row
 * of the table). Return the columns contents as a list.
 */
FG_Metlin.prototype.readTableColumn = function(tableElement, columnTitle) {
	var result = [];
	if (tableElement) {

		var rows = tableElement.getElementsByTagName("TR");
		var foundColumn = -1;

		// find column with title equal to columnTitle
		if (rows.length > 0) {
			var row = rows[0];

			// for each table cell
			for (var j=0,k=0; k<row.childNodes.length; k++) {
				if (row.childNodes[k].tagName=="TD" || row.childNodes[k].tagName=="TH") {
					var cell = row.childNodes[k];
					if (columnTitle == ufmt.trim(this.getTextInsideAnchorTags(cell))) {
						foundColumn = j;
						break;
					}
					j++;
				}
			}

			// if a column was found, read it's identifiers
			if (foundColumn >= 0) {
				for (var i=1; i<rows.length; i++) {
					row = rows[i];

					// for each table cell
					for (var j=0,k=0; k<row.childNodes.length; k++) {
						if (row.childNodes[k].tagName=="TD" || row.childNodes[k].tagName=="TH") {
							if (j == foundColumn) {
								var cellContents = ufmt.trim(this.getTextInsideAnchorTags(row.childNodes[k]));
								if (cellContents && cellContents.length > 0) {
									result.push(cellContents);
								}
								break;
							}
							j++;
						}
					}
				}
			}
		}

	}
	return result;
}


/**
 * get the text contained by the given node
 * recursing into anchor tags to get their contained
 * text as well.
 */
FG_Metlin.prototype.getTextInsideAnchorTags = function(node) {
	var txt = "";
	if (node && node.childNodes) {
		for (var i=0,len=node.childNodes.length; i<len; i++) {
			if (node.childNodes[i].nodeType == Node.TEXT_NODE) {
				txt += node.childNodes[i].nodeValue;
			}
			else if (node.childNodes[i].tagName && node.childNodes[i].tagName == "A") {
				txt += this.getTextInsideAnchorTags(node.childNodes[i]);
			}
		}
	}
	return txt;
}



// create and register a websiteHandler
FG_addWebsiteHandler("Metlin", new FG_Metlin());

