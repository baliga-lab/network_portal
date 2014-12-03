app.controller("GGBWebRightPaneCtrl", function($scope, $sce, GGBWebDataService) {
    $scope.columnDefs = [];
    var columndef = {"sTitle": "Gene"};
    var targets = [];
    targets.push(0);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    $scope.sendData = function(event) {
        // Send data to Chrome Goose
        console.log("Send data to Chrome Goose");
        var genes = {};
        genes._name = "DVU genes";
        genes._type = "NameList";
        genes._size = 2;
        genes._species = "dvu";
        genes._data = ["DVU0744", "DVU0560"];
        var event = new CustomEvent("GagglePageRequest",
                           {detail:
                            {
                                type: "Data",
                                data: JSON.stringify(genes)
                            },
                            bubbles: true,
                            cancelable: false});
        document.dispatchEvent(event);

        // Just a test of firing events to the left pane
        GGBWebDataService.addProduct("product 1");
    };

    angular.element(document).ready(function () {
       console.log('right document loaded...');
       rightcontentLoaded();
    });
});

function rightcontentLoaded()
{
    $( "#divUserTabs" ).tabs();
}
