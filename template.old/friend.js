;$(function () {
	// Friend.js
	$('.fr').each(function (i, e) {
		var qNum = $(e).attr('data');
		$(e)
			.append(' -> ')
			.append($('<a>').addClass('accept').text('接受').attr('href', '?action=accept&Q=' + qNum))
			.append(' | ')
			.append($('<a>').addClass('deny').text('拒绝').attr('href', '?action=deny&Q=' + qNum))
	});
});