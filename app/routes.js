var fs = require('fs');

module.exports = function (app) {

    // application -------------------------------------------------------------
    app.post('/api', function(req, res){
        var action = req.body.action;
        var ret = {};
        
        var returnData = function(data){
            ret.data = data;
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(ret));
        };
        
        switch(action){
            case 'getFrames':
                //return a list of all preset waves available
                fs.readdir(__dirname + '/presets/frames', function(err, files){
                    returnData(files);
                });
                break;
            case 'getFrame':
                var readStream = fs.createReadStream(__dirname + '/presets/frames/' + req.body.filename);
                readStream.on('data', function (chunk) {
                    var d = [];
                    var pos = 0;
                    for(var i=0; i<chunk.length; i+=2 ){
                        d.push({x: pos, y: chunk.readInt16LE(i)});
                        pos++;
                    }
                    returnData(d);
                });
                
                break;
        }
    });
    
    app.get('*', function (req, res) {
        res.sendFile(__dirname + '/public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });
};
