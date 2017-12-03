$(document).ready(function(){

	$('#logout-button').on('click', function(e){
		e.preventDefault();
		
		$.ajax({
			method: 'DELETE',
			url: '/api/logout-user'
		}).then(function(res){
			window.location.href = "/"
		});
	});

	$('#file-form').on('submit', function(e) {
		e.preventDefault();
      	var formData = new FormData($(this)[0]);
	   	$.ajax({
			url: '/fileupload',
			type: 'POST',
			data: formData,
			async: false,
			cache: false,
			contentType: false,
			enctype: 'multipart/form-data',
			processData: false,
			success: function (response) {
				appendImages();
			}
	   	});
	   	return false;
	});

	function appendImages(){
		$.ajax({
			method: 'GET',
			url: '/images'
		}).then(function(res){
			$('#dyn-image-div').remove();
			var imageDiv = $('<div id="dyn-image-div">')
			var img;
			for(var i = 0; i < res.images.length; i++){
				img = $('<img>',{
					height: 125,
					width: 'auto',
					src: '../public/images/' + res.user + '/' + res.images[i]
				});
				imageDiv.append(img)
				$('#images-div').append(imageDiv)
			}
		});
	};
	appendImages();

});