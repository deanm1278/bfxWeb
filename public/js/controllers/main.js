var ctlr = angular.module('mainController', []);

ctlr.controller('mainController', ['$scope', 'synth', 'dataToSysex', 'graphingService',
    'waveGen',
    function($scope, synth, dataToSysex, graphingService, waveGen) {
        $scope.WebMidi = WebMidi;
        $scope.synth = synth;
        
        $scope.WebMidi.enable(function (err) {
            //console.log($scope.WebMidi.inputs);
            //console.log($scope.WebMidi.outputs);
            $scope.$apply();
        }, true);
        
        $scope.$watch('input', function(newValue, oldValue){
            if(oldValue){ oldValue.removeListener(); }
            
            if(newValue){
                //route messages straight through to the output
                newValue.addListener('noteon', "all",
                  function (e) {
                    $scope.output.send(e.data[0], [e.data[1], e.data[2]]);
                  }
                );
                newValue.addListener('noteoff', "all",
                  function (e) {
                    $scope.output.send(e.data[0], [e.data[1], e.data[2]]);
                  }
                );
                newValue.addListener('controlchange', "all",
                    function (e) {
                      //$scope.output.send(e.data[0], [e.data[1], e.data[2]]);
                      $scope.synth.params[e.data[1]] = e.data[2];
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
            size: 100,
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
            size: 50,
            barColor: '#494B52',
            trackWidth: 5,
            barWidth: 10,
            textColor: '#494B52',
            step: 1,
            max: 127,
            animate: { enabled: false }
          };
          
        $scope.$watch('synth.params', function(newVal, oldVal){
            for(var i in newVal){
                if(newVal[i] != oldVal[i]){
                    $scope.sendControlValue(i);
                }
            }
        }, true);

        $scope.sendControlValue = function(ccNum){
            if($scope.output){
                $scope.output.send(0xB0, [ccNum, $scope.synth.params[ccNum]]);
            }
        };
        
        $scope.writeFrame = function(channel, data){
            if($scope.output){
                var sysexData = dataToSysex.toSysex(dataToSysex.int16Toint8(data));
                var sysexArray = [channel];
                sysexArray = sysexArray.concat(sysexData);
                $scope.output.sendSysex(synth.opcodes.WRITE_FRAME, sysexArray);
            }
        };
        
        $scope.writeMod = function(num, type, target, data){
            if($scope.output){
                var sysexData = dataToSysex.toSysex(dataToSysex.int16Toint8(data));
                var sysexArray = [num, type, target];
                sysexArray = sysexArray.concat(sysexData);
                $scope.output.sendSysex(synth.opcodes.WRITE_MOD, sysexArray);
            }
        };
        
        $scope.writeModAtIndex = function(ix){
            var mod = $scope.synth.mods[ix];
            var data = [];
            for(var i in mod.data){
                data.push(mod.data[i].y);
            }
            $scope.writeMod(ix, mod.type, mod.target, data);
            //TODO: send CC depth and rate as well
        };
        
        $scope.editWave = function(index, type){
            $scope.editingType = type;
            $scope.editingIndex = index;
            if(type == 'wave') { $scope.editingWave = $scope.synth.waves[index]; }
            else if(type == 'mod') { $scope.editingWave = $scope.synth.mods[index].data; }
            $scope.editorActive = true;
        };
        
        $scope.closeEditor = function(write){
            if(write){
                var data = [];
                if($scope.editingType == 'wave'){
                    for(var i in $scope.synth.waves[$scope.editingIndex]){ 
                        data.push($scope.synth.waves[$scope.editingIndex][i].y); 
                    }
                    $scope.writeFrame($scope.editingIndex, data);
                    $scope.waveGraphs[$scope.editingIndex].redraw();
                }
                else if($scope.editingType == 'mod'){
                    $scope.writeModAtIndex($scope.editingIndex);
                    $scope.modGraph0.redraw();
                    $scope.modGraph1.redraw();
                }
            }
            $scope.editorActive = false;
        };
        
        var generateWaveGraphs = function(){
            $scope.waveGraphs = [{}, {}, {}];
            for(var i in $scope.waveGraphs){
                var g = graphingService.createGraphWave();
                g.data = $scope.synth.waves[i];
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
        
        $scope.generateModGraph = function(mod){
            if(mod){
                var g;
                if(mod.type == $scope.synth.modTypes.LFO){
                    g = graphingService.createGraphWave();
                }
                else if(mod.type == $scope.synth.modTypes.ENVELOPE){
                    g = graphingService.createGraphEnv();
                }
                g.data = mod.data;
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
                return g;
            }
        };
        
        $scope.synth.waves[0] = waveGen.sineWave(1024);
        $scope.synth.waves[1] = waveGen.sawWave();
        $scope.synth.waves[2] = waveGen.squareWave();
        
        
        $scope.synth.mods[0] = {
            data: waveGen.sineWave(256),
            type: $scope.synth.modTypes.LFO,
            target: $scope.synth.targets.cutoff
        };
        $scope.synth.mods[1] = {
            data: waveGen.denv(),
            type: $scope.synth.modTypes.ENVELOPE,
            target: $scope.synth.targets.amp
        };
        
        generateWaveGraphs();
        
}]);

ctlr.service('synth', function(){
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
        vol0 : 14,
        vol1 : 15,
        //vol2 : 16,
        trans0 : 77,
        trans1 : 93,
        trans2 : 73,
        tune0 : 17,
        tune1 : 91,
        tune2 : 79
    };
    
    this.waves = [[], [], []];
    
    this.mods = [{}, {}];
    
    this.opcodes = {
        WRITE_FRAME: 0x01,
        DUMP_FRAME: 0x02,
        SET_ENABLE: 0x03,
        SET_MODE: 0x04,
        DUMP_PATCH: 0x05,
        WRITE_MOD: 0x06
    };
    this.targets = {
        OSC0_PITCH: 0x00,
        OSC1_PITCH: 0x01,
        OSC2_PITCH: 0x02,

        OSC0_ARP: 0x03,
        OSC1_ARP: 0x04,
        OSC2_ARP: 0x05,

        sublevel: 0x06,
        cutoff: 0x07,
        resonance: 0x08,
        amp: 0x09
    };
    this.modTypes = {
        LFO: 0x00,
        ENVELOPE: 0x01
    };
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
