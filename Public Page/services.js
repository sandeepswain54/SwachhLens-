// ===== Services page: category filter pills =====
(function () {
  var pills = document.querySelectorAll(".svc-filter-pill");
  var cards = document.querySelectorAll(".svc-card");
  var emptyNote = document.getElementById("svcEmpty");

  if (!pills.length || !cards.length) return;

  pills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      pills.forEach(function (p) {
        p.classList.remove("active");
      });
      pill.classList.add("active");

      var filter = pill.getAttribute("data-filter");
      var visibleCount = 0;

      cards.forEach(function (card) {
        var show = filter === "all" || card.getAttribute("data-category") === filter;
        card.hidden = !show;
        if (show) visibleCount++;
      });

      if (emptyNote) emptyNote.hidden = visibleCount !== 0;
    });
  });
})();
