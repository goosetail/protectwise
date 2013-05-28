'use strict';

/* Controllers */

var ToolbarCtrl = [ '$rootScope', 'config', 'Data', 'API', 'Util', 'PubSub', function( $rootScope, config, Data, API, Util, PubSub ) {

	$rootScope.toolbarLoading = true;

	// we don't like IE
	if ( document.documentMode && document.documentMode < 8 ) {
		return;
	}

	// if there are no tokens and a slug is passed, we want to show an anonymous version of the
	// toolbar primarily for the login page.
	if ( config.whit_access_token || config.moauth_access_token ) {

		Data.fetch()
			.success( function( data ) {

				$rootScope.toolbarLoading = false;

				if ( data.status == 'success' ) {
					$rootScope.data = data.data;
					$rootScope.isSuperAdmin = $rootScope.data.is_super_admin;

					// init the API
					API.init( data.data );

					// set the global
					Util.setObject( 'ecollege.toolbar.Toolbar.data', data.data, window );

					// announce the toolbar load
					PubSub.publish( 'toolbar-ready', [ data.data ] );
				}
				else {
					$rootScope.toolbarError = 'The toolbar is currently unavailable.';
				}
			})
			.error( function() {
				$rootScope.toolbarLoading = false;
				$rootScope.toolbarError = 'The toolbar is currently unavailable.';
			});
	}
	else {
		$rootScope.anonToolbar = true;
		$rootScope.toolbarLoading = false;
		$rootScope.toolbarError = 'The toolbar is currently unavailable.';
	}

}];

var ProfileCtrl = [ '$scope', 'Util', 'config', function( $scope, Util, config ) {

	$scope.$watch( 'data', function( data ) {

		if ( data ) {

			var avatarUrl = ( ( data.profile.avatar[0] == '/' ) ? config.server : '' ) + data.profile.avatar;
			var token = encodeURIComponent( data.tokens.whit_access_token );
			var refreshToken = encodeURIComponent( data.tokens.whit_refresh_token );
			var affinityId = Util.affinityIdFromToken( data.tokens.affinity_access_token );

			$scope.avatar = avatarUrl;
			$scope.name = data.profile.name;

			if ( data.institution.is_social ) {
				$scope.profileText = 'View Profile';
				$scope.profileId = 'social_toolbar_account_link';
				$scope.profileUrl = Util.socializeURL( Util.replace( data.config.profile_url, {
					affinityId: affinityId,
					token: token,
					refresh_token: refreshToken
				}), true );
			}
			else {
				$scope.profileText = 'Edit Profile';
				$scope.profileId = 'ecollege_toolbar_account_link';
				$scope.profileUrl = Util.replace( data.config.profile_url, { token: token });
			}

			if ( data.is_super_admin ) {
				$scope.superAdminUrl = data.config.admin_root + '/admin.html?token=' + token;
			}

			if ( data.config.settings_url ) {
				$scope.settingsUrl = Util.socializeURL( Util.replace( data.config.settings_url, {
					affinityId: affinityId,
					token: token,
					refresh_token: refreshToken
				}), true );
			}

			if ( data.institution.is_admin ) {
				$scope.adminUrl = Util.replace( data.config.admin_url, {
					token: token,
					refresh_token: refreshToken
				});
			}

			$scope.helpUrl = data.config.help_url;

			if ( data.config.get_satisfaction_fastpass_url ) {
				$scope.forumUrl = 'javascript:FASTPASS.popout_gsfn();';

				// Get Satisfaction SSO (GS code...mostly)
				Util.loadScript( config.server + '/js/lib/fastpass.js' );
				Util.loadScript( data.config.get_satisfaction_fastpass_url );
			}
			else if ( data.config.get_satisfaction_url ) {
				$scope.forumUrl = data.config.get_satisfaction_url;
			}
		}
	});
}];

var MainCtrl = [ '$scope', 'Util', function( $scope, Util ) {

	$scope.$watch( 'data', function( data ) {

		if ( data ) {

			$scope.dashboardUrl = Util.socializeURL( createUrl( data.config.dashboard_url ) );
			$scope.institution = data.institution.name;

			// only add the share link if the share_url is included in the config
			if ( data.config.share_url ) {
				$scope.shareUrl = Util.socializeURL( createUrl( data.config.share_url ) );
			}

			renderCourses();
		}

		function createUrl( link ) {

			return Util.replace( link, {
				token: encodeURIComponent( data.tokens.whit_access_token ),
				refresh_token: encodeURIComponent( data.tokens.whit_refresh_token )
			});
		}

		function renderCourses() {

			var token = data.tokens.whit_access_token;
			var len = data.courses.length;

			if ( len ) {

				$scope.courses = Util.map( data.courses, function( course ) {

					return {
						id: course.campusId,
						title: course.title,
						url: data.config.ph_root + "/transfer.html?action=launchCourse&courseId=" + course.campusId + "&token=" + encodeURIComponent( data.tokens.whit_access_token ),
						code: course.displayCourseCode
					}
				});
			}
			else {
				$scope.message = 'You are currently not enrolled in any courses.';
			}
		}
	});
}];

var NotificationsCtrl = [ '$scope', '$timeout', 'Notifications', 'Util', function( $scope, $timeout, Notifications, Util ) {

	var timeoutHook;
	var interval;

	// private
	function update( resp ) {
		this.loading = false;
		this.message = resp.items.length ? '' : 'You do not have any notifications.';

		this.notifications = resp.items;
		this.badgeCount = resp.unread.length;
	}

	function error() {
		this.loading = false;
		this.message = 'Notifications are temporarily unavailable.';
	}

	function runInterval( ) {
		timeoutHook = $timeout( $scope.getNotifications, interval * 1000 );
	}

	// initialize scope variables
	$scope.notifications = [];
	$scope.badgeCount = 0;
	$scope.loading = false;
	$scope.showWidget = false;

	// make notifications request
	$scope.getNotifications = function( type ) {

		// if we are already waiting on a request, do not make another one
		if ( $scope.loading ) {
			return;
		}

		$scope.loading = true;

		Notifications
			.fetch( type || 'unread' )
			.then( angular.bind( $scope, update ), angular.bind( $scope, error ) );
	};

	// listen for the dropdown to close to mark all read
	$scope.$on( 'dropdown-closed', function() {
		Notifications.markRead();
		$scope.badgeCount = 0;
	});

	// if there is now link, just do nothing
	$scope.followLink = function( ev, note ) {
		if ( !note.link ) {
			ev.preventDefault();
		}
	};

	$scope.runInterval = function() {
		$scope.getNotifications();

		if ( interval ) {
			timeoutHook = $timeout( $scope.runInterval, interval * 1000 );
		}
	};

	$scope.stopInterval= function( interval ) {
		$timeout.cancel( timeoutHook );
	};

	$scope.$watch( 'data', function( data ) {

		if ( data && data.institution && data.institution.is_social ) {

			var token = encodeURIComponent( data.tokens.whit_access_token );
			var affinityId = Util.affinityIdFromToken( data.tokens.affinity_access_token );

			$scope.showWidget = true;

			Notifications.setUrls({
				root: data.config.notifications_root_url,
				unread: Util.replace( data.config.notifications_url, { affinity_id: affinityId, token: token }),
				all: Util.replace( data.config.notifications_all_url, { affinity_id: affinityId, token: token }),
				read: Util.replace( data.config.notifications_read_url, { affinity_id: affinityId, token: token }),

			});

			$scope.getNotifications( 'all' );

			interval = data.config.notifications_polling_interval;
			timeoutHook = $timeout( $scope.runInterval, interval * 1000 );
		}
	});
}];

var GmailCtrl = [ '$scope', 'Google', function( $scope, Google ) {

	// private
	function update( resp ) {
		this.loading = false;
		this.message = resp.length ? '' : 'You have no unread emails.';
		this.emails = resp;
		this.badgeCount = resp.length;
	}

	function error( resp ) {
		this.loading = false;
		this.message = 'Gmail is temporarily unavailable.';
	}

	$scope.emails = [];
	$scope.badgeCount = 0;
	$scope.loading = false;
	$scope.showWidget = false;

	$scope.getEmails = function( token ) {

		// if we are already waiting on a request, do not make another one
		if ( $scope.loading ) {
			return;
		}

		$scope.loading = true;

		Google
			.fetch( 'gmail', token )
			.then( angular.bind( $scope, update ), angular.bind( $scope, error ) );
	};

	$scope.$watch( 'data', function( data ) {

		if ( data && data.institution && data.institution.is_google ) {

			var domain = data.institution.google_domain;

			$scope.showWidget = true;
			$scope.gmailLink = ( domain ) ? 'https://mail.google.com/a/' + domain : "https://mail.google.com";
			$scope.getEmails( data.tokens.whit_access_token );
		}
	});
}];

var CalendarCtrl = [ '$scope', 'Google', function( $scope, Google ) {

	// private
	function update( resp ) {
		this.loading = false;
		this.message = resp.length ? '' : 'No upcoming events in the next 7 days.';
		this.events = resp;
		this.badgeCount = resp.length;
	}

	function error( resp ) {
		this.loading = false;
		this.message = 'Google Calendar is temporarily unavailable.';
	}

	$scope.events = [];
	$scope.badgeCount = 0;
	$scope.loading = false;
	$scope.showWidget = false;

	$scope.getEvents = function( token ) {

		// if we are already waiting on a request, do not make another one
		if ( $scope.loading ) {
			return;
		}

		$scope.loading = true;

		Google
			.fetch( 'calendar', token )
			.then( angular.bind( $scope, update ), angular.bind( $scope, error ) );
	};

	$scope.$watch( 'data', function( data ) {

		if ( data && data.institution && data.institution.is_google ) {

			var domain = data.institution.google_domain;

			$scope.showWidget = true;
			$scope.calendarLink = ( domain ) ? 'https://calendar.google.com/a/' + domain : "https://calendar.google.com";
			$scope.getEvents( data.tokens.whit_access_token );
		}
	});
}];

var DocsCtrl = [ '$scope', 'Google', function( $scope, Google ) {

	// private
	function update( resp ) {
		this.loading = false;
		this.message = resp.length ? '' : 'No documents found.';
		this.docs = resp;
	}

	function error( resp ) {
		this.loading = false;
		this.message = 'Google Docs is temporarily unavailable.';
	}

	$scope.docs = [];
	$scope.loading = false;
	$scope.showWidget = false;

	$scope.getDocs = function( token ) {

		// if we are already waiting on a request, do not make another one
		if ( $scope.loading ) {
			return;
		}

		$scope.loading = true;

		Google
			.fetch( 'docs', token )
			.then( angular.bind( $scope, update ), angular.bind( $scope, error ) );
	};

	$scope.getBadgeCount = function( token ) {
		for ( var i = 0, count = 0, l = $scope.docs.length; i < l; i++ ) {
			$scope.docs[ i ].unread && count++;
		}
		return count;
	};

	$scope.$watch( 'data', function( data ) {

		if ( data && data.institution && data.institution.is_google ) {

			var domain = data.institution.google_domain;

			$scope.showWidget = true;
			$scope.docsLink = ( domain ) ? 'https://docs.google.com/a/' + domain : 'https://https://docs.google.com';
			$scope.getDocs( data.tokens.whit_access_token );
		}
	});
}];