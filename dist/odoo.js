'use strict';
angular.module('odoo', []);

'use strict';
angular.module('odoo')
   .provider('jsonRpc', function() {

    this.odooRpc = {
        uniq_id_counter: 0,
        callBackDeadSession: function() {},
        callBackError: function() {},
    };

    this.$get = ["$http", "$cookies", function($http, $cookies) {

        var odooRpc = this.odooRpc;

        odooRpc.sendRequest = function(url, params, callBackDeadSession) {
            var deferred = $.Deferred();
            params.session_id = $cookies.session_id
            odooRpc.uniq_id_counter += 1;
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
                'id': ("r" + odooRpc.uniq_id_counter),
            };

            $http( request )
                .success( function( response ) {
                    console.log('SUCCESS');
                    console.log(response);
                    if ( typeof response.error !== 'undefined' ) {
                        var error = response.error
                        if ( error.code === 300 ) {
                            if ( error.data ) {
                                if ( error.data.type == "client_exception"
                                        && error.data.debug.match("SessionExpiredException" ) ) {
                                $cookies.session_id = "";
                                deferred.reject('session_expired');
                                } else {
                                    callBackError( error );
                                    deferred.reject(response.result);
                                }
                            }
                        }
                    } else {
                        deferred.resolve(response.result);
                    }
            })
            return deferred.promise();
        };

        odooRpc.login = function(db, login, password) {
            var params = {
                db : db,
                login : login,
                password : password
            };
            return odooRpc.sendRequest('/web/session/authenticate', params)
                .done(
                    function( result ) {
                        $cookies.session_id = result.session_id;
                })
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

        odooRpc.get_session_info = function(model, method, args, kwargs) {
            return odooRpc.sendRequest('/web/session/get_session_info', {});
        }

        return odooRpc;
   }];
});

angular.module("odoo").run(["$templateCache", function($templateCache) {$templateCache.put("app/main/main.html","<div class=\"container\"><input type=\"text\" ng-model=\"login\"> <input type=\"text\" ng-model=\"password\"> <button ng-click=\"loginFn()\">Login</button> <input type=\"text\" ng-model=\"db\"></div>");}]);