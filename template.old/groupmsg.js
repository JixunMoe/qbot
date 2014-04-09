$(function ($){
	$('#status').fadeOut (1).css({
		marginLeft: '2em'
	});

	$(document.body).on ('click', '.group', function (e) {
		$('#groupid').val($(e.target).attr('data-group')).change();
		$('#message').focus();
	}).on('click', '#send', function(e) {
		$('#status').fadeIn().text('正在提交…');
		$.post('/sendmsg', {
			type: 'group',
			groupid: $('#groupid').val (),
			msg: $('#message').val()
		}, function(data) {
			$('#status')
				.text(data && !data.error?'提交成功 owo':'提交发生错误 oAo')
				.delay(1500).fadeOut();
		}, 'json');
	});

	$('#groupid').on('keyup paste change', function () {
		$('#groupstr').text ($('[data-group="' + $(this).val() + '"]').text() || '?');
	});

	$('#message').on('keypress', function (e) {
		if (e.ctrlKey && !e.altKey && !e.shiftKey && e.keyCode == 0x0A)
			$('#send').click();
	});
});