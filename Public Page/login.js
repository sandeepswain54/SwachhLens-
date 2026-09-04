// ===== Municipality Login (real Supabase auth) =====
(function () {
  const form = document.getElementById("municipalityLoginForm");
  if (!form) return; // not on this page

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const messageEl = document.getElementById("loginFormMessage");
  const submitBtn = document.getElementById("municipalityLoginBtn");

  function showMessage(text, kind) {
    messageEl.textContent = text;
    messageEl.className = "form-message show " + (kind || "error");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const db = window.swachhlensDb;
    if (!db) {
      showMessage("Could not connect to the server. Please refresh and try again.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    const { error } = await db.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In <span>→</span>';
      showMessage("Invalid email or password.", "error");
      return;
    }

    window.location.href = "municipality-status.html";
  });
})();
