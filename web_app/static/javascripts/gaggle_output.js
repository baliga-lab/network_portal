var pageGaggleData = [];
var tunableVariables = {};
var genePlotTunableControls = [];
var progressId = null;
var divProgressBar = null;
var progress = 0;
var step = 10;
var previousDataDiv = null;

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

function findObjectByKey1(key, list) {
    if (key != null && list != null) {
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.key == key) {
                return i;
            }
        }
    }
    return -1;
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
  $scope.updatedOutputId = "";

  $scope.init = function() {
    $scope.outputs = new Array();
  };

  $scope.addOutput = function(output) {
    for (var i = 0; i < ($scope.outputs).length; i++)
    {
        var item = ($scope.outputs)[i];
        item.open = false;
    }

    console.log("Searching for output with guid " + output.key);
    var index = findObjectByKey1(output.key, $scope.outputs);
    if (index < 0) {
        console.log("New output structure...");
        output.open = true;
        ($scope.outputs).push(output); //  [output.id] = output;
    }
    else {
        console.log("Found existing output structure " + index);
        var oldoutput = $scope.outputs[index];
        // We need to set the tunableVariables to the previous one to keep the selected values
        output.tunableVariables = oldoutput.tunableVariables;
        output.open = true;
        var clone = $.extend(true, [], $scope.outputs);
        clone.splice(index, 1, output);
        $scope.outputs.length = 0;
        $.extend($scope.outputs, clone);
    }
  };

  $scope.updateClicked = function(clickEvent) {
    var src = clickEvent.target;
    var parentdiv = $(src).parent();
    var grandparentdiv = $(parentdiv).parent();
    var inputkey = $(grandparentdiv).children()[0];
    var key = $(inputkey).val();

    console.log("Output key " + key);
    previousDataDiv = document.getElementById(key);
    var output = findObjectByKey(key, $scope.outputs);
    if (output != null) {
        console.log("Found output obj: " + JSON.stringify(output));
        var runscriptguid = output.key;
        var tabid = output.tabid;
        var params = {};
        var count = 0;
        for (var i = 0; i < output.tunableVariables.rows.length; i++)
        {
            for (var j = 0; j < output.tunableVariables.rows[i].length; j++) {
                var tunable = output.tunableVariables.rows[i][j];
                if (tunable.paramName != null && tunable.paramName.length > 0) {
                    console.log("tunable " + tunable + " selected item: " + tunable.selecteditem);
                    var paramvalue = (tunable.selecteditem.value.value != null) ? tunable.selecteditem.value.value : tunable.selecteditem.value;
                    var paramname = tunable["paramName"];
                    var paramvaluetype = tunable["paramValueType"];
                    console.log("Param name: " + paramname + " param value type: " + paramvaluetype + " param value: " + paramvalue);
                    params[count.toString()] = {paramName: paramname,
                                                    paramValueType: paramvaluetype,
                                                    paramValue: paramvalue};
                    count++;
                }

            }
        }

        console.log("Runscript guid: " + runscriptguid + " source data tab id: " + tabid + " params: " + params);

        divProgressBar = $(parentdiv).find(".divProgressBar")[0];
        console.log("progress bar div: " + divProgressBar);
        $(divProgressBar).show();
        $(divProgressBar).progressbar({value: 0});
        var progressbarValue = $(divProgressBar).find( ".ui-progressbar-value" );
        progressbarValue.css({
            "background": '#' + Math.floor( Math.random() * 16777215 ).toString( 16 )
        });

        progress = 0;
        step = 10;
        progessId = setInterval(function() {
            progress += step;
            if (progress == 60)
                step = 2;
            else if (progress == 86)
                step = 1;
            else if (progress == 95)
                step = 0;
            $(divProgressBar).progressbar( "option", {
                      value: progress
                    });
        }, 1000);



        // Now we inform gaggle.js of chrome goose to rerun the rscript
        var event = new CustomEvent('RScriptRerunFromOutputPageEvent', {detail: { rscriptGuid : runscriptguid,
                                        sourceTabId: tabid, parameters: params, initialRun: "false"},
                                        bubbles: true, cancelable: false});
        document.dispatchEvent(event);
    }
  };
});

app.directive('gaggleTable', function() {
    return function(scope, element, attrs) {

        options = {
            "bStateSave": true,
            "iCookieDuration": 2419200, /* 1 month */
            "bJQueryUI": true,
            "bPaginate": true,
            "bLengthChange": false,
            "bFilter": true,
            "bInfo": true,
            "bDestroy": true
        };

        var explicitColumns = [];
        element.find('th').each(function(index, elem) {
            explicitColumns.push($(elem).text());
        });
        if (explicitColumns.length > 0) {
            options["aoColumns"] = explicitColumns;
        } else if (attrs.aoColumns) {
            options["aoColumns"] = scope.$eval(attrs.aoColumns);
        }

        //alert(attrs.aoColumnDefs);
        if (attrs.aoColumnDefs) {
            options["aoColumnDefs"] = scope.$eval(attrs.aoColumnDefs);
        }

        //alert(explicitColumns);
        var dataTable = element.dataTable(options);

        scope.$watch(attrs.aaData, function(value) {
            var val = value || null;
            if (val) {
                dataTable.fnClearTable();
                dataTable.fnAddData(scope.$eval(attrs.aaData));
            }
        });
    }
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
            if (moduleid == enrichmentProp)  {
                //alert("Enrichment " + moduleid + " properties " + enrichmentObj.values[i].length + " " + pvalueProperties.length);
                for (var j = 0; j < pvalueProperties.length; j++) {
                    //alert("Inserting " + pvalueProperties[j].value);
                    enrichmentObj.values[i].push(pvalueProperties[j].value);
                }
                //alert("Enrichment properties " + enrichmentObj.values[i].length + " for module " + moduleid);
                break;
            }
        }
    }
}

// Generate the tunable variable object for a opencpu execution result.
// We add the necessary information (guid, tabid, param name, type, etc)
// to value the values object to be used in the reexecution
function generateTunableVariableObj(packagekey, runscriptguid, tabid)
{
    console.log("clone tunarable variable obj: " + packagekey + " " + runscriptguid + " " + tabid);
    if (tunableVariables[packagekey] != null) {
        console.log("Original object: " + JSON.stringify(tunableVariables[packagekey]));

        var clonedcontrols = {};
        var clonedrows= $.extend(true, [], tunableVariables[packagekey].rows);
        clonedcontrols.rows = clonedrows;
        console.log("Cloned controls: " + JSON.stringify(clonedcontrols));
        return clonedcontrols;
    }
    return {rows: []};
}

function parseFunctionalEnrichment()
{
    var returnobj = {};
    var categories = new Array();
    returnobj.categories = categories;
    var enrichment = {name: "Enrichments", type: "enrichments"};
    categories.push(enrichment);
    enrichment.properties = new Array();
    enrichment.columnDefs = new Array();
    enrichment.values = new Array();
    var index = 0;
    var hasData = false;

    $("#divNewGaggledData").find(".gaggle-genesetenrichment-info").each(function() {
       var inputtabid = $(this).children()[0];
       var tabid = $(inputtabid).val();
       var inputrunscriptguid = $(this).children()[1];
       var runscriptguid = $(inputrunscriptguid).val();
       returnobj.guid = runscriptguid;
       returnobj.tabid = tabid;
       console.log("genesetenrichment guid " + runscriptguid + " tabid " + tabid);

       var clonedcontrols = generateTunableVariableObj("gagglefunctionalenrichment-geneSetEnrichment", runscriptguid, tabid);
       returnobj.tunableVariables = clonedcontrols;
    });

    var colindex = 0;
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
                var columndef = {"sTitle": $(input1).val()};
                var targets = [];
                targets.push(colindex++);
                columndef["aTargets"] = targets;
                enrichment.columnDefs.push(columndef);
            }
            console.log("Enrichments index: " + index);
            var proppair = {};
            proppair.value = $(input2).val();
            proppair.type = $(input3).val();
            var value = proppair.value;
            if (proppair.type == "url")
                value = "<a target='_blank' href='" + proppair.value + "'>module</a>";
            enrichment.values[index].push(value);
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

                if (index == 0) {
                    enrichment.properties.push(propname);
                    var columndef = {"sTitle": propname};
                    var targets = [];
                    targets.push(colindex++);
                    columndef["aTargets"] = targets;
                    enrichment.columnDefs.push(columndef);
                }
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
        return returnobj;
    return null;
}

function parseGenePlot()
{
    var returnobj = {};
    var categories = new Array();
    returnobj.categories = categories;
    var plots = {name: "Plot", type: "geneplot"};
    categories.push(plots);
    plots.properties = new Array();
    plots.values = new Array();
    $("#divNewGaggledData").find(".gaggle-plotexpression").each(function() {
        var inputurl = $(this).children()[0];
        var ploturl = $(inputurl).val();
        var inputtabid = $(this).children()[1];
        var tabid = $(inputtabid).val();
        var inputrunscriptguid = $(this).children()[2];
        var runscriptguid = $(inputrunscriptguid).val();
        returnobj.guid = runscriptguid;
        returnobj.tabid = tabid;
        var clonedcontrols = generateTunableVariableObj("gaggleplotexpression-plotExpression", runscriptguid, tabid);
        returnobj.tunableVariables = clonedcontrols;
        console.log("Gaggle plot url: " + ploturl + " tabid: " + tabid + " runscript guid: " + runscriptguid);
        plots.values.push(ploturl);
    });
    if (plots.values.length > 0)
        return returnobj;
    return null;
}

function parseTFOEFilter(output)
{
    console.log("Parsing TFOE filter results..." + output);
    var returnobj = {};
    var categories = new Array();
    returnobj.categories = categories;
    var plots = {name: "Plot", type: "geneplot"};
    categories.push(plots);
    plots.properties = new Array();
    plots.values = new Array();
    var hasData = (output != null);
    $("#divNewGaggledData").find(".gaggle-plottfoe").each(function() {
        hasData = true;
        var inputurl = $(this).children()[0];
        var ploturl = $(inputurl).val();
        var inputtabid = $(this).children()[1];
        var tabid = $(inputtabid).val();
        var inputrunscriptguid = $(this).children()[2];
        var runscriptguid = $(inputrunscriptguid).val();
        returnobj.guid = runscriptguid;
        returnobj.tabid = tabid;
        console.log("Gaggle plot url: " + ploturl + " tabid: " + tabid + " runscript guid: " + runscriptguid);
        plots.values.push(ploturl);
        var clonedcontrols = generateTunableVariableObj("gaggletfoefilter-tfoefilter", runscriptguid, tabid);
        returnobj.tunableVariables = clonedcontrols;
        console.log("Gaggle tfoe url: " + ploturl + " tabid: " + tabid + " runscript guid: " + runscriptguid);
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
        return returnobj;
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
    if (functionalenrichments != null) {
        output.categories = output.categories.concat(functionalenrichments.categories);
        output.key = functionalenrichments.guid;
        output.tabid = functionalenrichments.tabid;
        output.tunableVariables = functionalenrichments.tunableVariables;
    }

    var plots = parseGenePlot();
    if (plots != null) {
        output.categories = output.categories.concat(plots.categories);
        output.key = plots.guid;
        output.tabid = plots.tabid;
        output.tunableVariables = plots.tunableVariables;
    }

    var tfoeresults = parseTFOEFilter(e.detail.output);
    if (tfoeresults != null) {
        output.categories = output.categories.concat(tfoeresults.categories);
        output.key = tfoeresults.guid;
        output.tabid = tfoeresults.tabid;
        output.tunableVariables = tfoeresults.tunableVariables;
    }
    console.log("Adding output to AngularJS " + output.categories.length);

    if (output.categories.length > 0) {
        if (previousDataDiv != null) {
            // If we get updated data, we remove the previous gaggled data
            $(previousDataDiv).empty();
            $(previousDataDiv).prop("id", "");
        }
    }
    previousDataDiv = null;

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
    if (progessId != null) {
       if (divProgressBar != null) {
           $(divProgressBar).progressbar( "option", {
             value: 100
           });
           divProgressBar = null;
       }
       clearInterval(progessId);
       progressId = null;
    }

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

    // Initialize tunable variables for opencpu packages
    var genePlotTunableControls = {};
    genePlotTunableControls.rows = [];
    var row0 = [];
    genePlotTunableControls.rows.push(row0);
    var plottunable = {type: "select", description: "Select Plot Type ",
                       paramName: "plottype", paramValueType:"string"}; // uiCol indicates which column of the table to display
    plottunable.values = [];
    //var default = {"value": "", "text": "---- Select a Plot Type ----"};
    var value0 = {"value": "lineplot", "text": "Line Plot"};
    var value1 = {"value": "heatmap", "text": "Heat Map"};
    var value2 = {"value": "smooth", "text": "Smooth"};
    //plottunable.values.push(default);
    plottunable.values.push(value0);
    plottunable.values.push(value1);
    plottunable.values.push(value2);
    row0.push(plottunable);
    var dummycontrol1 = {paramName: ""};
    var dummycontrol2 = {paramName: ""};
    var dummycontrol3 = {paramName: ""};
    row0.push(dummycontrol1);
    row0.push(dummycontrol2);
    row0.push(dummycontrol3);
    plottunable.selecteditem = value0;
    tunableVariables["gaggleplotexpression-plotExpression"] = genePlotTunableControls;

    var tfoefilterTunableControls = {};
    tfoefilterTunableControls.rows = [];
    var row0 = [];
    tfoefilterTunableControls.rows.push(row0);

    var control0 = {type: "input", description: "fold change",
                    paramName: "fold.change", paramValueType:"string"};
    var value0 = {"value": "1"}
    control0.values = [];
    control0.values.push(value0);
    control0.selecteditem = value0;
    row0.push(control0);

    var control1 = {type: "input", description: "P-Value",
                    paramName: "p.value", paramValueType:"double"};
    control1.values = [];
    var value0 = {"value": "0.05"};
    control1.values.push(value0);
    control1.selecteditem = value0;
    row0.push(control1);

    var control2 = {type: "select", description: "Show only up-regulated",
                    paramName: "only.up", paramValueType:"string"};
    control2.values = [];
    var value0 = {"value": "True", "text": "True"};
    var value1 = {"value": "False", "text": "False"};
    control2.values.push(value0);
    control2.values.push(value1);
    row0.push(control2);
    control2.selecteditem = value1;

    var control3 = {type: "select", description: "Show only down-regulated",
                        paramName: "only.down", paramValueType:"string"};
    control3.values = [];
    var value0 = {"value": "True", "text": "True"};
    var value1 = {"value": "False", "text": "False"};
    control3.values.push(value0);
    control3.values.push(value1);
    row0.push(control3);
    control3.selecteditem = value1;
    tunableVariables["gaggletfoefilter-tfoefilter"] = tfoefilterTunableControls;

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