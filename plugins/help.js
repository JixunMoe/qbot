var HELP_INFO = "",
	fs = require('fs'),
	Path = require('path'),
	dbConf = require('./dbConf'),
	util = require('util'),
	sprintf = util.format,
	mysql = require('mysql2'),
	core = require('./main.core'),
	conf = require('../config'),
	start_at = +new Date();

dbConf.sqlConnect.multipleStatements = true;

var db = mysql.createConnection(dbConf.sqlConnect);

db.connect();

if (!db)
	console.log('Unable connect to database :/');

console.log("Init database...");

// Get str from function
function ___ (f) {
	return f.toString ().match(/\{\s*\/\*\s*([\s\S]*?)\s*\*\/\s*\}/) [1];
}

db.query(sprintf(___(function(){/*
create database if not exists `jixun`;
use `jixun`;
create table if not exists `qbot` (
    `qNum` VARCHAR(20) NOT NULL,
    `tLastSign` TIMESTAMP NULL,
    `dMoneyLeft` FLOAT NULL,
    UNIQUE INDEX `qNum_UNIQUE` (`qNum` ASC)
)ENGINE = %s;
*/}), dbConf.sqlEngine), function(err) {
	if (err) {
		throw new Error(err);
	}
})

function trimText (inputText) {
	return inputText.toString().replace(/(^\s*|\s*$)/g, '');
}

// 解析输入指令
function parseCommand (inputCommand) {
	var addStr = false;
		rret = {},
		ret = [''],
		cCode = 0,
		lastChr = 0,
		chr = 0,
		curId = 0,
		inQuote = false;

	// Ignore first character
	for (var i = 1; i < inputCommand.length; i++) {
		if ((cCode = inputCommand.charCodeAt(i)) == 0x20) { // Space
			if (inQuote) {
				addStr = true;
			} else if (lastChr !== chr && ret[curId]) {
				// If the last character isn't space and last buff has content.
				ret.push("");
				curId++;
			}
		} else if (cCode === 34) { // Quote
			inQuote = !inQuote;
		} else {
			// Normal str
			addStr = true;
		}
		if (addStr)
			ret[curId] += String.fromCharCode(cCode);
		
		lastChr = cCode;
		addStr = false;
	}
	if (ret.length) {
		rret.command = ret[0].toLowerCase();
		ret.shift(); // Remove the first item
		rret.args = ret;
	}
	return rret;
}

// Remove the module and require it again.
function reloadModule (modName) {
	if (require.cache[require.resolve(modName)])
		delete require.cache[require.resolve(modName)];
	return require(modName);
}

function doServerReload () {
	console.log('doServerReload: 重载核心插件');
	var foo = {
		c: core
	};
	delete foo.c; // Don't know if this works or not..?
	core = reloadModule('./main.core');
	return core.init(db, dbConf, start_at, doServerReload);
}

core.init(db, dbConf, start_at, doServerReload);


/*
 @param content 消息内容
 @param send(content)	回复消息
 @param robot qqbot instance
 @param msg 原消息对象
 */

module.exports = function(contentInput, send, robot, msg) {
	var content, isOp, parsedCommand;
	if (conf.conf.ban && -1 !== conf.conf.ban.indexOf(msg.qnum)) {
		console.log('黑名单用户 [%s] 发言, 已过滤.', msg.qnum);
		return;
	}
	content = trimText(contentInput);
	if (!/^(\/|!)/.test(content)) {
		return;
	}
	parsedCommand = parseCommand(content);
	isOp = dbConf.defAdmin.indexOf(msg.qnum) !== -1;
	core.commandList.forEach(function(e) {
		var err;
		if (-1 !== e.name.indexOf(parsedCommand.command)) {
			console.log('[函数匹配][%s]: %s', e.name, parsedCommand.command);
			try {
				e.cb(parsedCommand.args, parsedCommand.command, send, msg, isOp);
			} catch (_error) {
				err = _error;
				console.log(err.message + '\n' + err.stack);
				send('梦姬执行遇到错误, 请等主人上线后报告 >//<');
			}
		}
	});
};
