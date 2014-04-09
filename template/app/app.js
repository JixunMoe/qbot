// app.js


var appBot = angular.module('jixun-qbot', [
	'ngRoute',
	'ui.bootstrap',
	'qC'
]);

appBot.config(['$routeProvider',
	function($routeProvider) {
		var funcList = 'code,groupmsg,friendReq'.split(',');

		funcList.forEach (function (e) {
			$routeProvider.when('/func/' + e, {
				templateUrl: 'res/' + e,
				controller: 'qbot-func-' + e
			})
		});

		$routeProvider.when('/main', {
			templateUrl: 'res/main.html'
		}).otherwise({
			redirectTo: '/main'
		});
	}
]);

var qbotController = angular.module('qC', []);

// 群发消息页
qbotController.controller('qbot-func-groupmsg', ['$scope', '$http',
	function($scope, $http) {
		$http.get ('/api?action=groupList')
		.success (function (r) {
			$scope.gList = r.data;

			$('#groupChoose').on('click', 'a', function (e) {
				$(e.target).toggleClass('active');
				e.preventDefault();
			});
		});
		$scope.keypress = function (e) {
			if (e.keyCode == 0x0D)
				$('#sendMsg').click();
		};

		$('#sendMsg').click(function () {
			var msgInput = $('#msgInput');
			if (!msgInput.val()) return;
			var groupList = [], that = $(this),
				msgList = $('<li>').text('发送 [')
					.append($('<span>').text(msgInput.val())).append('] …');

			$('#groupChoose>a.active').each(function(){
				groupList.push (parseInt($(this).attr('gid')));
			});
			$('#inputList').prepend(msgList);
			$.post('/api?action=groupmsg', {
				groupList: groupList,
				msg: msgInput.val()
			}, function (r) {
				var e = JSON.parse (r);
				if (e.error != 0) {
					msgList.append ('传送消息失败: ' + e.error);
				} else {
					msgList.append ('成功!');
					msgInput.select().focus();
				}
			});
		});
	}
]);

// 好友请求页
qbotController.controller('qbot-func-friendreq', ['$scope', '$routeParams', '$http',
	function($scope, $routeParams, $http) {

	}
]);

// 验证码输入页
qbotController.controller('qbot-func-code', ['$scope', '$routeParams', '$http',
	function($scope, $routeParams, $http) {
		$scope.submitting = false;
		$scope.keypress = function (e) {
			if (e.keyCode == 0x0D)
				$scope.submit ();
		};

		$scope.submit = function () {
			if ($scope.submitting) return;
			$scope.submitting = true;
			$.post('/api?action=code', {
				code: $('#codeInp').val()
			}, function () {
				$('#msg-code-submit').modal('show');
			});
		};
	}
]);
