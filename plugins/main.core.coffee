db = null
dbConf = {}
defConf = {}
http = require 'http'
https = require 'https'
util = require 'util'
sprintf = util.format
start_at = 0


# Null Function
nullFunc = -> ;

# 进行编码…
doEscape = (strIn) ->
    ret = db.escape(strIn)
    if typeof strIn == 'string'
        return ret.slice(1,-1)
    return ret

# 删除首尾的空格
trimText = (inputText) ->
  return inputText.toString().replace(/(^\s*|\s*$)/g, '');

# 添加用户
addUser = (uid, cb = nullFunc) ->
    db.query sprintf('insert ignore into `qbot` (`qNum`, `dMoneyLeft`) values (%s, %s)',
        doEscape(uid), db.escape(defConf.money)), cb

# 如果减的话把 money 设为负值即可 :3
addMoney = (uid, money, cb = nullFunc) ->
    db.query sprintf('update `qbot` set `dMoneyLeft` = `dMoneyLeft` +%s where `qNum` like "%s"',
        db.escape(money), doEscape(uid)), cb

# 获取用户信息
getUserInfo = (uid, cb = nullFunc) ->
    db.query sprintf('select * from `qbot` where `qNum`="%s" limit 1', doEscape(uid)), cb

# 抢钱函数
doRobMoney = (uid, target, cb = nullFunc) ->
    moneyRobbed = (Math.random() * 50 - 30).toFixed(2)
    uid = trimText(uid)
    target = trimText(target)
    if uid is target
        return
    db.query sprintf('''
update `qbot` set
    dMoneyLeft = dMoneyLeft -%s
where `qnum` like "%s";

update `qbot` set
    dMoneyLeft = dMoneyLeft +%s
where `qnum` like "%s";
''', moneyRobbed, doEscape(target), moneyRobbed, doEscape(uid))
    cb(moneyRobbed)

# 执行签到
doSignin = (uid, cb = nullFunc)->
    # Do Signin
    # `tLastSign`
    db.query sprintf('''
select
    tLastSign, qNum
    into
    @lastSign, @qNum
FROM `qbot` where `qNum` like '%s' limit 1;

update `qbot` set
    `tLastSign` = NOW()
where `qnum` like @qNum;

select @lastSign;
''', db.escape(uid)), cb


padZero = (str) ->
    ret = str.toString();
    ret = '0' + ret if ret.length == 1
    return ret

# Not used
url2Opt = (url, tryAgain) ->
    cont = url.match /http(s?):\/\/(.+?)(:?\d*)(\/.*)/i
    if !cont
        if tryAgain
            return url2Opt url, true
        return {}
    tmpPort = 80
    useHttps = false
    if useHttps = cont[1].toLowerCase() == 's'
        tmpPort = 443
    if parseInt cont[3]
        tmpPort = parseInt cont[3]

    host:  cont[2]
    port:  tmpPort
    path:  cont[4]
    https: useHttps

doHttpGet = (url, callback) ->
    console.log 'doHttpGet: %s', url
    # urlData = url2Opt url
    (if /^https:/i.test(url) then https else http).get url, (http_res) ->
        # initialize the container for our data
        data = ""

        # this event fires many times, each time collecting another piece of the response
        http_res.on "data", (chunk) ->
            # append this chunk to our growing `data` var
            data += chunk

        # this event fires *one* time, after all the `data` events/chunks have been gathered
        http_res.on "end", ->
            # you can use res.send instead of console.log to output via express
            callback data
galAcgCache = []
doParseGalacg = (strIn) ->
    galAcgCache = []
    strIn.replace /href="(.+?es\/\d+)".*?>(.+?)</ig, (a, b, c) ->
        galAcgCache.push
          t: c # Title
          l: b # Link

doGalAcgReadCache = (targetNum = 3) ->
  genPool = []
  ret = []

  i = 0
  genPool.push i  while i++ < galAcgCache.length

  i = 0
  while i++ < targetNum
    ranNum = Math.floor(Math.random() * (genPool.length - 1))
    ret.push galAcgCache[genPool[ranNum]].t + ':\n' + galAcgCache[genPool[ranNum]].l
    genPool.splice ranNum, 1
  '随机抽取的一些资源:\n\n' + (ret.join '\n\n') + '\n\n以上资源由《绅士仓库》友情提供.'

parseJSON = (input) ->
    if(/^[\],:{}\s]*$/.test(input.replace(/\\["\\\/bfnrtu]/g, '@')\
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')\
            .replace(/(?:^|:|,)(?:\s*\[)+/g, '')))
        return JSON.parse input
    return 0

padRight = (inputStr, targetNum) ->
    while inputStr.length < targetNum
        inputStr += ' '
    inputStr

commandList = []
regCommand = (sNames, sDesc, callback) ->
    commandList.push 
        name: sNames
        desc: sDesc
        cb: callback

regCommand ['资源', '仓库'], '查询仓库资源', (args, cmd, send, msg) ->
    if galAcgCache.length
        return send doGalAcgReadCache()
    # 抓取缓存
    doHttpGet 'http://www.galacg.me/sitemap.html', (str) ->
        doParseGalacg str
        send doGalAcgReadCache()

regCommand ['time', '时间', '报时'], '查询系统时间; 参数1 可为时差[整数型]', (args, cmd, send, msg) ->
    timeObj = new Date();
    tz = (if args.length then \
        parseInt((args[0].match(/-?\d+/)||[0])[0]) - timeObj.getTimezoneOffset() else 0);
    newHour = timeObj.getHours() + tz;
    while newHour < 0
        newHour += 24;
    # Send time
    send (if tz then 'UTC ' + (if tz > 0 then '+' else '-') + padZero(Math.abs(tz)) + ' 时间: ' else '') + padZero(newHour % 24)\
        + ':' + padZero(timeObj.getMinutes()) + ':' + padZero(timeObj.getSeconds())

regCommand ['sign', '签到'], '执行当天的签到, 重复签到将受惩罚~', (args, cmd, send, msg) ->
    timeNow = new Date;
    getUserInfo msg.qnum, (err, result)->
        if !result.length
            # 无此用户, 添加
            addUser msg.qnum
        doSignin msg.qnum, (err, result)->
            # Sign
            # console.log result[2][0]['@lastSign'], typeof result[2][0]['@lastSign']
            strLastSign = result[2][0]['@lastSign']
            lastTimeSign = new Date(strLastSign ||  0)
            if timeNow - lastTimeSign < 24*60*60*1000
                # 24 小时内签到 :/
                return send msg.from_user.nick + '已在 ' + strLastSign\
                    + ' 签到过了.\n作为惩罚, 接下来的 24 小时您将无法签到.'
            # 加钱
            ranMoneyTop = Math.random() * defConf.signMaxMoney
            send '签到成功! ' + msg.from_user.nick + ' 获得 $' + ranMoneyTop.toFixed (2)
            addMoney msg.qnum, ranMoneyTop

regCommand ['提现'], '嘛嘛~~', (args, cmd, send, msg) ->
    # 目标 ID
    # console.log JSON.stringify(msg)
    addMoney msg.qnum, -10
    send '成功提现 $10 到 Jixun 的账号 :3'

regCommand ['rob', '抢钱'], '抢别人的钱 :3', (args, cmd, send, msg) ->
    # 目标 ID
    # console.log JSON.stringify(msg)
    if args.length < 1
        return
    getUserInfo msg.qnum, (err, result)->
        if !result.length
            # 无此用户, 添加
            addUser msg.qnum
        tg = trimText(args[0]);
        getUserInfo tg, (err, result)->
            console.log err, result
            if !result.length
                return send '用户未注册或未在此开户 :3'
            doRobMoney msg.qnum, tg, (moneyRobbed) ->
                # rows[2][0]['@qNum']
                # rows[2][0]['@moneyBefore']
                send tg +  (if moneyRobbed > 0 then '被' else '反从 ')\
                    + msg.qnum + ' 抢走了 $'\
                    + Math.abs(moneyRobbed) + ', 真是可喜可贺可口可乐.'

regCommand ['money', 'balance', '余额'], '查询当前账号的余额', (args, cmd, send, msg) ->
    getUserInfo msg.qnum, (err, rows)->
        if !rows.length
            return send '用户未注册或未在此开户 :3'
        # console.log rows[0]['dMoneyLeft']
        send msg.from_user.nick + ' 尚有 $' + rows[0]['dMoneyLeft'] + ', 请继续履行救世主的责任.'

regCommand ['pay', '支付', '转账'], '<目标号码> <转账金额>', (args, cmd, send, msg) ->
    if args.length < 2
        return

    targetQNum = (args[0].match(/\d+/)||[])[0]
    if (!targetQNum)
        return
    targetMoney = Math.abs parseFloat args[1];
    getUserInfo msg.qnum, (err, rows)->
        if !rows.length
            return
        if rows[0]['dMoneyLeft'] < targetMoney
            return send sprintf '%s: 很抱歉, 余额不足, 转账失败 :(', msg.from_user.nick
        getUserInfo targetQNum, (err, rows)->
            if !rows.length
                return send sprintf '%s: 转账目标[%s]不存在 :(', msg.from_user.nick, targetQNum
            addMoney msg.qnum, -targetMoney
            addMoney targetQNum, targetMoney
            send sprintf '%s 成功转账 %s 给 [%s]', msg.from_user.nick, targetMoney, targetQNum

regCommand ['uptime', '运行时长'], '查询计算姬的运行时长', (args, cmd, send, msg) ->
    secs = (new Date().getTime() - start_at) / 1000
    aday  = 86400 
    ahour = 3600
    [day,hour,minute,second] = [secs/ aday,secs%aday/ ahour,secs%ahour/ 60,secs%60].map (i)-> padZero(parseInt(i))
    send "计算姬已执行 #{day}日 #{hour}时 #{minute}分 #{second}秒~"

regCommand ['roll', '摇点'], '摇点 0~100', (args, cmd, send, msg) ->
    send msg.from_user.nick + ' 摇了 ' + \
        (Math.round(Math.random() * 100) + \
            ( if args.length then (parseInt(args[0]) or 0)\
                else 0 )) + \
        ' 点';

regCommand ['hitokoto', '一句话', '来一句'], '从 [hitokoto.us] 随机抽取一句话', (args, cmd, send, msg) ->
    doHttpGet 'https://api.hitokoto.us/rand', (str) ->
        s = parseJSON str
        if s != 0
            send s.hitokoto + '\n　　—— ' + s.source||s.author

regCommand ['ping'], 'pong!', (args, cmd, send, msg) ->
    # console.log arguments
    send 'pong!'

osuReqModes = ['osu', '太鼓', 'CTB', 'mania'];
regCommand ['ostats'], '<用户名> [模式: 0/1/2/3] 查询某个用户的 osu 信息 :3', (args, cmd, send, msg) ->
    if args.length == 0
        return
    if args.length == 1
        args.push ('')
    
    osuMode = parseInt((args[1].match(/[0-3]/)||[0])[0])
    doHttpGet sprintf('https://osu.ppy.sh/api/get_user?k=%s&u=%s&m=%s', 
        defConf.osuApiKey, encodeURIComponent(args[0].replace(/_/g, ' ')), osuMode), (str) ->
            s = parseJSON str
            # console.log s, s.length
            if s == 0 || !s.length || !s[0].total_score
                return
            # read info
            send sprintf '''
%s 模式下, %s 的成绩如下:
总计分数: %s (#%s)
游戏次数: %s (lv%s)
　准确度: %s%%''', 
                osuReqModes[osuMode], s[0].username,
                s[0].ranked_score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), s[0].pp_rank,
                s[0].playcount, parseInt(s[0].level), parseFloat(s[0].accuracy).toFixed(2);


regCommand ['help', '帮助', '功能'], '显示该信息 :3', (args, cmd, send, msg) ->
    # console.log arguments
    send HELP_INFO

VERSION_INFO = """
v1.3 qqbot
二次开发: Jixun
"""

HELP_INFO = (() ->
    hi = ["帮助 - QBot 二次开发 By Jixun.Moe"]
    commandList.forEach (e) ->
        hi.push padRight('!' + e.name.join("/"), 22 ) + ' ' + e.desc
    hi.join "\n"
)()

regCommand ['about', 'version', '关于', '版本'], '查询机器人版本', (args, cmd, send, msg) ->
    send VERSION_INFO

module.exports = 
    commandList: commandList
    setDef: (def) ->
        defConf = def
    init: (db_, dbConf_, beginTime) ->
        db = db_
        dbConf = dbConf_
        defConf = dbConf.defConf
        start_at = beginTime