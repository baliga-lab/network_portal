/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

var FG_MRMAtlas = new Object();
FG_MRMAtlas.url = "https://db.systemsbiology.net/sbeams/cgi/PeptideAtlas/GetPABSTList";

/**
 * check the given doc to see if we can scrape it
 */
FG_MRMAtlas.recognize = function(doc) {
	if (doc) {
		var url = doc.location.href;
		return (url.indexOf(FG_MRMAtlas.url) >=0);
	}
	else
		return false;
}


FG_MRMAtlas.show = function() {
	var newTab = getBrowser().addTab(FG_MRMAtlas.url);
	getBrowser().selectedTab = newTab;
}

/**
 * nothing so far
 */
FG_MRMAtlas.getPageData = function(doc) {
}

/**
 * takes a species and a Java Array of names
 */
FG_MRMAtlas.handleNameList = function(species, names) {

	// store the species and names in this object
	this.species = species;
	this.names = names;

	var doc = window.content.document;
	var element = null;

	if (FG_util.startsWith(doc.location.href, FG_MRMAtlas.url)) {
		element = doc.getElementById("protein_name_constraint");
	}

	if (element)
	{
		this.insertNamelistIntoPasteBox(doc);
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
		var mrmatlas = this;
		var onPageLoadClosure = function(aEvent) {
			mrmatlas.onPageLoad(mrmatlas, aEvent);
			// listener removes itself
			browser.removeEventListener("load", mrmatlas.onPageLoadClosure, true);
		}
		this.onPageLoadClosure = onPageLoadClosure;

		// register the closure as a listener
		browser.addEventListener("load", onPageLoadClosure, true);
		browser.loadURI(FG_MRMAtlas.url);
	}
}

/**
 * when we open MRMAtlas in a new tab, this event listener
 * should be called. We have to pass in a reference to
 * this object because the onPageLoad function will be
 * passed as an event listener.
 */
FG_MRMAtlas.onPageLoad = function(mrmatlas, aEvent) {
	if (aEvent.originalTarget.nodeName == "#document") {
		var doc = window.content.document;
		mrmatlas.insertNamelistIntoPasteBox(doc);
	}
}

/**
 * insert the list of names held by the mrmatlas
 * object into the html form.
 */
FG_MRMAtlas.insertNamelistIntoPasteBox = function(doc) {
	var elements;
	if (!this.names) return;

	// put names in paste box
	elements = doc.getElementsByName("protein_name_constraint");
	if (elements) {
		// construct a string out of the name list
		elements[0].value = FG_util.join(this.names, ";");
	}
}

// create and register websiteHandler
FG_addWebsiteHandler("MRMAtlas", FG_MRMAtlas);

