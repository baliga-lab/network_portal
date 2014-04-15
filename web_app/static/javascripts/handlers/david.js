/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

var FG_david = new Object();

/**
 * check the given doc to see if we can scrape it
 */
FG_david.recognize = function(doc) {
	if (doc) {
		var url = doc.location.href;
		return (url.indexOf("http://david.abcc.ncifcrf.gov/") >=0);
	}
	else
		return false;
}


FG_david.show = function() {
	var url = "http://david.abcc.ncifcrf.gov/";
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}

/**
 * nothing so far
 */
FG_david.getPageData = function(doc) {
}

/**
 * takes a species and a Java Array of names
 */
FG_david.handleNameList = function(species, names) {

	// store the species and names in this object
	this.species = species;
	this.names = names;

	var url = "http://david.abcc.ncifcrf.gov/summary.jsp";
	var doc = window.content.document;
	var element = null;

	if (FG_util.startsWith(doc.location.href, "http://david.abcc.ncifcrf.gov/")) {
		element = doc.getElementById("divUpload");
	}

	if (element)
	{
		FG_David_selectUploadTab();
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
		var david = this;
		var onPageLoadClosure = function(aEvent) {
			david.onPageLoad(david, aEvent);
			// listener removes itself
			browser.removeEventListener("load", david.onPageLoadClosure, true);
		}
		this.onPageLoadClosure = onPageLoadClosure;

		// register the closure as a listener
		browser.addEventListener("load", onPageLoadClosure, true);
		browser.loadURI(url);
	}
}

/**
 * when we open David in a new tab, this event listener
 * should be called. We have to pass in a reference to
 * this object because the onPageLoad function will be
 * passed as an event listener.
 */
FG_david.onPageLoad = function(david, aEvent) {
	if (aEvent.originalTarget.nodeName == "#document") {
		var doc = window.content.document;
		david.insertNamelistIntoPasteBox(doc);

		// hack: the David summary page selects the 'list'
		// tab if you have a session open already in tabPane.js
		// do_onload(). Our onload event fires before theirs
		// apparently, so we kludge our way around by setting
		// a timer and selecting the 'Upload' tab after their
		// do_onload() has already run.
		setTimeout("FG_David_selectUploadTab()", 800);
	}
}

/**
 * this is in the root namespace 'cause it has to be
 * called from a timer
 */
function FG_David_selectUploadTab() {
	try {
		var doc = window.content.document;
		var tabobj=doc.getElementById("tablist");
		var tabobjlinks=tabobj.getElementsByTagName("A");
		window.content.wrappedJSObject.expandcontent('divUpload', tabobjlinks[0]);
	}
	catch (exception) {
		FG_trace(exception);
	}
}

/**
 * insert the list of names held by the david
 * object into the html form.
 */
FG_david.insertNamelistIntoPasteBox = function(doc) {
	var elements;
	if (!this.names) return;

	// put names in paste box
	elements = doc.getElementsByName("pasteBox");
	if (elements) {
		// construct a string out of the name list
		elements[0].value = FG_util.join(this.names, "\n");
	}

	// select type 'list' rather than 'background'
	elements = doc.getElementsByName("rbUploadType");
	if (elements) {
		elements[0].checked = true;
	}

	// too bad I can't select the naming system
//	elements = doc.getElementsByName("Identifier");
//	if (elements) {
//		elements[0].style.backgroundcolor=0xFF9999;
//		elements[0].value = "GI_ACCESSION";
//	}
}

// create and register websiteHandler
FG_addWebsiteHandler("DAVID", FG_david);

