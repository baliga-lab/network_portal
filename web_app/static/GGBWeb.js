var app = angular.module('GGBWebApp', ['ngSanitize', 'ui.bootstrap']);

app.controller("GGBWebLeftPaneCtrl", function($scope, $sce) {
    $scope.geneInfoList = new Array();

    $scope.trustSrc = function(src) {
       return $sce.trustAsResourceUrl(src);
    };

    $scope.loadGeneOfSpecies = function(geneinfotsv) {

    }
});



$(document).ready(function () {
    // Load ecoli info from network portal
    $.ajax({
      url: "http://networks.systemsbiology.net/eco/genes/?format=tsv",
    }).done(function(data) {
      alert(data);
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

         /*var scope = angular.element($("#divLeftPane")).scope();
         scope.$apply(function(){
             scope.loadGeneOfSpecies(data);
         }); */
      }
    });
});