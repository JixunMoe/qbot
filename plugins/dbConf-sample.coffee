# 请注意这里的内容不会自动重载

module.exports =
	sqlConnect:
		# MySQL 配置设定
	    host: "localhost"
	    port: 3306
	    user: "MySQL 用户名"
	    password: "MySQL 密码"

	# MySql 引擎; 建议为 InnoDB
	sqlEngine: 'InnoDB'

	defConf:
		# 用户默认的金钱;
		money: 250
		# 签到最大金额
		signMaxMoney: 8
		# OSU-API-Key
		osuApiKey: 'http://osu.ppy.sh/p/api'
	# 能操作系统指令的 Q 号
	defAdmin:
		['号码1', '号码2']
