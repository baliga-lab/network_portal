app.controller("GGBWebCenterPaneCtrl", function($scope, $sce, GGBWebDataService) {
    $scope.gene = "";
    $scope.ggbWindows = null;

    $scope.jqxWindowSettings = {
        height : 400,
        width : 600,
        resizable : true,
        isModal : false,
        autoOpen : true,
        //title: 'GGB Window',
        //dragArea: {left: parentPosition.left, top: parentPosition.top, width: 800, height: 800},
        showCloseButton: true,
        showCollapseButton: true
    };

    $scope.$on('state.update', function(event, args) {
        if (args.name == "NewGGBWindow") {
            //$scope.jqxWindowSettings.apply('open');
            var window = {};
            window.body = "Body Text";
            window.settings = jQuery.extend(true, {}, $scope.jqxWindowSettings);
            window.settings.title = "GGB Window";
            var newarray = jQuery.extend(true, [], $scope.ggbWindows);
            newarray.push(window);
            $scope.ggbWindows = newarray;
        }
    });

    $scope.showWindow = function() {
        $scope.jqxWindowSettings.apply('open');
    };
    $scope.Ok = function() {
        $scope.jqxWindowSettings.apply('close');
    };
    $scope.Cancel = function() {
        $scope.jqxWindowSettings.apply('close');
    };

    var window = {};
    window.body = "Body Text";
    window.settings = jQuery.extend(true, {}, $scope.jqxWindowSettings);
    window.settings.title = "GGB Window";
    $scope.ggbWindows = [];
    $scope.ggbWindows.push(window);
});