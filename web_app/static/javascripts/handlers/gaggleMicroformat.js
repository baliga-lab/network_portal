/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * gaggleMicroformat
 *
 * functions for reading gaggle data types from the gaggle microformat
 */
var gaggleMicroformat = {


	/**
	 * Used to detect the data type CSS tag
	 */
	// These are in a particular
	// order so that, for example gaggle-namelist-tsv will match
	// with itself before matching with gaggle-namelist.
	gaggleDataTypes: ["gaggle-namelist-tsv",
	                  "gaggle-namelist-tag",
	                  "gaggle-namelist",
	                  "gaggle-map",
	                  "gaggle-network",
	                  "gaggle-matrix-tsv",
	                  "gaggle-matrix",
	                  "gaggle-cluster"],


	/**
	 * Maps microformat types to standard Gaggle types.
	 * Used by standardizeType. 
	 */
    gaggleDataTypeMap: {
		"gaggle-namelist":     "NameList",
		"gaggle-namelist-tsv": "NameList",
		"gaggle-namelist-tag": "NameList",
		"gaggle-map":          "Map",
		"gaggle-network":      "Network",
		"gaggle-matrix":       "DataMatrix",
		"gaggle-matrix-tsv":   "DataMatrix",
		"gaggle-cluster":      "Cluster"
	},


    standardizeType: function(type) {
		var result = this.gaggleDataTypeMap[type];
		if (result)
			return result;
		else
			return type;
    },


	/**
	 * check if the document has gaggle microformat data
	 */
	hasGaggleData: function(doc) {
		var divs = ufmt.getElementsByClassName(doc, "gaggle-data");
		return divs && divs.length > 0;
	},


	/**
	 * find the gaggle-data elements in the document.
	 * Returns an array of FG_GaggleData objects.
	 */
	scan: function(doc) {
		var results = [];

        //var divs = ufmt.getElementsByClassName(doc, "gaggle-data");
		var divs = $(doc).find(".gaggle-data").toArray();
		for (var i in divs) {
			var name = gaggleMicroformat.getName(divs[i]);
			console.log("gaggle data name: " + name);
			var size = ufmt.getProperty(divs[i], "gaggle-size");
			if (size == "")
				size = null;
			var species = ufmt.getProperty(divs[i], "gaggle-species");
			var gaggleDataType = this.getGaggleDataTypeElement(divs[i]);
			console.log("Parsed gagge data: " + gaggleDataType);

			if (gaggleDataType) {

				// TODO: compute description?
				// TODO: get data from web service (indirect reference)

				// Create FG_GaggleData object w/ null data. Data will be lazily parsed later, if needed.
				// type is modified here to be consistent w/ the types used in the rest of the firegoose.
				console.log("Gaggle data type " + gaggleDataType.type);

				var gaggleData = new GaggleData(name,
				                                this.standardizeType(gaggleDataType.type),
				                                size,
				                                species,
				                                null);
	
				// attach a function to gaggleData that will lazily parse the microformat data			
				if (gaggleDataType.type == "gaggle-namelist") {
					gaggleData.getData = gaggleMicroformat._createLazyParser(this.readList, gaggleDataType.element);
				}
				else if (gaggleDataType.type == "gaggle-namelist-tsv") {
					gaggleData.getData = gaggleMicroformat._createLazyParser(this.readTsvList, gaggleDataType.element);
				}
				else if (gaggleDataType.type == "gaggle-namelist-tag") {
				    // tag is the CSS selector used to tag elements of the list
					var tag = ufmt.getText(gaggleDataType.element);
					gaggleData.getData = gaggleMicroformat._createLazyTaggedListParser(this.readTaggedList, doc, tag);
				}
				else if (gaggleDataType.type == "gaggle-map") {
					gaggleData.getData = gaggleMicroformat._createLazyParser(this.readMap, gaggleDataType.element);
				}
				else if (gaggleDataType.type == "gaggle-network") {
					gaggleData.getData = gaggleMicroformat._createLazyParser(this.readNetwork, gaggleDataType.element);
				}
				else if (gaggleDataType.type == "gaggle-matrix") {
					gaggleData.getData = gaggleMicroformat._createLazyParser(this.readDataMatrix, gaggleDataType.element);
				}
				else if (gaggleDataType.type == "gaggle-matrix-tsv") {
					gaggleData.getData = gaggleMicroformat._createLazyParser(this.readTsvDataMatrix, gaggleDataType.element);
				}
				else if (gaggleDataType.type == "gaggle-cluster") {
					gaggleData.getData = gaggleMicroformat._createLazyParser(this.readCluster, gaggleDataType.element);
				}
				else {
					console.log("Unknown gaggle data type: \"" + gaggleDataType.type + "\"");
					// don't return data of unknown type
					//continue;
				}

				results.push(gaggleData);
			}

		}

		return results;
	},

    _createLazyParser: function(parsingFunction, element) {
    	var _this = this;
    	return function() {
			if (!this._data) {
			    console.log("Lazy parser: " + parsingFunction);
				this._data = parsingFunction.call(_this, element);
			}
			return this._data;
    	}
    },

	_createLazyTaggedListParser: function(parsingFunction, doc, tag) {
    	var _this = this;
		return function() {
			if (!this._data) {
				this._data = parsingFunction.call(_this, doc, tag);
			}
			return this._data;
		}
	},


	/**
	 * Find an html element whose class is a gaggle data type.
	 * Returns an object with two fields.
	 * type: a string drawn from the list of gaggle data type names
	 * element: the element whose class is the gaggle data type
	 */
	getGaggleDataTypeElement: function(node) {
		var dataTypeRegExp = new RegExp('(?:^| )(' + this.gaggleDataTypes.join("|") + ')(?:$| )');
		var els = node.getElementsByTagName("*");
		for(var i=0,j=els.length; i<j; i++) {
			var m = dataTypeRegExp.exec(els[i].className);
			if(m) {
				return {type: m[1], element: els[i]}; 
			}
		}
		return null;
	},


	/**
	 * return a discription of the gaggle data
	 * contained in the given node
	 */
	getName: function(node) {
		return ufmt.getProperty(node, "gaggle-name");
	},


	/**
	 * read a gaggle namelist
	 */
	readList: function(element) {
	    console.log("Reading namelist " + ufmt);
		return ufmt.readHtmlList(ufmt.findElementByTagName(element, "OL", "UL"));
	},


	/**
	 * Read a list in tab or newline delimited form.
	 */
	readTsvList: function(element) {
		var listItems = [];
		if (element) {
			var re = RegExp("[\\t|\\n] *");
			var items = ufmt.trim(ufmt.getText(element)).split(re);
			for (var i in items) {
				if (items[i].length > 0)
					listItems.push(items[i]);
			}
		}
		return listItems;
	},


	/**
	 * read a gaggle namelist from a document by taking as an item in the list
	 * the text contents of any element that has a certain CSS class tag.
	 */
	readTaggedList: function(doc, tag) {
		var listItems = [];
		var elements = ufmt.getElementsByClassName(doc, tag);
		for (var i in elements) {
			listItems.push(ufmt.getText(elements[i]));
		}
		return listItems;
	},


	/**
	 * read a gaggle map
	 */
	readMap: function(element) {
		return ufmt.readHtmlDl(ufmt.findElementByTagName(element, "DL"));
	},


	/**
	 * Read a data matrix from an HTML table. Returns a javascript version of a
	 * data matrix, which may have to be converted to a java version later.
	 */
	readDataMatrix: function(element) {
		var matrix = new Object();
		matrix.data = [];
		matrix.rowTitles = [];
		matrix.columnTitles = [];
		matrix.rowTitlesTitle = "";

		var tableElement = ufmt.findElementByTagName(element, "TABLE");
		if (tableElement) {

			var rows = tableElement.getElementsByTagName("TR");
			var r = -1;
			for (var i=0; i<rows.length; i++) {
				var row = rows[i];
				var c = -1;
				for (var j=-1,k=0; k<row.childNodes.length; k++) {
					if (row.childNodes[k].tagName=="TD" || row.childNodes[k].tagName=="TH") {
						var cell = row.childNodes[k];
						if (c==-1 && r==-1) {
							matrix.rowTitlesTitle = ufmt.getText(cell);
							c++;
						}
						else if (r==-1) {
							matrix.columnTitles.push(ufmt.getText(cell));
							c++;
						}
						else if (c==-1) {
							matrix.rowTitles.push(ufmt.getText(cell));
							c++;
							matrix.data[r] = [];
						}
						else {
							matrix.data[r][c++] = parseFloat(ufmt.trim(ufmt.getText(cell)));
						}
					}
				}
				r++;
			}
		}
		return matrix;
	},


	/**
	 * Read a data matrix in tab delimited form
	 */
	readTsvDataMatrix: function(node) {
		return this.processTsvDataMatrixText(ufmt.getText(node));
	},

	processTsvDataMatrixText: function(text) {
		var matrix = new Object();
		matrix.data = [];
		matrix.rowTitles = [];
		matrix.columnTitles = [];
		matrix.rowTitlesTitle = "";

		var tsvLines = (ufmt.trim(text)).split(new RegExp(" *\\n *"));
		for (var i in tsvLines) {
			//print(i + " => " + tsvLines[i]);
			var fields = tsvLines[i].split(new RegExp(" *\\t *"));
			for (var j in fields) {
				//print(j + " => " + fields[j]);
				if (i==0 && j==0) {
					matrix.rowTitlesTitle = fields[j];
				}
				else if (i==0) {
					matrix.columnTitles[j-1] = fields[j];
				}
				else if (j==0) {
					matrix.rowTitles[i-1] = fields[j];
					matrix.data[i-1] = [];
				}
				else {
					matrix.data[i-1][j-1] = parseFloat(fields[j]);
				}
			}
		}

		matrix.size = matrix.data.length + "," + matrix.columnTitles.length;
		return matrix;
	},


	/**
	 * read a network encoded into three tables of three columns each
	 */		
	readNetwork: function(element) {
		var network = new Object();

		var table1 = ufmt.first(ufmt.getElementsByClassName(element, "gaggle-interactions"));
		network.interactions = ufmt.readTable(ufmt.findElementByTagName(table1, "TABLE"));

		var table2 = ufmt.first(ufmt.getElementsByClassName(element, "gaggle-node-attributes"));
		network.nodeAttributes = ufmt.readTable(ufmt.findElementByTagName(table2, "TABLE"));

		var table3 = ufmt.first(ufmt.getElementsByClassName(element, "gaggle-edge-attributes"));
		network.edgeAttributes = ufmt.readTable(ufmt.findElementByTagName(table3, "TABLE"));

		return network;
	},


	/**
	 * Read a cluster from two html lists
	 */
	readCluster: function(node) {
	    console.log("Reading cluster...");
		var results = new Object();

		var element = ufmt.first(ufmt.getElementsByClassName(node, "gaggle-rowNames"));
		results.rowNames = ufmt.readHtmlList(ufmt.findElementByTagName(element, "OL", "UL"));

		element = ufmt.first(ufmt.getElementsByClassName(node, "gaggle-columnNames"));
		results.columnNames = ufmt.readHtmlList(ufmt.findElementByTagName(element, "OL", "UL"));

		return results;
	}

}

