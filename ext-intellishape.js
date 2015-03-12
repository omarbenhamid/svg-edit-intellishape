//Load unistroke
var fileref=document.createElement('script')
fileref.setAttribute("type","text/javascript")
fileref.setAttribute("src", svgEditor.curConfig.extPath + 'unistroke.js')
document.getElementsByTagName("head")[0].appendChild(fileref)

svgEditor.addExtension("Intellishape", function() {
    
        var useProtractor = false;
        var minGestureScore = 0.8;
        
        
        var freehand = {
			minx: null,
			miny: null,
			maxx: null,
			maxy: null
		};
		var sumDistance = 0;
		var controllPoint2 = {x:0, y:0};
		var controllPoint1 = {x:0, y:0};
		var start = {x:0, y:0};
		var end = {x:0, y:0};
		var parameter;
		var nextParameter;
		var bSpline = {x:0, y:0};
		var nextPos = {x:0, y:0};
		var THRESHOLD_DIST = 0.8;
		var STEP_COUNT = 10;
		var d_attr;
		var shape;
		var started=true;
		
		
        //Instanciate recognizer
        var recognizer;
        var points;
        
    		
        var getBsplinePoint = function(t) {
            var spline = {x:0, y:0},
    			p0 = controllPoint2,
    			p1 = controllPoint1,
    			p2 = start,
    			p3 = end,
    			S = 1.0 / 6.0,
    			t2 = t * t,
    			t3 = t2 * t;
    
    		var m = [
    				[-1, 3, -3, 1],
    				[3, -6, 3, 0],
    				[-3, 0, 3, 0],
    				[1, 4, 1, 0]
    			];
    
    		spline.x = S * (
    			(p0.x * m[0][0] + p1.x * m[0][1] + p2.x * m[0][2] + p3.x * m[0][3] ) * t3 +
    				(p0.x * m[1][0] + p1.x * m[1][1] + p2.x * m[1][2] + p3.x * m[1][3] ) * t2 +
    				(p0.x * m[2][0] + p1.x * m[2][1] + p2.x * m[2][2] + p3.x * m[2][3] ) * t +
    				(p0.x * m[3][0] + p1.x * m[3][1] + p2.x * m[3][2] + p3.x * m[3][3] )
    		);
    		spline.y = S * (
    			(p0.y * m[0][0] + p1.y * m[0][1] + p2.y * m[0][2] + p3.y * m[0][3] ) * t3 +
    				(p0.y * m[1][0] + p1.y * m[1][1] + p2.y * m[1][2] + p3.y * m[1][3] ) * t2 +
    				(p0.y * m[2][0] + p1.y * m[2][1] + p2.y * m[2][2] + p3.y * m[2][3] ) * t +
    				(p0.y * m[3][0] + p1.y * m[3][1] + p2.y * m[3][2] + p3.y * m[3][3] )
    		);
    
    		return {
    			x:spline.x,
    			y:spline.y
    		};
    	};
    	
    	function renderRecognitionResult(shape,points,bbox) {
    	    var circleAspectRatio = 0.8;
    	    switch(shape){
    	        case "circle":
    	            /*var aspect = (bbox.maxx - bbox.minx)/(bbox.maxy - bbox.miny);
    	            if((1-Math.abs(aspect-1)) >= circleAspectRatio) {*/
    	            
        	            return svgCanvas.addSvgElementFromJson({
        					element: 'circle',
        					curStyles: true,
        					attr: {
        						id: svgCanvas.getId(),
        						cx:(bbox.minx + bbox.maxx)/2,
        						cy:(bbox.miny + bbox.maxy)/2,
        						r:(bbox.maxx - bbox.minx)/2,
        						opacity: 1
        					}
        				});
    	            
    				break;
    			default:
    			    message("I don't know how to render "+shape);
    	    }
    	}
    	
    	function message(msg){
    	    $.alert(msg);
    	}
        
        return {
                svgicons: svgEditor.curConfig.extPath + "intellishape-icon.xml",
                // Multiple buttons can be added in this array
			    buttons: [{
    				// Must match the icon ID in helloworld-icon.xml
    				id: "hello_world", 
				
    				// This indicates that the button will be added to the "mode"
    				// button panel on the left side
    				type: "mode", 
				
    				// Tooltip text
    				title: "Enable intelligent shape gestures", 
				
    				// Events
    				events: {
    					'click': function() {
    						// The action taken when the button is clicked on.
    						// For "mode" buttons, any other button will 
    						// automatically be de-pressed.
    						svgCanvas.setMode("intellishape");
    					}
    				}
    			}],
			// This is triggered when the main mouse button is pressed down 
			// on the editor canvas (not the tool panels)
    			mouseDown: function(opts) {
    				if(svgCanvas.getMode() != "intellishape") return;
    			    
    			    var zoom = svgCanvas.getZoom();
					
					// Get the actual coordinate by dividing by the zoom value
					var real_x = opts.start_x / zoom;
					var real_y = opts.start_y / zoom;
					points = [new Point(real_x,real_y)];
					
    				// Check the mode on mousedown
    				
    				start.x = real_x;
    				start.y = real_y;
    				end.x = real_x;
    				end.y = real_y;
    				started = true;
    				
    				controllPoint2 = {x:0, y:0};
				    controllPoint1 = {x:0, y:0};
				    sumDistance=0;
    				
    				
    				d_attr = real_x + ',' + real_y + ' ';
    				//d_attr = "0,0";
    				shape=svgCanvas.addSvgElementFromJson({
    					element: 'polyline',
    					curStyles: true,
    					attr: {
    						points: d_attr,
    						id: svgCanvas.getNextId(),
    						fill: 'none',
    						opacity: 0.5,
    						'stroke-linecap': 'round',
    						style: 'pointer-events:none'
    					}
    				});
    				freehand.minx = real_x;
    				freehand.maxx = real_x;
    				freehand.miny = real_y;
    				freehand.maxy = real_y;
    				
    				// The returned object must include "started" with 
    				// a value of true in order for mouseUp to be triggered
    				return {started: true};
    				
    			},
    			mouseMove: function(opts){
    			    if(svgCanvas.getMode() != "intellishape") return;
    			    if (!started) {return;}
		            //if (opts.button === 1 || canvas.spaceKey) {return;}
    			    var zoom = svgCanvas.getZoom();
					
					// Get the actual coordinate by dividing by the zoom value
					var real_x = opts.mouse_x / zoom;
					var real_y = opts.mouse_y / zoom;
					
    				points.push(new Point(real_x,real_y));
        			
        			freehand.minx = Math.min(real_x, freehand.minx);
    				freehand.maxx = Math.max(real_x, freehand.maxx);
    				freehand.miny = Math.min(real_y, freehand.miny);
    				freehand.maxy = Math.max(real_y, freehand.maxy);
    				end.x = real_x; end.y = real_y;
    				
    				
    				if (controllPoint2.x && controllPoint2.y) {
    					for (i = 0; i < STEP_COUNT - 1; i++) {
    						parameter = i / STEP_COUNT;
    						nextParameter = (i + 1) / STEP_COUNT;
    						bSpline = getBsplinePoint(nextParameter);
    						nextPos = bSpline;
    						bSpline = getBsplinePoint(parameter);
    						sumDistance += Math.sqrt((nextPos.x - bSpline.x) * (nextPos.x - bSpline.x) + (nextPos.y - bSpline.y) * (nextPos.y - bSpline.y));
    						if (sumDistance > THRESHOLD_DIST) {
    							d_attr += + bSpline.x + ',' + bSpline.y + ' ';
    							shape.setAttributeNS(null, 'points', d_attr);
    							sumDistance -= THRESHOLD_DIST;
    						}
    					}
    				}
    				controllPoint2 = {x:controllPoint1.x, y:controllPoint1.y};
    				controllPoint1 = {x:start.x, y:start.y};
    				start = {x:end.x, y:end.y};  
    			},
    			mouseUp: function(opts) {
    				// Check the mode on mouseup
    				if(svgCanvas.getMode() != "intellishape") return;
    				if (points.length >= 10)
    				{
    				    if(recognizer === undefined) recognizer = new DollarRecognizer();
    					var result = recognizer.Recognize(points, useProtractor);
    					console.log("Recognitized",result);
    					if(result.Score < minGestureScore) {
    					    //FIXME suggest shape ?
    					    message("Not recognized");
    					}else{
    					    var elem = renderRecognitionResult(result.Name,points,freehand);
    					    if(elem) {
        					    return {
        					        keep: true
        					    }
    					    }
    					}
    					
    				}
    				else // fewer than 10 points were inputted
    				{
    					message("Too few points made. Please try again.");
    				}
			    }
        };
});