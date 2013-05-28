// Type: views/module
// File: ticket-resources.js

define([
	'jquery',
	'backbone',
	'models/File',
	'util' ],

function( $, Backbone, Files, util ) {
	
	function _addResource() {
		
		this.$( '#ticket-resources-upload' ).click();
	}
	
	function _uploadResource( ev ) {
		
		this._files.upload( ev.currentTarget );
	}
	
	function _downloadResource( ev ) {
		
		this._files.download( _getRowId( ev ), this.$( '#ticket-resources-iframe') );
	}
	
	function _deleteResource( ev ) {
		
		this._files.destroyFile( _getRowId( ev ) );
		
		return false;
	}
	
	function _getRowId( ev ) {
		return $( ev.currentTarget ).closest( '.list-row' ).data( 'id' );
	}

	function _formatFile( file ) {

		return {
			id: file.id,
			name: file.get( 'name' ),
			size: util.round( file.get( 'size' ) / 1024, 1 ) + 'k',
			created: util.format.date( file.get( 'created' ), 'Mmm d, yyyy' )
		}
	}

	function _drawFiles() {

		var count = this._files.length;

		// toggle showing message or table based on if there are any rows
		this.$el.toggleClass( 'empty', !count );

		// draw out files
		this.$( '.list-body' ).fillTemplate( 'ticket-resources-row', this._files.map( _formatFile ) );

		// show the number of files
		this.$( '.module-count' ).html( count );
	}

	function _toggleShow() {
		this.$el.toggleClass( 'open' );
	}
	
	// Make the actual view public. 
	return Backbone.View.extend({
		
		el: '#ticket-resources',
		
		events: {
			'click #ticket-add-resource': _addResource,
			'change #ticket-resources-upload': _uploadResource,
			'click .file-name-trigger': _downloadResource,
			'click .file-delete': _deleteResource,
			'click h4': _toggleShow
		},
		
		initialize: function() {
			
			// populate collection with ticket's "files" attribute
			this._files = new Files( this.model.get( 'files' ), { parent: this.model });
			
			this.smartBind( 'add', this._files, _drawFiles );
			this.smartBind( 'remove', this._files, _drawFiles );
		},
		
		render: function() {
			
			this.$el.fillTemplate( 'ticket-resources-module' );
			
			_drawFiles.call( this );
			
			return this;
		}
	});
});
