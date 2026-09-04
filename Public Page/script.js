// ===== Hero Image Carousel =====
// Auto-slides every 3 seconds; can also be controlled with the left/right arrows or dots.
(function () {
  const track = document.getElementById("carouselTrack");
  const dotsWrap = document.getElementById("carouselDots");
  const prevBtn = document.getElementById("prevSlide");
  const nextBtn = document.getElementById("nextSlide");

  if (!track) return;

  const slides = Array.from(track.children);
  const total = slides.length;
  let current = 0;
  const AUTOPLAY_MS = 3000;
  let autoplayTimer = null;

  // Build dots
  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", "Go to slide " + (i + 1));
    dot.addEventListener("click", () => goToSlide(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function update() {
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }

  function goToSlide(index) {
    current = (index + total) % total;
    update();
    restartAutoplay();
  }

  function nextSlide() {
    goToSlide(current + 1);
  }

  function prevSlide() {
    goToSlide(current - 1);
  }

  function startAutoplay() {
    autoplayTimer = setInterval(nextSlide, AUTOPLAY_MS);
  }

  function restartAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  nextBtn.addEventListener("click", nextSlide);
  prevBtn.addEventListener("click", prevSlide);

  update();
  startAutoplay();
})();

// ===== Password show/hide toggle (login page) =====
(function () {
  const toggleBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("loginPassword");
  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "👁️" : "🙈";
    toggleBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
})();

// ===== Password show/hide toggle (SwachhLens Admin login page) =====
(function () {
  const toggleBtn = document.getElementById("toggleAdminPassword");
  const passwordInput = document.getElementById("adminPassword");
  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "👁️" : "🙈";
    toggleBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
})();

// ===== SwachhLens Admin login (central admin, separate from Municipality login) =====
// Credentials: admin / admin (see .env: SWACHHLENS_ADMIN_USER_ID / SWACHHLENS_ADMIN_PASSWORD)
(function () {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  const ADMIN_USER_ID = "admin";
  const ADMIN_PASSWORD = "admin";
  const DASHBOARD_URL = "Swachhlens Admin/dashboard.html";

  const userIdInput = document.getElementById("adminUserId");
  const passwordInput = document.getElementById("adminPassword");
  const errorMsg = document.getElementById("adminLoginError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const userId = userIdInput.value.trim();
    const password = passwordInput.value;

    if (userId === ADMIN_USER_ID && password === ADMIN_PASSWORD) {
      errorMsg.classList.remove("show");
      try {
        sessionStorage.setItem("swachhlensAdminAuthed", "true");
      } catch (err) {
        /* sessionStorage unavailable, continue anyway */
      }
      window.location.href = encodeURI(DASHBOARD_URL);
    } else {
      errorMsg.classList.add("show");
    }
  });
})();

// ===== Register page: show chosen file name (one listener per upload field) =====
(function () {
  document.querySelectorAll(".upload-field").forEach((field) => {
    const fileInput = field.querySelector(".choose-file-btn input[type='file']");
    const fileNameLabel = field.querySelector(".file-name");
    if (!fileInput || !fileNameLabel) return;

    fileInput.addEventListener("change", () => {
      fileNameLabel.textContent = fileInput.files.length ? fileInput.files[0].name : "No file chosen";
    });
  });
})();
