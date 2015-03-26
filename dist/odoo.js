'use strict';
angular.module('odoo', []);

'use strict';
angular.module('odoo')
   .provider('jsonRpc', function jsonRpcProvider() {

    this.odooRpc = {
        odoo_server: "",
        uniq_id_counter: 0,
        callBackDeadSession: function() {},
        callBackError: function() {},
        context: {'lang': 'fr_FR'},
        interceptors: []
    };

    this.$get = ["$http", "$cookies", "$rootScope", "$q", "$interval", function($http, $cookies, $rootScope, $q, $interval) {

        var odooRpc = this.odooRpc;

        odooRpc.sendRequest = function(url, params, callBackDeadSession) {
            var deferred = $q.defer();
            params.session_id = $cookies.session_id
            odooRpc.uniq_id_counter += 1;
            var json_data = {
                jsonrpc: '2.0',
                method: 'call',
                params: params,
            };
            var request = {
                'method' : 'POST',
                'url' : odooRpc.odoo_server + url,
                'data' : JSON.stringify(json_data),
                'headers': {
                    'Content-Type' : 'application/json'
                    },
                'id': ("r" + odooRpc.uniq_id_counter),
            };

            $http( request )
                .success( function( response ) {
                    if ( typeof response.error !== 'undefined' ) {
                        var error = response.error
                        if ( error.code === 300 && error.data
                                && error.data.type == "client_exception"
                                && error.data.debug.match("SessionExpiredException" ) ) {
                            delete $cookies.session_id;
                            deferred.reject('session_expired');
                            odooRpc.interceptors.forEach(function (i) { i('session_expired') });
                        } else {
                            var split = ("" + error.data.fault_code).split('\n')[0].split(' -- ');
                            if (split.length > 1) {
                                error.type = split.shift();
                                error.data.fault_code = error.data.fault_code.substr(error.type.length + 4);
                            }
                            var errorMessage = undefined;
                            var errorTitle = undefined;
                            if ( error.code === 200 && error.type ) {
                                errorTitle = error.type;
                                errorMessage = error.data.fault_code.replace(/\n/g, "<br />");
                            } else {
                                errorTitle = error.message;
                                errorMessage = error.data.debug.replace(/\n/g, "<br />");
                            };

                            deferred.reject({
                                'title': errorTitle,
                                'message': errorMessage,
                                'fullTrace': error
                            });

                        }
                    } else {
                        var result = response.result;
                        if ( result.type === "ir.actions.act_proxy" ) {
                            angular.forEach(result.action_list, function( action ) {
                                var request = {
                                    'method' : 'POST',
                                    'url' : odooRpc.odoo_server + action['url'],
                                    'data' : JSON.stringify(action['params']),
                                    'headers': {
                                        'Content-Type' : 'application/json'
                                        },
                                }
                                $http( request );
                            });
                        };
                        deferred.resolve(result);
                    }
            }).error(function (reason) {
                odooRpc.interceptors.forEach(function (i) { i(reason) });
                deferred.reject(reason);
            });
            return deferred.promise;
        };

        odooRpc.login = function(db, login, password) {
            var deferred = $q.defer();
            var params = {
                db : db,
                login : login,
                password : password
            };
            odooRpc.sendRequest('/web/session/authenticate', params)
                .then(
                    function( result ) {
                        if ( result.uid ) {
                            $cookies.session_id = result.session_id;
                            deferred.resolve(result);
                            console.log(result);
                            odooRpc.context=result.user_context;
                        } else {
                            delete $cookies.session_id;
                            deferred.reject(result);
                        };
                    },
                    function( result ) {
                        deferred.reject(result);
                    }
                );
            return deferred.promise;
        };
        odooRpc.isLoggedIn = function () {
            return $cookies.session_id && $cookies.session_id.length > 10;
        }

        odooRpc.logout = function () {
           delete $cookies.session_id;
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
            if ( ! kwargs ) {
                kwargs = {}
            }
            if ( kwargs.context ) {
                kwargs.context.extend(OdooRpc.context)
            } else {
                kwargs.context = odooRpc.context
            }
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
        
        odooRpc.syncDataImport = function(model, func_key, domain, limit, object) {
            return odooRpc.call(model, 'get_sync_data', [
                func_key, object.timekey, domain, limit
            ], {}).then(
                function(result) {
                    var res = result[0];
                    object.timekey = result[1];
                    var remove_ids = result[2];
                    if(!$.isEmptyObject(res)) {
                        angular.extend(object.data, res);
                        odooRpc.syncDataImport(model, func_key, domain, limit, object);
                    }
                    if(!$.isEmptyObject(remove_ids)) {
                        angular.forEach(remove_ids, function(id){
                            delete object.data[id]
                        });
                    }
            });
        };

        odooRpc.syncImportObject = function(params) {
            /* params = {
                    model: 'odoo.model',
                    func_key: 'my_function_key',
                    domain: [],
                    limit: 50,
                    interval: 5000,
                    }

             return a synchronized object where you can access
             to the data using object.data
             */
            var object = { data: {}, timekey: null };

            var sync = function() {
                odooRpc.syncDataImport(
                    params.model,
                    params.func_key,
                    params.domain,
                    params.limit,
                    object)
            }
            $interval(sync, params.interval);
            return object;
        }

        return odooRpc;
   }];
});
