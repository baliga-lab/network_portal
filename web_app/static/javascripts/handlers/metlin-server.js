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
function Metlin() {
}


/**
 * check the given doc to see if we can parse it.
 */
Metlin.prototype.recognize = function(doc) {
	if (doc) {
		var url = doc.location.href;
		return url.indexOf("http://metlin.scripps.edu/metabo_batch_list") >=0 ||
			   url.indexOf("http://metlin.scripps.edu/metabo_list") >=0;
	}
	else
		return false;
}


/**
 * retrieve the data from the page.
 */
Metlin.prototype.getPageData = function(doc) {
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
 * read a column of a table with the given title (in the first row
 * of the table). Return the columns contents as a list.
 */
Metlin.prototype.readTableColumn = function(tableElement, columnTitle) {
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
Metlin.prototype.getTextInsideAnchorTags = function(node) {
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


var metlin = new Metlin();
if (metlin.recognize(document))
    metlin.getPageData(document);
