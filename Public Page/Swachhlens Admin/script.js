// ===== SwachhLens Admin dashboard =====
// Guard: only reachable after a successful sign-in on ../admin-login.html
(function () {
  let authed = false;
  try {
    authed = sessionStorage.getItem("swachhlensAdminAuthed") === "true";
  } catch (err) {
    /* sessionStorage unavailable - let the page load rather than lock the admin out */
    authed = true;
  }

  if (!authed) {
    window.location.href = encodeURI("../admin-login.html");
  }
})();

// ===== Logout: clear the session flag before returning to the login page =====
(function () {
  const logoutLink = document.getElementById("adminLogout");
  if (!logoutLink) return;

  logoutLink.addEventListener("click", () => {
    try {
      sessionStorage.removeItem("swachhlensAdminAuthed");
    } catch (err) {
      /* ignore */
    }
  });
  logoutLink.href = encodeURI("../admin-login.html");
})();

// ===== Show today's date =====
(function () {
  const el = document.getElementById("adminToday");
  if (!el) return;
  const today = new Date();
  el.textContent = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
})();
