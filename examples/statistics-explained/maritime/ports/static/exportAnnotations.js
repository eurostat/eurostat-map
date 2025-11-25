function generatePortsAnnotations(portsAnnotations) {

    function parseTranslate(str) {
        if (!str) return null;
        var m = str.match(/translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/);
        return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null;
    }

    var source = portsAnnotations || window.portsAnnotations || [];

    // clone
    var cloned = source.map(function (a) {
        var copy = {};
        for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) copy[k] = a[k];
        copy.note = a.note ? Object.assign({}, a.note) : {};
        return copy;
    });

    var root = document.querySelector(".annotations") || document;
    var nodes = Array.prototype.slice.call(root.querySelectorAll(".annotation"));

    nodes.forEach(function (node) {
        var titleEl = node.querySelector(".annotation-note-title tspan") ||
            node.querySelector(".annotation-note-title");
        var title = titleEl ? (titleEl.textContent || "").trim() : "";
        if (!title) return;

        var gpos = parseTranslate(node.getAttribute("transform") || "");

        var noteEl = node.querySelector(".annotation-note");
        var npos = parseTranslate(noteEl ? noteEl.getAttribute("transform") || "" : "");

        var dxdy = npos;
        if (!dxdy && noteEl) {
            var c = noteEl.querySelector(".annotation-note-content");
            if (c) dxdy = parseTranslate(c.getAttribute("transform") || "");
        }

        // find index
        var idx = -1;
        for (var i = 0; i < cloned.length; i++) {
            var t = cloned[i].note && cloned[i].note.title ? String(cloned[i].note.title).trim() : "";
            if (t === title) { idx = i; break; }
        }
        if (idx === -1) {
            console.warn("No match for annotation:", title);
            return;
        }

        if (gpos) {
            cloned[idx].x = gpos.x;
            cloned[idx].y = gpos.y;
        }
        if (dxdy) {
            cloned[idx].dx = dxdy.x;
            cloned[idx].dy = dxdy.y;
        } else {
            if (cloned[idx].dx == null) cloned[idx].dx = 0;
            if (cloned[idx].dy == null) cloned[idx].dy = 0;
        }
    });

    return cloned;
}

// ---------------------------------------------------------
// Download helper
// ---------------------------------------------------------
function downloadJSON(data, filename) {
    var jsonStr = JSON.stringify(data, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json" });

    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

// ---------------------------------------------------------
// Button → generate annotations → download as JSON
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("export-annotations-btn");
    if (!btn) return;

    btn.addEventListener("click", function () {
        var result = generatePortsAnnotations(window.portsAnnotations);
        downloadJSON(result, "ports-annotations.json");
        console.log("Exported annotation array:", result);
    });
});