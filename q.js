// Protection
// http://nodejs.org/api.html#_child_processes
var sys = require('sys'),
	cp = require('child_process'),
	qbotProc, qbotLastOutput, qbotTimer;

function trimText (inp) {
	return inp.toString().replace(/(^\s+|\s+$)/g, '');
}

function doExecuteQBot() {
	console.log ('[INFO ] doExecuteQBot');
	qbotProc = cp.spawn ('cmd', '/c coffee main.coffee'.split(' '));
	
	qbotProc.stdout.on('data', function (data) {
		console.log ('[STD O]', trimText(data));
		qbotLastOutput = new Date;
	});

	qbotProc.stderr.on('data', function (data) {
		console.log ('[STD E]', trimText(data));
	});

	qbotProc.on('close', function (code) {
		console.log ('[EXIT ] Process exit: ' + code);
		if (code != 0) {
			qbotLastOutput = 0;
			console.log ('[ERROR] QBot Crashed! Will restart with in 1 min...');
		}
	});
}

// Check output status every 5 mins
qbotTimer = setInterval (function () {
	console.log ('[INFO ] Checking qbot...');
	// If last update was 1.5 mins ago, respawn process.
	if (new Date - qbotLastOutput > 90 * 1000) {
		console.log ('[INFO ] Kill QBot if present...');
		// qbotProc.kill ('SIGTERM');
		try {
			process.kill(qbotProc.pid);
		} catch (e) {}
		console.log ('[INFO ] Start qbot...');
		doExecuteQBot ();
	}
}, 90 * 1000);

doExecuteQBot ();