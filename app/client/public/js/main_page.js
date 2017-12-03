$(document).ready(function(){

	$.ajax({
		method: 'GET',
		url: '/api/signed-in'
	}).then(function(res){
		if(res.message){
			if(res.message === "signed-in"){
				var aProfile = $('<a>',{
					type: 'button',
					href: '/profile/' + res.user_id,
					text: 'Profile'
				});
				aProfile.addClass('btn btn-success sign-buttons');
				var aLogout = $('<a>',{
					type: 'button',
					href: '/api/logout-user',
					text: 'Logout',
					id: 'main-page-logout-button'
				});
				aLogout.addClass('btn btn-danger sign-buttons');

				$('#direct-buttons').append(aProfile).append(aLogout);

				$('#sign-up-button').attr('disabled', true);
				$('#sign-in-button').attr('disabled', true);
			}
		} else {
			$('#sign-up-button').attr('disabled', false);
			$('#sign-in-button').attr('disabled', false);
		}
	});

	$(document).on('click', '#main-page-logout-button', function(){		
		$.ajax({
			method: 'DELETE',
			url: '/api/logout-user'
		}).then(function(res){
			if(res.message === "logout successful"){
				window.location.href = "/sign-in"
			}
		});
	});

});