/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

//
//


/**
 * constructors aren't necessary for website handlers as they are usually singleton instances.
 */
// function FG_webDmvHandler() {
// }


/*
Handler for the WebDMV.
 */
var FG_webDmvHandler = new Object();


/**
 * check the given doc to see if we can parse it.
 */
FG_webDmvHandler.recognize = function(doc) {
	if (doc) {
		var url = doc.location.href;
		// this ensures it will work whether webDMV is deployed on localhost, production, etc.
		return url.indexOf("DMV.html") > -1;
	}
	else
		return false;
}


/**
 * open the website in a browser tab
 */
 
 
FG_webDmvHandler.show = function() {
    /*
    Not implementing this function because this handler requires that the user already be on a WebDMV page 
    before clicking the "Broadcast" button.
	*/
	/*
	var browsers = getBrowser().browsers;
	var tabContainer = getBrowser().tabContainer;
	log("browsers.length = " + browsers.length);
	log("tabContainer.length = " + tabContainer.length);
	log("tabContainer = " + tabContainer);
	*/
}


/*
var log = function(msg) {
    dump(msg + "\n");
    FG_trace(msg);
}
*/


var getDmvTabs = function() {
    // the getBrowser() method is (maybe) documented here: https://developer.mozilla.org/en/XUL%3atabbrowser
    var browsers = getBrowser().browsers;
    var dmvBrowsers = [];
    for (var i = 0; i < browsers.length; i++) {
        var browser = browsers[i];
        var doc = browser.contentDocument;
        var namesDiv = doc.getElementById("gaggle_namelist_names_from_firegoose");
		//alert("recognize? " + FG_webDmvHandler.recognize(doc));
		//dump("recognize? " + FG_webDmvHandler.recognize(doc) +"\n");
		
        if (namesDiv != null && FG_webDmvHandler.recognize(doc)) {
            dmvBrowsers.push(browser);
        }
    }
    return dmvBrowsers;
}

/**
 * Retrieve the data from the page. Returns a list of GaggleData objects.
 * (see firefox/chrome/content/gaggleData.js).
 */
 

/* 
//Not implementing this because we already use microformats to get data off of the page.
FG_webDmvHandler.getPageData = function(doc) {
}
*/

/**
 * takes a species and a Java Array of names and submits them for
 * processing by the website.
 */
 
 
 
 
FG_webDmvHandler.handleNameList = function(species, names) {
	try {
	    
	    
	    var dmvTabs = getDmvTabs();
	    if (dmvTabs.length == 0) {
	        alert("You have no open WebDMVs. Launch a WebDMV first in order to broadcast to it.\n (WebDMV must be in the same group of tabs as the currently open page.)");
	        return;
	    }
		//var doc = getBrowser().selectedBrowser.contentDocument;
		
		for (var i = 0; i < dmvTabs.length; i++) {
		    var doc = dmvTabs[i].contentDocument;
            var namesDiv = doc.getElementById("gaggle_namelist_names_from_firegoose");

            doc.getElementById("gaggle_namelist_species_from_firegoose").innerHTML = species;
            doc.getElementById("gaggle_namelist_names_from_firegoose").innerHTML = FG_util.join(names, "\n");

    		var ev = doc.createEvent("Events");
            ev.initEvent("webDmvHandleNamelistEvent", true, false); 
            doc.dispatchEvent(ev);
            FG_trace("dispatched event");
		}
		
		//log("number of open WebDMVs: " + dmvTabs.length);
		
		
		for (var i = 0; i < getBrowser().browsers.length; i++) {
			var doc = getBrowser().browsers[i].contentDocument;
		    var namesDiv = doc.getElementById("gaggle_namelist_names_from_firegoose");
		    if (namesDiv != null  && FG_webDmvHandler.recognize(doc)) {
		        gBrowser.tabContainer.selectedIndex = i;
		        break;
		    }
            
		}
		
	}
	catch (e) {
		FG_trace("Error putting stuff on page: " + e);
	}
	
}






FG_webDmvHandler.handleMatrix = function(matrix) {
    // Receiving a matrix broadcast is not yet supported
}



// create and register website handler
FG_addWebsiteHandler("WebDMV", FG_webDmvHandler);

