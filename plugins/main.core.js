var VERSION_INFO, addMoney, addUser, bodyPos, burnEqup, cleanArray, commandList, conf, db, dbConf, defConf, doEscape, doGalAcgReadCache, doHttpGet, doHttpGetAdv, doParseGalacg, doRobMoney, doServerReload, doSignin, filterNum, galAcgCache, getSign, getUserInfo, helpList, helpTotal, http, https, mathjs, nullFunc, osuCountryCode, osuReqModes, osuRooms, padRight, padZero, parseJSON, regCommand, rmSign, splitNum, sprintf, start_at, trimText, url2Opt, util;

db = null;

dbConf = {};

defConf = {};

http = require('http');

https = require('https');

util = require('util');

mathjs = require('mathjs');

sprintf = util.format;

start_at = 0;

conf = require('../config');

if (!conf.conf.ban) {
	conf.conf.ban = [];
}

osuRooms = [];

nullFunc = function () {};

doServerReload = nullFunc;

doEscape = function (strIn) {
	var ret;
	ret = db.escape(strIn);
	if (typeof strIn === 'string') {
		return ret.slice(1, -1);
	}
	return ret;
};

trimText = function (inputText) {
	return inputText.toString().replace(/(^\s*|\s*$)/g, '');
};

addUser = function (uid, cb) {
	if (cb == null) {
		cb = nullFunc;
	}
	return db.query(sprintf('insert ignore into `qbot` (`qNum`, `dMoneyLeft`) values (%s, %s)', doEscape(uid), doEscape(defConf.money)), cb);
};

addMoney = function (uid, money, cb) {
	if (cb == null) {
		cb = nullFunc;
	}
	return db.query(sprintf('update `qbot` set `dMoneyLeft` = `dMoneyLeft` +%s where `qNum` like "%s"', doEscape(money), doEscape(uid)), cb);
};

getUserInfo = function (uid, cb) {
	if (cb == null) {
		cb = nullFunc;
	}
	return db.query(sprintf('select * from `qbot` where `qNum`="%s" limit 1', doEscape(uid)), cb);
};

doRobMoney = function (uid, target, forceOther, cb) {
	var moneyRobbed;
	if (cb == null) {
		cb = nullFunc;
	}
	moneyRobbed = (Math.random() * 50 - (forceOther ? 60 : 30)).toFixed(2);
	uid = trimText(uid);
	target = trimText(target);
	if (uid === target) {
		return;
	}
	db.query(sprintf('update `qbot` set dMoneyLeft = dMoneyLeft -%s where `qnum` like "%s"; update `qbot` set dMoneyLeft = dMoneyLeft +%s where `qnum` like "%s";', moneyRobbed, doEscape(target), moneyRobbed, doEscape(uid)));
	return cb(moneyRobbed);
};

doSignin = function (uid, cb) {
	if (cb == null) {
		cb = nullFunc;
	}
	return db.query(sprintf('select tLastSign, qNum into @lastSign, @qNum FROM `qbot` where `qNum` like \'%s\' limit 1; update `qbot` set `tLastSign` = NOW() where `qnum` like @qNum; select @lastSign;', doEscape(uid)), cb);
};

padZero = function (str) {
	var ret;
	ret = str.toString();
	if (ret.length === 1) {
		ret = '0' + ret;
	}
	return ret;
};

url2Opt = function (url, tryAgain) {
	var cont, tmpPort, useHttps;
	cont = url.match(/http(s?):\/\/(.+?)(:?\d*)(\/.*)/i);
	if (!cont) {
		if (tryAgain) {
			return url2Opt(url, true);
		}
		return {};
	}
	tmpPort = 80;
	useHttps = false;
	if (useHttps = cont[1].toLowerCase() === 's') {
		tmpPort = 443;
	}
	if (parseInt(cont[3])) {
		tmpPort = parseInt(cont[3]);
	}
	return {
		host: cont[2],
		port: tmpPort,
		path: cont[4],
		https: useHttps
	};
};

doHttpGet = function (url, callback) {
	console.log('doHttpGet: %s', url);
	return (/^https:/i.test(url) ? https : http).get(url, function (http_res) {
		var data;
		data = "";
		http_res.on("data", function (chunk) {
			return data += chunk;
		});
		return http_res.on("end", function () {
			return callback(data);
		});
	}).on('error', function (e) {
		return console.log("HTTP(s) ERROR: " + e.message);
	});
};

function doHttpGetAdv (options, postData, callback) {
	console.log ('[doHttpGetAdv]: ' + options.url);
	var aurl = require('url').parse(options.url), data,
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
	// options.headers['Cookie'] = globalCookie;
	// options.headers['Referer'] = 'http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3';

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
			try {
				callback (body);
			} catch (e) {
				console.log ('[doHttpGetAdv] 回调报错: ' + body);
				console.log (e);
			}
		});
	});

	intervalCheck = setInterval (function () {
		if (respFinished)
			return clearInterval(intervalCheck);

		if (new Date - lastRespond >= 120000){
			// callback(null, 'No response');
			clearInterval(intervalCheck);
		}
	}, 120000); // 2 * 60 * 1000

	req.on("error", function (e) {
		console.log ('Connection error');
		// callback(null, e);
	});
	if (postData && options.method === 'POST') {
		req.write(data);
	}
	req.end();
}

galAcgCache = [];

doParseGalacg = function (strIn) {
	galAcgCache = [];
	return strIn.replace(/href="(.+?es\/\d+)".*?>(.+?)</ig, function (a, b, c) {
		return galAcgCache.push({
			t: c,
			l: b
		});
	});
};

doGalAcgReadCache = function (targetNum) {
	var genPool, i, ranNum, ret;
	if (targetNum == null) {
		targetNum = 3;
	}
	genPool = [];
	ret = [];
	i = 0;
	while (i++ < galAcgCache.length) {
		genPool.push(i);
	}
	i = 0;
	while (i++ < targetNum) {
		ranNum = Math.floor(Math.random() * (genPool.length - 1));
		ret.push(galAcgCache[genPool[ranNum]].t + ':\n - ' + galAcgCache[genPool[ranNum]].l);
		genPool.splice(ranNum, 1);
	}
	return (ret.join('\n')) + '\n\n以上资源由《绅士仓库》友情提供.';
};

parseJSON = function (input) {
	if (/^[\],:{}\s]*$/.test(input.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
		return JSON.parse(input);
	}
	return 0;
};

padRight = function (inputStr, targetNum) {
	var tgtLen;
	tgtLen = inputStr.length + (inputStr.match(/[^\x00-\xff]/g) || []).length;
	while (tgtLen < targetNum) {
		inputStr += '　';
		tgtLen += 2;
	}
	if (tgtLen & 1) {
		inputStr += ' ';
	}
	return inputStr;
};

commandList = [];

regCommand = function (sNames, sDesc, callback) {
	return commandList.push({
		name: sNames,
		desc: sDesc,
		cb: callback
	});
};

regCommand(['资源', '仓库', 'ck', 'zy'], '查询仓库资源', function (args, cmd, send, msg) {
	if (galAcgCache.length) {
		return send(doGalAcgReadCache());
	}
	return doHttpGet('http://www.galacg.me/sitemap.html', function (str) {
		doParseGalacg(str);
		return send(doGalAcgReadCache());
	});
});

regCommand(['time', '时间', '报时'], '查询系统时间; 参数1 可为时差[整数型]', function (args, cmd, send, msg) {
	var newHour, timeObj, tz;
	timeObj = new Date();
	args.push('');
	tz = parseInt((args[0].match(/-?\d+/) || [0])[0]);
	newHour = timeObj.getHours() + tz - timeObj.getTimezoneOffset();
	while (newHour < 0) {
		newHour += 24;
	}
	return send('UTC ' + (tz >= 0 ? '+' : '-') + padZero(Math.abs(tz) % 24) + ' 时间: ' + padZero(newHour % 24) + ':' + padZero(timeObj.getMinutes()) + ':' + padZero(timeObj.getSeconds()));
});

regCommand(['sign', '签到'], '执行当天的签到, 重复签到将受惩罚~', function (args, cmd, send, msg) {
	var timeNow;
	timeNow = new Date;
	return getUserInfo(msg.qnum, function (err, result) {
		if (!result.length) {
			addUser(msg.qnum);
		}
		return doSignin(msg.qnum, function (err, result) {
			var lastTimeSign, ranMoneyTop, strLastSign;
			if (err) {
				return send('抱歉, 系统错误 :/\n' + err);
			}
			strLastSign = result[2][0]['@lastSign'];
			lastTimeSign = new Date(strLastSign || 0);
			if (timeNow - lastTimeSign < 16 * 60 * 60 * 1000 && lastTimeSign.getDate() === timeNow.getDate()) {
				return send(msg.from_user.nick + '已在 ' + strLastSign + ' 签到过了.\n作为惩罚… Pupa ~☆');
			}
			ranMoneyTop = Math.random() * defConf.signMaxMoney;
			send('签到成功! [' + msg.from_user.nick + '] 获得 $' + ranMoneyTop.toFixed(2.));
			return addMoney(msg.qnum, ranMoneyTop);
		});
	});
});


/*
regCommand ['提现', 'alipay', '折现'], '嘛嘛~~', (args, cmd, send, msg) ->
     * 目标 ID
     * console.log JSON.stringify(msg)
    addMoney msg.qnum, -10
    send '成功提现 $10 到 Jixun 的账号 :3'
 */

regCommand(['淦'], '淦!', function (args, cmd, send, msg) {
	return send(sprintf('%s 语录: 我好无聊好想被%s淦', msg.from_user.nick, (args.length ? ' [ ' + args.join('、') + ' ] ' : '')));
});

regCommand(['room'], '[reg/rm] <房名> [密码]', function (args, cmd, send, msg, isOp) {
	var roomStr;
	roomStr = '';
	if (args < 2) {
		if (osuRooms.length === 0) {
			return send(sprintf('[%s] 目前还没人开房 :/  使用 !room reg <房名> [密码] 登陆房间吧~', msg.from_user.nick));
		}
		osuRooms.forEach(function (e) {
			roomStr += e.Creator + ' 登记的游戏; 房名: ' + e.Name;
			if (e.Password) {
				roomStr += '\n密码: ' + e.Password;
			} else {
				roomStr += ' <无密码>';
			}
			return roomStr += '\n';
		});
		return send(roomStr);
	}

	args[0] = args[0].toLowerCase();
	for (var loopIndex = 0, alreadyReged = false, roomName = '';
	loopIndex < osuRooms.length;
	loopIndex++) {

		if (osuRooms[loopIndex].qnum == msg.qnum) {
			alreadyReged = true;
			roomName = osuRooms[loopIndex].name
			break;
		}
	};
	switch (args[0]) {
	case 'reg':
		if (alreadyReged && !isOp) {
			return send(sprintf('[%s] 您已经注册了一间房了, 请不要重复注册 :/', msg.from_user.nick));
		}
		osuRooms.push({
			Creator: msg.from_user.nick,
			qnum: msg.qnum,
			Name: args[1],
			Password: args[2]
		});
		return send(sprintf('[%s] 房间注册成功 owo', msg.from_user.nick));
	case 'rm':
		if (!alreadyReged) {
			return send(sprintf('[%s] 很抱歉, 但是找不到您的登录信息 ><', msg.from_user.nick));
		}
		osuRooms.splice(loopIndex, 1);
		return send(sprintf('[%s] 移除了房间 [%s]', msg.from_user.nick, roomName));
	}
});

bodyPos = ['手掌', '双脚', '熊脸', '脸蛋', '鼻子', '小嘴', '咪咪', '大○ [警×蜀黍就是他!!]', '蛋蛋', '大× [不忍直视]', '双眼', '脖子', '胸口', '大腿', '脚踝', '那里 >////<', '腋下', '耳朵', '小腿', '袜子', '臭脚'];

regCommand(['prpr', '舔舔'], '赛高!', function (args, cmd, send, msg) {
	if (args.length > 0) {
		return send(sprintf('%s 舔了舔 %s 的 %s... 我好兴奋啊!', msg.from_user.nick, args[0].replace(/\s+/g, ' '), (args.length > 1 && args[1] && args[1] !== '>' ? args[1] : bodyPos[Math.floor(Math.random() * bodyPos.length)])));
	}
});

burnEqup = ['汽油', '火把'];

regCommand(['烧', '烧烧', '烧烧烧', 'fff'], '火把在哪!', function (args, cmd, send, msg) {
	if (args.length > 0) {
		return send(sprintf('快烧掉 %s, 壮哉我大 FFF!\n看, 我手上突然出现了%s! 这可是火之神的旨意!', args.join('、'), burnEqup[Math.floor(Math.random() * burnEqup.length)]));
	}
});

regCommand(['rob', '抢钱'], '抢别人的钱 :3', function (args, cmd, send, msg) {
	if (args.length < 1) {
		return;
	}
	return getUserInfo(msg.qnum, function (err, result) {
		var tg;
		if (!result.length) {
			addUser(msg.qnum);
		}
		tg = trimText(args[0]);
		return getUserInfo(tg, function (err, result) {
			var forceOther, pre;
			pre = '';
			forceOther = false;
			if (!result.length) {
				return send('用户未注册或未在此开户 :3');
			}
			if (result[0]['dMoneyLeft'] < 0) {
				pre = sprintf('%s 已经没钱了, 因此 ', tg);
				forceOther = true;
			}
			return doRobMoney(msg.qnum, tg, forceOther, function (moneyRobbed) {
				return send(tg + (moneyRobbed > 0 ? '被' : '反从 ') + msg.qnum + ' 抢走了 $' + Math.abs(moneyRobbed) + ', 真是可喜可贺可口可乐.');
			});
		});
	});
});

regCommand(['me'], '查询自己的信息/osu 模式', function (args, cmd, send, msg) {
	if (args.length < 1) {
		return send(sprintf('[%s]: QNum: %s, uin: %s', msg.from_user.nick, msg.qnum, msg.from_uin));
	}
	return send(sprintf('*%s %s', msg.from_user.nick, args.join(' ')));
});

regCommand(['money', 'balance', '余额'], '查询当前账号的余额', function (args, cmd, send, msg) {
	return getUserInfo(msg.qnum, function (err, rows) {
		if (!rows.length) {
			return send('用户未注册或未在此开户 :3');
		}
		return send(msg.from_user.nick + ' 尚有 $' + rows[0]['dMoneyLeft'] + ', 请继续履行救世主的责任.');
	});
});

regCommand(['pay'], '<目标号码> <数量>', function (args, cmd, send, msg) {
	var targetMoney, targetQNum;
	if (args.length < 2) {
		return;
	}
	targetQNum = (args[0].match(/\d+/) || [])[0];
	if (!targetQNum) {
		return;
	}
	targetMoney = Math.abs(parseFloat(args[1]));
	return getUserInfo(msg.qnum, function (err, rows) {
		if (!rows.length) {
			return;
		}
		if (rows[0]['dMoneyLeft'] < targetMoney) {
			return send(sprintf('%s: 很抱歉, 余-额不足, 转-账失败 :(', msg.from_user.nick));
		}
		return getUserInfo(targetQNum, function (err, rows) {
			if (!rows.length) {
				return send(sprintf('%s: 转-账目标[%s]不存在 :(', msg.from_user.nick, targetQNum));
			}
			addMoney(msg.qnum, -targetMoney);
			addMoney(targetQNum, targetMoney);
			return send(sprintf('%s 成功转-账 %s 给 [%s]', msg.from_user.nick, targetMoney, targetQNum));
		});
	});
});

regCommand(['uptime', '运行时长'], '查询计算姬的运行时长', function (args, cmd, send, msg) {
	var aday, ahour, day, hour, minute, second, secs, _ref;
	secs = (new Date().getTime() - start_at) / 1000;
	aday = 86400;
	ahour = 3600;
	_ref = [secs / aday, secs % aday / ahour, secs % ahour / 60, secs % 60].map(function (i) {
		return padZero(parseInt(i));
	}), day = _ref[0], hour = _ref[1], minute = _ref[2], second = _ref[3];
	return send("计算姬已执行 " + day + "日 " + hour + "时 " + minute + "分 " + second + "秒~");
});

regCommand(['roll', '摇点'], '摇点 0~100', function (args, cmd, send, msg) {
	return send(msg.from_user.nick + ' 摇了 ' + (Math.round(Math.random() * 100) + (args.length ? parseInt(args[0]) || 0 : 0)) + ' 点');
});

regCommand(['hito', '一句话', '来一句'], '从 [hitokoto.us] 随机抽取一句话', function (args, cmd, send, msg) {
	doHttpGetAdv({url: 'http://api.hitokoto.us/rand', Referer: 'http://jixun.org/qqbot'}, false, function (str) {
		var s = parseJSON(str);
		if (s !== 0)
			send(s.hitokoto + '\n　　—— ' + (s.source || s.author || '匿名'));
	});
});

regCommand(['ping'], 'pong!', function (args, cmd, send, msg) {
	return send('pong!');
});

splitNum = function (num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

osuReqModes = ['osu', '太鼓', 'CTB', 'mania'];

osuCountryCode = {
	GB: '腐国',
	CN: '天朝',
	JP: '霓虹'
};

regCommand(['ostats'], '"<用户名>" [模式: 0/1/2/3] 查询某个用户的 osu 信息 :3', function (args, cmd, send, msg) {
	var osuMode;
	if (args.length === 0) {
		return;
	}
	if (args.length === 1) {
		args.push('');
	}
	osuMode = parseInt((args[1].match(/[0-3]/) || [0])[0]);
	return doHttpGet(sprintf('https://osu.ppy.sh/api/get_user?k=%s&u=%s&m=%s', defConf.osuApiKey, encodeURIComponent(args[0]), osuMode), function (str) {
		var s;
		s = parseJSON(str);
		if (s === 0 || !s.length || !s[0].total_score) {
			return;
		}
		return send(sprintf('%s 模式下, [%s] %s 的成绩如下:\n总计分数: %s (#%s)\n游戏次数: %s (lv%s)\n　准确度: %s%%\n300: %s; 100: %s', osuReqModes[osuMode], osuCountryCode[s[0].country] || s[0].country, s[0].username, splitNum(s[0].ranked_score), s[0].pp_rank, s[0].playcount, parseInt(s[0].level), parseFloat(s[0].accuracy).toFixed(2), splitNum(s[0].count300), splitNum(s[0].count100)));
	});
});

regCommand(['晚安', 'gn'], '晚安~', function (args, cmd, send, msg) {
	return send('晚安, ' + (args.length > 0 ? args[0] : msg.from_user.nick) + '~');
});

regCommand(['欢迎', '新人'], '<新人昵称> 新人进群时用~~', function (args, cmd, send, msg) {
	if (args.length > 0) {
		return send('欢迎新人 [' + args[0] + '] ~\n新人新年好, 红包果照都拿来吧 owo' + '\n你可以通过输入 !签到 执行当天的签到 owo');
	}
});

regCommand(['save'], '储存设定, 用户操作后必须 *', function (args, cmd, send, msg, isOp) {
	if (!isOp) {
		console.log('/save 指令: %s 的权限不足 :/', msg.from_user.nick);
		return;
	}
	conf.save(conf.conf);
	return send(sprintf('[%s] 设定储存完毕 owo', msg.from_user.nick));
});

filterNum = function (inp) {
	return (inp.match(/\d+/) || [0])[0];
};

regCommand(['ban'], '封锁 *', function (args, cmd, send, msg, isOp) {
	var i, k, n;
	if (!isOp || args.length < 1) {
		console.log('/ban 指令: %s 的权限不足 :/', msg.from_user.nick);
		return;
	}
	i = 0;
	n = '';
	while (i < args.length) {
		if ((k = filterNum(args[i])) && -1 === conf.conf.ban.indexOf(k)) {
			conf.conf.ban.push(k);
		}
		i++;
	}
	return send(sprintf('[%s] 封禁成功: %s', msg.from_user.nick, args.join('、')));
});

regCommand(['banlist'], '查询封锁 *', function (args, cmd, send, msg, isOp) {
	if (!isOp) {
		console.log('/banlist 指令: %s 的权限不足 :/', msg.from_user.nick);
		return;
	}
	return send(sprintf('[%s] 封锁名单: %s', msg.from_user.nick, conf.conf.ban.join('、')));
});

cleanArray = function (inputArr) {
	var ret;
	ret = [];
	inputArr.forEach(function (e) {
		if (e) {
			return ret.push(e);
		}
	});
	return ret;
};

regCommand(['unban'], '取消封锁 *', function (args, cmd, send, msg, isOp) {
	var i, j, k, newBanList;
	if (!isOp || args.length < 1) {
		console.log('/unban 指令: %s 的权限不足 :/', msg.from_user.nick);
		return;
	}
	i = 0;
	j = 0;
	k = '';
	newBanList = [];
	while (i < args.length) {
		if ((k = filterNum(args[i])) && -1 !== (j = conf.conf.ban.indexOf(k))) {
			delete conf.conf.ban[j];
		}
		i++;
	}
	conf.conf.ban = cleanArray(conf.conf.ban);
	return send(sprintf('[%s] 解封成功: %s', msg.from_user.nick, args.join('、')));
});

regCommand(['reload'], '重载服务器 *', function (args, cmd, send, msg, isOp) {
	if (isOp) {
		conf.reload();
		doServerReload();
		send('[系统] [' + msg.from_user.nick + '] 插件重载完毕~ :3');
		return;
	}
	return console.log('/reload 指令: %s 的权限不足 :/', msg.from_user.nick);
});
regCommand(['say'], '说点什么 *', function (args, cmd, send, msg, isOp) {
	if (isOp) {
		if (args.length != 3)
			return ;
		var sayTime = parseInt (args[1]),
			sayWait = parseInt (args[2]),
			curTime = 0;

		send (args[0]);
		var iv = setInterval (function () {
			if (++curTime >= sayTime)
				return clearInterval (iv);
			send (args[0]);
		}, sayWait);

		return;
	}
	return console.log('/say 指令: %s 的权限不足 :/', msg.from_user.nick);
});

regCommand(['sing'], '说点什么 *', function (args, cmd, send, msg, isOp) {
	if (isOp) {
		if (args.length < 2)
			return ;
		// /sing 间隔 歌词1, ...
		var i = 0;
		var iv = setInterval (function (ee) {
			if (ee = args[i++]) {
				send (ee);
			} else {
				clearInterval (iv);
			}
		}, parseInt(args.shift ()));
	}
	return console.log('/sing 指令: %s 的权限不足 :/', msg.from_user.nick);
});

regCommand(['weather', '天气'], '查询天气?', function (args, cmd, send, msg, isOp) {
	if (!args.length) {
		send ('参数错误 oAo');
		return;
	}
	send (args[0] + '天气如何');
});


rmSign = function (num) {
	return Math.abs(num) || '';
};

getSign = function (num) {
	return (num.toString().slice(0, 1) === '-' ? '-' : '+');
};

regCommand(['math', 'maths', '数学'], '显示该信息 :3', function (args, cmd, send, msg) {
	var det, err, evalCommand, i, left, mathFunc, qsol, right;
	if (args.length < 2) {
		return;
	}
	mathFunc = args[0];
	i = 0;
	switch (args.shift()) {
	case "quad":
		if (args.length < 3) {
			return;
		}
		while (i < 3) {
			args[i] = parseInt(args[i++]);
		}
		det = args[1] * args[1] - 4 * args[0] * args[2];
		qsol = '';
		if (det < 0) {
			left = args[1] / args[0] / -2;
			right = Math.sqrt(det * -1) / args[0] / 2;
			qsol = left.toFixed(3) + '\xB1' + right.toFixed(3) + 'i';
		} else if (det === 0) {
			qsol = (-1 * args[1] / args[0] / 22).toFixed(3);
		} else {
			det = Math.sqrt(det);
			qsol = [((-1 * args[1] + det) / args[0] / 2).toFixed(3), ((-1 * args[1] - det) / args[0] / 2).toFixed(3)].join('、');
		}
		return send(sprintf('%sx\xB2^2 %s %sx %s %s 的结果: %s', args[0], getSign(args[1]), rmSign(args[1]), getSign(args[2]), rmSign(args[2]), qsol));
	case 'eval':
		if (args.length < 1) {
			return;
		}
		evalCommand = trimText((args.join(' ')).replace(/\s+/g, ' '));
		if (evalCommand.length > 100) {
			return send(sprintf('[%s]: 很抱歉, 您输入的指令太长了 :/', msg.from_user.nick));
		}
		try {
			return send(sprintf('[%s]: 运算结果为: %s', msg.from_user.nick, mathjs()["eval"](evalCommand)));
		} catch (_error) {
			err = _error;
			console.log('Exp. error: %s', evalCommand);
			return send(sprintf('[%s]: 运算表达式错误 :/', msg.from_user.nick));
		}
	}
});

helpList = [];

helpTotal = 0;

regCommand(['help', '帮助', '功能'], '显示该信息 :3', function (args, cmd, send, msg) {
	var page, stRow;
	args.push('');
	page = parseInt((args[0].match(/\d+/) || [1])[0]);
	if (page > helpTotal) {
		return send(sprintf('页码 %s 超出帮助范围 :/', page));
	}
	stRow = 5 * (page - 1);
	return send(sprintf('帮助 - Coffee.Bot 二次开发 By Jixun.Moe\n%s\n第 %s 页, 共 %s 页;%s', helpList.slice(stRow, stRow + 5).join('\n'), page, helpTotal, (page === helpTotal ? '' : sprintf(' 输入 !%s %s 查看下一页', cmd, page + 1))));
});

VERSION_INFO = "v1.3.1 Project\n  ~ Jixun Bot ~\n二次开发: Jixun";

regCommand(['about', 'version', '关于', '版本'], '查询机器人版本', function (args, cmd, send, msg) {
	return send(VERSION_INFO);
});

commandList.forEach(function (e) {
	return helpList.push(padRight('!' + e.name.join("/"), 22) + ' ' + e.desc);
});

helpTotal = Math.ceil(helpList.length / 5);

module.exports = {
	commandList: commandList,
	setDef: function (def) {
		return defConf = def;
	},
	init: function (db_, dbConf_, beginTime, doServerReload_) {
		db = db_;
		dbConf = dbConf_;
		defConf = dbConf.defConf;
		start_at = beginTime;
		return doServerReload = doServerReload_;
	}
};