function MaggieHandler()
{
    handler_base.call(this, "Maggie Data Viewer", true, "handlers/maggie.js", "http://maggie.systemsbiology.net/");
}

MaggieHandler.prototype = new handler_base();

MaggieHandler.prototype.constructor = MaggieHandler;

MaggieHandler.prototype.handleNameList = function(namelist) {
    var species = namelist.getSpecies();
    var names = namelist.getData();

    // Send custom event to Chrome goose, which will store the data on the background page
    var event = new CustomEvent('GaggleOutputPageEvent', {detail: {
                                handler: "Maggie Data Viewer", data: namelist},
                                bubbles: true, cancelable: false});
    document.dispatchEvent(event);

    var url = "http://maggie.systemsbiology.net/main/start";
    console.log("Maggie injecting " + this._extensionUrl);
    cg_util.createIFrame(url, ".divResultIFrames", "iframediv", "gaggleiframe");
};

// create and register website handler
var maggie = new MaggieHandler();

