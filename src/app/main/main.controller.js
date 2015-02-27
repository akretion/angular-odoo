'use strict';

angular.module('odoo')
  .controller('MainCtrl', function ($scope, jsonRpc) {
       $scope.loginFn = function () {
          jsonRpc.login($scope.db,$scope.login,$scope.password)
            .success(function(data) {
                console.log(data);
            });
       };
  });
