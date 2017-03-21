var fs = require('fs');
var jetpack = require('fs-jetpack');
var path = require('path');
var humanize = require('humanize');

function createLineReader(fileName, initStart, lineToRead) {
    var EM = require("events").EventEmitter
    var ev = new EM()
    var stream = require("fs").createReadStream(fileName)
    var remainder = null;
    var lineNumber = 1;
    var currentInit = initStart;
    var currentPosition = 0;
    stream.on("data", function(data) {
        if (remainder != null) { //append newly received data chunk
            var tmp = new Buffer(remainder.data.length + data.length)
            remainder.data.copy(tmp)
            data.copy(tmp, remainder.data.length)
            data = tmp;
        }
        var start = initStart || 0;
        for (var i = start; i < data.length; i++) {
            if (data[i] == 10) { //\n new line
                var line = data.slice(start, i)
                if (start < data.length && (!lineToRead || lineNumber == lineToRead)) {
                    ev.emit("data", { start: currentInit, end: currentPosition, lineNumber: lineNumber, data: line });
                    if (lineToRead) {
                        stream.close();
                    }
                } else {
                    currentInit = currentPosition;
                }
                start = i + 1;
                lineNumber++;
            }
            currentPosition++;
        }
        if (start < data.length && (!lineToRead || lineNumber - 1 == lineToRead)) {
            remainder = { start: currentInit, end: currentPosition, lineNumber: lineNumber, data: data.slice(start) };
            if (lineToRead) {
                stream.close();
            }
        } else {
            remainder = null;
        }
    })

    stream.on("end", function() {
        if (null != remainder) ev.emit("data", remainder)
    });

    return ev
}

function createReader(fileName, initStart, initEnd) {
    var EM = require("events").EventEmitter
    var ev = new EM()
    var stream = require("fs").createReadStream(fileName, { start: initStart, end: initEnd });
    var seek = false;
    stream.on("data", function(data) {
        console.log('data');
        ev.emit("data", { start: initStart, end: initEnd, data: data });
        seek = true;
        stream.close();
    });

    stream.on("end", function() {
        if (!seek)
            ev.emit("error", "Invalid seek position");
    })

    return ev
}


function getFilesList(filename, cb) {
    var init = new Date().getTime();
    lineReader1 = createLineReader(fileName, 0, 1)
    lineReader1.on("data", function(line) {

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

/*getFilesList(fileName, (err, header) => {
	console.log(header);
	var f = header.header['Linha 10628'];
	//console.log(f.start, header.end, f.start + header.end);
	//console.log(f.end, header.end, f.end + header.end);
	var reader = createReader(fileName, f.start + header.end + 1, f.end + header.end);
	reader.on("data",function(line) {
		console.log(line.data.toString('utf-8'));
	});	
});*/

const getFileHeader = function(file, cb) {

    if (jetpack.exists(file)) {

        var lr = createLineReader(file, 0, 1)
        lr.on("data", function(line) {

            var header = JSON.parse(line.data);
            /*header.start = line.start;
            header.end = line.end;*/
            //console.log(header);	

            cb(null, header);
        });

        lr.on("error", (err) => {
            cb(err, null);
        });
    } else {
        cb(null, null);
    }
}

const getFileList = function(bse) {
    getFileHeader(bse, (err, header) => {
        if (err) {
            console.error(err);
        } else {
            var list = Object.keys(header.header);
            console.log('File Name', '\t', 'File Size');
            list.forEach((l) => {

                console.log(l, '\t', humanize.filesize(header.header[l].size));
            });
        }
    });
}

const checkFileIsEmpty = function(file) {
    return true;
}

const buildFileHeader = function(filename, buffer) {
    return { "header": { "name": filename, "start": null, "size": buffer.length }, "data": buffer };
}

const createFile = function(bse, files) {
    getFileHeader(bse, (err, h) => {
        var start = 0;
        var emptyFile = h == null || Object.keys(h).length <= 0;
        if (emptyFile) {
            h = { "header": {} };
        } else {
            var fileList = Object.keys(h.header);
            var lastFile = h.header[fileList[fileList.length - 1]];
            var lastBit = lastFile.start + lastFile.size;
            start = lastBit;
        }
        files.forEach((file) => {
            if (Object.keys(h.header).indexOf(path.basename(file)) == -1) {
                console.log(file);
                var b = jetpack.read(file, 'buffer');
                var header = buildFileHeader(path.basename(file), b);
                h.header[header.header.name] = { "start": start, "size": header.header.size }
                if (emptyFile) {
                    var wstream = fs.createWriteStream(bse, { 'flags': 'a' });
                    wstream.write(Buffer.from(JSON.stringify(h)) + Buffer.from('\n') + header.data);
                    wstream.close();
                } else {
                    //TODO: Rewrite header line;
                    var wstream = fs.createWriteStream(bse, { 'flags': 'a' });
                    wstream.write(header.data);
                    wstream.close();
                }

                start += header.header.size;
            } else {
                console.error('Error:', path.basename(file), 'is already in', bse);
            }
        });
    });



}

createFile('teste.bse', ['./data/foca2.gif']);
//getFileList('teste.bse');