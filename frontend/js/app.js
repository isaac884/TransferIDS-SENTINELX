(function loadTransferIDSRootApp() {
  if (document.querySelector('script[data-transferids-root-app="true"]')) return;
  var script = document.createElement("script");
  script.src = "/app.js";
  script.defer = true;
  script.async = false;
  script.dataset.transferidsRootApp = "true";
  document.head.appendChild(script);
})();
