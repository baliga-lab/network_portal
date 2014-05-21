function GaggleOutputCtrl($scope) {
  $scope.outputs = {};

  $scope.addOutput = function(output) {
    ($scope.outputs)[output.id] = output;
  };
}

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
}

function gaggleDataAddHandler(e) {
    console.log("GaggleDataAddEvent captured...");
    var funcname = e.detail.funcname;
    var species = e.detail.species;
    console.log("Function name: " + funcname + " Species: " + species);
    var output = {};
    output.id = generateUUID();
    output.funcname = funcname;
    output.species = species;
    output.enrichments = [];
    $("#divNewGaggledData").find(".gaggle-enrichment").each(function() {
        $(this).find("label").each(function () {
            var input1 = $(this).children()[0];
            var input2 = $(this).children()[1];
            console.log("Property " + $(input1).val() + " Value " + $(input2).val());
            enrichment[property] = $(input1).val();
            enrichment[value] = $(input2).val();
        });
        output.enrichments.push(enrichment);
    });
    console.log("Output: " + output);
    $scope.addOutput(output);
    $("#divNewGaggledData").prop("id", "");
}

document.addEventListener("GaggleDataAddEvent", gaggleDataAddHandler, false);