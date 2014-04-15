/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * send a list of terms to the SBEAMS halo annotations search page. 
 */
var FG_haloAnnotations = new Object();

/*
This has the flaw that it can't handle large numbers of genes. You get this error from SBEAMS:

Server message number=8621 severity=17 state=88 line=2 server=TITAN text=Internal Query Processor Error: The query processor ran out of stack space during query optimization. at /local/wwwSSL/html/sbeams/cgi/ProteinStructure/../../lib/perl/SBEAMS/Connection/DBInterface.pm line 958
	SBEAMS::Connection::DBInterface::selectSeveralColumns('SBEAMS::Connection=HASH(0x804cbcc)','\x{a}      SELECT  \x{a}           BS.biosequence_id AS "protein_bios...') called at /local/wwwSSL/html/sbeams/cgi/ProteinStructure/GetHaloAnnotations line 582
	main::handle_request('ref_parameters','HASH(0x8b6ad14)') called at /local/wwwSSL/html/sbeams/cgi/ProteinStructure/GetHaloAnnotations line 132
	main::main() called at /local/wwwSSL/html/sbeams/cgi/ProteinStructure/GetHaloAnnotations line 94
*/


/**
 * The Halo Annotations page provides Gaggle XML, so
 * we don't need to scrape the contents here.
 */
FG_haloAnnotations.recognize = function(doc) {
	return false;
}


FG_haloAnnotations.show = function() {
	var url = "http://baliga.systemsbiology.net/halobacterium/";
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}


FG_haloAnnotations.getPageData = function(doc) {
	return null;
}

/**
 * put a list of search terms in the search box on the Halo
 * annotations page.
 */
FG_haloAnnotations.handleNameList = function(species, names) {

	// warning no longer needed. Changing "search scope" to FullGeneName seems
	// to speed things up quite a bite.
	/*
	if (names) {
		// warn user in case of large queries
		if (names.length > 30) {
			var msg = "The search function on the Halobacterium Annotations page runs " +
				"slowly for requests having more than " +
				"a handfull of terms and fails for requests larger than ~100. " +
				"Press OK to continue your search for " + names.length + " terms, or Cancel."

			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Components.interfaces.nsIPromptService);
			var result = prompts.confirm(window, "Warning", msg);
			
			if (!result) {
				return;
			}
		}
		
	}
	else {
		var url = "http://baliga.systemsbiology.net/halobacterium/";
	}
	*/

	var queryString = FG_util.join(names, "+");

	// https://db.systemsbiology.net/sbeams/cgi/ProteinStructure/GetHaloAnnotations?
	// search_scope=All&SBEAMSentrycode=DF45jasj23jh&protein_biosequence_set_id=2&
	// dna_biosequence_set_id=5&apply_action=QUERY&search_key=VNG7001%20VNG7002

	// construct a URL to search sbeams halo annotations
	var url = "https://db.systemsbiology.net/sbeams/cgi/ProteinStructure/GetHaloAnnotations?"
			+ "search_scope=FullGeneName"
			+ "&SBEAMSentrycode=DF45jasj23jh"
			+ "&protein_biosequence_set_id=2"
			+ "&dna_biosequence_set_id=5"
			+ "&apply_action=QUERY"
			+ "&search_key=" + queryString;

	// open the URL in a new tab
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
}

// register website handler
FG_addWebsiteHandler("Halo Annotations", FG_haloAnnotations);
