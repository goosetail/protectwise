// Type: views/module
// File: ticket-edit.js

define([
	'jquery',
	'underscore',
	'backbone',
	'formbinding',
	'models/Project',
	'models/Stage',
	'models/User',
	'zing.user',
	'zing.locale',
	'zing.utils',
	'views/modules/ticket/ticket-time-tracking',
	'views/modules/ticket/ticket-timer',
	'views/modules/ticket/ticket-resources',
	'views/modules/ticket/ticket-dependencies',
	'views/modules/ticket/ticket-tasks',
	'views/modules/ticket/ticket-tags',
	'util' ],

function( $, _, Backbone, FormBinding, projects, stages, users, zUser, zLocale, zUtils, TicketTracking, TicketTimer, TicketResources, TicketDependencies, TicketTasks, TicketTags, util ) {
	
	function _save( ev ) {

		var model = this.model;
		
		Backbone.trigger( 'show-loading', 'saving...' );

		// if you are in an input, make sure to allow the change event to fire
		$( ev.target ).blur();

		// make sure due date is in right format
		if ( model.hasChanged( 'due' ) ) {
			model.set( 'due', new Date( model.get( 'due' ) ), { silent: true } );
		}
		
		$.when( model.saveChanges() ).done( function() {
			Backbone.trigger( 'last-screen', 'dashboard' );
		});
	}
	
	function _cancel() {
		
		this.model.reset();

		Backbone.trigger( 'last-screen', 'dashboard' );
	}
	
	function _deleteTicket() {
		
		if ( confirm( zLocale.text( 'message', 'ticket-delete' ) + '\n\n' + this.model.get( 'title' ) ) ) {
			
			this.model.destroy();

			Backbone.trigger( 'last-screen', 'dashboard' );
		}
	}

	function _archiveTicket() {

		if ( confirm( zLocale.text( 'message', 'ticket-archive' ) + '\n\n' + this.model.get( 'title' ) ) ) {

			this.model.archive();

			Backbone.trigger( 'last-screen', 'dashboard' );
		}
	}

	function _copyTicket() {

		Backbone.trigger( 'show-loading', 'copying...' );

		this.model.copy( function( ticket ) {

			Backbone.trigger( 'navigate', '/ticket/' + ticket.id );

		});
	}
	
	function _changeOwner() {
		
		var select = this.$( '#owner-select' );
		var val = select.val();
		var user;
		
		if ( val ) {
			
			this.model.set({ 'owner': val }, { silent: true });
			
			user = users.get( val );
			
			select.prev().html( zUser.drawUser( user ) );
		}
		
		select.next().find( '.input-text' ).val( '' );
		
		return false;
	}
	
	function _usersLoaded() {
		
		var $ownerSelect = this.$( '#owner-select' );
		var $notifySelect = this.$( '#notify-select' );
		var $ownerBucket = this.$( '#owner-bucket' );
		var $notifyBucket = this.$( '#notify-bucket' );
		var owner = users.get( this.model.get( 'owner' ) );
		
		if ( owner ) {
			$ownerBucket.append( zUser.drawUser( owner ) );
		}
		
		// get only the users for this network
		_.each( users.getByNetwork( this.model.get( 'network' ) ), function( user ) {

			var values = {
				value: user.id, 
				text: user.getFullName()
			};

			$ownerSelect.appendTemplate( 'app-option', values );
			$notifySelect.appendTemplate( 'app-option', values );
		});

		$ownerSelect.combobox({ placeholder: zLocale.text( 'change owner' ) });
		$notifySelect.combobox({ placeholder: zLocale.text( 'add to notify list' ) });

		_.each( this.model.get( 'notify' ), function( id ) {
			var user = users.get( id );

			if ( user ) {
				$notifyBucket.append( zUser.drawUser( user ) );
			}
		});
	}
	
	function _finalRender() {

		_usersLoaded.call( this );

		zUtils.updateProjectDropdown.call( this, this.model.get( 'network' ) );
		zUtils.updateStageDropdown.call( this );
				
		// render the sub-modules
		this.nest( new TicketTags({ model: this.model }).render() );
		this.nest( new TicketTracking({ model: this.model }).render() );
		this.nest( new TicketTimer({ model: this.model }).render() );
		this.nest( new TicketDependencies({ model: this.model }).render() );
		this.nest( new TicketResources({ model: this.model }).render() );
		this.nest( new TicketTasks({ model: this.model }).render() );
	}
	
	function _changeInput( ev ) {
		
		// really dirty...love it.
		$( ev.currentTarget )
			.parent()
				.hide()
				.next()
					.css( 'display', 'block' );
	}

	function _initMenu() {

		this._$menu = $.fillTemplate( 'app-dropdown-menu', {
			'copy': { event: 'copy' },
			'archive': { event: 'archive' },
			'delete': { event: 'delete' }
		});

		this._$menu
			.menu()
			.appendTo( 'body' )
			.addClass( 'options-dropdown' )
			.on( 'click', '.menu-event', _.bind( _menuEvent, this ) );
	}

	function _menuEvent( ev ) {

		var event = $( ev.currentTarget ).data( 'event' ).split( '-' );

		_hideMenu.call( this );

		switch( event[ 0 ] ) {
			case 'delete':
				_deleteTicket.call( this );
				break;
			case 'archive':
				_archiveTicket.call( this );
				break;
			case 'copy':
				_copyTicket.call( this );
				break;
		}

		return false;
	}

	function _showMenu() {

		var offset = this.$( '.options-trigger' ).offset();

		this._$menu
			.show()
			.css({
				top: offset.top + 17,
				left: offset.left - 90
			});

		return false;
	}

	function _hideMenu() {

		this._$menu
			.hide()
			.menu( 'collapseAll' );
	}

	function _changePriority( ev ) {

		var val = $( ev.currentTarget ).data( 'priority' );

		this.model
			.trigger( 'change:priority', null, val )
			.set({ priority: parseFloat( val ) }, { silent: true });
	}

	function _changeStatus( ev ) {

		var val = $( ev.currentTarget ).data( 'status' );

		this.model
			.trigger( 'change:status', null, val )
			.set({ status: parseFloat( val ) }, { silent: true });
	}

	function _renderButtonSelect( $el, val ) {

		this.$( '.' + $el.data( 'bind' ) + '-level.level-' + val )
			.addClass( 'active' )
			.siblings()
				.removeClass( 'active' );
	}
	
	// Make the actual view public. 
	return Backbone.View.extend({
		
		id: 'ticket-edit',
		
		className: 'module',
		
		events: {
			'click .save': _save,
			'click .cancel': _cancel,
			'click .remove-avatar': zUser.removeUser,			
			'click .options-trigger': _showMenu,
			'click .change': _changeInput,
			'click .priority-level': _changePriority,
			'click .status-level': _changeStatus,
			'change [name="project"]': zUtils.updateStageDropdown,
			'selected #owner-select': _changeOwner,
			'selected #notify-select': zUser.addUser
		},
		
		initialize: function() {			
			
			this.load(
				projects.advancedFetch( false ),
				users.advancedFetch( false ),
				stages.advancedFetch( 300 )
			);
			
			this.smartRegister( this.model );
			this.smartBind( 'body-click', _hideMenu );

			this.registerMiddleware( zUtils.checkModelStatus, this );

			this.shortcuts({
				'alt-S': _save,
				'esc': _cancel
			});

			this.on( 'cleanup', function() {

				// manually remove menu when module is removed
				this._$menu.remove();

				// remove model if not active
				if ( this.model.get( 'documentState' ) != 1 && this.model.collection ) {
					this.model.collection.remove( this.model, { silent: true } );
				}

			}, this );
			
			this.createSchema({
				'project.title': {
					collection: projects
				},
				'status': {
					get: function( val ) {
						return this.model.getText( 'status', val );
					},
					complete: _renderButtonSelect
				},
				'priority': {
					get: function( val ) {
						return this.model.getText( 'priority', val );
					},
					complete: _renderButtonSelect
				},
				'due': {
					attr: 'value',
					get: function( val ) {
						return util.format.date( val, 'mm/dd/yyyy' );
					}
				},
				'documentState': {
					get: function( val ) {
						return this.model.getText( 'documentState', val );
					},
					complete: function( $el, val ) {
						if ( val == 2 ) {
							$el.addClass( 'archived' );
						}
						else if ( val == 3 ) {
							$el.addClass( 'deleted' );
						}
						else {
							$el.hide();
						}
					}
				}
			});
		},
		
		render: function() {
			
			this.$el.fillTemplate( 'ticket-edit-module', {}, this.model );

			_initMenu.call( this );

			this.$( '.input-date' ).datepicker();

			this.complete( function() {
				_finalRender.call( this );
				
				// bind the model to view
				FormBinding.bind( this );
			
				this.bindSchema();
			});

			return this;
		}
	});
});
