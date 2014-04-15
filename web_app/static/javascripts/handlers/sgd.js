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


/**
 * constructors aren't necessary for website handlers as they are usually singleton instances.
 */
// function FG_WebsiteHandler() {
// }

/*SEARCH TYPES*/
FG_sgd.GENE_SEARCH=1;
FG_sgd.GO_SLIM_MAPPER=2;
FG_sgd.GO_TERM_FINDER=3;

/**
 * There are 2 notations in js for creating objects. Creating an object, as we do here,
 * and adding properties to it and "object literal" notation. They are equivalent. I'm
 * inconsistent with their usage only because I was trying them out to see which was
 * more convenient.
 */
function FG_sgd(_searchType) {
	this.searchType = _searchType; //Set to one of the SEARCH TYPES
}

/**
 * check the given doc to see if we can parse it.
 */
FG_sgd.prototype.recognize = function(doc) {
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
FG_sgd.makeTable = function(genes,urls,goterms){
	
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
 * open the website in a browser tab
 */
FG_sgd.prototype.show = function() {
	var url = "http://www.yeastgenome.org/";
	var newTab = gBrowser.addTab(url);
	gBrowser.selectedTab = newTab;
	
	//This commented out code tests the ability to make a table
	//var browser = gBrowser.selectedTab
	//browser.addEventListener("load", FG_sgd.makeTable([1,2,3],["http://www.yeastgenome.org/","http://www.yeastgenome.org/","http://www.yeastgenome.org/"],["A","B","C"]), true);
}


/**
 * Retrieve the data from the page. Returns a list of GaggleData objects.
 * (see firefox/chrome/content/gaggleData.js).
 */
FG_sgd.prototype.getPageData = function(doc) {
	var results = [];

	// get the species and list of genes in the pathway
	var species = "Saccharomyces cerevisiae";
	var names = ["sce", "yeast"];
	var title = "Saccharomyces cerevisiae";

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
 * this.searchType should be defined in the constructor
 */
FG_sgd.prototype.handleNameList = function(species, names) {

	if (this.searchType == FG_sgd.GENE_SEARCH) {
		/**
		 * SGD takes only one query at a time.  
		 * For now open each result in a diff tab. 
		 * Later, build a summary page
		 */
		if (names.length > 0) {
			for (var i=0; i<names.length; i++) {
				// construct a URL to search SGD
				var url =	"http://www.yeastgenome.org/cgi-bin/locus.fpl?locus="
					+ names[i];

				// open the SGD URL in a new tab
				var newTab = getBrowser().addTab(url);
				getBrowser().selectedTab = newTab;
			}		
		}
	} else {
		/**
		 * Broadcast namelist to SGD Term Finder or Go Slim Mapper.
		 * Let the user set the final parameters.
		 */
		var newTab = getBrowser().addTab();
		var browser = getBrowser().getBrowserForTab(newTab);

		browser.addEventListener("load", FG_sgd.createOnloadFormFiller(species, names), true);

		if (this.searchType == FG_sgd.GO_SLIM_MAPPER) {
			var url = "http://www.yeastgenome.org/cgi-bin/GO/goSlimMapper.pl";
		} else if (this.searchType == FG_sgd.GO_TERM_FINDER) {
			var url = "http://www.yeastgenome.org/cgi-bin/GO/goTermFinder.pl";
		}
		getBrowser().selectedTab = newTab;
		browser.loadURI(url);
	}	
	
}


/**
 * Create a closure which will be called on the page "load" event that
 * fills in String's List Input form and submits it.
 *
 * Originally copied from emblstring.js
 */
FG_sgd.createOnloadFormFiller = function(species, names) {

	// this function removes itself as an event listener, so it's necessary to assign it to a variable
	var onLoadFormFiller = function(aEvent) {
		FG_trace("SGD: names = " + names);
		FG_trace("SGD: names.length = " + names.length);

		if (aEvent.originalTarget.nodeName == "#document" && names && names.length>1) {

			// remove the event listener
			var browser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
			if (browser)
				browser.removeEventListener("load", onLoadFormFiller, true);

			var doc = window.content.document;

			// find the box to put the names in
			var loci_text_area = doc.getElementsByName("loci")[0];

 			if (loci_text_area) {
				// construct a string out of the name list
				var queryString = "";
				if (names.length > 0) {
					queryString += names[0];
				}
				for (var i=1; i<names.length; i++) {
					queryString += "\n";
					queryString += names[i];
				}

				// input the new names
				loci_text_area.value=queryString
			}
		}
	};
	return onLoadFormFiller;
},

/* create and register website handler */
FG_addWebsiteHandler("SGD GO Slim Mapper", new FG_sgd(FG_sgd.GO_SLIM_MAPPER));
FG_addWebsiteHandler("SGD GO Term Finder", new FG_sgd(FG_sgd.GO_TERM_FINDER));
//FG_addWebsiteHandler("SGD (each gene in a new tab)", new FG_sgd(FG_sgd.GENE_SEARCH));
