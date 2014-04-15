var FG_virtualPlantHandler = new Object();


/**
 * check the given doc to see if we can parse it.
 */
FG_virtualPlantHandler.recognize = function(doc) {
    if (doc) {
        var url = doc.location.href;
        if ((url.indexOf("file:///Users/cbare/Desktop/VirtualPlant") >=0)
        ||  (url.indexOf("http://virtualplant.bio.nyu.edu/") >=0)) {
            dump("recognized VirtualPlant!\n");
            return true;
        }
    }
    return false;
}


/**
 * open the website in a browser tab
 */
FG_virtualPlantHandler.show = function() {
	var url = "http://virtualplant.bio.nyu.edu/cgi-bin/vpweb/";
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}


/**
 * Retrieve the data from the page. Returns a list of GaggleData objects.
 * (see firefox/chrome/content/gaggleData.js).
 */
FG_virtualPlantHandler.getPageData = function(doc) {
	var results = [];
    

    dump("FG_virtualPlantHandler.getPageData\n");

	// get the species and list of genes
	var names = this._getGenes(doc);
    if (names.length > 0) {
        var species = this._getSpecies(doc);
        var title = this._getTitle(doc);

        results.push(
            new FG_GaggleData(
                title,
                "NameList",
                names.length,
                species,
                names));
    }

	return results;
}


FG_virtualPlantHandler._getSpecies = function(doc) {
    // dummy function...
    // navigate doc to find species
    return "Arabidopsis thaliana columbia tair9";
}


FG_virtualPlantHandler._getGenes = function(doc) {
    var results = [];
    
    // find this h1 with id genes
    var geneHeading = doc.getElementById("genes");
    if (geneHeading) {
    
        dump("found heading\n");
    
        // find the table after the h1 element
        var element = geneHeading.nextSibling;
        while (element && (element.nodeType!=Node.ELEMENT_NODE || element.tagName!="TABLE")) {
            element = element.nextSibling;
        }

        if (element && element.nodeType==Node.ELEMENT_NODE && element.tagName=="TABLE") {
            dump("found table\n");
            // genes are in a list inside the table
            var nodeList = element.getElementsByTagName("LI");
            for (var i=0; i<nodeList.length; i++) {
                var anchorElements = nodeList.item(i).getElementsByTagName("A");
                if (anchorElements && anchorElements.length > 0) {
                    var geneName = ufmt.getText(anchorElements.item(0));
                    dump(geneName + "\n");
                    results.push(geneName);
                }
            }
        }
    }

    return results;
}


FG_virtualPlantHandler._getTitle = function(doc) {
    var introductionHeading = doc.getElementById("introduction");
    if (introductionHeading) {
       return ufmt.getText(introductionHeading); 
    }
    return "VirtualPlant genes";
}


/**
 * takes a species and a Java Array of names and submits them for
 * processing by the website.
 */
FG_virtualPlantHandler.handleNameList = function(species, names) {
	alert("VirtualPlant handler got namelist(" + names.length + ") species=" + species + ".");
}



// create and register website handler
FG_addWebsiteHandler("VirtualPlant", FG_virtualPlantHandler);
