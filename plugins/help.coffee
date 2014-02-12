HELP_INFO = ""

fs = require 'fs'
Path = require 'path'
dbConf = require './dbConf'
util = require 'util'
sprintf = util.format
mysql = require 'mysql2'
core = require './main.core'
conf = require '../config'
#file_path = Path.join __dirname, "..", "package.json"
#bundle = JSON.parse( fs.readFileSync file_path )
###################################


# 毫秒亲
start_at = +new Date()

# 允许同时执行多条语句
dbConf.sqlConnect.multipleStatements = true;

db = mysql.createConnection(dbConf.sqlConnect)
db.connect()
console.log 'Unable connect to database :/'  if not db

console.log "Init database..."
db.query sprintf('''
    create database if not exists `jixun`;
    use `jixun`;
    create table if not exists `qbot` (
        `qNum` VARCHAR(20) NOT NULL,
        `tLastSign` TIMESTAMP NULL,
        `dMoneyLeft` FLOAT NULL,
        UNIQUE INDEX `qNum_UNIQUE` (`qNum` ASC)
    )ENGINE = %s;
''', dbConf.sqlEngine), (err) ->
    throw new Error(err)  if err
    # Done;

# 关了就是真的关了…
# db.end()


reloadModule = (modName) ->
  delete require.cache[require.resolve(modName)]  if require.cache[require.resolve(modName)]
  require modName

# 删除首尾的空格
trimText = (inputText) ->
  return inputText.toString().replace(/(^\s*|\s*$)/g, '');

# 解析输入指令
parseCommand = (inputCommand)->
    rret = {  }; ret = ['']; cCode = 0; lastChr = 0; chr=0; curId = 0; inQuote = false; i=1;
    # Text's already trimed.i = 1
    while i < inputCommand.length
        addStr = false;
        if (cCode = inputCommand.charCodeAt(i)) is 32 #空格
            if inQuote
                addStr = true
            else if lastChr != chr && ret[ret.length - 1]
                ret.push ""
                curId++
        else if cCode is 34 # 引号
            inQuote = not inQuote
        else
            addStr = true
        # 继续 :3
        ret[curId] += String.fromCharCode(cCode) if addStr
        lastChr = cCode;
        i++;
    if (ret.length)
        rret.command = ret[0].toLowerCase();
        ret.shift()
        rret.args = ret;
    # console.log 'Parse Command: ' + JSON.stringify rret
    return rret;

# 初始化
doServerReload = () ->
    console.log 'doServerReload: 重载核心插件'
    foo = {c: core}
    delete foo.c
    core = reloadModule './main.core'
    core.init db, dbConf, start_at, doServerReload

core.init db, dbConf, start_at, doServerReload
###
 @param content 消息内容
 @param send(content)  回复消息
 @param robot qqbot instance
 @param msg 原消息对象
###

module.exports = (contentInput, send, robot, msg)->
    if conf.conf.ban && -1 != conf.conf.ban.indexOf msg.qnum
        console.log '黑名单用户 [%s] 发言, 已过滤.', msg.qnum
        return
    content = trimText (contentInput);
    if (!/^(\/|!)/.test(content))
        return; # Not Command

    # Get commands
    parsedCommand = parseCommand content;
    # console.log 'Recv. Command: ', parsedCommand
    isOp = dbConf.defAdmin.indexOf(msg.qnum) != -1;

    core.commandList.forEach (e) ->
        if -1 != e.name.indexOf parsedCommand.command
            console.log '[函数匹配][%s]: %s', e.name, parsedCommand.command
            try
                e.cb parsedCommand.args, parsedCommand.command, send, msg, isOp
            catch err
                console.log err.message + '\n' + err.stack
                send '梦姬执行遇到错误并记录, 请等主人上线后报告 >//<'
