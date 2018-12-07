require( "../setup" );
var processes = require( "processhost" )();
var seriate = require( "seriate" );
var tedious = require( "tedious" );
var config = require( "./intTestDbCfg.json" );
const ERR_CONSOLE_PREFIX = "Error executing integration tests:";

describe( "node-hilo integration tests", function() {
	describe.only( "when compared to a range of 10k NHibernate-generated keys", function() {
		const comparisons = [
			{ file: "../data/nhibernate.hival0.json", hival: "0" },
			{ file: "../data/nhibernate.hival10000.json", hival: "10000" },
			{ file: "../data/nhibernate.hival_1trillion.json", hival: "1000000000000" }
		];

		comparisons.forEach( function( comparison ) {
			describe( `with a starting hival of ${ comparison.hival }`, function() {
				let hilo;
				before( function( done ) {
					const connection = new tedious.Connection( {
						server: config.sql.server,
						authentication: {
							type: "default",
							options: {
								userName: config.sql.user,
								password: config.sql.password
							}
						},
						options: {
							database: "nhutil"
						}
					} );

					connection.on( "connect", err => {
						if ( err ) {
							console.error( ERR_CONSOLE_PREFIX, err ); /* eslint-disable-line no-console */
						}

						const hiloSqlReset = `UPDATE dbo.hibernate_unique_key WITH(rowlock,updlock) SET next_hi = ${ comparison.hival }`;

						const request = new tedious.Request( hiloSqlReset, e => {
							if ( e ) {
								console.error( ERR_CONSOLE_PREFIX, err ); /* eslint-disable-line no-console */
							}
							done();
						} );

						connection.execSql( request );
					} );

					hilo = getHiloInstance( seriate, Object.assign( config, { hilo: { maxLo: 100 } } ) );
				} );
				it( "should match nhibernate's keys exactly", function() {
					this.timeout( 20000 );
					return hilo.nextIds( 10000 ).then( function( ids ) {
						ids.should.eql( require( comparison.file ).nhibernate_keys );
					} );
				} );
			} );
		} );
	} );
	describe( "when multiple hilo clients are writing against a database (be patient, this could take a bit!)", function() {
		let nodeClient, cfg;
		before( function() {
			this.timeout( 600000 );
			nodeClient = {
				command: "node",
				args: [ "./spec/integration/testClient.js" ],
				restartLimit: false,
				start: true,
				restart: false
			};
			cfg = require( "./intTestDbCfg.json" );
			return new Promise( function( resolve, reject ) {
				seriate.getTransactionContext( cfg.sql )
					.step( "drop-hibernate_unique_key", {
						query: seriate.fromFile( "./NhibernateTable-Drop.sql" )
					} )
					.step( "create-hibernate_unique_key", {
						query: seriate.fromFile( "./NhibernateTable-Create.sql" )
					} )
					.step( "drop-ZeModel", {
						query: seriate.fromFile( "./ZeModelTable-Drop.sql" )
					} )
					.step( "create-ZeModel", {
						query: seriate.fromFile( "./ZeModelTable-Create.sql" )
					} )
					.step( "StartingHival", {
						query: "INSERT INTO hibernate_unique_key SELECT @hival",
						params: {
							hival: {
								type: seriate.BIGINT,
								val: cfg.test.startingHiVal
							}
						}
					} )
					.end( function( result ) {
						result.transaction.commit()
							.then( resolve, reject );
					} )
					.error( function( err ) {
						reject( err );
					} );
			} );
		} );
		it( "should let all clients create keys without errors or conflicts", function( done ) {
			this.timeout( 600000 );
			let stopped = 0;
			let running = 0;
			processes.setup( {
				clientA: nodeClient,
				clientB: nodeClient,
				clientC: nodeClient
			} ).then( function( handles ) {
				running = handles.length;
				handles.forEach( function( handle ) {
					handle.on( "crashed", function() {
						handle.stop();
						stopped++;
						if ( stopped === running ) {
							seriate.first( cfg.sql, {
								query: "SELECT COUNT(DISTINCT ID) AS cnt FROM ZeModel"
							} ).then( function( data ) {
								data.cnt.should.equal( handles.length * cfg.test.recordsToCreate );
								done();
							}, console.log ); // eslint-disable-line no-console
						}
					} );
				} );
			} );
		} );
	} );
} );
