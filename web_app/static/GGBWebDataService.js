app.service('GGBWebDataService', function($rootScope) {
  var productList = [];

  var broadcast = function(state) {
      $rootScope.$broadcast('state.update', state);
  }

  var addProduct = function(newObj) {
      productList.push(newObj);
      broadcast("new state");
  }

  var getProducts = function(){
      return productList;
  }

  var broadcast = function(state) {
    $rootScope.$broadcast('state.update', state);
  }

  return {
    addProduct: addProduct,
    getProducts: getProducts
  };

});