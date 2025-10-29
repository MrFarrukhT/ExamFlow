// Optional manifest for A2 Key RW absolute question ranges per part
// Used only to supplement missing info from DOM scanning.
(function(){
  window.A2KeyManifest = {
    ranges: [
      { part: 1, min: 1,  max: 6 },
      { part: 2, min: 7,  max: 13 },
      { part: 3, min: 14, max: 18 },
      { part: 4, min: 19, max: 24 },
      { part: 5, min: 25, max: 30 },
      // Writing parts often present as single items in this sample
      { part: 6, min: 31, max: 31 },
      { part: 7, min: 32, max: 32 }
    ]
  };
})();

