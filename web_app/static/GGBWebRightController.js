app.controller("GGBWebRightPaneCtrl", function($scope, $sce) {
    $scope.columnDefs = [];
    var columndef = {"sTitle": "Gene"};
    var targets = [];
    targets.push(0);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    angular.element(document).ready(function () {
       console.log('right document loaded...');
       rightcontentLoaded();
    });
});

function rightcontentLoaded()
{
    $( "#divUserTabs" ).tabs();
}
