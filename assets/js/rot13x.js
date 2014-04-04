// rot13x.js - Topcat Software LLC. 2011
// rot13 cipher extended to include digits
// www.topcat.hypermart.net/index.html

function rot13x(s) {

    var rxi = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    var rxo = "NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm5678901234"
    var map = []
    var buf = ""

    for (z = 0; z <= rxi.length; z++) {map[rxi.substr(z, 1)] = rxo.substr(z, 1)}

    for (z = 0; z <= s.length; z++) {
        var c = s.charAt(z)
        buf  += (c in map ? map[c] : c)
    }

    return buf
}

var voldemort = rot13x('cvbarreek');
var matchingUrls = [
    "*://*." + voldemort + ".com/*",
    "http://localhost:*/*clocked*.htm"
];