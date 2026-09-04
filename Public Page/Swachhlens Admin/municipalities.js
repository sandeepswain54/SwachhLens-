// ===== SwachhLens Admin: Municipalities module (realtime) =====
(function () {
  const db = window.swachhlensDb;
  const tableBody = document.getElementById("muniTableBody");
  const contentRow = document.querySelector(".muni-content-row");
  const detailPanel = document.getElementById("muniDetailPanel");
  const searchInput = document.getElementById("muniSearchInput");
  const tabs = document.querySelectorAll(".muni-tab");

  let allRows = [];
  let activeTab = "pending";
  let selectedId = null;

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function pillInfo(status) {
    if (status === "approved") return { cls: "approved", text: "Approved" };
    if (status === "rejected") return { cls: "rejected", text: "Rejected" };
    if (status === "under_review") return { cls: "review", text: "Under Review" };
    return { cls: "review", text: "Submitted" };
  }

  function statusPill(status) {
    const { cls, text } = pillInfo(status);
    return `<span class="status-pill ${cls}">${text}</span>`;
  }

  function matchesTab(row) {
    if (activeTab === "approved") return row.status === "approved";
    if (activeTab === "rejected") return row.status === "rejected";
    return row.status === "submitted" || row.status === "under_review";
  }

  function matchesSearch(row) {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return true;
    return [row.municipality_name, row.state, row.district].filter(Boolean).some((v) => v.toLowerCase().includes(q));
  }

  function updateCounts() {
    const pending = allRows.filter((r) => r.status === "submitted" || r.status === "under_review").length;
    const approved = allRows.filter((r) => r.status === "approved").length;
    const rejected = allRows.filter((r) => r.status === "rejected").length;
    document.getElementById("countPending").textContent = pending;
    document.getElementById("countApproved").textContent = approved;
    document.getElementById("countRejected").textContent = rejected;
    document.getElementById("muniPendingBadge").textContent = pending;
  }

  function renderTable() {
    updateCounts();
    const rows = allRows.filter(matchesTab).filter(matchesSearch);

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="muni-empty">No municipalities in this view yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows
      .map(
        (row, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${row.municipality_name}</td>
          <td>${row.state}</td>
          <td>${row.district}</td>
          <td>${row.municipality_type}</td>
          <td>${formatDate(row.submitted_at)}</td>
          <td>${statusPill(row.status)}</td>
          <td><button type="button" class="view-row-btn" data-view-id="${row.id}">👁 View</button></td>
        </tr>`
      )
      .join("");

    tableBody.querySelectorAll("[data-view-id]").forEach((btn) => {
      btn.addEventListener("click", () => openDetail(btn.dataset.viewId));
    });
  }

  async function openDetail(id) {
    selectedId = id;
    const row = allRows.find((r) => r.id === id);
    if (!row) return;

    contentRow.classList.add("with-detail");
    detailPanel.hidden = false;
    renderDetail(row);

    // Opening a fresh submission moves it into "Under Review" — realtime
    // pushes this to the municipality's status page immediately.
    if (row.status === "submitted") {
      const { data } = await db
        .from("municipality_registrations")
        .update({ status: "under_review" })
        .eq("id", id)
        .select()
        .single();
      if (data) applyRowUpdate(data);
    }
  }

  function renderDetail(row) {
    document.getElementById("detailName").textContent = row.municipality_name;
    document.getElementById("detailId").textContent = "MUN-" + row.id.slice(0, 8).toUpperCase();
    const { cls, text } = pillInfo(row.status);
    const pillEl = document.getElementById("detailStatusPill");
    pillEl.className = "status-pill " + cls;
    pillEl.textContent = text;

    document.getElementById("detailMunicipalityName").textContent = row.municipality_name;
    document.getElementById("detailState").textContent = row.state;
    document.getElementById("detailDistrict").textContent = row.district;
    document.getElementById("detailLocation").textContent = row.current_location;
    document.getElementById("detailType").textContent = row.municipality_type;
    document.getElementById("detailCode").textContent = row.municipality_code;
    document.getElementById("detailEmail").textContent = row.official_email;
    document.getElementById("detailContact").textContent = row.contact_number;
    document.getElementById("detailDesignation").textContent = row.designation;

    const authLink = document.getElementById("detailAuthDocLink");
    const imgLink = document.getElementById("detailImageLink");
    if (row.authorization_document_url) {
      authLink.href = row.authorization_document_url;
      authLink.textContent = "View →";
    } else {
      authLink.removeAttribute("href");
      authLink.textContent = "Not uploaded";
    }
    if (row.municipality_image_url) {
      imgLink.href = row.municipality_image_url;
      imgLink.textContent = "View →";
    } else {
      imgLink.removeAttribute("href");
      imgLink.textContent = "Not uploaded";
    }

    document.getElementById("muniComment").value = row.admin_comment || "";
    document.getElementById("muniDetailMessage").className = "form-message";

    const reviewSection = document.getElementById("muniReviewSection");
    reviewSection.style.display = row.status === "approved" || row.status === "rejected" ? "none" : "block";
  }

  function closeDetail() {
    selectedId = null;
    detailPanel.hidden = true;
    contentRow.classList.remove("with-detail");
  }

  function applyRowUpdate(updatedRow) {
    const idx = allRows.findIndex((r) => r.id === updatedRow.id);
    if (idx >= 0) allRows[idx] = updatedRow;
    else allRows.unshift(updatedRow);
    renderTable();
    if (selectedId === updatedRow.id) renderDetail(updatedRow);
  }

  async function reviewAction(status) {
    if (!selectedId) return;
    const comment = document.getElementById("muniComment").value.trim();
    const messageEl = document.getElementById("muniDetailMessage");

    if (status === "rejected" && !comment) {
      messageEl.textContent = "Please add a comment explaining the rejection.";
      messageEl.className = "form-message show error";
      return;
    }

    document.getElementById("muniApproveBtn").disabled = true;
    document.getElementById("muniRejectBtn").disabled = true;

    const { data, error } = await db
      .from("municipality_registrations")
      .update({ status, admin_comment: comment || null })
      .eq("id", selectedId)
      .select()
      .single();

    document.getElementById("muniApproveBtn").disabled = false;
    document.getElementById("muniRejectBtn").disabled = false;

    if (error) {
      messageEl.textContent = "Something went wrong. Please try again.";
      messageEl.className = "form-message show error";
      return;
    }

    applyRowUpdate(data);
    messageEl.textContent = status === "approved" ? "Municipality approved." : "Application rejected.";
    messageEl.className = "form-message show success";
  }

  function wireTabs() {
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        activeTab = tab.dataset.tab;
        renderTable();
      });
    });
  }

  function wireDetailTabs() {
    document.querySelectorAll(".muni-detail-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".muni-detail-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll("[data-detail-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.detailPanel !== btn.dataset.detailTab;
        });
      });
    });
  }

  async function init() {
    if (!db) {
      tableBody.innerHTML = '<tr><td colspan="8" class="muni-empty">Could not connect to the server.</td></tr>';
      return;
    }

    const { data, error } = await db
      .from("municipality_registrations")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) {
      tableBody.innerHTML = `<tr><td colspan="8" class="muni-empty">Couldn't load municipalities: ${error.message}</td></tr>`;
      return;
    }

    allRows = data || [];
    renderTable();

    // Realtime: new registrations and status changes from any admin/tab
    // show up here within a second or two.
    db.channel("admin-municipalities")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "municipality_registrations" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            allRows = allRows.filter((r) => r.id !== payload.old.id);
            renderTable();
          } else {
            applyRowUpdate(payload.new);
          }
        }
      )
      .subscribe();
  }

  document.getElementById("muniDetailClose").addEventListener("click", closeDetail);
  document.getElementById("muniApproveBtn").addEventListener("click", () => reviewAction("approved"));
  document.getElementById("muniRejectBtn").addEventListener("click", () => reviewAction("rejected"));
  searchInput.addEventListener("input", renderTable);
  wireTabs();
  wireDetailTabs();
  init();
})();
