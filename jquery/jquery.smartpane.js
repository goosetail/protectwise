( function( moduleDef ) {
	
	if ( typeof define === 'function' && define.amd ) {
		// AMD. Register as an anonymous module. 
		define( ['jquery'], moduleDef );
	} 
	else {
		// Browser globals
		moduleDef( jQuery );
	}
	
}( function( $ ) {
	
	function smartPane( options ) {
		
		var el = $( this );
		var handles = options.handles || [];
		var sibs = options.siblings;
		
		$.each( handles, function( i, hand ) {
			
			var handle = $( '<div class="pane-' + hand + '-handle"></div>' );
			var sibs = options.siblings && options.siblings[ hand ] || [];
			var props;
			
			el.append( handle );
			
			switch ( hand ) {
				case 'n': props = [ 'pageY', -1, 'height' ]; break;
				case 'e': props = [ 'pageX', 1, 'width' ]; break;
				case 's': props = [ 'pageX', -1, 'height' ]; break;
				case 'w': props = [ 'pageX', -1, 'width' ]; break;
			}

			handle.on( 'mousedown', function( ev ) {

				ev.preventDefault();

				var left = ev[ props[ 0 ] ];
				var size = el[ props[ 2 ] ]();
				var adjust = 0;

				$( window ).on( 'mousemove', function( ev ) {

					adjust = ( ev[ props[ 0 ] ] - left ) * props[ 1 ];

					el[ props[ 2 ] ]( size + adjust );
					
					$.each( sibs, function( i, sib ) {
						
						var obj = {};
						obj[ sib.prop ] = size + adjust;

						$( sib.el ).css( obj );
					});
				});

				$( window ).on( 'mouseup', function( ev ) {
					$( window ).off( 'mousemove mouseup' );
				});
			});
		});
	}
	
	function init() {
		
		var args = arguments;
		
		this.each( function() {
			smartPane.apply( this, args );
		});
	}
	
	$.fn.smartPane = init;
	
} ) );
