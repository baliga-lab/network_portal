/* advsearch.js - Javascript module providing helpers for the advanced search */
var advsearch;
if (!advsearch) {
    advsearch = {};
}
(function () {
     "use strict";
     var currentId = 0;

     function makeResidualParams(id) {
         return '<span id="module-search-params_' + id + '"> <input class="minresid" id="minresid_' + id + '" style="width: 60px" type="text"> - <input style="width: 60px" type="text" class="maxresid" id="maxresid_' + id + '"></span>';
     }

     function makeStdParams(id) {
    return '<span id="module-search-params_' + id + '"> <input id="param_' + id + '" type="text"></span>';
     }

     function makeFilterRow(id) {
         return '<div id="filterrow_' + id + '">' +
             '<select id="module-search-attr_' + id + '" class="module-search-attr">' +
             '<option value="residual">Residual</option>' +
             '<option value="gene">Contains gene</option>' +
             '<option value="regulator">Regulated by</option>' +
             '<option value="function">Enriched for function</option>' +
             '</select>' + makeResidualParams(id) + '&nbsp;' +
             '<input type="button" id="addfilterrow" value="+">' +
             '</div><div id="append-filter-row"></div>';
     }

     function replaceRow(id, attrType) {
         if (attrType == 'residual') {
             $('#module-search-params_' + id).replaceWith(makeResidualParams(id));
         } else {
             $('#module-search-params_' + id).replaceWith(makeStdParams(id));
         }
     }
     advsearch.initFilters = function(formSelector, orgcodeSelector,
                                      resultsSelector) {
         $(formSelector).replaceWith(makeFilterRow(currentId++));
         $('.module-search-attr').change(function() {
           var comps = $(this).attr('id').split('_');
           var id = comps[comps.length - 1];
           replaceRow(id, $(this).val());
         });

         $('#addfilterrow').click(function() {
           console.debug('hallo');
           $('#append-filter-row').replaceWith(makeFilterRow(currentId++));
         });


         // Setup the search button event handler
         $('#search-modules').click(function() {
           var orgcode = $(orgcodeSelector).val();
           var attr = $('.module-search-attr').val();
           var reqData;
           console.debug('attr: ' + attr);
           if (attr == 'residual') {
               var minresid = $.trim($('.minresid').val());
               var maxresid = $.trim($('.maxresid').val());
               if (minresid && isNaN(minresid)) {
                   alert("please enter a valid number as min residual");
               }
               if (maxresid && isNaN(maxresid)) {
                   alert("please enter a valid number as max residual");
               }
               reqData = {
                   organism: orgcode,
                   minresid: minresid,
                   maxresid: maxresid
               };
           } else {
               reqData = {
                   organism: orgcode
               };
               reqData[attr] = $('#param').val();
           }
           console.debug(reqData);

           // search in modules
           $.ajax({
             url: "/searchmodules",
             data: reqData,
             crossDomain: true,
             error: function(xhr, status, errorThrown) {
                 console.debug("error here: " + errorThrown);
             },
             success: function(data) {
                 $(resultsSelector).replaceWith(data);
             }
           });
         });
     };
}());
