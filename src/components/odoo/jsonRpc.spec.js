describe("jsonRpc tests", function() {

	var $httpBackend;
	var jsonRpc;

	beforeEach(module('odoo'));

	beforeEach(inject(function(_jsonRpc_) {
		jsonRpc = _jsonRpc_;
	}));

	beforeEach(inject(function(_$httpBackend_) {
		$httpBackend = _$httpBackend_
	}));

	afterEach(function() {
		$httpBackend.verifyNoOutstandingExpectation();
		$httpBackend.verifyNoOutstandingRequest();
	});
	function fail(a) {
		expect(true).toBe(false);
	}
	function success() {
		expect(true).toBe(true);
	}

	function set_version_info7() {
		$httpBackend.whenPOST('/web/webclient/version_info').respond({
			jsonrpc:"2.0",
			id: null,
			result: {"server_serie": "7.0", "server_version_info": [7, 0, 0, "final", 0], "server_version": "7.0", "protocol_version": 1}
		});
	}
	function set_version_info8() {
		$httpBackend.whenPOST('/web/webclient/version_info').respond({
				jsonrpc:"2.0",
				id: null,
				result: {"server_serie": "8.0", "server_version_info": [8, 0, 0, "final", 0], "server_version": "8.0", "protocol_version": 1}
		});
	}

	describe("session expiration", function () {
		function success(reason) {
			expect(reason.title).toEqual("session_expired");
		}
		it("session expired v7", function () {
			set_version_info7();

			$httpBackend.whenPOST('/web/session/get_session_info').respond ({
				jsonrpc:"2.0",
				id: null,
				error: {
					message: "OpenERP WebClient Error",
					code: 300,
					data : {
						debug: "Client Traceback (most recent call last):  File \"/workspace/parts/odoo/addons/web/http.py\", line 204, in dispatch    response[\"result\"] = method(self, **self.params)  File \"/workspace/parts/odoo/addons/web/controllers/main.py\", line 1133, in call_kw    return self._call_kw(req, model, method, args, kwargs)  File \"/workspace/parts/odoo/addons/web/controllers/main.py\", line 1125, in _call_kw    return getattr(req.session.model(model), method)(*args, **kwargs)  File \"/workspace/parts/odoo/addons/web/session.py\", line 158, in model    raise SessionExpiredException(\"Session expired\")SessionExpiredException: Session expired",
						type: "client_exception"
					}
				}
			});
			jsonRpc.sendRequest('/web/session/get_session_info', {}).then(fail, success);;
			$httpBackend.flush();
		});

		it("session expired v8", function () {
			set_version_info8();

			$httpBackend.whenPOST('/web/session/get_session_info').respond({
				jsonrpc:"2.0",
				id: null,
				error: {
					message: "Odoo Session Expired",
					code: 100
				},
				data: {
					debug: "Traceback (most recent call last):  File \"/workspace/parts/odoo/openerp/http.py\", line 530, in _handle_exception    return super(JsonRequest, self)._handle_exception(exception)  File \"/workspace/parts/odoo/openerp/addons/base/ir/ir_http.py\", line 160, in _dispatch    auth_method = self._authenticate(func.routing[\"auth\"])  File \"/workspace/parts/odoo/openerp/addons/base/ir/ir_http.py\", line 93, in _authenticate    getattr(self, \"_auth_method_%s\" % auth_method)()  File \"/workspace/parts/odoo/openerp/addons/base/ir/ir_http.py\", line 70, in _auth_method_user    raise http.SessionExpiredException(\"Session expired\")SessionExpiredException: Session expired",
					message: "Session expired",
					name:"openerp.http.SessionExpiredException",
					arguments: ["Session expired"]
				}
			});
			jsonRpc.sendRequest('/web/session/get_session_info', {}).then(fail, success);;
			$httpBackend.flush();
		});
	});

	describe("login fail (wrong credentials)", function () {
		function success(reason) {
			expect(reason.title).toEqual("wrong_login");
		}
		it("should reject wrong login v7", function () {
			set_version_info7();

			$httpBackend.whenPOST('/web/session/authenticate').respond({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: {}, uid: false, db: "db", company_id: null, session_id: "7a97f880c0374c02507b09e478cffb5be4df2ef8" }
			});
			jsonRpc.login().then(fail, success);
			$httpBackend.flush();
		});

		it("wrong login v8", function () {
			set_version_info8();
			$httpBackend.whenPOST('/web/session/authenticate').respond ({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: {}, uid: false, db: "db", company_id: null, session_id: "5699c4cd07f37e9fa8eaf5b63af8545020f25278" }
			});
			jsonRpc.login().then(fail, success);;
			$httpBackend.flush();
		});
	});

	describe("server issue on login", function () {
		function success(reason) {
			expect(reason.message).toEqual("HTTP Error");
		}
		it("should handle 404", function () {
			set_version_info7();
			$httpBackend.whenPOST('/web/session/authenticate').respond(404, "Not found");
			jsonRpc.login().then(fail, success);
			$httpBackend.flush();
		});
		it("should handle odoo 404", function () {
			set_version_info8();
			$httpBackend.whenPOST('/web/session/authenticate').respond({
				jsonrpc: "2.0",
				id: null,
				error: {message: "Odoo Server Error", code: 200, data: {debug: "Traceback (most recent call last):\n  File \"/workspace/parts/odoo/openerp/http.py\", line 530, in _handle_exception\n    return super(JsonRequest, self)._handle_exception(exception)\n  File \"/workspace/parts/odoo/openerp/addons/base/ir/ir_http.py\", line 153, in _dispatch\n    rule, arguments = self._find_handler(return_rule=True)\n  File \"/workspace/parts/odoo/openerp/addons/base/ir/ir_http.py\", line 65, in _find_handler\n    return self.routing_map().bind_to_environ(request.httprequest.environ).match(return_rule=return_rule)\n  File \"/home/ubuntu/.voodoo/shared/eggs/Werkzeug-0.10.4-py2.7.egg/werkzeug/routing.py\", line 1483, in match\n    raise NotFound()\nNotFound: 404: Not Found\n", message: "", name: "werkzeug.exceptions.NotFound", arguments: []}}});
			jsonRpc.login().then(fail, success);
			$httpBackend.flush();
		});
		it("should handle 500", function () {
			set_version_info7();
			$httpBackend.whenPOST('/web/session/authenticate').respond(500, "Server error");
			jsonRpc.login().then(fail, success);
			$httpBackend.flush();
		});
	});


	describe("wrong db on login", function () {
		function success(reason) {
			console.log('message', reason);
			expect(reason.title).toEqual("database_not_found");
		}/*
		it("should work with v7", function () {
			to be written
		});*/
		it("should work with v8", function () {
			set_version_info8();
			$httpBackend.whenPOST('/web/session/authenticate').respond({
				jsonrpc: "2.0",
				id: null,
				error: {message: "Odoo Server Error", code: 200, data: {debug: "\"Traceback (most recent call last):  File \"/workspace/parts/odoo/openerp/http.py\", line 537, in _handle_exception    return super(JsonRequest, self)._handle_exception(exception)  File \"/workspace/parts/odoo/openerp/http.py\", line 574, in dispatch    result = self._call_function(**self.params)  File \"/workspace/parts/odoo/openerp/http.py\", line 310, in _call_function    return checked_call(self.db, *args, **kwargs)  File \"/workspace/parts/odoo/openerp/service/model.py\", line 113, in wrapper    return f(dbname, *args, **kwargs)  File \"/workspace/parts/odoo/openerp/http.py\", line 307, in checked_call    return self.endpoint(*a, **kw)  File \"/workspace/parts/odoo/openerp/http.py\", line 803, in __call__    return self.method(*args, **kw)  File \"/workspace/parts/odoo/openerp/http.py\", line 403, in response_wrap    response = f(*args, **kw)  File \"/workspace/parts/odoo/addons/web/controllers/main.py\", line 796, in authenticate    request.session.authenticate(db, login, password)  File \"/workspace/parts/odoo/openerp/http.py\", line 956, in authenticate    uid = dispatch_rpc('common', 'authenticate', [db, login, password, env])  File \"/workspace/parts/odoo/openerp/http.py\", line 115, in dispatch_rpc    result = dispatch(method, params)  File \"/workspace/parts/odoo/openerp/service/common.py\", line 26, in dispatch    return fn(*params)  File \"/workspace/parts/odoo/openerp/service/common.py\", line 37, in exp_authenticate    res_users = openerp.registry(db)['res.users']  File \"/workspace/parts/odoo/openerp/__init__.py\", line 68, in registry    return modules.registry.RegistryManager.get(database_name)  File \"/workspace/parts/odoo/openerp/modules/registry.py\", line 339, in get    update_module)  File \"/workspace/parts/odoo/openerp/modules/registry.py\", line 356, in new    registry = Registry(db_name)  File \"/workspace/parts/odoo/openerp/modules/registry.py\", line 81, in __init__    cr = self.cursor()  File \"/workspace/parts/odoo/openerp/modules/registry.py\", line 272, in cursor    return self._db.cursor()  File \"/workspace/parts/odoo/openerp/sql_db.py\", line 575, in cursor    return Cursor(self.__pool, self.dbname, self.dsn, serialized=serialized)  File \"/workspace/parts/odoo/openerp/sql_db.py\", line 181, in __init__    self._cnx = pool.borrow(dsn)  File \"/workspace/parts/odoo/openerp/sql_db.py\", line 464, in _locked    return fun(self, *args, **kwargs)  File \"/workspace/parts/odoo/openerp/sql_db.py\", line 526, in borrow    result = psycopg2.connect(dsn=dsn, connection_factory=PsycoConnection)  File \"shared/eggs/psycopg2-2.6.1-py2.7-linux-x86_64.egg/psycopg2/__init__.py\", line 164, in connect    conn = _connect(dsn, connection_factory=connection_factory, async=async)OperationalError: FATAL:  database \"db\" does not exist", message: "FATAL:  database \"db\" does not exist", name: "psycopg2.OperationalError", arguments: ["FATAL:  database \"db\" does not exist"]}}});
			jsonRpc.login().then(fail, success);
			$httpBackend.flush();
		});
	});


	describe("login succeed", function () {
		function success(result) {
			expect(result.uid).toEqual(1);
			expect(result.username).toEqual('admin');
		}
		it("should login with v7", function () {
			set_version_info7();
			$httpBackend.whenPOST('/web/session/authenticate').respond({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: { lang:"en_US", tz:"Europe/Brussels", uid:1}, uid: 1, db: "db", company_id: null, session_id: "5699c4cd07f37e9fa8eaf5b63af8545020f25278" }
			}, {
				'Set-Cookie': 'sid=e3a14bd882a848187e0611bbc51712a25db0fec7; Path=/'
			});
			jsonRpc.login().then(success, fail);;
			$httpBackend.flush();
		});

		it("should login with v8", function () {
			set_version_info8();
			$httpBackend.whenPOST('/web/session/authenticate').respond({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: { lang:"en_US", tz:"Europe/Brussels", uid:1}, uid: 1, db: "db", session_id: "5699c4cd07f37e9fa8eaf5b63af8545020f25278" }
			},{
				'Set-Cookie': 'session_id=7a97f880c0374c02507b09e478cffb5be4df2ef8; Expires=Thu, 23-Jul-2015 10:36:21 GMT; Max-Age=7776000; Path=/'
			});
			jsonRpc.login().then(success, fail);
			$httpBackend.flush();
		});
	});

	describe("v7/v8 specific", function () {
		var session_idToken = null;
		function success(result) {
			expect(result.uid).toEqual(1);
		}

		beforeEach(function () {
			session_idToken = "sendMePlease"+ Math.random();

			$httpBackend.whenPOST('/web/session/authenticate').respond({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: { lang:"en_US", tz:"Europe/Brussels", uid:1}, uid: 1, db: "db", company_id: null, session_id: session_idToken }
			});
		});

		it("should take care of putting session_id in request.body — v7", function () {
			set_version_info7();

			$httpBackend.whenPOST('/web/session/get_session_info',
				'{"jsonrpc":"2.0","method":"call","params":{"session_id":"'+ session_idToken +'"}}'
			).respond({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: { lang:"en_US", tz:"Europe/Brussels", uid:1}, uid: 1, db: "db", company_id: null, session_id: session_idToken }
			});
			jsonRpc.login().then(function (a) {
				jsonRpc.sendRequest('/web/session/get_session_info', {}).then(success, fail);
			});

			$httpBackend.flush();
		});


		it("should take care of NOT putting session_id in request.body - v8", function () {
			set_version_info8();

			$httpBackend.whenPOST('/web/session/get_session_info',
				'{"jsonrpc":"2.0","method":"call","params":{}}' //session is_shouldn't be retransmitted
			).respond({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: { lang:"en_US", tz:"Europe/Brussels", uid:1}, uid: 1, db: "db", session_id: session_idToken }
			});

			jsonRpc.login().then(function () {
				jsonRpc.sendRequest('/web/session/get_session_info', {}).then(success, fail);
			});
			$httpBackend.flush();
		});
	});

	describe("isLoggedIn ? ", function () {
		it("isLoggedIn with v7", function () {
			return success();
			//continue here
			set_version_info7();
			$httpBackend.whenPOST('/web/session/authenticate').respond({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: { lang:"en_US", tz:"Europe/Brussels", uid:1}, uid: 1, db: "db", company_id: null, session_id: "5699c4cd07f37e9fa8eaf5b63af8545020f25278" }
			}, {
				'Set-Cookie': 'sid=e3a14bd882a848187e0611bbc51712a25db0fec7; Path=/'
			});

			$httpBackend.whenPOST('/web/session/get_session_info',
				'{"jsonrpc":"2.0","method":"call","params":{"session_id":"'+ session_idToken +'"}}'
			).respond({
				jsonrpc:"2.0",
				id: null,
				result: { username: "admin", user_context: { lang:"en_US", tz:"Europe/Brussels", uid:1}, uid: 1, db: "db", company_id: null, session_id: session_idToken }
			});

			jsonRpc.isLoggedIn().then(function (r) {
				expect(r).toBe(false); //ensure not connected
			}, fail)
			.then(function () {
				return jsonRpc.login('db','admin','password');
			}) //login
			.then(jsonRpc.isLoggedIn).then(function (r) {
				expect(r).toBe(true); //ensure connected
			}, fail);

			$httpBackend.flush();
		});
	});
});