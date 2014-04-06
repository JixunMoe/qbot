var https = require("https"),
	http = require('http'),
	querystring = require('querystring'),
	URL = require('url'),
	globalCookie = [];

function set_cookies (cookie) {
	if (cookie) globalCookie = cookie;
	return globalCookie;
}

function http_request (options, postData, callback) {
	var aurl = URL.parse(options.url), data,
		client = (aurl.protocol === 'https:') ? https : http,
		body = '';
	
	options.hostname = aurl.host;
	options.path = aurl.path;
	options.headers = options.headers || {};

	if (postData && options.method === 'POST') {
		data = querystring.stringify(postData);
		options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
		options.headers['Content-Length'] = Buffer.byteLength(data);
	}
	options.headers['Cookie'] = globalCookie;
	options.headers['Referer'] = 'http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3';
	// http://cgi.web2.qq.com/proxy.html?v=20110412001&callback=1&id=

	var lastRespond = 0,
		respFinished = false,
		intervalCheck,

	req = client.request(options, function (resp) {
		resp.on('data', function (chunk) {
			lastRespond = new Date;
			body += chunk;
		});
		resp.on('end', function () {
			respFinished = true;
			handle_resp_body(body, callback);
		});
	});

	req.on('error', function(e) {
		respFinished = true;
		console.log('请求出错: ' + e.message);
	});

	intervalCheck = setInterval (function () {
		if (respFinished)
			return clearInterval(intervalCheck);

		if (new Date - lastRespond >= 120000){
			callback(null, 'No response');
			clearInterval(intervalCheck);
		}
	}, 120000); // 2 * 60 * 1000

	if (postData && options.method === 'POST') {
		req.write(data);
	}
	req.end();
}

function handle_resp_body (body, callback) {
	try {
		var q = (JSON.parse(body.replace(/(^\s*|\s*$)/g, '')));
	} catch (_error) {
		console.log('网络数据解析错误:', body);
		err = _error;
		return callback(null, _error);
	}
	callback (q);
}

function http_get (options, callback) {
	console.log ('GET :', options.url);
	options.method = 'GET';
	http_request(options, null, callback);
}

function http_post (options, body, callback) {
	console.log ('POST:', options.url);
	options.method = 'POST';
	http_request(options, body, callback);
}

module.exports = {
	global_cookies: set_cookies,
	request: http_request,
	get: http_get,
	post: http_post
};