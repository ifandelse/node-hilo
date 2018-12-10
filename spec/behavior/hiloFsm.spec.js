describe.only( "hiloFsm", () => {
	let subject,
		machina,
		bigInt,
		Connection,
		HiloGenerationError,
		fs,
		path,
		Request,
		sql,
		fsm,
		createTediousConfig;

	beforeEach( () => {
		machina = {
			Fsm: sinon.stub(),
			transition: sinon.stub()
		};
		bigInt = sinon.stub();
		Connection = sinon.stub();
		HiloGenerationError = sinon.stub();
		fs = sinon.stub();
		path = sinon.stub();
		Request = sinon.stub();
		sql = "SQLCONFIG";
		createTediousConfig = sinon.stub();

		subject = proxyquire( "../src/hiloFsm", {
			machina,
			"big-integer": bigInt,
			tedious: {
				Connection,
				Request
			},
			"./HiloGenerationError": HiloGenerationError,
			fs,
			path,
			"./createTediousConfig": createTediousConfig
		} )( { sql } );
		fsm = machina.Fsm.getCall( 0 ).args[ 0 ];
	} );

	describe( "state", () => {
		it( "should have an initialState of uninitialized", () => {
			fsm.initialState.should.eql( "uninitialized" );
		} );

		describe.only( "_transitionToFailure", () => {
			beforeEach( () => {
				fsm._transitionToFailure.call( machina, "ERROR" );
			} );

			it( "should transition to dbFailure", () => {
				machina.transition.should.be.calledOnce()
					.and.calledWith( "ERROR" );
			} );
		} );
	} );
} );
