###
  QQAPI 包含获取好友，群信息，发送消息，长轮询
  - 使用前需要设置 cookies()
###



all_cookies = []
fs = require 'fs'
jsons = JSON.stringify
client = require './httpclient'
log   = new (require 'log')('debug')

exports.cookies = (cookie)->
    if cookie
        all_cookies = cookie
        client.global_cookies(all_cookies)
    return all_cookies


# 长轮训，默认一分钟
#  @param : [clientid,psessionid]
#  @param callback: ret, e
#  @return ret retcode 102，正常空消息
long_poll = (auth_opts, callback) ->
    log.debug "polling..."
    [clientid, psessionid] = [auth_opts.clientid, auth_opts.psessionid]
    url = "http://d.web2.qq.com/channel/poll2"
    r =
        clientid: clientid
        psessionid: psessionid
        key:0
        ids:[]
    params =
        clientid: clientid
        psessionid: psessionid
        r: jsons r

    client.post {url:url} , params , (ret,e)->
        long_poll( auth_opts , callback )
        callback(ret,e)

exports.long_poll = long_poll

# http://0.web.qstatic.com/webqqpic/pubapps/0/50/eqq.all.js
# uin, ptwebqq
hash_table = "0123456789ABCDEF".split("");
hash_func = (b, i) ->
  a = []
  s = 0
  j = []
  d = [
    b >> 24 & 255 ^ 69 # E
    b >> 16 & 255 ^ 67 # C
    b >> 8 & 255 ^ 79  # O
    b & 255 ^ 75       # K
  ]

  while s < i.length
    a[s % 4] ^= i.charCodeAt(s)
    s++
  s = 0
  while s < 8
    j[s] = (if s % 2 is 0 then a[s >> 1] else d[s >> 1])
    s++
  d = ""
  s = 0
  while s < j.length
    d += hash_table[j[s] >> 4 & 15]
    d += hash_table[j[s] & 15]
    s++
  d


#  @param uin     : 登录后获得
#  @param ptwebqq : cookie
#  @param vfwebqq : 登录后获得
#  @param callback: ret, e
#  retcode 0
exports.get_buddy_list = (auth_opts, callback)->
    opt = auth_opts
    url = "http://s.web2.qq.com/api/get_user_friends2"
    r =
      h: "hello"
      hash: hash_func(opt.uin, opt.ptwebqq)
      vfwebqq: opt.vfwebqq

    client.post {url:url} , {r:jsons(r)} , (ret,e )->
        callback(ret,e)


#  @param auth_opts vfwebqq : 登录后获得
#  @param callback: ret, e
#  retcode 0
exports.get_group_list = ( auth_opts, callback)->
    aurl = "http://s.web2.qq.com/api/get_group_name_list_mask2"
    r    = vfwebqq:  auth_opts.vfwebqq

    client.post {url:aurl} , {r:jsons(r)} , (ret, e )->
            callback(ret,e)


#  @param group_code: code
#  @param auth_opts vfwebqq : 登录后获得
#  @param callback: ret, e
#  retcode 0
exports.get_group_member = (group_code, auth_opts, callback)->
    url = "http://s.web2.qq.com/api/get_group_info_ext2"
    url += "?gcode=#{group_code}&cb=undefined&vfwebqq=#{auth_opts.vfwebqq}&t=#{+new Date()}"
    client.get {url:url}, (ret,e)->
        callback(ret,e)

# Added by Jixun
# 根据 uid 获取 QQ/群号
#  @param uid: uid
#  @param auth_opts vfwebqq : 登录后获得
#  @param type: 1: 好友; 4: Q群
#  retcode ??
exports.get_qnum_by_id = (uid, type, auth_opts, callback)->
    url = "http://s.web2.qq.com/api/get_friend_uin2"
    url += "?tuin=#{uid}&verifysession=&type=#{type}&code=&vfwebqq=#{auth_opts.vfwebqq}&t=#{+new Date()}"
    client.get {url:url}, (ret,e)->
        callback(ret,e)

#  @param to_uin: uin
#  @param msg, 消息
#  @param auth_opts: [clientid,psessionid]
#  @param callback: ret, e
#  @return ret retcode 0
exports.send_msg_2buddy = (to_uin , msg , auth_opts ,callback)->
    url = "http://d.web2.qq.com/channel/send_buddy_msg2"
    opt = auth_opts
    r =
      to: to_uin
      face: 0
      msg_id: parseInt Math.random()*100000 + 1000
      clientid: "#{opt.clientid}"
      psessionid: opt.psessionid
      content: jsons ["#{msg}" , ["font", {name:"微软雅黑", size:"10", style:[0,0,0], color:"ff6600" }] ]

    params =
        r: jsons r
        clientid: opt.clientid
        psessionid: opt.psessionid

    # log params
    client.post {url:url} , params , (ret,e) ->
        log.debug 'send2user',jsons ret
        callback( ret , e )

#  @param gid: gid
#  @param msg, 消息
#  @param auth_opts: [clientid,psessionid]
#  @param callback: ret, e
#  @return ret retcode 0
exports.send_msg_2group = (gid, msg , auth_opts, callback)->
    url = 'http://d.web2.qq.com/channel/send_qun_msg2'
    opt = auth_opts
    r =
      group_uin:  gid
      msg_id:     parseInt Math.random()*100000 + 1000
      clientid:   "#{opt.clientid}"
      psessionid: opt.psessionid
      content:    jsons ["#{msg}" , ["font", {name:"微软雅黑", size:"10", style:[0,0,0], color:"ff6600" }] ]
    params =
        r:         jsons r
        clientid:  opt.clientid
        psessionid:opt.psessionid
    client.post {url:url} , params , (ret,e)->
        log.debug 'send2group',jsons ret
        callback(ret,e)
