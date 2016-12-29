var bfx = angular.module('mainController', []);

bfx.controller('mainController', ['$scope', 'synth', function($scope, synth) {
        $scope.WebMidi = WebMidi;
        $scope.synth = synth;
        
        $scope.WebMidi.enable(function (err) {
            //console.log($scope.WebMidi.inputs);
            //console.log($scope.WebMidi.outputs);
            $scope.$apply();
        });
        
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
        
}]);

bfx.service('synth', function(){
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
});