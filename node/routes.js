"use strict";

var nconf = require( 'nconf' );
var app = require( '../app' );
var _ = require( 'underscore' );
var formidable = require('formidable');
var assets = require( '../lib/assets' );
var rackspace = require( '../lib/rackspace' );
var auth = app.get( 'admin auth' );

/*** ERROR HANDLING ***/

// Handle 404
app.use( function( req, res ) {
	res.status( 400 );
	res.render( 'error/404.jade', {
		title: '404: Page Not Found',
		paths: assets.getPaths( req, 'app' )
	});
});

// Handle 500
app.use( function( error, req, res ) {
	res.status( 500 );
	res.render( 'error/500.jade', {
		title: '500: Internal Server Error',
		error: error,
		paths: assets.getPaths( req, 'app' )
	});
});

/*** ROUTE FUNCTIONS ***/
function indexAction( req, res ) {

	res.render( 'pages/index', {
		title: 'Comcast',
		paths: assets.getPaths( req, 'app' ),
		logo:nconf.get( 'app:logo' )
	});
}

/*** MAIN ROUTES ***/
var indexRoutes = [
	'/'
];

_.each( indexRoutes, function( route ) {
	app.get( route, auth, indexAction );
});

app.get( '/videos', auth, function( req, res ) {
	rackspace.listVideos( function( err, files ) {
		res.json( files );
	})
});

app.post( '/upload', auth, function( req, res ) {

	var form = new formidable.IncomingForm();

	form.onPart = function( part ) {

		if ( !part.filename ) {

			// let formidable handle all non-file parts
			form.handlePart( part );
		}
		else {

			var start = Date.now();

			var writeStream = rackspace.createUpload( part.filename, function( err, result ) {
				var seconds = ( Date.now() - start ) / 1000;
				console.log( err || 'Rackspace Upload Successful %ss', seconds.toFixed(2) );
			});

			part.pipe( writeStream );
		}
	};

	form.parse( req );
	res.send( 'End' );
});