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
})
