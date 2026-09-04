// ===== Municipality Dashboard: live status, plans/payment, profile, support =====
(function () {
  const db = window.swachhlensDb;
  const errorEl = document.getElementById("muniLoadError");

  // Where "Click to Visit Your Custom Admin Panel" sends a paid, approved
  // municipality — the separate admin_panel deployment (same Supabase
  // project, so their registration credentials work there too).
  const ADMIN_PANEL_URL = "https://swachlens-admin.vercel.app/";

  function showError(text) {
    errorEl.textContent = text;
    errorEl.className = "form-message show error";
  }

  function clearError() {
    errorEl.textContent = "";
    errorEl.className = "form-message";
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  const PLAN_NAMES = { basic: "Basic", standard: "Standard", smart_city: "Smart City" };

  const PLAN_DATA = [
    {
      key: "basic",
      name: "Basic",
      price: 24000,
      desc: "Essential municipal management",
      features: [
        "Complaint management",
        "Waste collection tracking",
        "Basic reporting &amp; dashboard",
        "Citizen engagement tools",
        "Email support",
      ],
      variant: "",
    },
    {
      key: "standard",
      name: "Standard",
      price: 60000,
      desc: "Operations + AI + vehicle management",
      features: [
        "All Basic features",
        "AI-based waste classification",
        "Vehicle &amp; route management",
        "Advanced analytics &amp; reports",
        "Team management",
        "Priority support",
      ],
      variant: "popular",
      badge: "Most Popular",
    },
    {
      key: "smart_city",
      name: "Smart City",
      price: 120000,
      desc: "Complete municipal management + advanced AI &amp; analytics",
      features: [
        "All Standard features",
        "Predictive analytics &amp; insights",
        "Smart bin monitoring (IoT ready)",
        "Advanced AI recommendations",
        "Custom integrations",
        "Dedicated support manager",
      ],
      variant: "smart",
    },
  ];

  // mode "choose": only used pre-payment (Dashboard) — plain "Choose <Plan>".
  // mode "browse": used on the Plans & Payment tab, always — marks the
  // active plan and offers "Upgrade to <Plan>" for the others.
  function buildPlanCardHTML(plan, { mode, currentPlan }) {
    const isCurrent = mode === "browse" && currentPlan === plan.key;
    const btnClass = plan.variant === "popular" ? "signin-btn" : "outline-btn";
    let btnLabel = `Choose ${plan.name} Plan`;
    let btnAttrs = "";
    if (mode === "browse") {
      if (isCurrent) {
        btnLabel = "Current Plan";
        btnAttrs = "disabled";
      } else if (currentPlan) {
        btnLabel = `Upgrade to ${plan.name}`;
      }
    }

    return `
      <div class="plan-card ${plan.variant} ${isCurrent ? "is-current" : ""}" data-plan="${plan.key}">
        ${plan.badge && !isCurrent ? `<span class="plan-badge">${plan.badge}</span>` : ""}
        ${isCurrent ? `<span class="plan-current-badge">Current Plan</span>` : ""}
        <h3>${plan.name}</h3>
        <div class="plan-price">₹${plan.price.toLocaleString("en-IN")} <span>/ year</span></div>
        <p class="plan-desc">${plan.desc}</p>
        <ul class="plan-features">${plan.features.map((f) => `<li>✅ ${f}</li>`).join("")}</ul>
        <button type="button" class="${btnClass} choose-plan-btn" data-plan="${plan.key}" ${btnAttrs}>${btnLabel}</button>
      </div>
    `;
  }

  // ---------------- View switching (sidebar tabs) ----------------
  function initViewSwitching() {
    const navItems = document.querySelectorAll("#muniNav li[data-view]");
    navItems.forEach((li) => {
      const link = li.querySelector("a[data-view-link]");
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = li.dataset.view;
        navItems.forEach((other) => other.classList.toggle("active", other === li));
        document.querySelectorAll(".muni-view").forEach((section) => {
          section.hidden = section.id !== `view-${view}`;
        });
      });
    });
  }

  // ---------------- Dashboard: stepper + status banner + plan picker ----------------
  function renderDashboard(row) {
    document.getElementById("muniStatusRow").hidden = false;

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
        row.admin_comment ? escapeHtml(row.admin_comment) : "Please contact support for details."
      }</p>`;
    } else if (row.status === "under_review") {
      banner.classList.add("pending");
      banner.innerHTML = `<div class="banner-icon">🔍</div><h4>Under Review</h4><p>Our team is currently reviewing your application. This usually takes 2-3 business days.</p>`;
    } else {
      banner.classList.add("pending");
      banner.innerHTML = `<div class="banner-icon">⏳</div><h4>Application Submitted</h4><p>Thanks! Your registration has been received and is queued for review.</p>`;
    }

    // ---- Plan picker (only shown pre-payment; hidden once paid — see the
    // Plans & Payment tab for browsing/upgrading after that) ----
    const plansSection = document.getElementById("muniPlansSection");
    const plansGrid = document.getElementById("muniPlansGrid");
    const planConfirmed = document.getElementById("muniPlanConfirmed");

    if (row.status === "approved") {
      plansSection.hidden = false;
      if (row.payment_status === "paid") {
        plansGrid.hidden = true;
        planConfirmed.hidden = false;
        document.getElementById("muniPlanConfirmedName").textContent = PLAN_NAMES[row.plan] || row.plan;
        document.getElementById("muniAdminPanelLink").href = ADMIN_PANEL_URL;
      } else {
        plansGrid.hidden = false;
        planConfirmed.hidden = true;
        plansGrid.innerHTML = PLAN_DATA.map((p) => buildPlanCardHTML(p, { mode: "choose" })).join("");
      }
    } else {
      plansSection.hidden = true;
    }
  }

  // ---------------- Application Status (detail) ----------------
  function renderApplicationStatus(row) {
    const grid = document.getElementById("muniStatusDetailGrid");
    const statusClass = row.status;
    const items = [
      ["Registration ID", `<code>${escapeHtml(row.id)}</code>`],
      ["Current Status", `<span class="muni-status-badge ${statusClass}">${escapeHtml(row.status.replace("_", " "))}</span>`],
      ["Submitted On", escapeHtml(formatDate(row.submitted_at)) || "—"],
      ["Under Review Since", escapeHtml(formatDate(row.under_review_at)) || "—"],
      [row.status === "rejected" ? "Rejected On" : "Approved On", escapeHtml(formatDate(row.status === "rejected" ? row.rejected_at : row.approved_at)) || "—"],
      ["Plan Selected", row.payment_status === "paid" ? `${escapeHtml(PLAN_NAMES[row.plan] || row.plan)} on ${escapeHtml(formatDate(row.plan_selected_at))}` : "Not yet"],
    ];
    grid.innerHTML = items
      .map(([label, value]) => `<div class="muni-detail-item"><span class="muni-detail-label">${label}</span><span class="muni-detail-value">${value}</span></div>`)
      .join("");

    const note = document.getElementById("muniRejectedNote");
    if (row.status === "rejected") {
      note.hidden = false;
      note.textContent = row.admin_comment
        ? `Reason: ${row.admin_comment}`
        : "No reason was provided. Please contact support for details.";
    } else {
      note.hidden = true;
    }
  }

  // ---------------- Plans & Payment ----------------
  function renderPlansPaymentView(row) {
    const currentCard = document.getElementById("muniCurrentPlanCard");
    if (row.payment_status === "paid") {
      currentCard.hidden = false;
      document.getElementById("muniCurrentPlanName").textContent = `${PLAN_NAMES[row.plan] || row.plan} Plan`;
      const validUntil = row.paid_at ? new Date(row.paid_at) : null;
      if (validUntil) validUntil.setFullYear(validUntil.getFullYear() + 1);
      document.getElementById("muniCurrentPlanMeta").textContent = row.paid_at
        ? `Paid on ${formatDate(row.paid_at)} · Valid until ${formatDate(validUntil.toISOString())}`
        : "Active";
      document.getElementById("muniAdminPanelLink2").href = ADMIN_PANEL_URL;
    } else {
      currentCard.hidden = true;
    }

    const lockedNote = document.getElementById("muniPlansLockedNote");
    const allPlansGrid = document.getElementById("muniAllPlansGrid");
    if (row.status !== "approved") {
      lockedNote.hidden = false;
      allPlansGrid.hidden = true;
    } else {
      lockedNote.hidden = true;
      allPlansGrid.hidden = false;
      allPlansGrid.innerHTML = PLAN_DATA.map((p) => buildPlanCardHTML(p, { mode: "browse", currentPlan: row.payment_status === "paid" ? row.plan : null })).join("");
    }
  }

  function renderPaymentHistory(payments) {
    const body = document.getElementById("muniPaymentHistoryBody");
    const empty = document.getElementById("muniPaymentHistoryEmpty");
    const table = document.getElementById("muniPaymentHistoryTable");

    if (!payments || !payments.length) {
      table.hidden = true;
      empty.hidden = false;
      return;
    }
    table.hidden = false;
    empty.hidden = true;
    body.innerHTML = payments
      .map(
        (p) => `
        <tr>
          <td>${escapeHtml(formatDateTime(p.paid_at))}</td>
          <td>${escapeHtml(PLAN_NAMES[p.plan] || p.plan)}</td>
          <td>₹${Number(p.amount).toLocaleString("en-IN")}</td>
          <td><span class="muni-status-badge ${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
          <td><code>${escapeHtml(p.stripe_session_id || "—")}</code></td>
        </tr>
      `
      )
      .join("");
  }

  async function loadPaymentHistory(registrationId) {
    const { data } = await db
      .from("municipality_payments")
      .select("*")
      .eq("registration_id", registrationId)
      .order("paid_at", { ascending: false });
    renderPaymentHistory(data || []);
  }

  // ---------------- Profile ----------------
  function renderProfile(row) {
    const grid = document.getElementById("muniProfileGrid");
    const docLink = row.authorization_document_url
      ? `<a href="${escapeHtml(row.authorization_document_url)}" target="_blank" rel="noopener">View document</a>`
      : "—";
    const imageLink = row.municipality_image_url
      ? `<a href="${escapeHtml(row.municipality_image_url)}" target="_blank" rel="noopener">View image</a>`
      : "—";

    const items = [
      ["Municipality Name", escapeHtml(row.municipality_name)],
      ["Municipality Type", escapeHtml(row.municipality_type)],
      ["Municipality Code (ULB)", escapeHtml(row.municipality_code)],
      ["State", escapeHtml(row.state)],
      ["District", escapeHtml(row.district)],
      ["Current Location", escapeHtml(row.current_location)],
      ["Official Email", escapeHtml(row.official_email)],
      ["Designation", escapeHtml(row.designation)],
      ["Contact Number", escapeHtml(row.contact_number)],
      ["Authorization Document", docLink],
      ["Municipality Image", imageLink],
      ["Registered On", escapeHtml(formatDate(row.submitted_at))],
    ];
    grid.innerHTML = items
      .map(([label, value]) => `<div class="muni-detail-item"><span class="muni-detail-label">${label}</span><span class="muni-detail-value">${value}</span></div>`)
      .join("");
  }

  // ---------------- Support ----------------
  function renderSupportList(requests) {
    const list = document.getElementById("muniSupportList");
    const empty = document.getElementById("muniSupportListEmpty");
    if (!requests || !requests.length) {
      list.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.innerHTML = requests
      .map(
        (r) => `
        <div class="muni-support-item">
          <div class="muni-support-item-head">
            <strong>${escapeHtml(r.subject)}</strong>
            <span class="muni-status-badge ${escapeHtml(r.status)}">${escapeHtml(r.status)}</span>
          </div>
          <p>${escapeHtml(r.message)}</p>
          <span class="muni-support-item-date">Raised on ${escapeHtml(formatDateTime(r.created_at))}</span>
          ${r.admin_reply ? `<div class="muni-support-reply"><strong>Support reply:</strong> ${escapeHtml(r.admin_reply)}</div>` : ""}
        </div>
      `
      )
      .join("");
  }

  async function loadSupportRequests(registrationId) {
    const { data } = await db
      .from("municipality_support_requests")
      .select("*")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: false });
    renderSupportList(data || []);
  }

  function initSupportForm(row) {
    const form = document.getElementById("muniSupportForm");
    const msgEl = document.getElementById("muniSupportFormMessage");
    const btn = document.getElementById("muniSupportSubmitBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const subject = document.getElementById("muniSupportSubject").value.trim();
      const message = document.getElementById("muniSupportMessage").value.trim();
      if (!subject || !message) return;

      btn.disabled = true;
      btn.textContent = "Submitting...";

      const {
        data: { session },
      } = await db.auth.getSession();

      const { error } = await db.from("municipality_support_requests").insert({
        registration_id: row.id,
        user_id: session && session.user ? session.user.id : null,
        subject,
        message,
      });

      btn.disabled = false;
      btn.textContent = "Submit Request";

      if (error) {
        msgEl.textContent = error.message || "Could not submit your request. Please try again.";
        msgEl.className = "form-message show error";
        return;
      }

      form.reset();
      msgEl.textContent = "Your support request has been submitted. Our team will get back to you.";
      msgEl.className = "form-message show success";
      loadSupportRequests(row.id);
    });
  }

  // ---------------- Choose/upgrade a plan (Stripe test checkout) ----------------
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

  function initPlanButtons(getRow) {
    // Event delegation on the main content area: handles clicks from both
    // the Dashboard's plan grid and the Plans & Payment tab's grid, even
    // though they're rebuilt (innerHTML) on every render.
    document.querySelector(".muni-main").addEventListener("click", (e) => {
      const btn = e.target.closest(".choose-plan-btn");
      if (!btn || btn.disabled) return;
      choosePlan(getRow(), btn.dataset.plan, btn);
    });
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

  function renderAll(row) {
    document.getElementById("muniSidebarName").textContent = row.municipality_name;
    document.getElementById("muniSidebarLocation").textContent = `${row.district}, ${row.state}`;
    document.getElementById("muniWelcomeName").textContent = row.municipality_name;

    renderDashboard(row);
    renderApplicationStatus(row);
    renderPlansPaymentView(row);
    renderProfile(row);
  }

  async function init() {
    if (!db) {
      showError("Could not connect to the server. Please refresh and try again.");
      return;
    }

    initViewSwitching();

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
    renderAll(row);
    loadPaymentHistory(row.id);
    loadSupportRequests(row.id);
    initSupportForm(row);
    initPlanButtons(() => row);

    // Realtime: reflect admin approve/reject/status/payment changes, and
    // support replies, instantly across every tab.
    db.channel("muni-status-" + row.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "municipality_registrations", filter: `id=eq.${row.id}` },
        (payload) => {
          row = payload.new;
          clearError();
          renderAll(row);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "municipality_payments", filter: `registration_id=eq.${row.id}` },
        () => loadPaymentHistory(row.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "municipality_support_requests", filter: `registration_id=eq.${row.id}` },
        () => loadSupportRequests(row.id)
      )
      .subscribe();
  }

  document.getElementById("muniLogoutLink").addEventListener("click", async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to logout?")) return;
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
