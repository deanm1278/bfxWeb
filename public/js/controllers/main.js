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
                      $scope.output.send(e.data[0], [e.data[1], e.data[2]]);
                      $scope.synth.params[e.data[1]] = e.data[2];
                      $scope.$apply();
                    }
                );
            }
        });
        
        $scope.sendControlValue = function(ccNum){
            $scope.output.send(0xB0, [ccNum, $scope.synth.params[ccNum]]);
        };
        
        $scope.writeFrame = function(channel, data){
             var sysexData = dataToSysex.toSysex(dataToSysex.int16Toint8(data));
             var sysexArray = [channel];
             sysexArray = sysexArray.concat(sysexData);
             $scope.output.sendSysex(synth.opcodes.WRITE_FRAME, sysexArray);
        };
        
        $scope.toggleEditor = function(wave){
            $scope.editingWave = wave;
            $scope.editorActive = !$scope.editorActive;
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
            console.log(mod);
            if(mod){
                var g;
                if(mod.type == 'lfo'){
                    g = graphingService.createGraphWave();
                }
                else if(mod.type == 'env'){
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
                console.log(g);
                return g;
            }
        };
        
        $scope.synth.waves[0] = waveGen.sineWave(1024);
        $scope.synth.waves[1] = waveGen.sawWave();
        $scope.synth.waves[2] = waveGen.squareWave();
        
        
        $scope.synth.mods[0] = {
            data: waveGen.denv(),
            type: 'env'
        };
        $scope.synth.mods[1] = {
            data: waveGen.sineWave(256),
            type: 'lfo'
        };
        
        generateWaveGraphs();
        
}]);

ctlr.service('synth', function(){
    this.params = {
        74 : 50,
        71 : 50,
        7 : 50,
        76 : 50
    };
    
    this.CC = {
        cutoff : 74,
        resonance : 71,
        amp : 7,
        subLevel : 76
    };
    
    this.waves = [[], [], []];
    
    this.mods = [{}, {}];
    
    this.opcodes = {
        WRITE_FRAME: 0x01,
        DUMP_FRAME: 0x02,
        SET_ENABLE: 0x03,
        SET_MODE: 0x04,
        DUMP_PATCH: 0x05
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
                else if(i < 512){ y = -32768; }
                else{ y = 32767; }
                arr.push({x:i, y:y});
            }
            return arr;
        },
        denv : function(){
            var step = 32768 / 356;
            var arr = [];
            var y = 0;
            for(var i = 0; i < 256; i++){
                arr.push({x:i, y:y});
                y -= step;
            }
            arr.push({x:256, y:0});
            return arr;
        }
   } 
});
