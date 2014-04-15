/*
 * Copyright (C) 2008 the Ontological Discovery Environment
 * Oak Ridge, Tennessee, USA.  All rights reserved.
 *
 * If you are viewing this file in Firefox, use 
 *
 *   Tools -> Firegoose -> Import Website Handler
 *  
 * to enable ODE as a target for firegoose.
 */

var FG_OntDiscEnvHandler = new Object();
FG_OntDiscEnvHandler.recognize = function(doc) {
   // use the normal firegoose microformat parser
	return false;
}

FG_OntDiscEnvHandler.show = function() {
	var url = "http://ontologicaldiscovery.org";
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}

FG_OntDiscEnvHandler.handleCluster= function(species, name, genes, description) {
	// construct a query string out of the gene list
	var queryString = "";
	if (genes.length > 0) {
		queryString += genes[0];
	}
	for (var i=1; i<genes.length; i++) {
		queryString += ",";
		queryString += genes[i];
	}

	var url =	"http://ontologicaldiscovery.org/index.php?action=manage&cmd=importGeneSet&client=firegoose"
         + "&idtype=symbol"
			+ "&name=" + name + "&label=" + name
         + "&desc=" + description
			+ "&species=" + species
         + "&list=" + queryString;

	// open the URL in a new tab
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}

FG_OntDiscEnvHandler.handleNameList = function(species, genes) {
   var name="", description="";
   try { // try to get more info than just species and gene list...

      var broadcastChooser = document.getElementById("fg_broadcastChooser");
      var broadcastData = FG_gaggleDataHolder.get(broadcastChooser.selectedItem.getAttribute("value"));

      name = broadcastData.getName();
      description = broadcastData.getDescription();
      if( name=="" && description!="" ) name=description;
      if( name!="" && description=="" ) description=name;
   } catch(anything) {}
   FG_OntDiscEnvHandler.handleCluster(species, name, genes, description);
}

FG_OntDiscEnvHandler.handleNetwork = FG_OntDiscEnvHandler.handleNameList;

// create and register a websiteHandler
FG_addWebsiteHandler("ODE", FG_OntDiscEnvHandler);
