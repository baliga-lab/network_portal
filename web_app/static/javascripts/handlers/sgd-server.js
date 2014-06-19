/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

//
// Connect to the Saccharomyces Gene Database (SGD)
//



function SGDParser() {
}

/**
 * check the given doc to see if we can parse it.
 */
SGDParser.prototype.recognize = function(doc) {
	if (doc) {
		var url = doc.location.href;
		return url.indexOf("http://www.yeastgenome.org/") == 0;
	}
	else
		return false;
}

/**
 * Create a table to hold the results from many SGD tabs
 * Requires 3 arrays of equal length: genes, urls, and goterms
 * Should add error checking to enforce this
 * 06/3/10  Works, but not well.  
 *     1) Back button does not work with links.
 *     2) Event handler hangs around despite "removeEventListener" 
 * Posible Solution: Use jQuery instead.
 */
SGDParser.prototype.makeTable = function(genes,urls,goterms){
	
	var makeTableFcn = function(aEvent) {
	
		//if (aEvent.originalTarget.nodeName == "#document" && names && names.length>1) {
		if (aEvent.originalTarget.src == "" && genes && genes.length>1) {
			// remove the event listener
			var browser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
			if (browser)
				browser.removeEventListener("load", makeTableFcn, true);
			//var doc = window.content.document;
				
			tableName='SGDtable';

			doc=browser.contentDocument;
			doc.body.innerHTML = "<div id="+tableName+"></div>";

			row=new Array();
			cell=new Array();

			tab=doc.createElement('table');
			tab.setAttribute('id',tableName); 

			numCols=2;
			numRows=genes.length;
			tbo=doc.createElement('tbody'); 

			for(r=0;r<numRows;r++){
				row[r]=doc.createElement('tr'); 

				cell[0]=doc.createElement('td');
				var alink = doc.createElement("A");
				alink.href=urls[r]
				cont=doc.createTextNode(genes[r]);
				alink.appendChild(cont)
				cell[0].appendChild(alink);
				row[r].appendChild(cell[0]);

				cell[1]=doc.createElement('td');
				cont=doc.createTextNode(goterms[r]);
				cell[1].appendChild(cont);
				row[r].appendChild(cell[1]);

				tbo.appendChild(row[r]); 
			} //for(r=0;r<numRows;r++){
			tab.appendChild(tbo);
			doc.getElementById(tableName).appendChild(tab);
			doc.close()
			tab.close();
		}
		
	};
	return makeTableFcn;
}

/**
 * Retrieve the data from the page. Returns a list of GaggleData objects.
 * (see firefox/chrome/content/gaggleData.js).
 */
SGDParser.prototype.getPageData = function(doc) {
	var results = [];

	// get the species and list of genes in the pathway
	var species = "Saccharomyces cerevisiae";
	var names = ["sce", "yeast"];
	var title = "Saccharomyces cerevisiae";

	results.push(
		new GaggleData(
		    title,
		    "NameList",
			names.length,
			species,
			names));

	return results;
}


var sgdParser = new SGDParser();
if (sgdParser.recognize(document))
    sgdParser.getPageData(document);