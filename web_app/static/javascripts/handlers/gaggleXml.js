/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * Handle gaggle XML embedded in web pages
 *
 * depends on: gaggleMicroformat.js
 */
var FG_gaggleXml = new Object();


FG_gaggleXml.dontDisplayInMenu = true;

/**
 * look in the page for gaggleData tags
 */
FG_gaggleXml.recognize = function(doc) {
	if (doc) {
		var elements = doc.getElementsByTagName("gaggleData");
		return (elements && elements.length > 0);
	}
	else
		return false;
}

/**
 * Retrieves a list of the Gaggle data structures available
 * in (or linked indirectly from) the current page.
 */
FG_gaggleXml.getPageData = function(doc) {
	var results = [];
	if (doc) {
	
		// There can be more than one Gaggle data structure of different types.
		var gaggleDataElements = doc.getElementsByTagName("gaggleData");
		if (gaggleDataElements) {
			for (var i=0; i < gaggleDataElements.length; i++) {
				var gaggleDataElement = gaggleDataElements.item(i);
				var version = gaggleDataElement.getAttribute("version");
				dump("gaggle data found: version=" + version + "\n");
				
				for (var ci=0; ci<gaggleDataElement.childNodes.length; ci++) {
					var node = gaggleDataElement.childNodes[ci];
					if (node.nodeType == Node.ELEMENT_NODE) {

						// get attributes
						var name    = node.getAttribute("name");
						var size    = node.getAttribute("size");
						var species = node.getAttribute("species");
						var refType = node.getAttribute("type");

						dump(node.tagName + "(" + size + "): " + name + " species=" + species + " refType=" + refType + "\n");

						// namelist
						if (node.tagName == "NAMELIST") {
							if (refType == "direct") {
								// get and parse TEXT_NODE which will contain a
								// tab-delimited list of names.
								if (node.firstChild.nodeType == Node.TEXT_NODE) {
									var names = this.processNamelist(node.firstChild.nodeValue);
									results.push(
										new FG_GaggleData(
										    name,
										    "NameList",
											names.length,
											species,
											names));
								}
							}
							else if (refType == "indirect") {
								var url = node.getAttribute("url");
			
								// return a partial GaggleData object that will fetch the
								// the indirect list asynchronously when requested.
								results.push(this.createAsyncGaggleNamelist(url, name, species, size));
							}
						}

						else if (node.tagName == "DATAMATRIX") {
							if (refType == "direct") {
								if (node.firstChild.nodeType == Node.TEXT_NODE) {
									var dataMatrix = gaggleMicroformat.readTsvDataMatrix(node.firstChild);
									var gaggleData = new FG_GaggleData(
										    name,
										    "DataMatrix",
											dataMatrix.size,
											species,
											dataMatrix);
									results.push(gaggleData.setConvertToJavaOnGetData());
								}
							}
							else if (refType == "indirect") {
								var url = node.getAttribute("url");
								results.push(
									this.createAsyncGaggleDataMatrix(url, name, species, size)
										.setConvertToJavaOnGetData());
							}
						}

						// Note that tuples don't work. Support needs to be written in firegoose.js
						// for converting a javascript object (or tree-shaped object graph) into a
						// java tuple.
/*
						// tuple
						else if (node.tagName == "TUPLE" || node.tagName == "NAMEVALUE") {
							if (refType == "direct") {
								if (node.firstChild.nodeType == Node.TEXT_NODE) {
									var tuples = this.processTuples(node.firstChild.nodeValue);
									results.push(
										new FG_GaggleData(
										    name,
										    "Tuple",
											tuples.length,
											species,
											tuples));
								}
							}
							else if (refType == "indirect") {
							}
						}
*/

						else {
							dump("unrecognized gaggle data tag: \"" + node.tagName + "\"\n");
						}
					}
				}
			}
		}
    }
	return results;
}

FG_gaggleXml.createAsyncGaggleNamelist = function(url, name, species, size) {
	var gaggleData = new FG_GaggleData(
		    name,
		    "NameList",
		    size,
			species,
			null);

	// for the purpose of calling FG_gaggleXml.fetchIndirectNamelist()
	var gaggleXml = this;

	gaggleData.isAsynch = true;
	gaggleData.asynchronouslyFetchData = function(callback) {
		if (!this._data) {
			this._callback = callback;
			gaggleXml.fetchIndirectNamelist(url, this);
			gaggleData.isAsynch = false;
		}
		else {
			callback();
		}
	}

	return gaggleData;
}

/**
 * to be called from within an asynchronous GaggleData object
 * when the user requests that this data be broadcast.
 */
FG_gaggleXml.fetchIndirectNamelist = function(url, gaggleData) {
	FG_trace("fetching indirect url = " + url);

	var gaggleXml = this;
	var request = new XMLHttpRequest();

	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			if (request.status == 200 || (request.status == 0 && request.responseText)) {
				// store the network in GaggleData object and notify callback.
				gaggleData._data = gaggleXml.processNamelist(request.responseText);

				FG_trace("fetching indirect data completed");

				if (gaggleData._callback)
					gaggleData._callback();
			}
			else {
				FG_trace("indirect request failed: (" + request.status + ") " + request.statusText );
				alert("Request for indirect Gaggle object failed: (" + request.status + ") " + request.statusText);
			}
		}
	}

	request.open("GET", url);
	request.setRequestHeader("User-Agent", "XMLHttpRequest");
	request.setRequestHeader("Accept-Language", "en");

	request.send(null);
}

/**
 * parse text delimited by tabs or newlines into a namelist
 */
FG_gaggleXml.processNamelist = function(text)  {
	if (text==null || text=="")
		return [];
	var t = text.replace(/^\s+|\s+$/g,""); // trim
	t = t.replace( /\s*\n\s*/g, "\n" );
	t = t.replace( /\s*\t\s*/g, "\t" );
	return t.split(/\n|\t/);
}

/**
 * parse text containing one tab delimited key-value pair per line
 */
FG_gaggleXml.processTuples = function(text) {
	var object = new Object();
	if (text==null || text=="")
		return object;
	var t = text.replace(/^\s+|\s+$/g,""); // trim
	var lines = t.split(/\s*\n\s*/);
	for (var i in lines) {
		var fields = lines[i].split(/\s*\t\s*/);
		object[fields[0]] = fields[1];
		dump(fields[0] + " - " + fields[1] + "\n");
	}
	var length = 0;
	for (var i in object)
		length++;
	object.length = length;
	return object;
}



FG_gaggleXml.createAsyncGaggleDataMatrix = function(url, name, species, size) {
	var gaggleData = new FG_GaggleData(
		    name,
		    "DataMatrix",
		    size,
			species,
			null);

	// for the purpose of calling FG_gaggleXml.fetchIndirectDataMatrix()
	var gaggleXml = this;

	gaggleData.isAsynch = true;
	gaggleData.asynchronouslyFetchData = function(callback) {
		if (!this._data) {
			this._callback = callback;
			gaggleXml.fetchIndirectDataMatrix(url, this);
			gaggleData.isAsynch = false;
		}
		else {
			callback();
		}
	}

	return gaggleData;
}

FG_gaggleXml.fetchIndirectDataMatrix = function(url, gaggleData) {
	dump("fetching indirect url = " + url + "\n");
	FG_trace("fetching indirect url = " + url);

	var gaggleXml = this;
	var request = new XMLHttpRequest();

	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			if (request.status == 200 || (request.status == 0 && request.responseText)) {
				// store the network in GaggleData object and notify callback.
				gaggleData._data = gaggleMicroformat.processTsvDataMatrixText(request.responseText);

				FG_trace("fetching indirect data completed");

				if (gaggleData._callback)
					gaggleData._callback();
			}
			else {
				FG_trace("indirect request failed: (" + request.status + ") " + request.statusText );
				alert("Request for indirect Gaggle object failed: (" + request.status + ") " + request.statusText);
			}
		}
	}

	request.open("GET", url);
	request.setRequestHeader("User-Agent", "XMLHttpRequest");
	request.setRequestHeader("Accept-Language", "en");

	request.send(null);
}


// register website handler
FG_addWebsiteHandler("GaggleXml", FG_gaggleXml);
