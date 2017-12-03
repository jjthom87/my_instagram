$(document).ready(function(){

	$.ajax({
		method: 'GET',
		url: '/api/signed-in'
	}).then(function(res){
		if(res.message){
			if(res.message === "signed-in"){
				var a = $('<a>',{
					type: 'button',
					href: '/profile/' + res.user_id,
					text: 'Profile'
				});
				a.addClass('btn btn-success sign-buttons');
				$('#direct-buttons').append(a);

				$('#sign-up-button').attr('disabled', true);
				$('#sign-in-button').attr('disabled', true);
			}
		} else {
			$('#sign-up-button').attr('disabled', false);
			$('#sign-in-button').attr('disabled', false);
		}
	});

});