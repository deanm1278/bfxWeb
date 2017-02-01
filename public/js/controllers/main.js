var ctlr = angular.module('mainController', []);

ctlr.controller('mainController', ['$scope', 'synth', 'dataToSysex', 'graphingService',
    'waveGen', 'webMidi',
    function($scope, synth, dataToSysex, graphingService, waveGen, webMidi) {
        
        $scope.width = window.innerWidth;
        $scope.height = window.innerHeight;
        $scope.graphsize = {width:$scope.width/3.5, height:$scope.height/5};
        
        //console.log(w, h);
        
        $scope.synth = synth;
        $scope.WebMidi = webMidi.client;
        
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
                      //synth.output.send(e.data[0], [e.data[1], e.data[2]]);
                      synth.params[e.data[1]] = e.data[2];
                      $scope.$apply();
                    }
                );
            }
        });
        
        $scope.knobOptions = {
            skin: {
              type: 'tron',
              width: 5,
              color: '#494B52',
              spaceWidth: 3
            },
            size: $scope.width/12,
            barColor: '#494B52',
            trackWidth: 30,
            barWidth: 30,
            textColor: '#494B52',
            step: 1,
            max: 127,
            animate: { enabled: false }
          };
          $scope.knobOptionsSmall = {
            skin: {
              type: 'tron',
              width: 2,
              color: '#494B52',
              spaceWidth: 3
            },
            size: $scope.width/20,
            barColor: '#494B52',
            trackWidth: 5,
            barWidth: 10,
            textColor: '#494B52',
            step: 1,
            max: 127,
            animate: { enabled: false }
          };
          
        $scope.writeEverything = function(){
            for(var i in synth.waves){
                synth.waves[i].write();
            }
            for(var i in synth.mods){
                synth.mods[i].write();
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
        
        generateWaveGraphs();
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

ctlr.service('synth', function(waveGen, dataToSysex){
    var self = this;
    
    this.params = {
        74 : 50,
        71 : 50,
        7 : 50,
        76 : 50,
        
        14: 60,
        15: 65,
        16: 66, 
        
        77: 64,
        93: 64,
        73: 64,
        75: 64,
        
        17: 64,
        91: 64,
        79: 64,
        
        1: 50,
        114: 50,
        
        18: 50,
        19: 50
    };
    
    this.CC = {
        cutoff : 74,
        resonance : 71,
        amp : 7,
        subLevel : 76,
        vol0 : 77,
        vol1 : 17,
        vol2 : 75,
        //trans0 : 77,
        trans1 : 93,
        trans2 : 73,
        //tune0 : 17,
        tune1 : 91,
        tune2 : 79
    };
    
    this.waves = [];
    for(var i=0; i<3; i++){
        this.waves[i] = {
            num: i,
            active : false,
            data: waveGen.sawWave(),
            
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
            }
        };
    }
    
    this.modTypes = {
        LFO: 0x00,
        ENVELOPE: 0x01
    };
    
    this.mods = [];
    for(var i=0; i<10; i++){
        this.mods[i] = {
            num: i,
            active: false,
            data: (i == 0 ? waveGen.sineWave(256) : waveGen.denv()),
            type: this.modTypes.LFO,
            target: null,
            targetId: null,
            
            write: function(){
                if(self.output){
                    var data = [];
                    for(var j in this.data){ 
                        data.push(this.data[j].y); 
                    }
                    var sysexData = dataToSysex.toSysex(dataToSysex.int16Toint8(data));
                    var sysexArray = [this.num, this.type, this.target.code, this.targetId];
                    console.log(sysexArray);
                    sysexArray = sysexArray.concat(sysexData);
                    self.output.sendSysex(self.opcodes.WRITE_MOD, sysexArray);
                }
            }
        };
    }

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
