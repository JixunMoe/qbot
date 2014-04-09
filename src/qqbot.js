var api = require('./qqapi'),
	Log = require('log'),
	Dispatcher = require('./dispatcher'),
	log = new Log('debug'),
	jsons = JSON.stringify,
	sprintf = require ('util').format,

/*
 为hubot专门使用，提供两个方法
 - send
 - on_message (content,send_fun, bot , message_info) ->
 */
Group = (function () {
	function Group(bot, gid) {
		this.bot = bot;
		this.gid = gid;
	}
	Group.prototype.send = function (content, callback) {
		this.bot.send_message_to_group(this.gid, content, function (ret, e) {
			if (callback)
				callback(ret, e);
		});
	};
	Group.prototype.on_message = function (msg_cb) {
		this.msg_cb = msg_cb;
	};
	Group.prototype.dispatch = function (content, send, robot, message) {
		if (message.from_gid === this.gid && this.msg_cb)
			this.msg_cb(content, send, robot, message);
	};
	return Group;
})(),

/*
 cookie , auth 登录需要参数
 config:  配置信息，将 config.yaml
   plugins: 插件
 */
QQBot = (function () {
	function QQBot(cookies, auth, config) {
		this.friendQueue = [];
		this.cookies = cookies;
		this.auth = auth;
		this.config = config;
		this.buddy_info = {};
		this.group_info = {};
		this.groupmember_info = {};
		this.qNumCache = {};
		api.cookies(this.cookies);
		api.setAuth(auth);
		this.api = api;
		this.dispatcher = new Dispatcher(this.config.plugins);
	}
	QQBot.prototype.getQnum = function (u, type, cb) {
		var UIN, that;
		if (type == null) {
			type = 1;
		}
		if (cb == null) {
			cb = function () {};
		}
		UIN = u.toString();
		that = this;
		if (this.qNumCache[UIN]) {
			return cb(this.qNumCache[UIN]);
		}
		api.get_qnum_by_id(UIN, type, function (data) {
			if (data && data.result) {
				cb(that.qNumCache[UIN] = data.result.account.toString());
			} else {
				cb('[QQ 获取失败]');
			}
		});
	};
	QQBot.prototype.save_buddy_info = function (buddy_info) {
		this.buddy_info = buddy_info;
	};
	QQBot.prototype.save_group_info = function (group_info) {
		this.group_info = group_info;
	};
	QQBot.prototype.save_group_member = function (group, info) {
		// console.log ('save_group_member', group, info);
		this.groupmember_info[group.gid] = info;
	};
	QQBot.prototype.get_user = function (uin) {
		var users = this.buddy_info.info.filter(function (item) {
			return item.uin === uin;
		});
		return users.pop();
	};
	QQBot.prototype.get_user_ingroup = function (uin, gid, fCB, noMoreRetry) {
		var _that = this,
			info = this.groupmember_info[gid],
			users = info.minfo.filter(function (item) {
			return item.uin === uin;
		}), cardUser = (info.cards||[]).filter(function (item) {
			return item.muin === uin;
		});

		if (!users.length && noMoreRetry)
			// 忽略更新请求, 吞下消息 owo
			return log.info ('[ERR  ] Request for ' + gid + ' ignored.');

		if (!users.length) {
			log.info ('Group\'s too old! Try to update...');
			
			
			this.update_group_member (this.get_group ({gid: gid}), function (bSuccess, errStr) {
				if (errStr)
					return log.info('更新群出错! ', errStr);
				_that.get_user_ingroup (uin, gid, fCB, true);
			});
		} else {
			if (cardUser.length)
				users[0].nick = cardUser[0].card;
			fCB (users[0]);
		}
	};
	QQBot.prototype.get_group = function (options) {
		var groups = this.group_info.gnamelist.filter(function (item) {
			var key, value;
			for (key in options)
				return item[key] === options[key];
		});
		return groups.pop();
	};
	QQBot.prototype.update_group_list = function (callback) {
		var _that = this;
		this.api.get_group_list(function (ret, e) {
			if (e) log.error(e);
			if (ret.retcode === 0)
				_that.save_group_info(ret.result);
			if (callback)
				callback(ret.retcode === 0, e || 'retcode isnot 0');
		});
	};
	QQBot.prototype.update_buddy_list = function (callback) {
		var _that = this;
		this.api.get_buddy_list(function (ret, e) {
			if (ret.retcode === 0) {
				_that.save_buddy_info(ret.result);
			}
			if (callback) {
				callback(ret.retcode === 0, e || 'retcode isnot 0');
			}
		});
	};
	QQBot.prototype.update_group_member = function (options, callback, noMoreRetry) {
		var _that = this,
			group = options.code ? options : this.get_group(options);
		api.get_group_member(group.code, function (ret, e) {
			if (ret.retcode === 0) {
				_that.save_group_member(group, ret.result);
				callback(true, e);
				return ;
			}
			if (noMoreRetry && noMoreRetry >= 3)
				return callback(false, e);

			noMoreRetry = noMoreRetry ? noMoreRetry + 1 : 1
			console.log ('Retry: %s/3', noMoreRetry)

			_that.update_group_member (options, callback, noMoreRetry);
		});
	};
	QQBot.prototype.update_all_group_member = function (callback) {
		var groups = this.group_info.gnamelist || [],
			all = groups.length,
			finished = 0,
			successed = 0;

		for (var i=0; i<groups.length; i++)
			this.update_group_member(groups[i], function (ret, error) {
				finished += 1;
				successed += ret;
				log.debug(sprintf("Fetch group info: %s/%s/%s", successed, finished, all));
				if (finished === all)
					callback(successed === all, finished, successed);
			});
		
	};
	QQBot.prototype.update_all_members = function (callback) {
		var actions = {
			buddy: [0, 0],
			group: [0, 0],
			groupmember: [0, 0]
		}, check = function () {
			var all, finished, item, key, stats, successed, value, _i, _len;
			finished = successed = 0;
			all = Object.keys(actions).length;
			stats = (function () {
				var _results;
				_results = [];
				for (key in actions) {
					value = actions[key];
					_results.push(value);
				}
				return _results;
			})();
			for (_i = 0, _len = stats.length; _i < _len; _i++) {
				item = stats[_i];
				finished += item[0];
				successed += item[1];
			}
			log.debug("updating all: all " + all + " finished " + finished + " success " + successed);
			if (finished === all) {
				callback(successed === all);
			}
		};
		log.info('fetching buddy list...');
		this.update_buddy_list(function (ret) {
			actions.buddy = [1, ret];
			check();
		});
		log.info('fetching group list...');
		var _that = this;
		this.update_group_list(function (ret) {
			actions.group = [1, ret];
			if (!ret) {
				callback(false);
				return;
			}
			log.info('fetching all groupmember...');
			_that.update_all_group_member(function (ret, all, successed) {
				actions.groupmember = [1, ret];
				check();
			});
		});
	};
	QQBot.prototype.runloop = function (callback) {
		var _that = this;
		this.api.long_poll(function (ret, e) {
			_that.handle_poll_responce(ret, e);
			callback && callback(ret, e);
		});
	};
	QQBot.prototype.reply_message = function (message, content, callback, font) {
		log.info("发送消息: ", content);
		if (message.type === 'group') {
			this.api.send_msg_2group(message.from_gid, content, function (ret, e) {
				callback && callback(ret, e);
			});
		} else if (message.type === 'buddy') {
			this.api.send_msg_2buddy(message.from_uin, content, function (ret, e) {
				callback && callback(ret, e);
			});
		}
	};
	QQBot.prototype.send_message_to_group = function (gid_or_group, content, callback) {
		var gid = typeof gid_or_group === 'object' ? gid_or_group.gid : gid_or_group;
		log.info("send msg " + content + " to group" + gid);
		api.send_msg_2group(gid, content, function (ret, e) {
			if (callback)
				callback(ret, e);
		});
	};
	QQBot.prototype.die = function (message, info) {
		if (message) {
			console.log("QQBot die! message: " + message);
		}
		if (info) {
			console.log("QQBot die! info " + (JSON.stringify(info)));
		}
		return process.exit(1);
	};
	QQBot.prototype.handle_poll_responce = function (resp, e) {
		console.log('handle_poll_responce: ', arguments)
		if (e) log.error("[POLL] there's error: " + e);

		var retCode = resp ? resp.retcode : -1;
		switch (retCode) {
			case -1:
				log.error("[POLL] resp is null/Error");
				break;
			case 0:
				var ret = [];
				for (var i=0; i<resp.result.length; i++)
					ret.push(this._handle_poll_event(resp.result[i]));

				return ret;
			case 102:
			case 103:
				log.info ('[POLL] ' + retCode);
				break;
			// case 103:
				// 应该是token失效了，但是偶尔也有情况返回
				this.die("[POLL] 登录异常 " + retCode, resp);
				break;
			case 116:
				this._update_ptwebqq(resp);
				break;
			case 121:
				this.die("[POLL] 目测掉线: " + retCode, resp);
				break;
			default:
				log.debug(resp);
				break;
		}
	};
	// Useless function
	QQBot.prototype.cb_token_changed = function () {};
	QQBot.prototype.on_token_changed = function (callback) {
		this.cb_token_changed = callback;
	};
	QQBot.prototype._update_ptwebqq = function (ret) {
		log.info('Update ptwebqq: ', ret);
		this.auth['ptwebqq'] = ret.p;
		api.setAuth (this.auth);
		this.cb_token_changed(this.auth);
	};
	QQBot.prototype._handle_poll_event = function (event) {
		switch (event.poll_type) {
			case 'group_message':
			case 'message':
				// console.log (event);
				this._on_message(event);
				break;
			case 'sys_g_msg':
				// 群事件
				console.log ('[群事件]: ', event.value);
				break;
			case 'system_message':
				// {"poll_type":"system_message","value":{"seq":1990,"type":"verify_required","uiuin":"","from_uin":2741819002,"account":927195482,"msg":"^^","stat":10,"client_type":41}}
				log.info ('系统消息: ', event);
				var sysInfo = event.value;
				if (sysInfo.type == 'verify_required') {
					// 好友验证
					this.friendQueue.push (sysInfo);
				}
				break;
			default:
				log.warning("EVENT", event.poll_type, "content: ", jsons(event));
		}
	};
	QQBot.prototype._on_message = function (event) {
		var _that = this;

		this._create_message(event, function (msg) {
			var msgContent = [];
			msg.content.shift();
			msg.content.forEach (function (e) {
				msgContent.push (typeof e == 'string' ? e : '[图片]');
			});
			msgContent = msgContent.join(' ');

			if (msg.type === 'group') {
				log.debug("[群] [" + msg.from_group.name + "] " + msg.from_user.nick + ": " + msgContent);
			} else if (msg.type === 'buddy') {
				log.debug("[友] [" + msg.from_user.nick + "]: " + msgContent);
			} else {
				log.debug('[??] 未知消息类型: ' + msg.type);
			}
			_that._on_message_next (msg, _that, msgContent);
		});
	};
	QQBot.prototype._on_message_next = function (msg, _that, msgContent) {
		_that.getQnum(msg.from_uin, 1, function (qqnum) {
			msg.qnum = qqnum;
			_that.dispatcher.dispatch(msgContent, function (content){
				_that.reply_message(msg, content);
			}, _that, msg);
		});
	};

	QQBot.prototype._create_message = function (event, msgCallback) {
		var msg, value;
		value = event.value;
		msg = {
			content: value.content,
			time: new Date(value.time * 1000),
			from_uin: value.from_uin,
			type: value.group_code ? 'group' : 'buddy',
			uid: value.msg_id
		};

		if (msg.type === 'group') {
			msg.from_gid = msg.from_uin;
			msg.group_code = value.group_code;
			msg.from_uin = value.send_uin;
			msg.from_group = this.get_group({
				gid: msg.from_gid
			});

			this.get_user_ingroup(msg.from_uin, msg.from_gid, function (user) {
				msg.from_user = user;
				msgCallback (msg);
			});
		} else if (msg.type === 'buddy') {
			msg.from_user = this.get_user(msg.from_uin);
			msgCallback (msg);
		} else {
			msgCallback ({});
		}
	};
	QQBot.prototype.listen_group = function (name, callback) {
		log.info('Fetch group list');
		var _that = this;

		this.update_group_list(function (ret, e) {
				log.info('√ group list fetched');
				log.info("fetching groupmember " + name);
				_that.update_group_member({
					name: name
				}, function (ret, error) {
					var group, groupinfo;
					log.info('√ group memeber fetched');
					groupinfo = _that.get_group({
						name: name
					});
					group = new Group(_that, groupinfo.gid);
					_that.dispatcher.add_listener([group, "dispatch"]);
					callback(group);
				});
		});
	};

	return QQBot;
})();

module.exports = QQBot;
