// Althea compatibility shim for pages that still resolve nav assets under /althea/shared/.
(function () {
  var s = document.createElement("script");
  s.src = "/shared/nexus-topnav-v2.js?v=54";
  s.defer = true;
  document.head.appendChild(s);
})();
