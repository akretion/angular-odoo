'use strict';
angular.module('odoo', []);

'use strict';
angular.module('odoo')
   .provider('jsonRpc', function() {
    this.odooRpc = {
        session_id : ""
    };

    this.$get = ["$http", function($http) {
        var odooRpc = this.odooRpc;

        odooRpc.sendRequest = function(url, params) {
            var json_data = {
                jsonrpc: '2.0',
                method: 'call',
                params: params,
            };
            var request = {
                'method' : 'POST',
                'url' : url,
                'data' : JSON.stringify(json_data),
                'headers': {
                    'Content-Type' : 'application/json'
                    },
            };
            return $http(request)
                .success(function(response) {
                      return response.result;
            })
        };

        odooRpc.login = function(db, login, password) {
            var params = {
                db : db,
                login : login,
                password : password
            };
            return odooRpc.sendRequest('/web/session/authenticate', params);
        };

        odooRpc.searchRead = function(model, domain, fields) {
            var params = {
                model: model,
                domain: domain,
                fields: fields,
            }
            return odooRpc.sendRequest('/web/dataset/search_read', params);
        }

        odooRpc.call = function(model, method, args, kwargs) {
            var params = {
                model: model,
                method: method,
                args: args,
                kwargs: kwargs,
            };
            return odooRpc.sendRequest('/web/dataset/call_kw', params);
        }

       return odooRpc;
   }];
});

angular.module("odoo").run(["$templateCache", function($templateCache) {$templateCache.put("app/main/main.html","<div class=\"container\"><input type=\"text\" ng-model=\"login\"> <input type=\"text\" ng-model=\"password\"> <button ng-click=\"loginFn()\">Login</button> <input type=\"text\" ng-model=\"db\"></div>");}]);