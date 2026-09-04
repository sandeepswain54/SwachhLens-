// ===== Municipality Dashboard: live status + plan selection =====
(function () {
  const db = window.swachhlensDb;
  const errorEl = document.getElementById("muniLoadError");

  function showError(text) {
    errorEl.textContent = text;
    errorEl.className = "form-message show error";
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  const PLAN_NAMES = { basic: "Basic", standard: "Standard", smart_city: "Smart City" };

  function renderRegistration(row) {
    document.getElementById("muniSidebarName").textContent = row.municipality_name;
    document.getElementById("muniSidebarLocation").textContent = `${row.district}, ${row.state}`;
    document.getElementById("muniWelcomeName").textContent = row.municipality_name;

    document.getElementById("muniStatusRow").hidden = false;

    // ---- Stepper ----
    const steps = document.querySelectorAll(".muni-step");
    const lines = document.querySelectorAll(".muni-step-line");
    steps.forEach((el) => el.classList.remove("done", "current", "rejected"));
    lines.forEach((el) => el.classList.remove("done"));

    const isRejected = row.status === "rejected";
    const reviewDone = row.status !== "submitted"; // under_review, approved or rejected
    const approvedDone = row.status === "approved";
    const planDone = row.payment_status === "paid"; // plan only counts once it's actually paid for

    const stepEls = {
      submitted: document.querySelector('.muni-step[data-step="submitted"]'),
      under_review: document.querySelector('.muni-step[data-step="under_review"]'),
      approved: document.querySelector('.muni-step[data-step="approved"]'),
      plan: document.querySelector('.muni-step[data-step="plan"]'),
    };

    stepEls.submitted.classList.add("done");
    document.querySelector('[data-date="submitted"]').textContent = formatDate(row.submitted_at);

    const approvedCircle = stepEls.approved.querySelector(".muni-step-circle");
    const approvedLabel = stepEls.approved.querySelector(".muni-step-label");

    if (isRejected) {
      stepEls.under_review.classList.add(reviewDone ? "done" : "current");
      stepEls.approved.classList.add("rejected");
      approvedCircle.textContent = "✗";
      approvedLabel.textContent = "Rejected";
      lines[0].classList.toggle("done", reviewDone);
    } else {
      approvedCircle.textContent = "✓";
      approvedLabel.textContent = "Approved";
      if (reviewDone) stepEls.under_review.classList.add("done");
      else stepEls.under_review.classList.add("current");
      lines[0].classList.toggle("done", reviewDone);

      if (approvedDone) stepEls.approved.classList.add("done");
      else if (reviewDone) stepEls.approved.classList.add("current");
      lines[1].classList.toggle("done", approvedDone);

      if (planDone) stepEls.plan.classList.add("done");
      else if (approvedDone) stepEls.plan.classList.add("current");
      lines[2].classList.toggle("done", planDone);
    }

    document.querySelector('[data-date="under_review"]').textContent = formatDate(row.under_review_at);
    document.querySelector('[data-date="approved"]').textContent = formatDate(row.approved_at);
    document.querySelector('[data-date="plan"]').textContent = planDone
      ? `${PLAN_NAMES[row.plan] || row.plan} · ${formatDate(row.plan_selected_at)}`
      : "Pending";

    // ---- Status banner ----
    const banner = document.getElementById("muniStatusBanner");
    banner.className = "panel muni-status-banner";
    if (row.status === "approved") {
      banner.classList.add("approved");
      banner.innerHTML = row.payment_status === "paid"
        ? `<div class="banner-icon">🎉</div><h4>You're all set!</h4><p>Your ${PLAN_NAMES[row.plan] || row.plan} plan is active. Welcome to SwachhLens.</p>`
        : `<div class="banner-icon">✅</div><h4>Application Approved!</h4><p>Your municipality registration has been approved. Please choose a plan below and complete payment to activate your account and access SwachhLens.</p>`;
    } else if (row.status === "rejected") {
      banner.classList.add("rejected");
      banner.innerHTML = `<div class="banner-icon">❌</div><h4>Application Rejected</h4><p>${
        row.admin_comment ? row.admin_comment : "Please contact support for details."
      }</p>`;
    } else if (row.status === "under_review") {
      banner.classList.add("pending");
      banner.innerHTML = `<div class="banner-icon">🔍</div><h4>Under Review</h4><p>Our team is currently reviewing your application. This usually takes 2-3 business days.</p>`;
    } else {
      banner.classList.add("pending");
      banner.innerHTML = `<div class="banner-icon">⏳</div><h4>Application Submitted</h4><p>Thanks! Your registration has been received and is queued for review.</p>`;
    }

    // ---- Plans section ----
    const plansSection = document.getElementById("muniPlansSection");
    const plansGrid = document.getElementById("muniPlansGrid");
    const planConfirmed = document.getElementById("muniPlanConfirmed");

    if (row.status === "approved") {
      plansSection.hidden = false;
      if (row.payment_status === "paid") {
        plansGrid.hidden = true;
        planConfirmed.hidden = false;
        document.getElementById("muniPlanConfirmedName").textContent = PLAN_NAMES[row.plan] || row.plan;
      } else {
        plansGrid.hidden = false;
        planConfirmed.hidden = true;
      }
    } else {
      plansSection.hidden = true;
    }
  }

  // Sends the municipality to Stripe's hosted checkout (test mode) for the
  // chosen plan. Payment is only recorded once Stripe redirects back and
  // confirmPaymentFromUrl() verifies it server-side — see below.
  async function choosePlan(row, planKey, btn) {
    const allButtons = document.querySelectorAll(".choose-plan-btn");
    allButtons.forEach((b) => (b.disabled = true));
    const originalText = btn.textContent;
    btn.textContent = "Redirecting to payment...";

    const { data, error } = await db.functions.invoke("create-checkout-session", {
      body: { registration_id: row.id, plan: planKey, origin: window.location.origin },
    });

    if (error || !data || data.error || !data.url) {
      allButtons.forEach((b) => (b.disabled = false));
      btn.textContent = originalText;
      const body = error && error.context && typeof error.context.json === "function"
        ? await error.context.json().catch(() => null)
        : null;
      showError((body && body.error) || (data && data.error) || "Could not start payment. Please try again.");
      return;
    }

    window.location.href = data.url;
  }

  // Runs once on load: if Stripe just redirected back here, verify the
  // payment server-side (never trust the URL alone) and activate the plan.
  async function confirmPaymentFromUrl(row) {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const payment = params.get("payment");

    if (payment === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
      showError("Payment was cancelled. You can choose a plan again whenever you're ready.");
      return row;
    }

    if (payment !== "success" || !sessionId) return row;

    window.history.replaceState({}, "", window.location.pathname);

    const { data, error } = await db.functions.invoke("confirm-payment", {
      body: { session_id: sessionId },
    });

    if (error || !data || data.error || !data.registration) {
      showError("We couldn't confirm your payment automatically. If you were charged, please contact support.");
      return row;
    }

    return data.registration;
  }

  async function init() {
    if (!db) {
      showError("Could not connect to the server. Please refresh and try again.");
      return;
    }

    let row = null;

    const {
      data: { session },
    } = await db.auth.getSession();

    if (session && session.user) {
      const { data } = await db
        .from("municipality_registrations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      row = data;
    }

    if (!row) {
      let storedId = null;
      try {
        storedId = localStorage.getItem("swachhlensMunicipalityRegistrationId");
      } catch (err) {
        /* ignore */
      }
      if (storedId) {
        const { data } = await db.from("municipality_registrations").select("*").eq("id", storedId).maybeSingle();
        row = data;
      }
    }

    if (!row) {
      showError("We couldn't find a registration for this browser. Please register your municipality or log in.");
      return;
    }

    row = await confirmPaymentFromUrl(row);
    renderRegistration(row);

    // Realtime: reflect admin approve/reject/status changes instantly.
    db.channel("muni-status-" + row.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "municipality_registrations", filter: `id=eq.${row.id}` },
        (payload) => renderRegistration(payload.new)
      )
      .subscribe();

    document.querySelectorAll(".choose-plan-btn").forEach((btn) => {
      btn.addEventListener("click", () => choosePlan(row, btn.dataset.plan, btn));
    });
  }

  document.getElementById("muniLogoutLink").addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await db.auth.signOut();
    } catch (err) {
      /* ignore */
    }
    try {
      localStorage.removeItem("swachhlensMunicipalityRegistrationId");
    } catch (err) {
      /* ignore */
    }
    window.location.href = "index.html";
  });

  init();
})();
