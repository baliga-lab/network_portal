function GaggleData(name, dataType, size, species, data) {
    //alert("Gaggle Data " + name);
	this._name = name;
	this._type = dataType;
	this._size = size;
	this._species = species;
	this._data = data;
	this._isAsync = false;
}

GaggleData.prototype.getName = function() {
	return this._name;
}

/**
 * types are: NameList, Map, Network, DataMatrix, Cluster
 * TODO: support Tuple
 */
GaggleData.prototype.getType = function() {
	return this._type;
}

GaggleData.prototype.getSize = function() {
	return this._size;
}

/*
 * Be careful not to call getData() from within getSpecies().
 */
GaggleData.prototype.getSpecies = function() {
	return (this._species);
}

GaggleData.prototype.getData = function() {
	return this._data;
}

GaggleData.prototype.getDescription = function() {
	return this.getName() + ": " + this.getType() + this._sizeString();
}

GaggleData.prototype._sizeString = function() {
	if (this.getSize())
		return "(" + this.getSize() + ")";
	else
		return "";
}

GaggleData.prototype.toString = function() {
	return this.getDescription();
}

GaggleData.prototype._applyDefaultSpecies = function(species) {
	return species;
}

GaggleData.prototype.getAsync = function() {
    return this._isAsync;
}

GaggleData.prototype.setAsync = function(isAsync) {
    this._isAsync = isAsync;
}

GaggleData.prototype.setData = function(data) {
    this._data = data;
}

function parseJSONdataToGaggle(jsondata)
{
    var jsonobj = JSON.parse(jsondata);
    if (jsonobj != null) {
        var sourceobj = jsonobj["source"];
        var type = sourceobj["_type"];
        console.log("Data type: " + type);
        if (type == "NameList") {
            try {
                namelist = new Namelist("", 0, "", null);
                namelist.parseJSON(sourceobj);
                return namelist;
            }
            catch(e) {
                console.log("Failed to convert namelist " + e);
            }
        }
    }
    return null;
}