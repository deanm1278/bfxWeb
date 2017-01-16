var api = angular.module('api', [])
        .service('apiService', function($q){
            this.async = function(request, callback){
                var d = $q.defer();
                var p = d.promise;
                if('log' in request){
                    request.log.page = window.location.href;
                }
                $.ajax({
                    url: 'api',
                    type: 'POST',
                    data: request,
                    success: function(data) {
                        if('data' in data){
                            d.resolve(data.data);
                        }
                        else{ console.log("invalid!!", d); }
                    }
                });
                p.then(function(ret){ if(callback){callback(ret);} });
            };
});