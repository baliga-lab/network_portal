/*
 * Copyright (C) 2009. Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * Author: Nils Gehlenborg
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

//
// Handler for interacting with the Prion Disease Database.
//


// create and register a websiteHandler
FG_addWebsiteHandler("Prion Disease Database (PDDB)", {

	recognize : function(doc) {
		return false;
	},

	show : function() {
		var url = "http://prion.systemsbiology.net/page/MicroExpression";
		var newTab = getBrowser().addTab(url);
		getBrowser().selectedTab = newTab;
	},
	
	getPageData : function(doc) {
		return null;
	},
	
	handleNameList : function(species, names) {

	    if ( names.length < 1 )
	    {
	       alert( "No identifiers have been submitted to the Prion Disease Database. Please send at least one identifer to query the database." );	
	       
	       return null;
	    }
	    
	    var speciesMm = false;
	    var speciesCoded = species.toLowerCase().replace( ' ','');
	    
	    if ( speciesCoded == "" || speciesCoded == "musmusculus" || speciesCoded == "m.musculus" || speciesCoded == "mmusculus" || speciesCoded == "mouse" || speciesCoded == "mus" )
	    {
	      speciesMm = true;
	    }	    
	    
	    if ( !speciesMm )
	    {
	      speciesMm = confirm( "The Prion Disease Database currently only contains mouse (Mus musculus) data. The retrieved identifers are labeled as \"" + species + "\".\n\nAre you sure you want to query the database with these identifiers?" );
	      
	      if ( !speciesMm )
	      {
	        return null;
	      }	      
	    }
	    
	
        alert( "The Prion Disease Database received a list of " +
        names.length + " identifiers. Please select which conditions you want to retrieve from the database (Step 2) and click \"Search\" (Step 3)." );	
	
		var url = "http://prion.systemsbiology.net/page/MicroExpression?useGenes=";

		// semi-colon delimited list of gene names
		url += FG_util.join(names, "%2C");

		var newTab = getBrowser().addTab(url);
		getBrowser().selectedTab = newTab;
	}
});
