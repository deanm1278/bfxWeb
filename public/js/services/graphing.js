angular.module("graphing", [])

        .service("graphingService", function(){
            var bfxGraph = {};
            var self = this;
            this.createBaseGraph = function(data){

                var margin = {top: 40, right: 30, bottom: 20, left: 40},
                    width = 1120 - margin.left - margin.right,
                    height = 500 - margin.top - margin.bottom;

                var obj = Object.create(bfxGraph, {
                    margin:{  writable: true, configurable: true, value: margin },
                    width:{  writable: true, configurable: true, value: width },
                    height: {  writable: true, configurable: true, value: height },
                    mods: {  writable: true, configurable: true, value:[]},
                    pres: {  writable: true, configurable: true, value:[]},
                    args: { writable: true, configurable: true, value:[]}
                });

                obj.preRender = function(container){
                    this.svg = d3.select(container).append("svg")
                        .attr("width", this.width + this.margin.left + this.margin.right)
                        .attr("height", this.height + this.margin.top + this.margin.bottom);

                    this.svg.append("defs").append("clipPath")
                        .attr("id", "clip")
                        .append("rect")
                        .attr("width", width)
                        .attr("height", height);

                    this.body = this.svg.append("g")
                        .attr("class", "gr-body")
                        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

                    var queue = new Queue(this.pres);
                    for (var i in this.pres) {
                        queue.callNext(this);
                    }
                };

                obj.render = function(container){
                    this.preRender(container);
                    // Call any user specified modification functions. Subclasses will either append their modifications to the base class
                    // here or rewrite the render function entirely
                    var queue = new Queue(this.mods);

                    for (var i in this.mods) {
                        queue.callNext(this);
                    }
                };

                obj.mod = function(fn){
                    this.mods.push(fn);
                };
                obj.pre = function(fn){
                   this.pres.push(fn);  
                };

                //Standard domain getting function, can take a function to apply to the value
                obj.getDomain = function(axis, data, key, apply, forceZero){
                    forceZero = typeof forceZero !== 'undefined' ? forceZero : false;
                    if (forceZero) {
                        this[axis].domain([0, d3.max(data, function(d) {
                                return typeof apply !== 'undefined' ? apply(d[key]) : d[key];
                            })]);
                    }
                    else{
                        this[axis].domain(d3.extent(data, function(d) {
                                return typeof apply !== 'undefined' ? apply(d[key]) : d[key];
                            }));
                    }
                };

                //copy the passed data attributes to the graph object. If duplicate names are used default properties will be overwritten
                for (p in data) {
                    obj[p] = data[p];
                }

                return obj;
            };
            
            this.createGraphWave = function(data){
                var obj = Object.create(self.createBaseGraph(data), { });
                obj.pre(function(caller){
                    caller.canvas = caller.body.append("g").attr("clip-path", "url(#clip)");
                    caller.x = d3.scale.linear().range([0, caller.width]);
                    caller.y = d3.scale.linear().range([caller.height, 0]);

                    caller.xAxis = d3.svg.axis().scale(caller.x).orient("bottom").ticks(0);
                    caller.yAxis = d3.svg.axis().scale(caller.y).orient("left").ticks(0);
                    
                    caller.y.domain([-32768, 32767]);
                });
                
                obj.mod(function(caller){
                    caller.body.append("line")
                    .attr("x1", 0)
                    .attr("y1", (caller.height)/2)
                    .attr("x2", caller.width)
                    .attr("y2", (caller.height)/2)
                    .style("stroke-width", 1)
                    .style("stroke", "gray")
                    .style("fill", "none");
                });
                obj.drawLine = function(x_attr, y_attr, xAxisObj, yAxisObj) {
                    xAxisObj = typeof xAxisObj !== 'undefined' ? xAxisObj : this.x;
                    yAxisObj = typeof yAxisObj !== 'undefined' ? yAxisObj : this.y;
                    return d3.svg.line()
                            .x(function(d) {
                                return xAxisObj(d[x_attr]);
                            })
                            .y(function(d) {
                                return yAxisObj(d[y_attr]);
                            });
                };

                obj.drawX = function() {
                    this.xView = this.body.append("g")
                            .attr("class", "x axis")
                            .attr("transform", "translate(0," + this.height + ")")
                            .call(this.xAxis);
                };
                obj.drawY = function(label){
                    this.body.append("g")
                            .attr("class", "y axis")
                            .call(this.yAxis);
                };

                obj.createContext = function(){
                    this.xContext.domain(this.x.domain());
                    this.yContext.domain(this.y.domain());
                    this.drawXContext();
                };

                return obj;
            };
            
            this.createGraphEnv = function(data){
                var obj = Object.create(self.createGraphWave(data), { });
                return obj;
            };
        })

        .directive('bfxGraph', function(){
               return{
                   restrict: 'E',
                   scope: {
                       graph: '=',
                       width: '=',
                       height: '=',
                       margin: '='
                   },
                   link: function(scope, element){
                       //if were dealing with a promise wait till resolve to render
                       scope.$watch('graph', function() {
                            if (scope.graph) {
                                if (scope.graph.prom) {
                                    angular.element(element[0]).html('');
                                    scope.graph.prom.then(function(g) {
                                        g.render(element[0]);
                                    });
                                }
                                else {
                                    //no promise, just render graph
                                    scope.graph.margin = scope.margin;
                                    scope.graph.width = scope.width - scope.margin.left - scope.margin.right,
                                    scope.graph.height = scope.height - scope.margin.top - scope.margin.bottom;
                                    scope.graph.render(element[0]);
                                }
                            }
                        });
                   }
               } 
        });
        

function Queue(arr) {
    var i = 0;
    this.callNext = function(arg) {
        typeof arr[i] == 'function' && arr[i++](arg);
    };
}