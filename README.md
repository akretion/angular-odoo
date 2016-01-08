### angular-odoo

Call Odoo webservices from AngularJS


Why
===

Odoo is not HTTP friendly : every request shoud be POST, session_id should be added in the body, there some other stuff which should be added in each request...

This module gives you an abstraction and friendly methods in order to communicate with Odoo.


Requirements
===

* OpenERP 7 or Odoo 8
* Angular > 1.4


Install
===

Prefered method: 

		bower install angular-odoo

Alternative :

Download dist/odoo.js or dist/odoo.min.js

Include
===

Add the script to your page : 

```html
&gt;script src="path/to/angular-odoo/dist/odoo.js"&lt;&gt;/script&lt;
```

Add the module __odoo__ to your applicaiton:
```js
	angular.module('yourApplication', ['odoo']);
```

Use in your services
===

Add __jsonRpc__ as a dependency.

```js
angular.module('loginCtrl', ['$scope', 'jsonRpc', function($scope, jsonRpc) {
	
	jsonRpc.getDbList().then(function (result) {
		$scope.dbs = result;
	});

	$scope.login = function(creds) {
		jsonRpc.login(creds.db, creds.username, creds.password).then(function () {
			//login successfull redirect here
		}, function(reason) {
			//display error
		});
	};
}]);

```


High level functions : 

* login
* isLoggedIn
* logout
* searchRead
* getSessionInfo
* getServerInfo
* getDbList
* syncDataImport
* syncImportObject
* call


Please read src/components/odoo/jsonRPC-service.js for code and detailled documentation.


At [Akretion](http://akretion.com), we write Angular / Ionic applications and use this lib in all our devs when Odoo is the backend.


Tests
===

There is some tests in jsonRpc.spec.js
