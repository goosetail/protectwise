"use strict";

var nconf = require( 'nconf' );
var pkgcloud = require( 'pkgcloud' );
var client = pkgcloud.storage.createClient({
	provider: 'rackspace',
	username: nconf.get( 'rackspace:username' ),
	apiKey: nconf.get( 'rackspace:apiKey' ),
	region:	nconf.get( 'rackspace:region' )
});

// define exports
module.exports = {
	createUpload: createUpload,
	deleteFile: deleteFile,
	listVideos: listVideos
};

/**
 * List all the video names in the container.
 *
 * @param callback
 */
function listVideos( callback ) {

	var folder = nconf.get( 'rackspace:videoFolder' );
	var len = folder.length;

	client.getFiles( nconf.get( 'rackspace:container' ), function(err, files) {

		var output = [];

		if ( err ) {
			callback( err );
			return;
		}

		files.forEach( function( file ) {
			if ( file.name.substr( 0, len ) === folder ) {
				output.push({ name: file.name.slice( len ) });
			}
		});

		callback( null, output );
	});
}

/**
 * Push video to the cloud.
 *
 * @param name
 * @param callback
 * @returns {*}
 */
function createUpload( name, callback ) {

	return client.upload(
		{
			container: nconf.get( 'rackspace:container' ),
			remote: nconf.get( 'rackspace:videoFolder' ) + name
		},
		callback );
}

/**
 * Delete the video from the cloud.
 *
 * @param name
 * @param callback
 */
function deleteFile( name, callback ) {
	client.removeFile( nconf.get( 'rackspace:container' ), name, callback );
}