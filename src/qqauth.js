var https = require("https"),
	http = require('http'),
	crypto = require('crypto'),
	front = require('../frontsrv'),
	querystring = require('querystring'),
	Url = require('url'),
	all_cookies = [],
	Path = require('path'),
	Log = require('log'),
	log = new Log('debug');

function md5 (str) {
	return crypto.createHash('md5').update(str.toString()).digest('hex');
};
function int (v, b) {
	return parseInt(v, b||10);
};

function hex2ascii (hexstr) {
	return hexstr.match(/\w{2}/g).map(function (byte_str) {
		return String.fromCharCode(parseInt(byte_str, 16));
	}).join('');
};
exports.cookies = function () {
	return all_cookies;
};

exports.check_qq = function (qq, callback) {
	var body = '',
		options = {
			host: 'ssl.ptlogin2.qq.com',
			path: ("/check?uin=" + qq + "&appid=1003903&js_ver=10062&js_type=0&r=") + Math.random(),
			headers: {
				'Cookie': "chkuin=" + qq
			}
		};

	https.get(options, function (resp) {
		all_cookies = resp.headers['set-cookie'];
		resp.on('data', function (chunk) {
			body += chunk;
		});
		resp.on('end', function () {
			var ret;
			ret = body.match(/\'(.*?)\'/g).map(function (i) {
				var last;
				last = i.length - 2;
				return i.substr(1, last);
			});
			callback (ret);
		});
	}).on("error", function (e) {
		log.error(e);
	});
};
exports.get_verify_code = function (qq, host, port, callback) {
	var url = "http://captcha.qq.com/getimage?aid=1003903&r=" + Math.random() + "&uin=" + qq,
		body = '';
	http.get(url, function (resp) {
		all_cookies = all_cookies.concat(resp.headers['set-cookie']);
		resp.setEncoding('binary');
		resp.on('data', function (chunk) {
			body += chunk;
		});
		resp.on('end', function () {
			front.updateVarifyCode(body);
			callback();
		});
	}).on("error", function (e) {
		log.error(e);
		callback(e);
	});
};
exports.finish_verify_code = function () {};
exports.encode_password = function (password, token, bits) {
	password = md5(password);
	bits = bits.replace(/\\x/g, '');
	return md5(md5(hex2ascii(password) + hex2ascii(bits)).toUpperCase() + token.toUpperCase()).toUpperCase();
};
exports.login_step1 = function (qq, encode_password, verifycode, callback) {
	var body, options, path;
	path = "/login?u=" + qq + "&p=" + encode_password + "&verifycode=" + verifycode + "&webqq_type=10&remember_uin=1&login2qq=1&aid=1003903&u1=http%3A%2F%2Fweb2.qq.com%2Floginproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&h=1&ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&action=3-15-72115&mibao_css=m_webqq&t=1&g=1&js_type=0&js_ver=10062&login_sig=qBpuWCs9dlR9awKKmzdRhV8TZ8MfupdXF6zyHmnGUaEzun0bobwOhMh6m7FQjvWA";
	options = {
		host: 'ssl.ptlogin2.qq.com',
		path: path,
		headers: {
			'Cookie': all_cookies
		}
	};
	body = '';
	https.get(options, function (resp) {
		all_cookies = all_cookies.concat(resp.headers['set-cookie']);
		resp.on('data', function (chunk) {
			body += chunk;
		});
		resp.on('end', function () {
			var ret;
			ret = body.match(/\'(.*?)\'/g).map(function (i) {
				var last;
				last = i.length - 2;
				return i.substr(1, last);
			});
			callback(ret);
		});
	}).on("error", function (e) {
		log.error(e);
	});
};
exports.login_step2 = function (url, callback) {
	var body, options;
	url = Url.parse(url);
	options = {
		host: url.host,
		path: url.path,
		headers: {
			'Cookie': all_cookies
		}
	};
	body = '';
	http.get(options, function (resp) {
		log.debug("Login Response: " + resp.statusCode);
		all_cookies = all_cookies.concat(resp.headers['set-cookie']);
		callback(true);
	}).on("error", function (e) {
		log.error(e);
	});
};
exports.login_token = function (callback) {
	var body = '',
		client_id = 97500000 + int (Math.random() * 99999),
		ptwebqq = all_cookies.filter(function (item) {
				return /ptwebqq/.test(item);
			}).pop().replace(/ptwebqq\=(.*?);.*/, '$1'),
		data = querystring.stringify({
			clientid: client_id,
			psessionid: 'null',
			r: JSON.stringify({
				status: "online",
				ptwebqq: ptwebqq,
				passwd_sig: "",
				clientid: client_id,
				psessionid: null
			})
		}), options = {
			host: 'd.web2.qq.com',
			path: '/channel/login2',
			method: 'POST',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36',
				'Referer': 'http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3',
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Content-Length': Buffer.byteLength(data),
				'Cookie': all_cookies
			}
		},
		req = http.request(options, function (resp) {
			log.debug("Login Token response: " + resp.statusCode);
			resp.on('data', function (chunk) {
				body += chunk;
			});
			resp.on('end', function () {
				callback(JSON.parse(body), client_id, ptwebqq);
			});
		});
	req.write(data);
	req.end();
};

/*
    全局登录函数，如果有验证码会建立一个 http-server ，同时写入 tmp/*.jpg (osx + open. 操作)
    http-server 的端口和显示地址可配置
    @param options {account,password,port,host}
    @callback( cookies , auth_options ) if login success
 */
exports.login = function (opt, callback) {
	var auth = exports,
		qq = opt.account;

	log.info('[LOGIN] Checking verify code status...');
	auth.check_qq(qq, function (result) {
		console.log (result);
		var need_verify = result[0],
			verify_code = result[1],
			bits = result[2];

		if (int(need_verify)) {
			log.info("[LOGIN] Need varify code :/");
			auth.get_verify_code(qq, opt.host, opt.port, function (error) {
				if (process.platform === 'darwin')
					require('child_process').exec('open tmp');
				log.notice("Please login and type the code: http://" + (opt.host || '127.0.0.1') + ":" + opt.port);
				front.setCodeCallback(function (verify_code) {
					log.notice('Code checking：', verify_code);
					login_next(qq, auth.encode_password(opt.password, verify_code, bits), verify_code, callback);
				});
			});
		} else {
			log.info("[LOGIN] No code needed.");
			login_next(qq, auth.encode_password(opt.password, verify_code, bits), verify_code, callback);
		}
	});
};

function login_next (account, pass_encrypted, verify_code, callback) {
	var auth = exports;
	log.info("[LOGIN] Checking password");
	auth.login_step1(account, pass_encrypted, verify_code, function (ret) {
		if (!/^http/.test(ret[2])) {
			log.error("[LOGIN] Password error..?", ret);
			process.exit(2);
			return;
		}
		log.info("[LOGIN] Fetch cookie...");
		auth.login_step2(ret[2], function (ret) {
			log.info("[LOGIN] Fetch token...");
			auth.login_token(function (ret, client_id, ptwebqq) {
				if (ret.retcode === 0) {
					log.info('[LOGIN] success: ', account);
					front.initBot();
					callback(all_cookies, {
						psessionid: ret.result.psessionid,
						clientid: client_id,
						ptwebqq: ptwebqq,
						uin: ret.result.uin,
						vfwebqq: ret.result.vfwebqq
					});
				} else {
					log.info("[LOGIN] Login failed :/");
					log.error(ret);
					process.exit(3);
				}
			});
		});
	});
};

