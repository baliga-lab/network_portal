/* advsearch.js - Javascript module providing helpers for the advanced search */
var advsearch;
if (!advsearch) {
    advsearch = {};
}
(function () {
     "use strict";

     function makeResidualParams(id) {
         return '<span id="module-search-params_' + id + '"> <input class="minresid" style="width: 60px" type="text"> - <input style="width: 60px" type="text" class="maxresid"></span>';
     }

     function makeStdParams(id) {
    return '<span id="module-search-params_' + id + '"> <input id="param" type="text"></span>';
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
             '</div>';
     }

     function replaceRow(id, attrType) {
         if (attrType == 'residual') {
             $('#module-search-params_' + id).replaceWith(makeResidualParams(id));
         } else {
             $('#module-search-params_' + id).replaceWith(makeStdParams(id));
         }
     }
     advsearch.initFilters = function(selector) {
         $(selector).replaceWith(makeFilterRow(0));
         $('.module-search-attr').change(function() {
           var comps = $(this).attr('id').split('_');
           var id = comps[comps.length - 1];
           replaceRow(id, $(this).val());
         });
     };
}());
