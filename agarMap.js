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
    $('body').append($('<div id="mapContainer" style="position:absolute; top:0; left:0; background-color:lightgreen"></div>'));
    $('#mapContainer').append($('<div id="map"></div>')
       .css('width', '112px')
       .css('height', '112px')
       .css('border', '2px solid black')
       .css('margin', '10px')
       .css('background-color', 'white'));
    $('#mapContainer').append($('<div id="coords"></div>'));
}

agarMap.process = function process(blobs) {
    //console.log(blobs);
    var text = '';
    var map = '';
    blobs.forEach(function(blob) {
        if($.inArray(blob.id, agarMap.ids) > -1) {
            var radius = Math.max(blob.size / 100, 1.5);
            var left = Math.round((blob.x / 100) - radius);
            var top = Math.round((blob.y / 100) - radius);
            var dimension = Math.round(2*radius);
            map += '<div style="position: absolute; width: ' + dimension + 'px; height: ' + dimension + 'px; margin-left: ' +
                left + 'px; margin-top: ' +
                top + 'px; background-color: red;">&nbsp;</div>';
            text += '<div>x: ' + Math.round(blob.x) + ' / y: ' + Math.round(blob.y) + ' (' + Math.round(blob.size) + ')</div>';
        }
    });
    agarMap.display(text, map);
};

agarMap.display = function display(text, map) {
    $('#coords').html(text);
    $('#map').html(map);
};

agarMap.init();

agarMap.processMessage16 = function processMessage16(dataView) {
    var offset = 1; // Because first byte is message type
    // Walk over some data
    var length = dataView.getUint16(offset, true);
    offset += 2 + length * 8;
    
    var blobs = [];
    
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
        
        var unknown = dataView.getUint8(offset++); // what is this for?
        
        // Parse text (seems always to be empty?)
        var textObj = agarMap.parseString(dataView, offset);
        offset = textObj.offset;
        blob.name = textObj.text;
        blobs.push(blob);
    }
    agarMap.process(blobs);
}

// returns object containing text and new offset
agarMap.parseString = function parseString(dataView, offset) {
    var text = "";
    while(true) {
        var charCode = dataView.getUint16(offset, true); offset += 2;
        if(charCode == 0) break; // break if end of string
        text += String.fromCharCode(charCode);
    }
    return {text: text, offset: offset};
}

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
                    agarMap.ids.push(dataView.getUint32(1, true));
                    break;
            }
            onMessageOrig(event);
        }
    }, 1000);
    
    return socket;
};