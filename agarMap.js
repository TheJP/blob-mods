// ==UserScript==
// @name         AgarMap
// @namespace    http://localhost/
// @version      0.2
// @description  Displayes your coordinates (Later a map is planned)
// @author       mupfel / jp
// @match        http://agar.io/
// @grant        none
// ==/UserScript==


//Add compatibelity line for monkey addons
window.unsafeWindow = window.unsafeWindow || window;

unsafeWindow.agarMap = {};

agarMap.ids = [];

agarMap.init = function init() {
    console.log("starting agarMap...");
    $('body').append($('<div id="mapContainer"></div>')
                     .css('position', 'absolute')
                     .css('top', 0)
                     .css('left', 0)
                     .css('background-color', 'lightgreen'));
    $('#mapContainer').append($('<div id="map"></div>')
                              .css('width', '112px')
                              .css('height', '112px')
                              .css('border', '2px solid black')
                              .css('margin', '10px')
                              .css('background-color', 'white')
                              .css('box-sizing', 'content-box'));
    $('#mapContainer').append($('<div id="coords"></div>'));
};

agarMap.process = function process(blobs) {
    var text = '';
    var map = '';
    blobs.forEach(function(blob) {
        if($.inArray(blob.id, agarMap.ids) > -1) {
            var radius = Math.max(blob.size / 100, 1.5);
            var left = Math.round((blob.x / 100) - radius);
            var top = Math.round((blob.y / 100) - radius);
            var dimension = Math.round(2*radius);
            $('#blob-' + blob.id)
            .css('width', dimension + 'px')
            .css('height', dimension + 'px')
            .css('margin-left', left + 'px')
            .css('margin-top', top + 'px');
            text += '<div>x: ' + Math.round(blob.x) + ' / y: ' + Math.round(blob.y) + ' (' + Math.round(blob.size) + ')</div>';
        }
    });
    agarMap.display(text, map);
};

agarMap.display = function display(text, map) {
    $('#coords').html(text);
};

agarMap.addBlob = function addBlob(id) {
    $('#map').append($('<div id="blob-' + id + '"></div>')
                     .css('position', 'absolute')
                     .css('background-color', 'red'));
    agarMap.ids.push(id);
};

agarMap.removeBlob = function removeBlob(index) {
    $('#blob-' + agarMap.ids[index]).remove();
    agarMap.ids.splice(index, 1);
};

agarMap.processMessage16 = function processMessage16(dataView) {
    var offset = 1; // Because first byte is message type
   
    // Walk over some data
    var length = dataView.getUint16(offset, true); offset += 2;
    offset += length * 8;
    
    /*for(var i = 0; i < length; i++) {
        offset += 8;
        var a = dataView.getUint32(offset, true); offset += 4;
        var b = dataView.getUint32(offset, true); offset += 4;
    }*/

    var blobs = [];
    var existing = [];

    while(true) {
        var blob = {};
        blob.id = dataView.getUint32(offset, true); offset += 4;
        if(blob.id == 0) break; // Break if id zero, indicates end of blob array

        blob.x = dataView.getFloat32(offset, true); offset += 4;
        blob.y = dataView.getFloat32(offset, true); offset += 4;
        blob.size = dataView.getFloat32(offset, true); offset += 4;
        // Parse color (base 16)
        blob.color = (dataView.getUint8(offset++) << 16 | dataView.getUint8(offset++) << 8 | dataView.getUint8(offset++)).toString(16);
        blob.color = "#" + new Array(7-blob.color.length).join("0") + blob.color; // Add starting hash and missing 0's

        var type = dataView.getUint8(offset++);
        blob.isVirus = type & 1 === 1;
        blob.isAgitated = type & 16 === 16;

        if(type & 2) offset += 4; // what is this for?
        if(type & 4) offset += 8;
        if(type & 8) offset += 16;

        // Parse text (seems always to be empty?)
        var textObj = agarMap.parseString(dataView, offset);
        offset = textObj.offset;
        blob.name = textObj.text;

        blobs.push(blob);
        existing[blob.id] = true;
    }

    offset += 2; // what is here?

    length = dataView.getUint32(offset, true);
    for(i = 0; i < length; i++) {
        // blobs that exist, but have no changes
        existing[dataView.getUint32(offset, true)] = true; offset += 4;
    }

    // remove own ids that no longer exists
    for(i = agarMap.ids.length - 1; i >= 0; --i) {
        if(existing[agarMap.ids[i]] === undefined) {
            agarMap.removeBlob(i);
        }
    }

    agarMap.process(blobs);
};

// returns object containing text and new offset
agarMap.parseString = function parseString(dataView, offset) {
    var text = "";
    while(true) {
        var charCode = dataView.getUint16(offset, true); offset += 2;
        if(charCode == 0) break; // break if end of string
        text += String.fromCharCode(charCode);
    }
    return {text: text, offset: offset};
};

WebSocketOrig = WebSocket;

// hijack WebSocket
unsafeWindow.WebSocket = function(address) {
    // Create WebSocket from Original reference
    var socket = new WebSocketOrig(address);

    // hijack on message after timeout (should be enough time for agar to set onmessage)
    setTimeout(function(){
        onMessageOrig = socket.onmessage; // save orignal function reference to call later
        // own onmessage implementation
        socket.onmessage = function(event) {

            var dataView = new DataView(event.data);

            // Switch for different message types
            switch (dataView.getUint8(0)) {
                case 16:
                    agarMap.processMessage16(dataView);
                    break;
                case 32:
                    // Get own blob id
                    agarMap.addBlob(dataView.getUint32(1, true));
                    break;
            }
            onMessageOrig(event);
        };
    }, 1000);

    return socket;
};

agarMap.init();
