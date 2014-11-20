var app = angular.module('GGBWebApp', ['ngSanitize', 'ui.bootstrap', 'jqwidgets']);

app.directive('ggbloading', function ()
{
    return {
        restrict: 'AE',
        template: "<div><img src='/static/images/loading.gif' /></div>",
        link: function (scope, elm, attrs)
        {
            scope.isLoading = function () {
                if (attrs.targetdata != null)
                {
                   return false;
                }
                return true;
            };

            scope.$watch(attrs.targetdata, function (v)
            {
                //alert(v);
                if(v == null){
                    elm.show();
                }else{
                    elm.hide();
                }
            });
        }
    };

});


app.directive('gaggleTable', function() {
    return function(scope, element, attrs) {
        options = {
            "bStateSave": true,
            "iCookieDuration": 2419200, // 1 month
            "bJQueryUI": true,
            "bPaginate": true,
            "bLengthChange": false,
            "bFilter": true,
            "bInfo": true,
            "bDestroy": true,
            "fnCreatedRow": function( nRow, aData, iDataIndex ) {
                                        // In the row created callback, we add the ondblclick event handler from the controller
                                        //$(nRow).attr('ondblclick', 'angular.element(this).scope().selectRow(event)');

                                    }
        };

        var explicitColumns = [];
        /*element.find('th').each(function(index, elem) {
            explicitColumns.push($(elem).text());
        }); */
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
        });
    }
});

// Create the XHR object.
function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // XHR for Chrome/Firefox/Opera/Safari.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // XDomainRequest for IE.
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    xhr = null;
  }
  if (xhr != null)
    xhr.withCredentials = true;
  return xhr;
}

