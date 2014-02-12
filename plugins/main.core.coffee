db = null
dbConf = {}
defConf = {}
http = require 'http'
https = require 'https'
util = require 'util'
mathjs = require 'mathjs'
sprintf = util.format
start_at = 0
conf = require '../config'
if !conf.conf.ban
    conf.conf.ban = [];


# Null Function
nullFunc = -> ;

doServerReload = nullFunc;

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
        doEscape(uid), doEscape(defConf.money)), cb

# 如果减的话把 money 设为负值即可 :3
addMoney = (uid, money, cb = nullFunc) ->
    db.query sprintf('update `qbot` set `dMoneyLeft` = `dMoneyLeft` +%s where `qNum` like "%s"',
        doEscape(money), doEscape(uid)), cb

# 获取用户信息
getUserInfo = (uid, cb = nullFunc) ->
    db.query sprintf('select * from `qbot` where `qNum`="%s" limit 1', doEscape(uid)), cb

# 抢钱函数
# doRobMoney msg.qnum, tg, forceOther, (moneyRobbed) ->
doRobMoney = (uid, target, forceOther, cb = nullFunc) ->
    moneyRobbed = (Math.random() * 50 - (if forceOther then 60 else 30)).toFixed(2)
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
''', doEscape(uid)), cb


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
        ret.push galAcgCache[genPool[ranNum]].t + ':\n - ' + galAcgCache[genPool[ranNum]].l
        genPool.splice ranNum, 1
    return (ret.join '\n') + '\n\n以上资源由《绅士仓库》友情提供.'

parseJSON = (input) ->
    if(/^[\],:{}\s]*$/.test(input.replace(/\\["\\\/bfnrtu]/g, '@')\
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')\
            .replace(/(?:^|:|,)(?:\s*\[)+/g, '')))
        return JSON.parse input
    return 0

padRight = (inputStr, targetNum) ->
    tgtLen = inputStr.length + (inputStr.match(/[^\x00-\xff]/g)||[]).length
    while tgtLen < targetNum
        inputStr += '　'
        tgtLen+=2
    inputStr+=' '  if tgtLen & 1
    inputStr

commandList = []
regCommand = (sNames, sDesc, callback) ->
    commandList.push 
        name: sNames
        desc: sDesc
        cb: callback

regCommand ['资源', '仓库', 'ck', 'zy'], '查询仓库资源', (args, cmd, send, msg) ->
    if galAcgCache.length
        return send doGalAcgReadCache()
    # 抓取缓存
    doHttpGet 'http://www.galacg.me/sitemap.html', (str) ->
        doParseGalacg str
        send doGalAcgReadCache()

regCommand ['time', '时间', '报时'], '查询系统时间; 参数1 可为时差[整数型]', (args, cmd, send, msg) ->
    timeObj = new Date();
    args.push ''
    tz = parseInt((args[0].match(/-?\d+/)||[0])[0]);
    newHour = timeObj.getHours() + tz - timeObj.getTimezoneOffset();
    newHour += 24  while newHour < 0
    # Send time
    send 'UTC ' + (if tz >= 0 then '+' else '-') + padZero(Math.abs(tz)) + ' 时间: ' + padZero(newHour % 24)\
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
            return send '抱歉, 系统错误 :/\n' + err  if err
            strLastSign = result[2][0]['@lastSign']
            lastTimeSign = new Date(strLastSign ||  0)
            # 改成 16 小时
            if timeNow - lastTimeSign < 16*60*60*1000
                # 24 小时内签到 :/
                return send msg.from_user.nick + '已在 ' + strLastSign\
                    + ' 签到过了.\n作为惩罚, 接下来的 16 小时内您将无法签到.'
            # 加钱
            ranMoneyTop = Math.random() * defConf.signMaxMoney
            send '签到成功! [' + msg.from_user.nick + '] 获得 $' + ranMoneyTop.toFixed (2)
            addMoney msg.qnum, ranMoneyTop

###
regCommand ['提现', 'alipay', '折现'], '嘛嘛~~', (args, cmd, send, msg) ->
    # 目标 ID
    # console.log JSON.stringify(msg)
    addMoney msg.qnum, -10
    send '成功提现 $10 到 Jixun 的账号 :3'
###

bodyPos = [ '手掌', '双脚', '熊脸', 
            '脸蛋', '鼻子', '小嘴', 
            '大○ [警×蜀黍就是他!!]', 
            '大× [不忍直视]', '双眼', 
            '脖子', '胸口', '大腿', '脚踝',
            '那里 >////<', '腋下', '耳朵',
            '小腿', '袜子', '臭脚' ]
regCommand ['prpr', '舔舔'], '赛高!', (args, cmd, send, msg) ->
    if args.length > 0
        send sprintf '%s 舔了舔 %s 的 %s... 我好兴奋啊!', msg.from_user.nick,\
            args[0].replace(/\s+/g, ' '),\
            (if args.length > 1 && args[1] && args[1] != '>' \
                then args[1] else bodyPos[Math.floor(Math.random() * bodyPos.length)])

burnEqup = ['汽油', '火把']
regCommand ['烧', '烧烧', '烧烧烧', 'fff'], '火把在哪!', (args, cmd, send, msg) ->
    if args.length > 0
        send sprintf '快烧掉 %s, 壮哉我大 FFF!\n看, 我手上突然出现了%s! 这可是火之神的旨意!',\
            args.join('、'), burnEqup[Math.floor(Math.random() * burnEqup.length)]

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
            pre = ''
            forceOther = false
            if !result.length
                return send '用户未注册或未在此开户 :3'
            if result[0]['dMoneyLeft'] < 0
                pre = sprintf '%s 已经没钱了, 因此 ', tg
                forceOther = true
            doRobMoney msg.qnum, tg, forceOther, (moneyRobbed) ->
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

regCommand ['pay'], '<目标号码> <数量>', (args, cmd, send, msg) ->
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
            return send sprintf '%s: 很抱歉, 余-额不足, 转-账失败 :(', msg.from_user.nick
        getUserInfo targetQNum, (err, rows)->
            if !rows.length
                return send sprintf '%s: 转-账目标[%s]不存在 :(', msg.from_user.nick, targetQNum
            addMoney msg.qnum, -targetMoney
            addMoney targetQNum, targetMoney
            send sprintf '%s 成功转-账 %s 给 [%s]', msg.from_user.nick, targetMoney, targetQNum

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
###
regCommand ['hito', '一句话', '来一句'], '从 [hitokoto.us] 随机抽取一句话', (args, cmd, send, msg) ->
    doHttpGet 'http://api.hitokoto.us/rand', (str) ->
        s = parseJSON str
        if s != 0
            send s.hitokoto + '\n　　—— ' + s.source||s.author
###
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

regCommand ['晚安', 'gn'], '晚安~', (args, cmd, send, msg) ->
    send '晚安, ' + (if args.length > 0 then args[0] else msg.from_user.nick) + '~'

regCommand ['欢迎'], '<新人昵称> 新人进群时用~~', (args, cmd, send, msg) ->
    if args.length > 0
        send '欢迎新人 [' + args[0] + '] ~\n新人新年好, 红包果照都拿来吧 owo'

regCommand ['save'], '储存设定, 用户操作后必须 *', (args, cmd, send, msg, isOp) ->
    if !isOp
        console.log '/save 指令: %s 的权限不足 :/', msg.from_user.nick
        return
    conf.save conf.conf
    send sprintf '[%s] 设定储存完毕 owo', msg.from_user.nick

filterNum = (inp) -> (inp.match(/\d+/)||[0])[0]

regCommand ['ban'], '封锁 *', (args, cmd, send, msg, isOp) ->
    if !isOp || args.length < 1
        console.log '/ban 指令: %s 的权限不足 :/', msg.from_user.nick
        return
    i = 0; n = '';
    while i<args.length
        if (k = filterNum(args[i])) && -1 == conf.conf.ban.indexOf k
            conf.conf.ban.push k
        i++
    # conf.save conf.conf
    send sprintf '[%s] 封禁完毕: %s', msg.from_user.nick, args.join('、')

regCommand ['banlist'], '查询封锁 *', (args, cmd, send, msg, isOp) ->
    if !isOp
        console.log '/banlist 指令: %s 的权限不足 :/', msg.from_user.nick
        return
    send sprintf '[%s] 封锁名单: %s', msg.from_user.nick, conf.conf.ban.join('、')

cleanArray = (inputArr) ->
    ret = []
    inputArr.forEach (e) ->
        ret.push e  if e
    ret

regCommand ['unban'], '取消封锁 *', (args, cmd, send, msg, isOp) ->
    if !isOp || args.length < 1
        console.log '/unban 指令: %s 的权限不足 :/', msg.from_user.nick
        return
    i = 0; j = 0; k = '';
    newBanList = []
    while i<args.length
        # 如果黑名单存在, 移除
        if (k = filterNum(args[i])) && -1 != j = conf.conf.ban.indexOf k
            delete conf.conf.ban[j]
        i++
    conf.conf.ban = cleanArray conf.conf.ban
    send sprintf '[%s] 解封完毕: %s', msg.from_user.nick, args.join('、')

regCommand ['reload'], '重载服务器 *', (args, cmd, send, msg, isOp) ->
    if isOp
        conf.reload()
        doServerReload()
        send '[系统] [' + msg.from_user.nick + '] 插件重载完毕~ :3'
        return
    console.log '/reload 指令: %s 的权限不足 :/', msg.from_user.nick

rmSign = (num) ->
    Math.abs(num) || ''

getSign = (num) ->
    return (if num.toString().slice(0,1) == '-' then '-' else '+')

regCommand ['math', 'maths', '数学'], '显示该信息 :3', (args, cmd, send, msg) ->
    if args.length < 2
        return
    mathFunc = args[0]
    i = 0
    switch args.shift()
        when "quad"
            if args.length < 3
                return
            # Solve
            args[i] = parseInt(args[i++])  while i < 3
            # (-b +/- sqrt(b^2 - 4ac))/2
            det = args[1] * args[1] - 4 * args[0] * args[2]
            qsol = ''
            if det < 0
                # Imaginary number, i
                left = args[1] / args[0] / -2
                right = Math.sqrt(det * -1) / args[0] / 2
                qsol = left.toFixed(3) + '\xB1' + right.toFixed(3) + 'i'
            else if det == 0
                # 1 Solution
                qsol = (-1 * args[1] / args[0] / 22).toFixed(3)
            else
                # 2 Solutions
                det = Math.sqrt(det)
                qsol = [((-1 * args[1] + det) / args[0] / 2).toFixed(3),
                        ((-1 * args[1] - det) / args[0] / 2).toFixed(3)].join ('、')
            send sprintf '%sx\xB2^2 %s %sx %s %s 的结果: %s',
                args[0], getSign(args[1]), rmSign(args[1]), getSign(args[2]), rmSign(args[2]), qsol
        when 'eval'
            if args.length < 1
                return
            evalCommand = trimText (args.join ' ').replace(/\s+/g,' ')
            if evalCommand.length > 100
                return send sprintf '[%s]: 很抱歉, 您输入的指令太长了 :/', msg.from_user.nick
            try
                send sprintf '[%s]: 运算结果为: %s', msg.from_user.nick, mathjs().eval(evalCommand)
            catch err
                console.log 'Exp. error: %s', evalCommand
                send sprintf '[%s]: 运算表达式错误 :/', msg.from_user.nick

helpList = []
helpTotal = 0
regCommand ['help', '帮助', '功能'], '显示该信息 :3', (args, cmd, send, msg) ->
    # console.log arguments
    args.push ''
    page = parseInt((args[0].match(/\d+/)||[1])[0])
    if page > helpTotal
        return send sprintf '页码 %s 超出帮助范围 :/', page
    stRow = 5 * (page - 1)
    send sprintf '''
        帮助 - Coffee.Bot 二次开发 By Jixun.Moe
        %s
        第 %s 页, 共 %s 页;%s
    ''', helpList.slice(stRow, stRow + 5).join('\n'), page, helpTotal,
         (if page is helpTotal then '' else sprintf ' 输入 !%s %s 查看下一页', cmd, page + 1)

VERSION_INFO = """
v1.3.1 Coffee Bot
二次开发: Jixun
"""

regCommand ['about', 'version', '关于', '版本'], '查询机器人版本', (args, cmd, send, msg) ->
    send VERSION_INFO

commandList.forEach (e) ->
    helpList.push padRight('!' + e.name.join("/"), 22 ) + ' ' + e.desc
helpTotal = Math.ceil(helpList.length / 5)

module.exports = 
    commandList: commandList
    setDef: (def) ->
        defConf = def
    init: (db_, dbConf_, beginTime, doServerReload_) ->
        db = db_
        dbConf = dbConf_
        defConf = dbConf.defConf
        start_at = beginTime
        doServerReload = doServerReload_