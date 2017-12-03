$(document).ready(function(){

	$.ajax({
		method: 'GET',
		url: '/api/sign-in'
	}).then(function(res){
		if(res.message === "signed-in"){
			window.location.href = '/profile/' + res.user_id
		}
	});

	$('#sign-in-form').on('submit', function(e){
		e.preventDefault();

		var signInObj = {
			username: $('#username-input').val(),
			password: $('#password-input').val()
		}

		$.ajax({
			method: 'POST',
			url: '/api/sign-in',
			dataType: 'json',
			data: JSON.stringify(signInObj),
			contentType: 'application/json'
		}).then(function(res){
			if(!res.success){
				if(res.info.message === "incorrect password"){
					alert("Incorrect Password for username")
				} else if (res.info.message === "no user"){
					alert("Username does not exist")
				}
			} else {
				window.location.href = '/profile/' + res.object.id
			}
		});
	});

});