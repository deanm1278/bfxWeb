var ctlr = angular.module('mainController', []);

ctlr.controller('mainController', ['$scope', 'synth', 'dataToSysex', 'graphingService',
    'waveGen', 'webMidi','apiService',
    function($scope, synth, dataToSysex, graphingService, waveGen, webMidi, apiService) {
        
        $scope.width = window.innerWidth;
        $scope.height = window.innerHeight;
        $scope.graphsize = {width:$scope.width/3.5, height:$scope.height/5};
        
        //console.log(w, h);
        
        $scope.synth = synth;
        $scope.WebMidi = webMidi.client;
        
        //default index of modulators to show in the 
        $scope.modix0 = 0;
        $scope.modix1 = 1;
        
        $scope.$watch('input', function(newValue, oldValue){
            if(oldValue){ oldValue.removeListener(); }
            
            if(newValue){
                //route messages straight through to the output
                newValue.addListener('noteon', "all",
                  function (e) {
                    synth.output.send(e.data[0], [e.data[1], e.data[2]]);
                  }
                );
                newValue.addListener('noteoff', "all",
                  function (e) {
                    synth.output.send(e.data[0], [e.data[1], e.data[2]]);
                  }
                );
                newValue.addListener('controlchange', "all",
                    function (e) {
                      synth.params[e.data[1]] = e.data[2];
                      $scope.$apply();
                    }
                );
            }
        });
        
        $scope.knobOptions = {
            skin: {
              type: 'tron',
              width: 3,
              color: '#e5e5e5',
              spaceWidth: 4
            },
            size: $scope.width/13,
            barColor: '#e5e5e5',
            trackWidth: $scope.width/50,
            barWidth: $scope.width/50,
            textColor: '#e5e5e5',
            step: 1,
            max: 127,
            animate: { enabled: false }
          };
          $scope.knobOptionsSmall = {
            skin: {
              type: 'tron',
              width: 2,
              color: '#e5e5e5',
              spaceWidth: 3
            },
            size: $scope.width/20,
            barColor: '#e5e5e5',
            trackWidth: $scope.width/95,
            barWidth: $scope.width/95,
            textColor: '#e5e5e5',
            step: 1,
            max: 127,
            animate: { enabled: false }
          };
          
        $scope.writeEverything = function(){
            for(var i in synth.waves){
                synth.waves[i].write();
                synth.params[synth.waves[i].cc.active] = (synth.waves[i].active ? 64 : 63);
            }
            for(var i in synth.mods){
                synth.mods[i].write();
                synth.params[synth.mods[i].cc.active] = (synth.mods[i].active ? 64 : 63);
            }
            for(var i in synth.params){
                $scope.sendControlValue(i);
            }
        };
          
        $scope.$watch('synth.params', function(newVal, oldVal){
            for(var i in newVal){
                if(newVal[i] != oldVal[i]){
                    $scope.sendControlValue(i);
                }
            }
        }, true);

        $scope.sendControlValue = function(ccNum){
            if(synth.output){
                synth.output.send(0xB0, [ccNum, synth.params[ccNum]]);
            }
        };
        
        $scope.editWave = function(index, type){
            $scope.editingType = type;
            $scope.editingIndex = index;
            if(type == 'wave') { $scope.editingWave = synth.waves[index].data; }
            else if(type == 'mod') { $scope.editingWave = synth.mods[index].data; }
            $scope.editorActive = true;
        };
        
        $scope.closeEditor = function(write){
            if(write){
                if($scope.editingType == 'wave'){
                    synth.waves[$scope.editingIndex].write();
                    $scope.waveGraphs[$scope.editingIndex].redraw();
                }
                else if($scope.editingType == 'mod'){
                    synth.mods[$scope.editingIndex].write();
                    $scope.modGraphs[$scope.editingIndex].redraw();
                }
            }
            $scope.editorActive = false;
        };
        
        $scope.closeModRouting = function(){
            $scope.modRoutingActive = false;
        };
        
        var generateWaveGraphs = function(){
            $scope.waveGraphs = [{}, {}, {}];
            for(var i in $scope.waveGraphs){
                var g = graphingService.createGraphWave();
                g.data = synth.waves[i].data;
                //need to parse the date strings into date objects
                g.pre(function(caller){
                    caller.getDomain('x', caller.data, 'x');
                });
                g.mod(function(caller){
                    caller.drawY("");

                caller.canvas.append("path")
                    .datum(caller.data)
                    .attr("class", "line")
                    .attr("d", caller.drawLine('x', 'y'));
                });

                $scope.waveGraphs[i] = g;
            }
        };
        
        var generateModGraphs = function(){
            $scope.modGraphs = [];
            for(var i=0; i<10; i++){
                var g;
                g = graphingService.createGraphWave();
                g.data = synth.mods[i].data;
                
                g.pre(function(caller){
                    caller.getDomain('x', caller.data, 'x');
                });
                g.mod(function(caller){
                    caller.drawY("");

                caller.canvas.append("path")
                    .datum(caller.data)
                    .attr("class", "line")
                    .attr("d", caller.drawLine('x', 'y'));
                });
                $scope.modGraphs[i] = g;
            }
        };
        
        
        apiService.async({action:'getFrame', filename:'eorgan_106.w'}, function(d){
            for(var i=0; i<3; i++){
                copyArray(synth.waves[i].data, d);
                synth.waves[i].filename = 'eorgan_106.w';
            }
            generateWaveGraphs();
        });
        
        generateModGraphs();
        
}]);

ctlr.service("webMidi", function(){
        this.client = WebMidi;
        
        WebMidi.enable(function (err) {
            //console.log($scope.WebMidi.inputs);
            //console.log($scope.WebMidi.outputs);
            //$scope.$apply();
        }, true);
});

ctlr.directive('keyboard', function(synth){
    return{
        restrict: 'E',
        templateUrl:'templates/keyboard.html',
        replace: true,
        scope: {
        },
        link: function(scope, element){
            
            scope.offset = 40;
            
            var noteOn = function(channel, num, velocity){
                if(synth.output){
                    synth.output.send(0x8F + channel, [num, velocity]);
                }
            };
            var noteOff = function(channel, num, velocity){
                if(synth.output){
                    synth.output.send(0x7F + channel, [num, velocity]);
                }
            };
            
            if('ontouchstart' in document.documentElement){
                d3.selectAll(".base-key").on('touchstart', function(){
                    var note = parseInt(d3.select(this).attr('data-key'));
                    noteOn(1, scope.offset + note, 127);
                    //console.log("touch note on: " + note);
                }).on('touchend', function(){
                    var note = parseInt(d3.select(this).attr('data-key'));
                    noteOff(1, scope.offset + note, 127);
                    //console.log("touch note off: " + note);
                });
            }
            else{
                d3.selectAll(".base-key").on('mousedown', function(){
                    var note = parseInt(d3.select(this).attr('data-key'));
                    noteOn(1, scope.offset + note, 127);
                    console.log("note on: " + note);
                }).on('mouseup', function(){
                    var note = parseInt(d3.select(this).attr('data-key'));
                    noteOff(1, scope.offset + note, 127);
                    console.log("note off: " + note);
                });
            }
            
        }
    };
});

ctlr.directive('modRouting', function(synth){
    return{
        restrict: 'E',
        templateUrl:'templates/modRouting.html',
        replace: true,
        scope: {
            close: "&"
        },
        link: function(scope, element){
            scope.synth = synth;
            
            scope.knobOptionsSmall = {
            skin: {
              type: 'tron',
              width: 1,
              color: '#e5e5e5',
              spaceWidth: 2
            },
            size: 40,
            barColor: '#e5e5e5',
            trackWidth: 4,
            barWidth: 7,
            textColor: '#e5e5e5',
            step: 1,
            max: 127,
            animate: { enabled: false }
          };
        }
    };
});

ctlr.service('synth', function(waveGen, dataToSysex){
    var self = this;
    
    this.params = new Array(128);
    this.params.fill(63);
    
    this.CC = {
        cutoff : 74,
        resonance : 71,
        amp : 7,
        subLevel : 76,
        para:   80,
        glide: 65
    };
    
    this.paraMode = true;
    
    this.togglePara = function(){
        this.paraMode = !this.paraMode;
        this.params[this.CC.para] = (this.paraMode ? 64 : 63);
    };
    
    this.waves = [];
    for(var i=0; i<3; i++){
        
        this.waves[i] = {
            num: i,
            active : true,
            data: new Array(1024),
            filename: '',
            cc: {
                vol: 16 + (i * 4),
                trans: 17 + (i * 4),
                tune: 18 + (i * 4),
                active: 19 + (i * 4)
            },
            
            write: function(){
                if(self.output){
                    var data = [];
                    for(var j in this.data){ 
                        data.push(this.data[j].y); 
                    }
                    var sysexData = dataToSysex.toSysex(dataToSysex.int16Toint8(data));
                    var sysexArray = [this.num];
                    sysexArray = sysexArray.concat(sysexData);
                    
                    self.output.sendSysex(self.opcodes.WRITE_FRAME, sysexArray);
                }
            },
            toggleActive: function(){
                this.active = !this.active;
                self.params[this.cc.active] = (this.active ? 64 : 63);
            }
        };
    }
    
    this.modTypes = {
        LFO: 0x00,
        ENVELOPE: 0x01
    };

    this.output = undefined;
    
    this.opcodes = {
        WRITE_FRAME: 0x01,
        DUMP_FRAME: 0x02,
        SET_ENABLE: 0x03,
        SET_MODE: 0x04,
        DUMP_PATCH: 0x05,
        WRITE_MOD: 0x06
    };
    this.targets = [
        {  
            name: 'pitch',
            code: 0x00,
            values : {
                'osc 0' : 0x00,
                'osc 1' : 0x01,
                'osc 2' : 0x02
            }
        },
        {
            name: 'control',
            code: 0x02,
            values : {
                sub : 0x00,
                cutoff : 0x01,
                resonance : 0x02,
                amplitude : 0x03,
                noise : 0x04
            }
        },
        {
            name: 'modulator rate',
            code: 0x04,
            values : {
                'mod 0' : 0, 'mod 1' : 1, 'mod 2' : 2, 'mod 3' : 3,
                'mod 4' : 4, 'mod 5' : 5, 'mod 6' : 6, 'mod 7' : 7,
                'mod 8' : 8, 'mod 9' : 9
            }
        }
    ];
    
    this.mods = [];
    for(var i=0; i<10; i++){
        
        this.mods[i] = {
            //MOD STRUCTURE
            num: i,
            active: false,
            data: waveGen.sineWave(256),
            type: this.modTypes.LFO,
            target: self.targets[1],
            targetId: 0x01,
            filename: '',
            cc:{
                rate: 32 + (i * 3),
                depth: 33 + (i * 3),
                active: 34 + (i * 3)
            },
            
            write: function(){
                if(self.output){
                    var data = [];
                    for(var j in this.data){ 
                        data.push(this.data[j].y); 
                    }
                    var sysexData = dataToSysex.toSysex(dataToSysex.int16Toint8(data));
                    var sysexArray = [this.num, this.type, this.target.code, this.targetId];
                    sysexArray = sysexArray.concat(sysexData);
                    self.output.sendSysex(self.opcodes.WRITE_MOD, sysexArray);
                    for(var j in this.cc){
                        self.output.send(0xB0, [this.cc[j], self.params[this.cc[j]]]);
                    }
                }
            },
            toggleActive: function(){
                this.active = !this.active;
                self.params[this.cc.active] = (this.active ? 64 : 63);
            }
        };
    }
});

ctlr.factory('waveGen', function(){
   return {
       sineWave : function(samples){
            var per = Math.PI * 2;
            var step = per / (samples - 1);
            var arr = [];
            var sample = 0;

            for(var i = 0; i<per; i+=step){
                arr.push({x:sample, y:Math.sin(i) * 32767});
                sample++;
            }
            return arr;
        },
        sawWave : function(){
            var step = 32767 / 512;
            var arr = [];
            var y = 0;
            
            for(var i = 0; i<1024; i++){
                arr.push({x:i, y:y});
                y += step;
                if(i == 511){ y = -32768; }
            }
            return arr;
        },
        squareWave : function(){
            var arr = [];
            var y;
            
            for(var i = 0; i<1024; i++){
                if(i == 0 || i == 1023) { y = 0; }
                else if(i < 512){ y = 32767; }
                else{ y = -32768; }
                arr.push({x:i, y:y});
            }
            return arr;
        },
        denv : function(){
            var step = 32768 / 356;
            var arr = [];
            var y = 0;
            for(var i = 0; i < 255; i++){
                arr.push({x:i, y:y});
                y -= step;
            }
            arr.push({x:255, y:0});
            return arr;
        }
   } 
});

var copyArray = function(dest, src){
    dest.length = src.length;
    for(var i in src){
        dest[i] = src[i];
    }
};

ctlr.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    };
});
