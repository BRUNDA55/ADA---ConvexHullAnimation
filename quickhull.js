var refEdgeColor = "rgba(0, 0, 255, 0.5)"
var checkEdgeColor = "rgba(255, 0, 0, 0.5)"
var hullEdgeColor = "rgba(0, 255, 0, 0.5)"
var edges = []

/**
* Removes all edges from the canvas
*/
function clearHull(two) {
    if (edges.length == 0) { return }
    
    for (var i in edges) {
        two.remove(edges[i])
    }
}

/**
* Draws an edge onto the canvas
*/
function createEdge(two, color, v1, v2) {
    edge = two.makeLine(v1.x, v1.y, v2.x, v2.y)
    edge.linewidth = 3
    edge.stroke = color
    edge.scale = 0.0
    edges.push(edge) 
    return edge
}

/**
* Determines if v1 -> v2 -> v3 is a left turn
*/    
function leftTurn(v1, v2, v3) {
    det = (v2.x - v1.x) * (v3.y - v1.y) - (v2.y - v1.y) * (v3.x - v1.x)
    return det < 0
}

/**
* Determines if v1 -> v2 -> v3 is a right turn
*/
function rightTurn(v1, v2, v3) {
    det = (v2.x - v1.x) * (v3.y - v1.y) - (v2.y - v1.y) * (v3.x - v1.x)
    return det > 0
}

function findLeftmostPoint(vertices) {
    leftMost = vertices[0]
    
    for (var i in vertices) {
        if (vertices[i].x < leftMost.x) { leftMost = vertices[i] }
    }
        
    return leftMost
}

function findRightmostPoint(vertices) {
    rightMost = vertices[0]
    
    for (var i in vertices) {
        if (vertices[i].x > rightMost.x) { rightMost = vertices[i] }
    }
        
    return rightMost
}

/**
* Sorts vertices into an array based on whether or not
* they form a right or left turn with line ab
*/
function sortVertices(vertices, a, b, turn) {
    v = []

    for (var i in vertices) {
        if (turn(a, b, vertices[i])) { v.push(vertices[i]) }
    }
        
    return v
}

/**
* Returns the distance from point v to the line
* going throughs points p1 and p2
*/
function lineDistance(p1, p2, v) {
    num = Math.abs(
        ((p2.y - p1.y) * v.x) - ((p2.x - p1.x) * v.y) + (p2.x * p1.y) - (p2.y * p1.x)
    )
    
    den = Math.sqrt(
        (p2.y - p1.y)**2 + (p2.x - p1.x)**2
    )
    
    return num / den
}

/**
* Colours all edges
*/
function colorEdges(color) {
    for (var i in edges) {
        edges[i].stroke = color
    }
}

/**
* Gets the execution speed from the DOM
*/
function getSpeed() {
    speed = document.getElementById('speed').value
    return speed / 100
}

var quickHull = {
    execute : function(vertices, two) {
        pauseButton = document.getElementById("pause");
        pauseButton.disabled = false
        
        // Clear the previous hull, if it exists
        clearHull(two)
        
        // Sort vertices into upper and lower components
        a = findLeftmostPoint(vertices)
        b = findRightmostPoint(vertices)
        upperVertices = sortVertices(vertices, a, b, leftTurn)
        lowerVertices = sortVertices(vertices, a, b, rightTurn)
        
        // Create an execution queue to handle the recursive animation
        execQueue = []
        
        function findHull(points, a, b, upper, oldEdge) {
            if (points.length === 0) {
                // We have reached the base case - we know this edge is on the convex hull
                oldEdge.stroke = hullEdgeColor
                
                if (execQueue.length != 0) { 
                    // We still have more recursions queued up
                    findHull(...execQueue.shift())
                    return
                }
                
                // Nothing else to do
                pauseButton.disabled = true
                return
            }
            
            oldEdge.stroke = refEdgeColor
            furthest = quickHull.findFurthestPoint(points, a, b)
            
            // Create the quick hull triangle
            edge1 = createEdge(two, checkEdgeColor, a, furthest)
            edge2 = createEdge(two, checkEdgeColor, furthest, b)
            
            two.bind('update', function(frameCount) {
                if (edge1.scale < 0.9999) {
                    var t = (1 - edge1.scale) * getSpeed();
                    edge1.scale += t;
                    edge2.scale += t;
                } else {
                    two.unbind('update')
                    
                    // Whether we check right of left turns depends on if we are
                    // dealing with points on the upper or lower component of the hull
                    if (upper) {
                        leftPoints = sortVertices(points, a, furthest, leftTurn)
                        rightPoints = sortVertices(points, b, furthest, rightTurn)
                    } else {
                        leftPoints = sortVertices(points, a, furthest, rightTurn)
                        rightPoints = sortVertices(points, b, furthest, leftTurn)
                    }
                    
                    // Add these parameters to the execution queue
                    execQueue.push([leftPoints, a, furthest, upper, edge1])
                    execQueue.push([rightPoints, furthest, b, upper, edge2])
                    
                    // Remove the edge that is not on the convex hull
                    two.remove(oldEdge)
                    
                    // Execute the next thing in line in the queue
                    findHull(...execQueue.shift())
                }
            }).play();
        }
        
        // Create initial edges and add to exec queue
        refEdge1 = createEdge(two, refEdgeColor, a, b)
        refEdge2 = createEdge(two, refEdgeColor, a, b)
        execQueue.push([upperVertices, a, b, true, refEdge1])
        execQueue.push([lowerVertices, a, b, false, refEdge2])
        
        two.bind('update', function(frameCount) {
            if (refEdge1.scale < 0.9999) {
                var t = (1 - refEdge1.scale) * getSpeed();
                refEdge1.scale += t;
                refEdge2.scale += t;
            } else {
                two.unbind('update')
                findHull(...execQueue.shift())
            }
        }).play();
    },
    
    /*
    * Finds the furthest point from the line going throughs
    * a & b in the input points array
    */
    findFurthestPoint : function(points, a, b) {
        furthest = points[0]
        furthestDist = lineDistance(a, b, points[0])
        
        for (var i in points) {
            dist = lineDistance(a, b, points[i])
            if (dist > furthestDist) {
                furthestDist = dist
                furthest = points[i]
            }
        }
        
        return furthest
    }
}