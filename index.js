

var fileName = './doc.txt';

function createLineReader(fileName, initStart, lineToRead){
    var EM = require("events").EventEmitter
    var ev = new EM()
    var stream = require("fs").createReadStream(fileName)
    var remainder = null;
	var lineNumber = 1;
	var currentInit = initStart;
	var currentPosition = 0;
    stream.on("data",function(data){
        if(remainder != null){//append newly received data chunk
            var tmp = new Buffer(remainder.data.length+data.length)
            remainder.data.copy(tmp)
            data.copy(tmp,remainder.data.length)
            data = tmp;
        }
        var start = initStart || 0;
        for(var i=start; i<data.length; i++){
            if(data[i] == 10){ //\n new line
                var line = data.slice(start,i)
				if(start<data.length && (!lineToRead || lineNumber == lineToRead)) {
					ev.emit("data", {start: currentInit, end: currentPosition, lineNumber: lineNumber, data: line});
					if(lineToRead) {
						stream.close();
					}
				} else {
					currentInit = currentPosition;
				}
                start = i+1;
				lineNumber++;
            }
			currentPosition++;
        }
        if(start<data.length && (!lineToRead || lineNumber-1 == lineToRead)){
			remainder = {start: currentInit, end: currentPosition, lineNumber: lineNumber, data: data.slice(start)};
			if(lineToRead) {
				stream.close();
			}
        }else{
            remainder = null;
        }
    })

    stream.on("end",function(){
        if(null!=remainder) ev.emit("data",remainder)
    });

    return ev
}

function createReader(fileName, initStart, initEnd){
    var EM = require("events").EventEmitter
    var ev = new EM()
    var stream = require("fs").createReadStream(fileName, {start: initStart, end: initEnd});
	var seek = false;
    stream.on("data",function(data){
		console.log('data');
		ev.emit("data", {start: initStart, end: initEnd, data: data});
		seek = true;
		stream.close();
    });

    stream.on("end",function(){
		if(!seek)
			ev.emit("error", "Invalid seek position");
    })

    return ev
}

function getFilesList(filename, cb) {
	var init = new Date().getTime();
	lineReader1 = createLineReader(fileName, 0, 1)
	lineReader1.on("data",function(line){
    
		var header = JSON.parse(line.data);
		header.start = line.start;
		header.end = line.end;
		//console.log(header);	
		
		cb(null, header);
	});
	
	lineReader1.on("error", (err) => {
		cb(err, null);
	});
}

getFilesList(fileName, (err, header) => {
	console.log(header);
	var f = header.header['Linha 10628'];
	//console.log(f.start, header.end, f.start + header.end);
	//console.log(f.end, header.end, f.end + header.end);
	var reader = createReader(fileName, f.start + header.end + 1, f.end + header.end);
	reader.on("data",function(line) {
		console.log(line.data.toString('utf-8'));
	});	
});

