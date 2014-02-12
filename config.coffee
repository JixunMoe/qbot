yaml = require 'js-yaml'
fs   = require 'fs'

expConf = {}

doConfReload = () ->
	expConf.conf = yaml.load fs.readFileSync './config.yaml', 'utf8'

expConf = 
	conf: {}
	save: (newConf) ->
		fs.writeFileSync './config.yaml', yaml.safeDump(newConf, 
			skipInvalid: true
		)
		expConf.conf = newConf;
	reload: doConfReload

doConfReload()

module.exports = expConf