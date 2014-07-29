/**
 * handler for ensemble EGRIN
 */


function Egrin2Handler()
{
    console.log("Initializing Egrin2...");
    handler_base.call(this, "EGRIN2", true, "handlers/egrin2.js", "http://egrin2.systemsbiology.net/");
}

Egrin2Handler.prototype = new handler_base();

Egrin2Handler.prototype.constructor = Egrin2Handler;


Egrin2Handler.prototype.handleNameList = function(namelist) {
    if (namelist != null) {
        var names = namelist.getData();
        var url = this._pageUrl
        + "search_biclusters?search_text=" + cg_util.join(names, "+");

        // open the URL in a new tab
        console.log("Egrin2 open tab " + url);
        //cg_util.createIFrame(url, ".divResultIFrames", "iframediv", "gaggleiframe");

        var iframeid = cg_util.generateUUID();
        var scope = angular.element($("#divGeneInfo")).scope();
        cg_util.addIframeToAngularJS(scope, HANDLER_SEARCH_RESULT_TITLE, HANDLER_SEARCH_RESULT_TITLE, this._name, url, this._name, iframeid);
    }
}

var egrin2 = new Egrin2Handler();
