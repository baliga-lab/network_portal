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
var gaggleXml_Parser = new Object();


/**
 * look in the page for gaggleData tags
 */
gaggleXml_Parser.recognize = function(doc) {
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
gaggleXml_Parser.getPageData = function(doc) {
	var results = [];
	if (doc) {
	    console.log("gaggleXml parsing page...");

		// There can be more than one Gaggle data structure of different types.
		var gaggleDataElements = doc.getElementsByTagName("gaggleData");
		console.log("gaggleXML data elements " + gaggleDataElements);
		if (gaggleDataElements) {
		    console.log("gaggleXML found " + gaggleDataElements.length + " items");

			for (var i=0; i < gaggleDataElements.length; i++) {
				var gaggleDataElement = gaggleDataElements.item(i);
				var version = gaggleDataElement.getAttribute("version");
				console.log("gaggle data found: version=" + version + "\n");
				
				for (var ci=0; ci<gaggleDataElement.childNodes.length; ci++) {
					var node = gaggleDataElement.childNodes[ci];
					if (node.nodeType == Node.ELEMENT_NODE) {

						// get attributes
						var name    = node.getAttribute("name");
						var size    = node.getAttribute("size");
						var species = node.getAttribute("species");
						var refType = node.getAttribute("type");

						console.log(node.tagName + "(" + size + "): " + name + " species=" + species + " refType=" + refType + "\n");

						// namelist
						if (node.tagName == "NAMELIST") {
							if (refType == "direct") {
								// get and parse TEXT_NODE which will contain a
								// tab-delimited list of names.
								if (node.firstChild.nodeType == Node.TEXT_NODE) {
									var names = this.processNamelist(node.firstChild.nodeValue);
									pageGaggleData.push(
										new Namelist(
										    name,
											names.length,
											species,
											names));
								}
							}
							else if (refType == "indirect") {
								var url = node.getAttribute("url");
			
								// return a partial GaggleData object that will fetch the
								// the indirect list asynchronously when requested.
								pageGaggleData.push(this.createAsyncGaggleNamelist(url, name, species, size));
							}
						}

						else if (node.tagName == "DATAMATRIX") {
							if (refType == "direct") {
								if (node.firstChild.nodeType == Node.TEXT_NODE) {
									var dataMatrix = gaggleMicroformat.readTsvDataMatrix(node.firstChild);
									var gaggleData = new GaggleData(
										    name,
										    "DataMatrix",
											dataMatrix.size,
											species,
											dataMatrix);
									pageGaggleData.push(gaggleData.setConvertToJavaOnGetData());
								}
							}
							else if (refType == "indirect") {
								var url = node.getAttribute("url");
								pageGaggleData.push(
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
							console.log("gaggleXml unrecognized gaggle data tag: \"" + node.tagName + "\"\n");
						}
					}
				}
			}
		}
    }
	//return results;
}

gaggleXml_Parser.createAsyncGaggleNamelist = function(url, name, species, size) {
	var gaggleData = new GaggleData(
		    name,
		    "Namelist",
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
gaggleXml_Parser.fetchIndirectNamelist = function(url, gaggleData) {
	console.log("gaggleXml fetching indirect url = " + url);

	var gaggleXml = this;
	var request = new XMLHttpRequest();

	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			if (request.status == 200 || (request.status == 0 && request.responseText)) {
				// store the network in GaggleData object and notify callback.
				gaggleData._data = gaggleXml.processNamelist(request.responseText);

				console.log("gaggleXml fetching indirect data completed");

				if (gaggleData._callback)
					gaggleData._callback();
			}
			else {
				console.log("indirect request failed: (" + request.status + ") " + request.statusText );
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
gaggleXml_Parser.processNamelist = function(text)  {
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
gaggleXml_Parser.processTuples = function(text) {
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



gaggleXml_Parser.createAsyncGaggleDataMatrix = function(url, name, species, size) {
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

gaggleXml_Parser.fetchIndirectDataMatrix = function(url, gaggleData) {
	console.log("gaggleXml fetching indirect url = " + url + "\n");

	var gaggleXml = this;
	var request = new XMLHttpRequest();

	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			if (request.status == 200 || (request.status == 0 && request.responseText)) {
				// store the network in GaggleData object and notify callback.
				gaggleData._data = gaggleMicroformat.processTsvDataMatrixText(request.responseText);

				console.log("gaggleXML fetching indirect data completed");

				if (gaggleData._callback)
					gaggleData._callback();
			}
			else {
				console.log("gaggleXml indirect request failed: (" + request.status + ") " + request.statusText );
				alert("Request for indirect Gaggle object failed: (" + request.status + ") " + request.statusText);
			}
		}
	}

	request.open("GET", url);
	request.setRequestHeader("User-Agent", "XMLHttpRequest");
	request.setRequestHeader("Accept-Language", "en");

	request.send(null);
}

if (gaggleXml_Parser.recognize(document))
    gaggleXml_Parser.getPageData(document);

