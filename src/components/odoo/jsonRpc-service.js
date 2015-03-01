'use strict';
angular.module('odoo')
   .provider('jsonRpc', function() {

    this.odooRpc = {
        uniq_id_counter: 0,
        callBackDeadSession: function() {},
        callBackError: function() {},
    };

    this.$get = function($http, $rootScope) {
        var odooRpc = this.odooRpc;

        console.log($rootScope);
        odooRpc.sendRequest = function(url, params, callBackDeadSession) {
            var deferred = $.Deferred();
            params.session_id = $rootScope.session_id
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
                            console.log("ERRROOOOOR");
                            console.log(response.error);
                            if ( error.data ) {
                                if ( error.data.type == "client_exception"
                                        && error.data.debug.match("SessionExpiredException" ) ) {
                                console.log('session dead');
                                odooRpc.clearCookieSession();
                                } else {
                                    callBackError( error )
                                }
                            }
                            deferred.reject(response.result);
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
                .then(
                    function( result ) {
                        $rootScope.session_id = result.session_id;
                        return true
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

        odooRpc.getSessionFromCookie = function() {
            //initialisation of the session_id if exist
            var name = "sid=";
            var ca = document.cookie.split(';');
            for(var i=0; i<ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1);
                if (c.indexOf(name) == 0) {
                    $rootScope.session_id = c.substring(name.length,c.length);
                    console.log('CHECKK SSESSSION')
                    console.log( $rootScope.session_id );
                    if ( $rootScope.session_id ) {
                        odooRpc.searchRead( 'res.user', [], ['login'] )
                    }
                }
            }
        }

        odooRpc.clearCookieSession = function () {
            console.log('CALL CLEAR COOKIES');
            function delete_cookie( name ) {
              document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            }
            delete_cookie("sid")
            $rootScope.session_id = "";
        }
        return odooRpc;
   };
});
