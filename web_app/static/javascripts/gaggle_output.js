var pageGaggleData = [];
var dictGeese = {
                 "DAVID": david,
                 "KEGG": kegg,
                 "EMBLString": emblString,
                 "EGRIN2": egrin2,
                 "HaloAnnotation": haloAnnotation,
                 "EntrezGene": entrezGene,
                 "EntrezProtein": entrezProtein,
                 "Maggie": maggie,
                 "NetworkPortal": networkPortal
                };

function findObjectByKey(key, list) {
    if (key != null && list != null) {
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.key == key) {
                return item;
            }
        }
    }
    return null;
}

var app = angular.module('gaggleOutputApp', ['ngSanitize', 'ui.bootstrap']);

app.controller("GaggleGeneInfoCtrl", function($scope, $sce) {
    $scope.geneInfoList = new Array();

    $scope.trustSrc = function(src) {
       return $sce.trustAsResourceUrl(src);
    };

    $scope.initGeneParse = function() {
        $scope.geneInfoList = new Array();
    };

    $scope.addGeneData = function(geneId, geneName, source, type, url, desc, iframeid) {
         console.log(geneId + ", " + geneName + ", " + source + ", " + type + ", " + url + ", " + iframeid);
         var geneInfo = findObjectByKey(geneId, $scope.geneInfoList);

         var newentry = false;
         if (geneInfo == null) {
            geneInfo = {};
            geneInfo.key = geneId;
            geneInfo.geneName = geneName;
            geneInfo.sourceList = new Array();  // all the handlers
            newentry = true;
         }
         if (geneInfo != null) {
            console.log("Searching source handler " + source + " for Gene: " + geneInfo.geneName);
            var sourceObj = findObjectByKey(source, geneInfo.sourceList);
            if (sourceObj == null) {
                sourceObj = {};
                sourceObj.key = source;
                sourceObj.dataList = new Array();    // results for each handler
                geneInfo.sourceList.push(sourceObj);
            }

            // Verify dataobj is not duplicated
            var dataobj = findObjectByKey(iframeid, sourceObj.dataList);
            if (dataobj == null) {
                dataobj = {};
                dataobj.key = iframeid;
                dataobj.type = type;
                dataobj.url = url; //$sce.trustAsResourceUrl(url); // Need to do this to ensure successful binding to iframe src attribute
                dataobj.desc = desc;
                dataobj.iframeId = iframeid;
                console.log("Data obj " + sourceObj.dataList.length + ": " + dataobj.url + " " + dataobj.type);
                sourceObj.dataList.push(dataobj);
            }
         }
         if (newentry)
            $scope.geneInfoList.push(geneInfo);

         // Hide the iframe
         //if (iframeid != null && iframeid.length > 0)
         //   $("#" + iframeid).parent().hide();
    };
});

app.controller("GaggleOutputCtrl", function($scope, $sce) {
  $scope.outputs = new Array();

  $scope.init = function() {
    $scope.outputs = new Array();
  };

  $scope.addOutput = function(output) {
    for (var i = 0; i < ($scope.outputs).length; i++)
    {
        var item = ($scope.outputs)[i];
        item.open = false;
    }
    output.open = true;
    ($scope.outputs).push(output); //  [output.id] = output;
  };
});

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
}

function parseGaggleData(categoryName, categoryType) {
    console.log("Parsing gaggle data...");

    var category = {name: categoryName, type: categoryType};
    category.properties = new Array();
    category.values = new Array();
    var hasData = false;
    var gaggledData = gaggleMicroformat.scan("#divNewGaggledData");
    if (gaggledData != null) {
        for (var i = 0; i < gaggledData.length; i++) {
            hasData = true;
            var data = (gaggledData)[i];
            // Call the lazy parser
            var fetcheddata = data.getData();
            console.log(data.getData());
            category.values.push(data);
        }
        console.log("Output gaggled data: " + gaggledData);
    }

    if (hasData)
        return category;
    return null;
}

function insertPValueToEnrichment(moduleid, pvalueProperties, enrichmentObj)
{
    if (moduleid != null && pvalueProperties != null && enrichmentObj != null) {
        //alert("Inserting pvalue of module " + moduleid);
        for (var i = 0; i < enrichmentObj.values.length; i++) {
            // We assume the first item of enrichmentObj.values is the module property
            var enrichmentProp = (enrichmentObj.values[i])[0];
            if (moduleid == enrichmentProp.value)  {
                //alert("Enrichment " + moduleid + " properties " + enrichmentObj.values[i].length + " " + pvalueProperties.length);
                for (var j = 0; j < pvalueProperties.length; j++) {
                    //alert("Inserting " + pvalueProperties[j].value);
                    enrichmentObj.values[i].push(pvalueProperties[j]);
                }
                //alert("Enrichment properties " + enrichmentObj.values[i].length + " for module " + moduleid);
                break;
            }
        }
    }
}

function parseFunctionalEnrichment()
{
    var categories = new Array();
    var enrichment = {name: "Enrichments", type: "enrichments"};
    categories.push(enrichment);
    enrichment.properties = new Array();
    enrichment.values = new Array();
    var index = 0;
    var hasData = false;
    $("#divNewGaggledData").find(".gaggle-enrichment").each(function() {
        enrichment.values.push([]);

        $(this).find("label").each(function () {
            hasData = true;
            var input1 = $(this).children()[0];
            var input2 = $(this).children()[1];
            var input3 = $(this).children()[2]; // type
            console.log("Property " + $(input1).val() + " Value " + $(input2).val() + " Type: " + $(input3).val());
            if (index == 0) {
                // Add all the column names (e.gl, Input.Name, Enriched.Module, etc)
                enrichment.properties.push($(input1).val());
            }
            console.log("Enrichments index: " + index);
            var proppair = {};
            proppair.value = $(input2).val();
            proppair.type = $(input3).val();
            enrichment.values[index].push(proppair);
        });
        index++;
    });
    console.log("Output enrichments: " + enrichment.values);

    // Parse p value results
    var pvalues = {name: "P-Values", type: "p-values"};
    pvalues.properties = new Array();
    pvalues.values = new Array();
    //categories.push(pvalues);
    index = 0;
    $("#divNewGaggledData").find(".gaggle-pvalue").each(function() {
        pvalues.values.push([]);
        var module = "";
        $(this).find("label").each(function () {
            hasData = true;
            var input1 = $(this).children()[0];
            var input2 = $(this).children()[1];
            var propname = $(input1).val();
            var propvalue = $(input2).val();
            console.log("P-value prop name: " + propname + " prop value: " + propvalue);
            if (propname == "Module")
                module = propvalue;
            else {
                var proppair = {};
                proppair.value = propvalue;
                proppair.type = "value";
                pvalues.values[index].push(proppair);

                if (index == 0)
                    enrichment.properties.push(propname);
            }
        });
        insertPValueToEnrichment(module, pvalues.values[index], enrichment);
        index++;
    });
    console.log("Output pvalue properties: " + pvalues.properties);
    console.log("Output pvalues: " + pvalues.values);

    // Parse gaggled data
    /*if (hasData) {
        var category = parseGaggleData("Overlapped Genes", "output");
        if (category != null) {
            categories.push(category);
            hasData = true;
        }
    }*/

    if (hasData)
        return categories;
    return null;
}

function parseGenePlot()
{
    var categories = new Array();
    var plots = {name: "Plot", type: "geneplot"};
    categories.push(plots);
    plots.properties = new Array();
    plots.values = new Array();
    $("#divNewGaggledData").find(".gaggle-plotexpression").each(function() {
        var inputurl = $(this).children()[0];
        var ploturl = $(inputurl).val();
        console.log("Gaggle plot url: " + ploturl);
        plots.values.push(ploturl);
    });
    if (plots.values.length > 0)
        return categories;
    return null;
}

function parseTFOEFilter(output)
{
    console.log("Parsing TFOE filter results..." + output);
    var categories = new Array();
    var plots = {name: "Plot", type: "geneplot"};
    categories.push(plots);
    plots.properties = new Array();
    plots.values = new Array();
    var hasData = (output != null);
    $("#divNewGaggledData").find(".gaggle-plottfoe").each(function() {
        hasData = true;
        var inputurl = $(this).children()[0];
        var ploturl = $(inputurl).val();
        console.log("Gaggle plot url: " + ploturl);
        plots.values.push(ploturl);
    });

    if (hasData) {
        var category = parseGaggleData("Expression Genes", "output");
        if (category != null) {
            hasData = true;
            categories.push(category);
        }

        var category1 = {name: "Output", type: "html"};
        category1.properties = new Array();
        category1.values = new Array();
        category1.values.push(output);
        categories.push(category1);
    }

    if (hasData)
        return categories;
    return null;
}

// Handles data added from OpenCPU results
function gaggleDataAddHandler(e) {
    console.log("GaggleDataAddEvent captured...");
    var funcname = e.detail.funcname;
    var species = e.detail.species;
    var desc = e.detail.description;
    console.log("Function name: " + funcname + " Species: " + species + " Desc: " + desc);
    var output = {};
    output.id = generateUUID();
    output.funcname = funcname;
    output.species = species;
    output.description = desc;
    output.categories = new Array();

    var functionalenrichments = parseFunctionalEnrichment();
    if (functionalenrichments != null)
        output.categories = output.categories.concat(functionalenrichments);

    var plots = parseGenePlot();
    if (plots != null)
        output.categories = output.categories.concat(plots);

    var tfoeresults = parseTFOEFilter(e.detail.output);
    if (tfoeresults != null)
        output.categories = output.categories.concat(tfoeresults);
    console.log("Adding output to AngularJS " + output.categories.length);


    var scope = angular.element($("#divGaggleOutput")).scope();
    scope.$apply(function(){
        scope.addOutput(output);
    });

    $("#divNewGaggledData").prop("id", "");
    // Set the hidden input to inform chrome goose to scan page for gaggled data
    $("#inputDataParsingFinishSignal").val("Page");
}

// Handles data received from multiple iframes opened to analyze genes
function gaggleParseHandler(e)
{
    console.log("GaggleParseEvent captured " + e.detail);
    var geneId = e.detail.GeneId;
    var geneName = e.detail.GeneName;
    var url = e.detail.Url;
    var type = e.detail.Type;
    var source = e.detail.Source;
    var iframeid = e.detail.IFrameId;
    var desc = e.detail.Description;
    console.log("Gene: " + geneId + " Url: " + url + " IFrame Id: " + iframeid);

    var scope = angular.element($("#divGeneInfo")).scope();
    scope.$apply(function(){
        scope.addGeneData(geneId, geneName, source, type, url, desc, iframeid);
    });
}

function gaggleDataItemSelected(event)
{
    console.log("Gaggle data item selected "); // + $("#selGaggleMenu").val());

    var source = event.target;
    console.log("gaggleDataItemSelected: event source: " + source);
    var selected = $(source).val();
    console.log("Selected data value: " + selected);
    if (selected == "text") {
        $(".divTextInput").show();
        $(".divFileInput").hide();
    }
    else if (selected == "file") {
        $(".divFileInput").show();
        $(".divTextInput").hide();
    }
}

function cancelTextInput(event) {
    console.log("Cancel data text input"); // + $("#selGaggleMenu").val());
    $(".divTextInput").hide();
    $("#selGaggleData").val("-1");
}

function cancelFileInput(event) {
    console.log("Cancel data text input"); // + $("#selGaggleMenu").val());

    $(".divFileInput").hide();
    $("#selGaggleData").val("-1");
}

function getOrganisms() {
    //alert("Get organism from " + GAGGLE_SERVER); // + "/workflow/getorganisms);
    cg_util.httpGet(GAGGLE_SERVER + "/workflow/getorganisms", function(jsonorganisms) {
        // Get organisms from network portal
        var organismsobj = JSON.parse(jsonorganisms);
        // Generate the organism selection html
        var organismSelectionHtml = "<option value=''>Select an organism</option>";
        for (var i in organismsobj) {

            var organism = organismsobj[i];
            organismSelectionHtml += "<option value='" + organism.shortname + "'>" + organism.name + "</option>";
        }
        $("#selSpecies").html(organismSelectionHtml)
    });
}


function generateNamelist(species, nameliststring)
{
    if (nameliststring != null && nameliststring.length > 0)
    {
        console.log("Generating namelist from " + nameliststring);
        var list = new Array();
        var splitted = nameliststring.split("\n");
        for (var i = 0; i < splitted.length; i++)
        {
            var line = splitted[i];
            console.log("Line: " + line);
            var delimited = line.split(" ");
            if (delimited.length == 1)
                delimitted = line.split(";");
            if (delimitted.length == 1)
                delimitted = line.split("\t");
            if (delimitted.length == 1)
                delimitted = line.split(",");
            for (var j = 0; j < delimitted.length; j++) {
                console.log("Name " + delimitted[j]);
                list.push(delimitted[j]);
            }
        }
        var namelist = new GaggleData("", "NameList", list.length, species, list);
        return namelist;
    }
    return null;
}

function getNamelist(callback)
{
    var species = $("#selSpecies").val();
    //alert("Species: " + species);
    var selected = $("#selGaggleData").val();
    //alert("Selected " + selected);
    if (selected == "text" || selected == "file") {
        if (selected == "text") {
            var line = $("#inputTextData").val();
            if (line != null && line.trim().length > 0) {
                var names = line.split(";");
                var namelist = new GaggleData("", "NameList", names.length, species, names);
                if (callback != null)
                    callback(namelist);
            }
        }
        else {
            var fileinput = document.getElementById("inputFileData");
            var file = fileinput.files[0];
            if (file != null) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var contents = e.target.result;
                    console.log( "Got the file.\n"
                      +"name: " + file.name + "\n"
                      +"type: " + file.type + "\n"
                      +"size: " + file.size + " bytes\n"
                      + "Content: " + contents
                    );
                    var namelist = generateNamelist(species, contents);
                    if (callback != null)
                        callback(namelist);
                }
                reader.readAsText(file);
            }
        }
    }
    else {
        var intsel = parseInt(selected);
        if (intsel >= 0) {
            var namelist = generateNamelist(pageGaggleData[intsel].getSpecies(), pageGaggleData[intsel].getData().join(";"));
            //alert(namelist);
            if (callback != null)
                callback(namelist);
        }
    }
}

function processNamelist()
{
    getNamelist(function(namelist) {
        if (namelist == null)
            return;

        //alert("Namelist species " + namelist.getSpecies());
        var firstone = true;
        $("input:checkbox.chkboxGeese").each(function () {
            if (this.checked) {
                //alert("checkbox value: " + $(this).val() + " dictionary " + dictGeese);
                if (firstone) {
                    // clean up UI related to gene parsing
                    firstone = false;
                    $(".divResultIFrames").empty();

                    //removeAllResults();
                    var scope = angular.element($("#divGeneInfo")).scope();
                    scope.$apply(function(){
                        scope.initGeneParse();
                    });

                    var event = new CustomEvent('GaggleOutputInitEvent',
                                                {detail:
                                                    {},
                                                    bubbles: true,
                                                    cancelable: false});
                    document.dispatchEvent(event);
                }

                var goose = dictGeese[$(this).val()];
                //alert(goose);
                if (goose != null && goose.handleNameList != null) {
                    console.log("Passing namelist to " + $(this).val());
                    goose.handleNameList(namelist);
                }
            }
        });
    });
}

function removeAllResults()
{
    $(".divResultIFrames").empty();

    var scope = angular.element($("#divGeneInfo")).scope();
    scope.$apply(function(){
        scope.initGeneParse();
    });

    var event = new CustomEvent('GaggleOutputInitEvent',
                                {detail:
                                    {},
                                    bubbles: true,
                                    cancelable: false});
    document.dispatchEvent(event);

    var scope1 = angular.element($("#divGaggleOutput")).scope();
    scope1.$apply(function(){
        scope1.init();
    });

    $("#divGaggledData").empty();
    $("#inputDataParsingFinishSignal").val("Page");
}

// Other data source can pass data to this page by firing the GaggleDataAddEvent
document.addEventListener("GaggleDataAddEvent", gaggleDataAddHandler, false);
document.addEventListener("GaggleParseEvent", gaggleParseHandler, false);

$(document).ready(function () {
    console.log("Get organisms...");
    getOrganisms();
    $("#selGaggleData").on('change', gaggleDataItemSelected);

    // Periodically check gaggle data on the page
    setInterval(function() {
         var control = $("#inputDataParsingFinishSignal");
         if (control != null && ($("#inputDataParsingFinishSignal").val() == "Page"))
         {

            $("#selGaggleData").children().each(function() {
                 var val = $(this).val();
                 if (val != "-1" && val != "-2" && val != "text" && val != "file")
                 {
                     $(this).remove();
                 }
            });
            pageGaggleData = [];

            //$("#selGaggleData").change(gaggleDataItemSelected);
            if (gaggleMicroformat.hasGaggleData(document)) {
                //alert("Scanning data...")
                pageGaggleData = gaggleMicroformat.scan(document);
                //alert(gaggleddata);
                if (pageGaggleData != null && pageGaggleData.length > 0) {
                    for (var i = 0; i < pageGaggleData.length; i++) {
                        var pagedata = pageGaggleData[i];
                        var text = pagedata.getName();
                        console.log("Data name: " + text);
                        if (text == null)
                            text = pagedata.getType();
                        console.log("Final name: " + text);
                        if (text != null) {
                            //var data = pagedata.getData();
                            //if (data != null && data.length > 0)
                            //    text += " (" + data.length + ")";
                            $("#selGaggleData").append($("<option></option>").attr("value", i).text(text));
                        }
                    }
                }
            }
            $("#inputDataParsingFinishSignal").val("Goose");
         }
    },
    4000);
});