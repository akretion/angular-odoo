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

    this.$get = function($http, $cookies, $rootScope, $q, $timeout) {

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

                        var error = response.error;
                        var errorObj = {
                            title: '',
                            message:'',
                            fullTrace: error
                        };

                        if ( error.code === 300 && error.data
                                && error.data.type == "client_exception"
                                && error.data.debug.match("SessionExpiredException" ) ) {
                            console.log('session exipre with ',$cookies.session_id);
                            delete $cookies.session_id;

                            errorObj.title ='session_expired'; 
                        } else {
                            var split = ("" + error.data.fault_code).split('\n')[0].split(' -- ');
                            if (split.length > 1) {
                                error.type = split.shift();
                                error.data.fault_code = error.data.fault_code.substr(error.type.length + 4);
                            }

                            if ( error.code === 200 && error.type ) {
                                errorObj.title = error.type;
                                errorObj.message = error.data.fault_code.replace(/\n/g, "<br />");
                            } else {
                                errorObj.title = error.message;
                                errorObj.message = error.data.debug.replace(/\n/g, "<br />");
                            };
                        }
                        deferred.reject(errorObj);
                        odooRpc.interceptors.forEach(function (i) { i(errorObj); });

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
                var errorObj = {title:'http', fullTrace: reason, message:'HTTP Error'};
                odooRpc.interceptors.forEach(function (i) { i(errorObj); });
                deferred.reject(errorObj);
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
                    if (object.timekey === result.timekey)
                        return;
                    object.timekey = result.timekey; 
                    if(!$.isEmptyObject(result.data)) {
                        angular.extend(object.data, result.data);
                    }
                    if(!$.isEmptyObject(object.remove_ids)) {
                        angular.forEach(object.remove_ids, function(id){
                            delete object.data[id]
                        });
                    }
                    if (result.data.length)
                    	odooRpc.syncDataImport(model, func_key, domain, limit, object);
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
            var stop = false;
            var watchers = [];
            var object = { 
                data: {}, 
                timekey: null, 
                stopCallback: function () {
                    stop = true;
                },
                watch: function(fun) {
                    watchers.push(fun);
                }
            };

            function sync() {

                odooRpc.syncDataImport(
                    params.model,
                    params.func_key,
                    params.domain,
                    params.limit,
                    object).then(function () { 
                        if (!stop)
                            $timeout(sync, params.interval);
                }).then(function(data) {
                    watchers.forEach(function (fun) {
                        fun(data);
                    });
                });
            }
            sync();

            return object;
        }

        return odooRpc;
   };
});

