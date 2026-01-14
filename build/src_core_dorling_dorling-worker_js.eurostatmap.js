(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["eurostatmap"] = factory();
	else
		root["eurostatmap"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!********************************************!*\
  !*** ./src/core/dorling/dorling-worker.js ***!
  \********************************************/
onmessage = (event) => {
    const { nodes: inputNodes, radii, strengthX, strengthY, iterations, d3URL } = event.data

    // Load D3 dynamically into the worker
    importScripts(d3URL || 'https://unpkg.com/d3@7/dist/d3.min.js')

    const nodes = inputNodes.map((n, i) => {
        n.x = n.properties.centroid[0]
        n.y = n.properties.centroid[1]
        n.r = radii[i]
        return n
    })

    const sim = d3
        .forceSimulation(nodes)
        .force('x', d3.forceX((d) => d.properties.centroid[0]).strength(strengthX))
        .force('y', d3.forceY((d) => d.properties.centroid[1]).strength(strengthY))
        .force('collide', d3.forceCollide((d) => d.r).iterations(iterations))
        .stop()

    const nTicks = Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay()))

    for (let i = 0; i < nTicks; i++) {
        sim.tick()
        if (i % 10 === 0) {
            postMessage({ type: 'progress', progress: i, total: nTicks })
        }
    }

    postMessage({ type: 'end', nodes })
    self.close()
}

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3JjX2NvcmVfZG9ybGluZ19kb3JsaW5nLXdvcmtlcl9qcy5ldXJvc3RhdG1hcC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDO0FBQ0QsTzs7Ozs7QUNWQTtBQUNBLFlBQVksb0VBQW9FO0FBQ2hGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixZQUFZO0FBQ2hDO0FBQ0E7QUFDQSwwQkFBMEIsOENBQThDO0FBQ3hFO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQixvQkFBb0I7QUFDdEM7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2V1cm9zdGF0bWFwL3dlYnBhY2svdW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbiIsIndlYnBhY2s6Ly9ldXJvc3RhdG1hcC8uL3NyYy9jb3JlL2RvcmxpbmcvZG9ybGluZy13b3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jylcblx0XHRleHBvcnRzW1wiZXVyb3N0YXRtYXBcIl0gPSBmYWN0b3J5KCk7XG5cdGVsc2Vcblx0XHRyb290W1wiZXVyb3N0YXRtYXBcIl0gPSBmYWN0b3J5KCk7XG59KShzZWxmLCAoKSA9PiB7XG5yZXR1cm4gIiwib25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XHJcbiAgICBjb25zdCB7IG5vZGVzOiBpbnB1dE5vZGVzLCByYWRpaSwgc3RyZW5ndGhYLCBzdHJlbmd0aFksIGl0ZXJhdGlvbnMsIGQzVVJMIH0gPSBldmVudC5kYXRhXHJcblxyXG4gICAgLy8gTG9hZCBEMyBkeW5hbWljYWxseSBpbnRvIHRoZSB3b3JrZXJcclxuICAgIGltcG9ydFNjcmlwdHMoZDNVUkwgfHwgJ2h0dHBzOi8vdW5wa2cuY29tL2QzQDcvZGlzdC9kMy5taW4uanMnKVxyXG5cclxuICAgIGNvbnN0IG5vZGVzID0gaW5wdXROb2Rlcy5tYXAoKG4sIGkpID0+IHtcclxuICAgICAgICBuLnggPSBuLnByb3BlcnRpZXMuY2VudHJvaWRbMF1cclxuICAgICAgICBuLnkgPSBuLnByb3BlcnRpZXMuY2VudHJvaWRbMV1cclxuICAgICAgICBuLnIgPSByYWRpaVtpXVxyXG4gICAgICAgIHJldHVybiBuXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHNpbSA9IGQzXHJcbiAgICAgICAgLmZvcmNlU2ltdWxhdGlvbihub2RlcylcclxuICAgICAgICAuZm9yY2UoJ3gnLCBkMy5mb3JjZVgoKGQpID0+IGQucHJvcGVydGllcy5jZW50cm9pZFswXSkuc3RyZW5ndGgoc3RyZW5ndGhYKSlcclxuICAgICAgICAuZm9yY2UoJ3knLCBkMy5mb3JjZVkoKGQpID0+IGQucHJvcGVydGllcy5jZW50cm9pZFsxXSkuc3RyZW5ndGgoc3RyZW5ndGhZKSlcclxuICAgICAgICAuZm9yY2UoJ2NvbGxpZGUnLCBkMy5mb3JjZUNvbGxpZGUoKGQpID0+IGQucikuaXRlcmF0aW9ucyhpdGVyYXRpb25zKSlcclxuICAgICAgICAuc3RvcCgpXHJcblxyXG4gICAgY29uc3QgblRpY2tzID0gTWF0aC5jZWlsKE1hdGgubG9nKHNpbS5hbHBoYU1pbigpKSAvIE1hdGgubG9nKDEgLSBzaW0uYWxwaGFEZWNheSgpKSlcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5UaWNrczsgaSsrKSB7XHJcbiAgICAgICAgc2ltLnRpY2soKVxyXG4gICAgICAgIGlmIChpICUgMTAgPT09IDApIHtcclxuICAgICAgICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAncHJvZ3Jlc3MnLCBwcm9ncmVzczogaSwgdG90YWw6IG5UaWNrcyB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwb3N0TWVzc2FnZSh7IHR5cGU6ICdlbmQnLCBub2RlcyB9KVxyXG4gICAgc2VsZi5jbG9zZSgpXHJcbn1cclxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9