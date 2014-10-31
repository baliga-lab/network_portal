var app = angular.module('GGBWebApp', ['ngSanitize', 'ui.bootstrap']);

app.controller("GGBWebLeftPaneCtrl", function($scope, $sce) {
    $scope.columnDefs = [];
    var columndef = {"sTitle": "Gene"};
    var targets = [];
    targets.push(0);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    columndef = {"sTitle": "Position"};
    targets = [];
    targets.push(1);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    columndef = {"sTitle": "Info"};
    targets = [];
    targets.push(2);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    $scope.values = [];
    $scope.values.push(["NP_415256.1", "chromosome+:762237-763403", "NP_415256.1"]);
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

        if (attrs.aoColumnDefs) {
            options["aoColumnDefs"] = scope.$eval(attrs.aoColumnDefs);
        }


        var dataTable = element.dataTable(options);

        scope.$watch(attrs.aaData, function(value) {
            var val = value || null;
            if (val) {
                dataTable.fnClearTable();
                dataTable.fnAddData(scope.$eval(attrs.aaData));
            }
             $('body').layout({ applyDefaultStyles: true });
             $( "#tabs" ).tabs();
        });
    }
});

$(document).ready(function () {
    $('body').layout({ applyDefaultStyles: true });
    $( "#tabs" ).tabs();


    // Load ecoli info from network portal
    /*$.ajax({
      url: "http://localhost:8000/dvu/genes/?format=tsv",
    }).done(function(data) {
      console.log(data);
      if (data != null) {
          var lines = data.split("\n");
          console.log("Gene info " + lines.length + " lines");
          var line = lines[0];
          var splitted = line.split('\t');
          console.log("Fields " + splitted);

          var circle_vis = new vq.CircVis();
          $.ajax({
              url: '/json/circvis/?species=1&gene=NP_415256.1',
                success: function(json) {
                    var circle_vis = new vq.CircVis();
                    var cvdata = vqhelpers.makeCircVisData('circvis', json.chromosomes,
                        json.genes, json.network);
                    circle_vis.draw(cvdata);
                },
                error: function() {
                    console.debug('could not read data');
                }
          });

         //var scope = angular.element($("#divLeftPane")).scope();
         //scope.$apply(function(){
         //    scope.loadGeneOfSpecies(data);
         //});
      }
    }); */
});