
/**
 * handler for ensemble EGRIN
 */

var FG_egrin2Handler = new Object();
FG_egrin2Handler.egrinUrl = "http://egrin.systemsbiology.net/";


FG_egrin2Handler.show = function() {
	var newTab = getBrowser().addTab(this.egrinUrl);
	getBrowser().selectedTab = newTab;
}

// getting data from EGRIN2 pages is implemented using the microformat

FG_egrin2Handler.recognize = function() {
	return false;
}

FG_egrin2Handler.getPageData = function() {
	return null;
}

FG_egrin2Handler.handleNameList = function(species, names) {
	var url = this.egrinUrl
	+ "search_biclusters?search_text=" + FG_util.join(names, "+");

	// open the URL in a new tab
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}

FG_addWebsiteHandler("EGRIN2", FG_egrin2Handler);
