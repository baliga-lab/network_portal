/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * submit requests to seamonkey via rserve
 */
var FG_testR = new Object();

FG_testR.recognize = function(doc) {
	return false;
}

FG_testR.getPageData = function(doc) {
	return null;
}

/**
 * search in Entrez Gene
 */
FG_testR.handleNameList = function(species, names) {

	// store the species and names in this object
	this.species = species;
	this.names = names;

	var url = "http://alice:8080/dreiss/rsp/halotest1.rsp"
	var doc = window.content.document;

	FG_trace("asdf 1");

	if (FG_util.startsWith(doc.location.href, url)) {
		var element = doc.getElementsByName("genes");

		if (element)
			this.insertNamelistIntoGenesTextArea(doc);
	}
	else {
		// open url in a new tab
		var newTab = getBrowser().addTab();
		var browser = getBrowser().getBrowserForTab(newTab);
		getBrowser().selectedTab = newTab;
	
		// create a closure which preserves a reference to this
		// so the listener can remove itself after being called.
		// If the user browses away in the new browser, we don't
		// want to keep performing the onPageLoad action.
		var thisTestR = this;
		this.onPageLoadClosure = function(aEvent) {
			thisTestR.onPageLoad(thisTestR, aEvent);
			// listener removes itself
			browser.removeEventListener("load", thisTestR.onPageLoadClosure, true);
		}
	
		// register the closure as a listener
		browser.addEventListener("load", this.onPageLoadClosure, true);
		browser.loadURI(url);
	}
}

FG_testR.onPageLoad = function(testR, aEvent) {
	if (aEvent.originalTarget.nodeName == "#document") {
		var doc = window.content.document;
		testR.insertNamelistIntoGenesTextArea(doc);
	}
}

FG_testR.insertNamelistIntoGenesTextArea = function(doc) {
	if (!this.names) return;
	var names = this.names;

	var elements = doc.getElementsByName("genes");
	if (elements) {
		var str = "";
		// iterate this way 'cause we might have either a javascript array
		// or a java array.
		for (var i=0; i< names.length; i++) {
			str += names[i] + "\n";
		}
		elements[0].value = str;
	}
}


// register website handler
FG_addWebsiteHandler("Test R page", FG_testR);
