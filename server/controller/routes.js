var pg = require('pg');
var fs = require('fs');
var multer = require('multer');
var path = require('path');

const { exec } = require('child_process');

if(process.env.DATABASE_URL){
	dbUrl = process.env.DATABASE_URL
} else {
	dbUrl = {
		user: process.argv.POSTGRES_USER,
		password: process.argv.POSTGRES_PASSWORD,
		database: 'pg_pass',
		host: 'localhost',
		port: 5432
	};
}

var pgClient = new pg.Client(dbUrl);

pgClient.connect();

var express = require('express');
var path = require('path');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');

var router = express.Router();

var html_creator = require('../helpers/html_creator.js');

const aws = require('aws-sdk');
const S3_BUCKET = process.env.S3_BUCKET;
const AWS_SECRET_ACCESS_KEY=process.env.AWS_SECRET_ACCESS_KEY;
const s3 = new aws.S3();

passport.serializeUser(function(user,done){
	done(null, user);
});

passport.deserializeUser(function(obj,done){
	done(null, obj);
});

passport.use('local-signin', new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password',
	passReqToCallback: true
},
function(req, username, password, done){
	process.nextTick(function(){
		pgClient.query("SELECT * FROM users WHERE username='" + username + "'", (err, user) => {
			if(user.rows.length < 1)
				return done(null, false, {message: 'no user'});
	        if (!bcrypt.compareSync(password, user.rows[0].password)){
	          return done(null, false, {message: 'incorrect password'});
	        }
			return done(null, user.rows[0]);
		});
	});
}));

passport.use('local-signup', new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password',
	passReqToCallback: true
},
function(req, username, password, done){
	process.nextTick(function(){
		pgClient.query("SELECT username FROM users WHERE username='" + username + "'", (err, user) => {
			if(user.rows.length > 0){
				return done(null, false, {message: 'username taken'});
			} else {
				var salt = bcrypt.genSaltSync(10);
				var hashedPassword = bcrypt.hashSync(password, salt);
				var query = "INSERT INTO users (name, username, password) VALUES ($1,$2,$3)";
				pgClient.query(query, [req.body.name, username, hashedPassword], (error,queryRes) => {
					if(error){
						console.error(error)
					} else {
						return done(null, queryRes)
					}
				});
			};
  		});
    });
}));

router.get('/api/sign-up', function(req,res){
	if(req.user){
		res.json({message: 'signed-in', user_id: req.user.id});
	}
});

router.get('/api/sign-in', function(req,res){
	if(req.user){
		res.json({message: 'signed-in', user_id: req.user.id});
	}
});

router.post('/api/sign-up', function(req,res,next){
	passport.authenticate('local-signup', function(err, user, info){
		if (err) {
			return next(err);
		} else {
			res.json({user: user, info: info})
		}
	})(req, res, next);
});

router.post('/api/sign-in', function(req,res,next){
	passport.authenticate('local-signin', function(err, user, info){
	    if (err) {
	      	return next(err);
	    }
	    if (!user) {
	    	return res.json({ success : false, message : 'authentication failed', info: info });
	    }
	    req.login(user, function(err){
		if(err){
			return next(err);
		}
      	return res.status(200).json({ success : true, message : 'authentication succeeded', object : user });        
		});
  	})(req, res, next);
});

router.get('/', function(req,res){
	res.sendFile(path.join(__dirname, '../../app/client/public/html/main_page.html'));
});

router.get('/sign-up', function(req,res){
	res.sendFile(path.join(__dirname, '../../app/client/public/html/sign_up.html'));
});

router.get('/sign-in', function(req,res){
	res.sendFile(path.join(__dirname, '../../app/client/public/html/sign_in.html'));
});

router.get('/api/signed-in', (req,res) => {
	if(req.user){
		res.json({message: 'signed-in', user_id: req.user.id});
	}
})

router.get('/profile/:id', (req,res) => {
	if(req.user){

		if (!fs.existsSync('./app/client/public/images/' + req.user.username)){
		    fs.mkdirSync('./app/client/public/images/' + req.user.username);
		}

		var userInfo = [];
		var query = `SELECT name FROM users WHERE id=${req.params.id}`;
		pgClient.query(query, (error,queryRes) => {
			if(error){
				res.json({error: error})
			} else {
				res.set('Content-Type', 'text/html');
				res.send(html_creator(queryRes.rows[0]));
			}
		});
	} else {
		res.redirect('/');
	}
});

router.delete('/api/logout-user', function (req, res) {
  req.session.destroy(function(out){
    res.json({message: "logout successful"})
  });
});

var storage = multer.diskStorage({
    destination: function(req, file, callback){
    	callback(null, './app/client/public/images/' + req.user.username);
    },
    filename: function(req, file, callback){
        callback(null, file.originalname);
    }
});
var upload = multer({storage: storage});

router.post('/fileupload', upload.single('myFile'), (req,res) => {
	var params = {Bucket: S3_BUCKET, Key: '', Body: ''};
	var fileStream = fs.createReadStream(path.join(__dirname, '../../app/client/public/images/' + req.user.username + "/" + req.file.originalname));
	fileStream.on('error', function(err) {
	  console.log('File Error', err);
	});
	params.Body = fileStream;

	params.Key = req.user.username + "/" + req.file.originalname;
	s3.upload(params, function(err, data) {
		if(err){
			res.json({error: err})
		} else {
			res.json({result: "Image Uploaded", data: data})
			exec('rm -rf ' + path.join(__dirname, '../../app/client/public/images/*'), (err, stdout, stderr) => {
			  if (err) {
			    return;
			  }
			});
		}
	});
});

router.get('/images', function(req,res){
	if(req.user){
		s3.listObjects({Bucket: S3_BUCKET}, function(err, data) {
			var images = []
		    if (err) {
		      console.log("Error", err);
		    } else {
		   	  	data.Contents.forEach((image) => {
			   	  	if(image.Key.split("/")[0] === req.user.username){
			   	  		images.push(image.Key.split("/")[1])
						// var params = {Bucket: S3_BUCKET, Key: image.Key};
						// var file = require('fs').createWriteStream(path.join(__dirname, '../../app/client/public/images/' + image.Key));
						// s3.getObject(params).createReadStream().pipe(file);
			   	  	}
		   	  	})
		   	  	res.json({images: images, user: req.user.username, bucket: S3_BUCKET})
		    }
		});
	} else {
		res.redirect("/")
	}
});

module.exports = router;