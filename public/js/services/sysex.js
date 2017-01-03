ctlr.service('dataToSysex', function(){
    this.toSysex = function(data) {
        var sysex = [0];
        var idx = 0;
        var cnt7 = 0;

        for (var x in data) {
            var c = data[x] & 0x7F;
            var msb = data[x] >> 7;
            sysex[idx] |= msb << cnt7;
            sysex.push(c);

            if (cnt7 == 6) {
                idx += 8;
                sysex.push(0);
                cnt7 = 0;
            }
            else {
                cnt7 += 1;
            }
        }

        if (cnt7 == 0) {
            sysex.pop();
        }

        return sysex
    };
    
    this.int16Toint8 = function(data){
        var ret = [];
        for(var x in data){
            ret.push(data[x] & 0xFF);
            ret.push((data[x] >> 8) & 0xFF);
        }
        return ret;
    };
});
