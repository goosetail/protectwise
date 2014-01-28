"use strict";

var mongoose = require( 'mongoose' );
var async = require( 'async' );
var _ = require( 'underscore' );
var Party = mongoose.model( 'Party' );
var Side = mongoose.model( 'Side' );

// define export
module.exports = {
	getByOwner: getByOwner,
	getByUid: getByUid,
	create: create,
	update: update,
	details: details,
	createSide: createSide,
	deleteSide: deleteSide,
	selectSide: selectSide,
	dashboard: dashboard
};

/**
 * Get all parties by owner.
 *
 * @param userId
 * @param callback
 */
function getByOwner( userId, callback ) {
	Party.find({ owner: userId }, callback );
}

/**
 * Find a party by it's UID.
 *
 * @param uid
 * @param callback
 */
function getByUid( uid, callback ) {
	Party.findOne({ uid: uid }, function( err, party ) {
		callback( err, party && party.toObject() );
	});
}

/**
 * Creates a new party.
 *
 * @param data
 * @param callback
 */
function create( data, callback ) {
	data.created = new Date();
	Party.create( data, callback );
}

/**
 * Updates the party information.
 *
 * @param owner
 * @param data
 * @param callback
 */
function update( owner, data, callback ) {

	var id = data._id;
	delete data.__v;
	delete data._id;
	delete data.created;
	delete data.owner;
	delete data.uid;

	Party.findOneAndUpdate({ _id: id, owner: owner }, data, callback );
}

/**
 * Generate the data needed for the dashboard screen.
 *
 * @param userId
 * @param callback
 */
function dashboard( userId, callback ) {

	var parallel = {};

	if ( !userId ) {
		callback( 'Requires user ID' );
	}
	else {

		parallel.myParties = function( topCallback ) {

			async.waterfall([
				function( cb ) {
					Party.find({ owner: userId }, cb );
				},
				function( parties, cb ) {

					var uids = _.map( parties, function( party ) {
						return party.uid;
					});

					var options = {
						query: { party: { $in: uids } },
						map: function () {
							emit( this.party, {
								total: 1,
								selected: this.status == 'selected' ? 1 : 0
							});
						},
						reduce: function( k, data ) {

							var output = {
								total: 0,
								selected: 0
							};

							data.forEach( function( val ) {
								output.total += val.total;
								output.selected += val.selected;
							});

							return output;
						}
					};

					Side.mapReduce( options, function( err, results ) {

						if ( err ) {
							cb( err );
						}
						else {
							cb( null, _.map( parties, function( party ) {

								var stats = _.find( results, function( obj ) {
									return obj._id === party.uid;
								});

								party = party.toObject();

								party.count = stats && stats.value;

								return party;
							}));
						}
					});
				}

			], topCallback );
		};

		parallel.attendingParties = function( topCallback ) {

			async.waterfall([

				// first step is to get all sides the you have offered to bring.
				function( cb ) {
					Side
						.find({ selectedBy: userId })
						.select( 'party description' )
						.exec( cb );
				},

				// then fetch all the parties for those sides (unless it's your party)
				function( sides, cb ) {

					var uids = [];
					var stats = {};

					_.each( sides, function( side ) {

						var uid = side.party;

						uids.push( uid );

						if ( stats[ uid ] ) {
							stats[ uid ].count++;
							stats[ uid ].descriptions.push( side.description );
						}
						else {
							stats[ uid ] = {
								descriptions: [ side.description ],
								count: 1
							}
						}
					});

					Party
						.find({ uid: { $in: uids } })
						.exec( function( err, parties ) {

							if ( err ) {
								cb( err );
							}
							else {
								cb( null, _.map( parties, function( party ) {
									party = party.toObject();
									party.stats = stats[ party.uid ];
									return party;
								}));
							}
						});
				}

			], topCallback );
		};

		async.parallel( parallel, callback );
	}
}

/**
 * Generate the data needed for party details page.
 *
 * @param uid
 * @param callback
 */
function details( uid, callback ) {

	var parallel = {};

	if ( !uid ) {
		callback( 'Requires party UID' );
	}
	else {
		parallel.party = function( cb ) {
			Party
				.findOne({ uid: uid })
				.populate( 'owner', 'first last' )
				.exec( cb );
		};
		parallel.sides = function( cb ) {
			Side
				.find({ party: uid })
				.populate( 'createdBy selectedBy', 'first last' )
				.exec( cb );
		};

		async.parallel( parallel, callback );
	}
}

/**
 * Creates a new side item on the party registry.
 *
 * @param data
 * @param callback
 */
function createSide( data, callback ) {

	if ( !data.party ) {
		callback( 'Must have party associated with side' );
	}
	else {

		data.created = new Date();
		data.status = 'active';

		async.waterfall([
			function( cb ) {
				Side.create( data, cb );
			},
			function( side, cb ) {
				Side.populate( side, { path: 'createdBy', select: 'first last' }, cb );
			}
		], callback );
	}
}

/**
 * Toggles the "selection" of a side item.
 *
 * @param id
 * @param select
 * @param user
 * @param callback
 */
function selectSide( id, select, user, callback ) {

	if ( !id || !user) {
		callback( 'Requires side ID and user ID' );
	}
	else {

		async.waterfall([
			function( cb ) {
				var update = select ? { selectedBy: user, status: 'selected' } : { $unset: { selectedBy: 1 }, status: 'active' };
				Side.findByIdAndUpdate( id, update, cb );
			},
			function( side, cb ) {
				Side.populate( side, { path: 'selectedBy', select: 'first last' }, cb );
			}
		], callback );
	}
}

/**
 * Removes a side item from the registry.
 *
 * @param id
 * @param callback
 */
function deleteSide( id, callback ) {

	if ( !id ) {
		callback( 'Requires side ID' );
	}
	else {
		Side.remove({ _id: id }, callback );
	}
}