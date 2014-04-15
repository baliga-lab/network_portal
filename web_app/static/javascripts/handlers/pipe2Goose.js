/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

//
// Broadcast to javascript functions in a web page...
// return data through a variable. Formerly known as
// pageGoose, now specifically tailored to the PIPE
// application
//


var FG_pipe2Goose = new Object();
FG_pipe2Goose.url = "http://pipe2.systemsbiology.net";

FG_pipe2Goose.recognize = function(doc) {
	var pageScope = doc.defaultView.wrappedJSObject;
	if (pageScope && pageScope.pipe2GaggleDataForFiregoose)
		return true;
}


FG_pipe2Goose.show = function() {
	var newTab = getBrowser().addTab(FG_pipe2Goose.url);
	getBrowser().selectedTab = newTab;
}


/**
 * read data out of a variable in the page.
 */
FG_pipe2Goose.getPageData = function(doc) {
	var pageScope = doc.defaultView.wrappedJSObject;
	if (pageScope && pageScope.pipe2GaggleDataForFiregoose) {
		var data = pageScope.pipe2GaggleDataForFiregoose;
		
		// security: these methods get called w/ elevated privileges,
		// so this is not too safe but allows us to get tricky with
		// deferring work until it's definitely needed. We can enable
		// it later, if we want to. Examples of the client side are in
		// http://gaggle.systemsbiology.org/cbare/gaggleDataEventTest.html

		if (data.getName && data.getType && data.getSize && data.getSpecies && data.getDescription && data.getData) {
			return data;
		}
		else if (data.name && data.type && data.data) {
			return new FG_GaggleData(data.name, data.type, data.size, data.species, data.data);
		}
		else {
			return null;
		}
	}
}


/**
 * takes a species and a Java Array of names and submits them for
 * processing by the website.
 */
FG_pipe2Goose.handleNameList = function(species, names) {
	// since we're broadcasting to an open page, we don't want to open
	// a new page. This is no good from a security point of view.
	// Find the first tab with a page that implements a goose object
	// and call the handler method on the goose object.
	var found = false;
	var num = gBrowser.browsers.length;
	for (var i = 0; i < num; i++) {
		var browser = gBrowser.getBrowserAtIndex(i);
        var doc = browser.contentDocument;
		try {
			if (FG_util.startsWith(doc.location.href, FG_pipe2Goose.url)
                && browser.contentWindow.wrappedJSObject.goose!=null) {
				gBrowser.tabContainer.selectedIndex = i;
				var goose = browser.contentWindow.wrappedJSObject.goose;
				goose.handleNameList(species, names);
				found = true;
				break;
			}
		} catch(e) {
			// wtf? Components.utils.reportError(e);
			FG_trace(e);
		}
	}
	if (!found) {
		this.show();

		// create a poller object to be called from a timer
		var poller = new Object();
		poller.timerCount = 0;
		poller.species = species;
		poller.names = names;
		poller.browser = gBrowser.selectedBrowser;

		// the poll function checks for the presence of the receiving goose
		// and completes the broadcast when the receiving goose is ready
		poller.poll = function() {
			this.timerCount++;
			dump("polling for presence of PIPE goose: " + this.timerCount + "\n");
			dump("species = " + this.species + "\n");
			dump("namelist = " + this.names + "\n");

			var goose = this.browser.contentWindow.wrappedJSObject.goose;
			if (goose) {
				try {
					goose.handleNameList(this.species, this.names);
					clearInterval(this.timerId);
				} catch(e) {
					FG_trace("Error in page's goose.handleNameList(...): " + e);
				}
			}
			else if (this.timerCount >= 10) {
				clearInterval(this.timerId);
			}
		}

		// set a timer which calls the poller every second
		poller.timerId = setInterval(function() { poller.poll(); }, 1000);
	}
}



// register websiteHandler
FG_addWebsiteHandler("PIPE2", FG_pipe2Goose);

