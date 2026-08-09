(function () {
  var NAV_ITEMS = [
    { key: "home", label: "home", href: "index.html" },
    { key: "me", label: "me", href: "me.html" },
    { key: "projects", label: "projects", href: "projects.html" }
  ];

  function currentPage() {
    var path = location.pathname.split("/").pop();
    if (path === "" || path === "index.html") return "home";
    if (path === "me.html") return "me";
    if (path === "projects.html") return "projects";
    return "";
  }

  function renderNav() {
    var active = currentPage();
    return NAV_ITEMS.map(function (item) {
      return item.key === active
        ? '<span class="active">' + item.label + '</span>'
        : '<a href="' + item.href + '">' + item.label + '</a>';
    }).join(' · ');
  }

  var root = document.getElementById('nav-root');
  if (root) root.innerHTML = renderNav();
})();
