/*
  QQAPI 包含获取好友，群信息，发送消息，长轮询
  - 使用前需要设置 cookies()
 */

var all_cookies = [],
	fs = require('fs'),
	jsons = JSON.stringify,
	client = require('./httpclient'),
	log = new(require('log'))('debug'),
	auth = {},
	hash_table = "0123456789ABCDEF".split("");

exports.setAuth = function (__auth) {
	auth = __auth;
};

exports.cookies = function (cookie) {
	if (cookie) {
		all_cookies = cookie;
		client.global_cookies(all_cookies);
	}
	return all_cookies;
};

function long_poll (callback) {
	log.debug('Longpoll...');

	client.post({
		url: 'http://d.web2.qq.com/channel/poll2'
	}, {
		clientid: auth.clientid,
		psessionid: auth.psessionid,
		r: jsons({
			clientid: auth.clientid,
			psessionid: auth.psessionid,
			key: 0,
			ids: []
		})
	}, function (ret, e) {
		long_poll(callback);
		callback(ret, e);
	});
};

exports.long_poll = long_poll;
function hash_func (b, i) {
	var a = [],
		j = [],
		d = [
			b >> 24 & 255 ^ 69,
			b >> 16 & 255 ^ 67,
			b >> 8 & 255 ^ 79,
			b & 255 ^ 75
		];

	for (var s=0; s < i.length; s++)
		a[s % 4] ^= i.charCodeAt(s);

	for (var s=0; s < 8; s++)
		j[s] = (s % 2 === 0 ? a[s >> 1] : d[s >> 1]);

	for (var s=0, d=''; s < j.length; s++) {
		d += hash_table[j[s] >> 4 & 15];
		d += hash_table[j[s] & 15];
	}
	return d;
};

exports.get_buddy_list = function (callback) {
	client.post({
		url: "http://s.web2.qq.com/api/get_user_friends2"
	}, {
		r: jsons({
			h: "hello",
			hash: hash_func (auth.uin, auth.ptwebqq),
			vfwebqq: auth.vfwebqq
		})
	}, function (ret, e) {
		callback(ret, e);
	});
};


exports.acceptFriend = function (QNum, nick, callback) {
	if (!nick) nick = '';

	client.post({
		url: "http://s.web2.qq.com/api/allow_and_add2"
	}, {
		r: jsons({
			account: QNum,
			gid: 0, 
			mname: nick,
			vfwebqq: auth.vfwebqq
		})
	}, function (ret, e) {
		callback && callback(ret, e);
	});
};


exports.denyFriend = function (QNum, reason, callback) {
	if (reason == null) reason = '很抱歉, 我不喜欢你 :L';

	client.post({
		url: "http://s.web2.qq.com/api/deny_added_request2"
	}, {
		r: jsons({
			account: QNum,
			msg: reason,
			vfwebqq: auth.vfwebqq
		})
	}, function (ret, e) {
		callback && callback(ret, e);
	});
}


exports.get_group_list = function (callback) {
	client.post({
		url: 'http://s.web2.qq.com/api/get_group_name_list_mask2'
	}, {
		r: jsons({
			vfwebqq: auth.vfwebqq
		})
	}, function (ret, e) {
		callback(ret, e);
	});
};

exports.get_group_member = function (group_code, callback) {
	var url = "http://s.web2.qq.com/api/get_group_info_ext2"
			+ "?gcode=" + group_code + "&cb=undefined&vfwebqq=" + auth.vfwebqq + "&t=" + (+new Date());

	client.get({
		url: url
	}, function (ret, e) {
		callback(ret, e);
	});
};

exports.get_qnum_by_id = function (uid, type, callback) {
	var url = "http://s.web2.qq.com/api/get_friend_uin2"
			+ "?tuin=" + uid + "&verifysession=&type=" + type + "&code=&vfwebqq=" + auth.vfwebqq + "&t=" + (+new Date());
	
	client.get({
		url: url
	}, function (ret, e) {
		console.log ('get_qnum_by_id', ret);
		callback(ret, e);
	});
};

exports.send_msg_2buddy = function (to_uin, msg, callback) {
	var	url = "http://d.web2.qq.com/channel/send_buddy_msg2",
		r = {
			to: to_uin,
			face: 0,
			msg_id: parseInt(Math.random() * 100000 + 1000),
			clientid: "" + auth.clientid,
			psessionid: auth.psessionid,
			content: jsons([
				msg, [
					"font", {
						name: "微软雅黑",
						size: "10",
						style: [0, 0, 0],
						color: "ff6600"
					}
				]
			])
		},
		params = {
			r: jsons(r),
			clientid: auth.clientid,
			psessionid: auth.psessionid
		};
	client.post({
		url: url
	}, params, function (ret, e) {
		log.debug('send2user', jsons(ret));
		callback(ret, e);
	});
};

exports.send_msg_2group = function (gid, msg, callback) {
	var url = 'http://d.web2.qq.com/channel/send_qun_msg2',
		r = {
			group_uin: gid,
			msg_id: parseInt(Math.random() * 100000 + 1000),
			clientid: auth.clientid,
			psessionid: auth.psessionid,
			content: jsons([
				msg, [
					"font", {
						name: "微软雅黑",
						size: "10",
						style: [0, 0, 0],
						color: "ff6600"
					}
				]
			])
		},
		params = {
			r: jsons(r),
			clientid: auth.clientid,
			psessionid: auth.psessionid
		};

	client.post({
		url: url
	}, params, function (ret, e) {
		log.debug('send2group', jsons(ret));
		callback(ret, e);
	});
};