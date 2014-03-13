var http = require ('http'),
	fs = require ('fs'),
	qs = require('querystring'),
	api = require('./src/qqapi'),
	auth = require('./src/qqauth'),
	varifyCodeImgBin,
	loginAuth = '',
	conf = require('./config').conf,
	userLogins = conf.web.auth,
	codeCallback = function () {},
	bot = {};

function setCookie_ (res, name, value, exdays, domain, path) {
	var cookies = res.getHeader('Set-Cookie');
	if (typeof cookies !== 'object')
		cookies = [];
	
	var exdate = new Date();
	exdate.setDate(exdate.getDate() + exdays);
	var cookieText = name + '=' + value + ';expires=' + exdate.toUTCString() + ';';
	if (domain) {
		cookieText += 'domain=' + domain + ';';
	}
	if (path) {
		cookieText += 'path=' + path + ';';
	}
	cookies.push(cookieText);
	res.setHeader('Set-Cookie', cookies);
};


function parseCookies (request) {
	var list = {},
		rc = request.headers.cookie;

	rc && rc.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		list[parts.shift().trim()] = unescape(parts.join('='));
	});

	return list;
}


function handleUrl (req, res, $_POST) {
	// res.writeHead(200, {'Content-Type': 'text/plain'});
	var $_COOKIE = parseCookies(req),
		urlPart = req.url.replace(/\.\.\//g, '').match(/(\/[^?]*)\??(.*)/),
		url = urlPart[1],
		$_GET = {},
		urlExt = (url.match(/.+\.(.+)$/)||[,])[1],
		oldUrl = url;

	if (urlExt == 'tpl') return res.end ();

	urlPart[2].split('&').forEach (function (a) {
		$_GET [a.substr(0,a.indexOf('='))] = decodeURIComponent(a.substr(a.indexOf('=')+1));
	});
	
	function setCookie (name, value, exdays, domain, path) {
		setCookie_ (res, name, value, exdays, domain, path);
	}

	if (url == '/')
		url = '/index.html';
	
	if ($_COOKIE.auth && loginAuth && loginAuth == $_COOKIE.auth) {
		switch (urlExt) {
			case 'js': case 'css':
				// Cache for a year.
				res.setHeader('Cache-Control', 'max-age=31556926');
				break;
		}
		
		switch (url) {
			case '/code.img':
				res.setHeader('Content-Type', 'image/png');
				res.end (varifyCodeImgBin, 'binary');
				return;
			case '/submit':
				if ($_POST.code) {
					url = '/submit.html';
				}
				break;
		}
	} else {
		if (urlExt != 'js' && urlExt != 'css' && url.indexOf ('/auth/')) {
			url = '/auth/' + url;
		}
	}
	if (!fs.existsSync('./template' + url)) {
		if (!fs.existsSync('./template' + url + '.html')) {
			res.statusCode = 404;
			console.log ('[ERROR] File not found: ' + url);
			url = '/404.html';
		} else {
			url += '.html';
		}
	}
	console.log ('[INFO ] Request ' + url);
	function loadTemplate (url) {
		var fc = fs.readFileSync ('./template' + url).toString(),
			echo = function (a) {
				res.write (a.toString());
			}, $_G = {};
		res.write (fc.replace(/([\s\S]*?)<#([\s\S]+?)#>/g, function (a, html, tempCode) {
			html && echo (html);
			// console.log ('Execute code: ', tempCode);
			eval (tempCode);
			return '';
		}));
	}
	loadTemplate(url);
	res.end();
}

imgServer = http.createServer (function (req, res) {
	if (req.method == 'POST') {
		var postData = '';
		req.on('data', function(chunk) {
			postData += chunk.toString();
		});
		req.on('end', function() {
			handleUrl (req, res, qs.parse(postData));
		});
	} else {
		handleUrl (req, res, {});
	}
}).listen(conf['port']);

exports.setCodeCallback = function (cb) {
	codeCallback = cb
};

exports.updateVarifyCode = function (newCode) {
	varifyCodeImgBin = newCode || fs.readFileSync('./template/code.png');
};
exports.updateVarifyCode();

exports.initBot = function (newBot) {
	bot = newBot;
};