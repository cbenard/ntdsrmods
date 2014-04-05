$(function()
{
	$('#frm').submit(function(e) {
    	e.preventDefault();
        window.close();
        return false;
	});
	
	$('#close').click(function(e) {
		e.preventDefault();
		window.close();
	});

	$('#currentVersion').text(chrome.runtime.getManifest().version);

	$('.toggleImageLink').click(function() {
		$('#' + $(this).attr('data-toggle')).slideToggle();
	});
});
