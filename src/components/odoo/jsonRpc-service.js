'use strict';
angular.module('odoo')
   .provider('jsonRpc', function() {

    this.odooRpc = {
        uniq_id_counter: 0,
        callBackDeadSession: function() {},
        callBackError: function() {},
    };

    this.$get = function($http, $cookies, $rootScope, $q) {

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
                'url' : url,
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
                            $cookies.session_id = "";
                            deferred.reject('session_expired');
                        } else {
                            var split = ("" + error.data.fault_code).split('\n')[0].split(' -- ');
                            if (split.length > 1) {
                                error.type = split.shift();
                                error.data.fault_code = error.data.fault_code.substr(error.type.length + 4);
                            }

                            if ( error.code === 200 && error.type ) {
                                $rootScope.modal({
                                    title: error.type,
                                    show: true,
                                    content: error.data.fault_code.replace(/\n/g, "<br />"),
                                    html: true,
                                });
                            } else {
                                $rootScope.modal({
                                    title: error.message,
                                    content: error.data.debug.replace(/\n/g, "<br />"),
                                    show: true,
                                    html: true,
                                });
                            };
                            deferred.reject(error);
                        }
                    } else {
                        var result = response.result;
                        if ( result.type === "ir.actions.act_proxy" ) {
                            angular.forEach(result.action_list, function( action ) {
                                var request = {
                                    'method' : 'POST',
                                    'url' : action['url'],
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
            })
            return deferred.promise;
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
   };
});
