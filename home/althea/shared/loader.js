// Althea compatibility shim for pages that still resolve loader assets under /althea/shared/.
(function () {
  var s = document.createElement("script");
  s.src = "/shared/loader.js";
  s.async = false;
  document.head.appendChild(s);
})();
