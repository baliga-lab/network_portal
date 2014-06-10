/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * Handle broadcasts to and from EMBL's String database.
 *
 * Updated for String version 7.1
 * Updated for String version 8.0 (not compatible w/ previous versions)
 *
 * Notes: There are a couple cases here of some awkwardness because I haven't
 *        figured out how to do a POST and show the results in a browser tab.
 */

function EMBLString()
{
    handler_base.call(this, "EMBL String", true, "handlers/EMBLString.js", "http://string.embl.de", (WEBHANDLER_BASEURL + "emblstring-server.js"));
    this.progressCounter = 0;
    this.speciesSynonyms = {
         "halobacterium sp.": "halobacterium sp. nrc-1",
         "halobacterium nrc1": "halobacterium sp. nrc-1",
         "halobacterium nrc-1": "halobacterium sp. nrc-1",
         "h. salinarum": "halobacterium sp. nrc-1",
         "halobacterium salinarum": "halobacterium sp. nrc-1",
         "halobacterium salinarum nrc-1": "halobacterium sp. nrc-1"
    };
}

EMBLString.prototype = new handler_base();

EMBLString.prototype.constructor = EMBLString;


/**
 * get species by scraping hidden field
 */
EMBLString.prototype.getSpecies = function() {
    var code = "unknown";
    var doc = document;

    var identifier = doc.getElementsByName("input_query_species");
    if (identifier && identifier[0]) {
        var speciesCode = identifier[0].getAttribute("value");
        code = this.codeToSpecies(speciesCode);
    }

    if (code == "unknown" && this._defaultSpecies) {
        return this._defaultSpecies;
    }

    return code;
};

/**
	 * when we receive a namelist, open the input form with a formFiller
	 * event listener that fills out the input form and submits it.
	 */
EMBLString.prototype.handleNameList = function(namelist) {

    // String's input page no longer uses numeric species codes. The species names are
    // text, but periods seem to have been converted to underscores.
    console.log("EMBL String handling namelist " + namelist);
    var url = "http://string.embl.de/newstring_cgi/show_input_page.pl?input_page_type=multiple_identifiers"
        + "&" + this.callerIdentity();

    var iframeid = cg_util.generateUUID();

    // Send custom event to Chrome goose, which will store the data on the background page
    var event = new CustomEvent('GaggleOutputPageEvent', {detail: {
                                handler: "EMBL String", data: namelist, iframeId: iframeid},
                                bubbles: true, cancelable: false});
    document.dispatchEvent(event);

    // We call angularJS to create a new entry for EMBL String iframe

    console.log("EMBL String open url: " + url);
    //cg_util.createIFrame(url, iframeid, ".divResultIFrames", "iframediv", "gaggleiframe");
    cg_util.addIframeToAngularJS("STRING", "STRING", this._name, url, "EMBL String", iframeid);

    //  Send event to ChromeGoose to store the iframeId
    var event = new CustomEvent('IFrameOpenEvent',
                                {detail:
                                    {handler: this._name,
                                    iframeId: iframeid},
                                    bubbles: true,
                                    cancelable: false});
    document.dispatchEvent(event);
};

/**
 * create a caller identity URL param that String can use to log hits
 */
EMBLString.prototype.callerIdentity = function() {
    return "caller_identity=GaggleOutputPage";
};

/**
	 * In the input page, string uses species names in which periods appear to
	 * have been replaced by underscores. Also, converts species to all lower case.
	 */
EMBLString.prototype.toStringSpeciesName = function(species) {
    // HACK: make sure we're dealing with a javascript string, not a java string.
    species = "" + species;

    var speciesLowerCase = species.toLowerCase();

    // fudge for Halo synonyms
    if (speciesLowerCase in this.speciesSynonyms) {
        speciesLowerCase = this.speciesSynonyms[speciesLowerCase];
    }

    // replace periods with underscores
    return speciesLowerCase.replace("\.", "_");
};

var emblString = new EMBLString();
