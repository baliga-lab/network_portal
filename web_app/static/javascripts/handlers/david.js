/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

function David()
{
    handler_base.call(this, "DAVID", true, "handlers/david.js", "http://david.abcc.ncifcrf.gov/");
}

David.prototype = new handler_base();

David.prototype.constructor = David;

David.prototype.scanPage = function ()
{
    console.log("DAVID scan page...");
    cg_util.checkHandlerData(david, this.processData);

    /*var url = document.location.href;
    if (url.indexOf("http://david.abcc.ncifcrf.gov/") >= 0)
    {
        // Ask the background page for data to be processed
        console.log("DAVID: Retrieving data from event page...");
        try {
            console.log("Retrieving data from event page...");
            var msg = new Message(MSG_FROM_CONTENT, chrome.runtime, null, MSG_SUBJECT_RETRIEVEDATA,
                                 "aaa", this.processData);
            msg.send();
        }
        catch (e) {
            console.log("DAVID failed to send message to event page: " + e);
        }
    } */

};

/**
 * nothing so far
 */
David.prototype.getPageData = function(doc) {
}

/**
 * takes a species and a Java Array of names,
 */
David.prototype.handleNameList = function(namelist) {

	// store the species and names in this object
	console.log("DAVID handling namelist " + namelist);
	if (namelist == null)
	    return;

	var davidurl = "http://david.abcc.ncifcrf.gov/summary.jsp";
	var element = null;

    // Send custom event to Chrome goose, which will store the data on the background page
    var iframeid = cg_util.generateUUID();
    var event = new CustomEvent('GaggleOutputPageEvent', {detail: {
                                handler: "DAVID", data: namelist, iframeId: iframeid},
                                bubbles: true, cancelable: false});
    document.dispatchEvent(event);

    // create a new iframe
    //cg_util.createIFrame(davidurl, iframeid, ".divResultIFrames", "iframediv", "gaggleiframe");

    var scope = angular.element($("#divGeneInfo")).scope();
    cg_util.addIframeToAngularJS(scope, HANDLER_SEARCH_RESULT_TITLE, HANDLER_SEARCH_RESULT_TITLE, this._name, davidurl, this._name, iframeid);

    //  Send event to ChromeGoose to store the iframeId
    var event = new CustomEvent('IFrameOpenEvent',
                                {detail:
                                    {handler: this._name,
                                    iframeId: iframeid},
                                    bubbles: true,
                                    cancelable: false});
    document.dispatchEvent(event);
};

var david = new David();
