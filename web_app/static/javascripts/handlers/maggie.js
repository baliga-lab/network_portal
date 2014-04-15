
var FG_maggieHandler = {
	
	recognize: function(doc) {
		if (doc) {
			var url = doc.location.href;
			return url.indexOf("http://maggie.systemsbiology.net/") >=0;
		}
		else
			return false;
	},

	show: function() {
		var url = "http://maggie.systemsbiology.net/main/start";
		var newTab = getBrowser().addTab(url);
		getBrowser().selectedTab = newTab;
	},

	// page data for maggie data viewer handled by microformats
/*
	getPageData = function(doc) {
		var results = [];

		// get the species and list of genes in the pathway
		var species = "Moose";
		var names = ["abc", "xyz", "123"];
		var title = "Bogus Moose Genes";

		results.push(
			new FG_GaggleData(
			    title,
			    "NameList",
				names.length,
				species,
				names));

		return results;
	},
*/

	handleNameList: function(species, names) {
		var newTab = getBrowser().addTab();
		var browser = getBrowser().getBrowserForTab(newTab);

		browser.addEventListener("load", this.createOnloadFormFiller(species, names), true);

		var url = "http://maggie.systemsbiology.net/main/start";
		getBrowser().selectedTab = newTab;
		browser.loadURI(url);
	},

	createOnloadFormFiller: function(species, names) {
		var onLoadFormFiller = function(aEvent) {
			FG_trace("MAGGIE data viewer: species = " + species);
			FG_trace("MAGGIE data viewer: names = " + names);
			FG_trace("MAGGIE data viewer: names.length = " + names.length);
	
			if (aEvent.originalTarget.nodeName == "#document" && names && names.length>0) {
	
				// remove the event listener
				var browser = getBrowser().getBrowserForTab(getBrowser().selectedTab);
				if (browser)
					browser.removeEventListener("load", onLoadFormFiller, true);

				var doc = window.content.document;

				var search_box = doc.getElementById("search_box");
				if (search_box) {
					var search_string = names[0];
					for (var i=1; i<names.length; i++) {
						search_string += " ";
						search_string += names[i];
					}
					search_box.value = search_string;
				}
				else {
					dump("Maggie data viewer handler couldn't find search_box\n");
				}
			}
		};
		return onLoadFormFiller;
	}
}


// create and register website handler
FG_addWebsiteHandler("MAGGIE Data Viewer", FG_maggieHandler);
