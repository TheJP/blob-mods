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
}

agarMap.process = function process(blobData) {
    var text = '';
    var map = '<div id="map" style="width: 112px; height: 112px; border: 2px solid black; margin: 10px 10px; box-sizing: content-box; background-color: white;">';
    blobData.forEach(function(blob) {
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
    map += '</div>'
    text = map + text;
    agarMap.display(text);
};

agarMap.display = function display(text) {
    $('#mapContainer').html(text);
};

agarMap.init();

WebSocket2 = WebSocket;

unsafeWindow.WebSocket = function(a) {
    var socket = new WebSocket2(a);
    setTimeout(function(){
        oldOnMessage = socket.onmessage;
        socket.onmessage = function(evt) {
            function b() {
                for (var a = "";;) {
                    var b = e.getUint16(c, !0);
                    c += 2;
                    if (0 == b) break;
                    a += String.fromCharCode(b);
                }
                return a;
            }
            function Ba(a) {
                D = +new Date;
                var b = Math.random(),
                    c = 1;
                da = !1;
                for (var e = a.getUint16(c, !0), c = c + 2, d = 0; d < e; ++d) {
                    var f = w[a.getUint32(c, !0)],
                        g = w[a.getUint32(c + 4, !0)],
                        c = c + 8;
                    f && g && (g.destroy(), g.ox =
                               g.x, g.oy = g.y, g.oSize = g.size, g.nx = f.x, g.ny = f.y, g.nSize = g.size, g.updateTime = D)
                }
                var blobData = [];
                for (;;) {
                    e = a.getUint32(c, !0);
                    c += 4;
                    if (0 == e) break;
                    for (var d = a.getFloat32(c, !0), c = c + 4, f = a.getFloat32(c, !0), c = c + 4, g = a.getFloat32(c, !0), c = c + 4, h = a.getUint8(c++), k = a.getUint8(c++), l = a.getUint8(c++), h = (h << 16 | k << 8 | l).toString(16); 6 > h.length;) h = "0" + h;
                    h = "#" + h;
                    l = a.getUint8(c++);
                    k = !!(l & 1);
                    l & 2 && (c += 4);
                    l & 4 && (c += 8);
                    l & 8 && (c += 16);
                    for (l = "";;) {
                        var n = a.getUint16(c, !0),
                            c = c + 2;
                        if (0 == n) break;
                        l += String.fromCharCode(n)
                    }
                    n = null;
                    blobData.push({id: e, x: d, y: f, color: h, size: g});
                }
                agarMap.process(blobData);
            }
            var c = 1, e = new DataView(evt.data);
            var m =[];
            var w = {};
            switch (e.getUint8(0)) {
                case 16:
                    Ba(e);
                    //console.log(JSON.stringify(m));
                    break;
                case 32:
                    // Get own blob id
                    agarMap.ids.push(e.getUint32(1, !0));
                    break;
                case 49:
                    a = e.getUint32(c, !0);
                    c += 4;
                    y = [];
                    for (var d = 0; d < a; ++d) {
                        var f = e.getUint32(c, !0),
                            c = c + 4;
                        y.push({
                            id: f,
                            name: b()
                        })
                    }
                    //console.log(JSON.stringify(y));

                    break;
            }
            oldOnMessage(evt);
        }
    }, 1000);
    return socket;
};