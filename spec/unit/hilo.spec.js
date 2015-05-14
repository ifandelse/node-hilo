describe( "node-hilo - unit tests", function() {
	describe( "generated unit tests", function() {
		function getIds( cnt, hilo ) {
			var p = [];
			var idx = 0;
			while ( idx < cnt ) {
				p.push( hilo.nextId() );
				idx++;
			}
			return when.all( p );
		}

		function getExpected( cnt, startIdx ) {
			var expected = [];
			var idx = 0;
			while ( idx < cnt ) {
				expected.push( ( startIdx++ ).toString() );
				idx++;
			}
			return expected;
		}

		var hivals = [ "1", "10", "100", "1000", "10000", "100000", "1000000", "10000000", "100000000", "1000000000" ].map( function( x ) {
			return bigInt( x );
		} );

		hivals.forEach( function( startHival ) {
			describe( "when hival starts at " + startHival, function() {
				[ 1, 3, 5, 10, 100 ].forEach( function( maxLo ) {
					describe( "with a maxLo of " + maxLo, function() {
						var hilo, hival, expected, spy;
						var idCount = maxLo * 10;
						var maxLoPlusOne = maxLo + 1;
						var expCallCount = Math.ceil( idCount / maxLoPlusOne ) + ( idCount % maxLoPlusOne === 0 ? 1 : 0 );
						before( function() {
							hival = startHival;
							var stubiate = {
								first: function() {
									var val = { next_hi: hival++ };
									return when( val );
								},
								fromFile: function() {}
							};
							spy = sinon.spy( stubiate, "first" );
							hilo = getHiloInstance( stubiate, { hilo: { maxLo: maxLo } } );
						} );
						it( "should return expected ids for the given range", function() {
							return getIds( idCount, hilo ).then( function( ids ) {
								spy.callCount.should.equal( Math.ceil( expCallCount ) );
								ids.should.eql( getExpected( idCount, ( maxLoPlusOne * startHival ) ) );
								hilo.hival.should.equal( ( expCallCount + startHival - 1 ).toString() );
							} );
						} );
					} );
				} );
			} );
		} );
	} );
} );
