// ===== Register Your Municipality: states/districts, geolocation, Supabase submit =====
(function () {
  const form = document.getElementById("registerForm");
  if (!form) return; // not on this page

  const stateSelect = document.getElementById("fState");
  const districtSelect = document.getElementById("fDistrict");
  const locationInput = document.getElementById("fCurrentLocation");
  const detectBtn = document.getElementById("detectLocationBtn");
  const messageEl = document.getElementById("registerFormMessage");
  const submitBtn = document.getElementById("registerSubmitBtn");

  let latitude = null;
  let longitude = null;

  // ---- State -> District cascade ----
  const states = Object.keys(window.INDIA_STATES_DISTRICTS || {}).sort();
  states.forEach((state) => {
    const opt = document.createElement("option");
    opt.value = state;
    opt.textContent = state;
    stateSelect.appendChild(opt);
  });

  stateSelect.addEventListener("change", () => {
    const districts = (window.INDIA_STATES_DISTRICTS || {})[stateSelect.value] || [];
    districtSelect.innerHTML = "";

    if (!districts.length) {
      districtSelect.disabled = true;
      const opt = document.createElement("option");
      opt.value = "";
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = "Select state first";
      districtSelect.appendChild(opt);
      return;
    }

    districtSelect.disabled = false;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = "Select district";
    districtSelect.appendChild(placeholder);

    districts.forEach((district) => {
      const opt = document.createElement("option");
      opt.value = district;
      opt.textContent = district;
      districtSelect.appendChild(opt);
    });
  });

  // ---- Current Location: detect via browser geolocation + OpenStreetMap Nominatim ----
  // (Nominatim is OpenStreetMap's free reverse-geocoding service.)
  async function detectLocation() {
    if (!navigator.geolocation) {
      showMessage("Geolocation isn't supported by this browser — please type the location manually.", "error");
      return;
    }

    const originalPlaceholder = locationInput.placeholder;
    locationInput.placeholder = "Detecting your location...";
    detectBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } }
          );
          const data = await res.json();
          locationInput.value = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        } catch (err) {
          locationInput.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        } finally {
          locationInput.placeholder = originalPlaceholder;
          detectBtn.disabled = false;
        }
      },
      () => {
        locationInput.placeholder = originalPlaceholder;
        detectBtn.disabled = false;
        showMessage("Couldn't access your location — please allow location access or type it in manually.", "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  detectBtn.addEventListener("click", detectLocation);
  // Also auto-detect the first time the field is focused and still empty,
  // so clicking straight into the field "just works" as asked.
  locationInput.addEventListener(
    "focus",
    () => {
      if (!locationInput.value.trim()) detectLocation();
    },
    { once: true }
  );

  // ---- Password show/hide (register page) ----
  const toggleBtn = document.getElementById("toggleRegisterPassword");
  const passwordInput = document.getElementById("fPassword");
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      toggleBtn.textContent = isHidden ? "🙈" : "👁️";
    });
  }

  function showMessage(text, kind) {
    messageEl.textContent = text;
    messageEl.className = "form-message show " + (kind || "error");
  }

  function clearMessage() {
    messageEl.textContent = "";
    messageEl.className = "form-message";
  }

  async function uploadFile(db, registrationId, file, kind) {
    if (!file) return null;
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${registrationId}/${kind}.${ext}`;

    const { error } = await db.storage.from("municipality-documents").upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) throw error;

    const { data } = db.storage.from("municipality-documents").getPublicUrl(path);
    return data.publicUrl;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const db = window.swachhlensDb;
    if (!db) {
      showMessage("Could not connect to the server. Please refresh and try again.", "error");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const authDocFile = document.getElementById("fAuthDoc").files[0];
    const muniImageFile = document.getElementById("fMuniImage").files[0];
    if (!authDocFile) {
      showMessage("Please upload the authorization document.", "error");
      return;
    }

    const email = document.getElementById("fEmail").value.trim();
    const password = document.getElementById("fPassword").value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      // A client-generated id lets us upload files under a known path
      // before the registration row exists.
      const registrationId =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : "reg-" + Date.now() + "-" + Math.random().toString(16).slice(2);

      // 1. Upload the document(s) with the anon key (open storage policies).
      const authorizationDocumentUrl = await uploadFile(db, registrationId, authDocFile, "authorization-document");
      const municipalityImageUrl = await uploadFile(db, registrationId, muniImageFile, "municipality-image");

      // 2. Create the login and the registration row together via the
      // register-municipality edge function. It creates the Auth account
      // already confirmed (service-role `email_confirm: true`), so
      // municipalities can sign in with their credentials right away — no
      // confirmation email, and none of its rate limits, involved.
      const { data: fnData, error: fnError } = await db.functions.invoke("register-municipality", {
        body: {
          id: registrationId,
          email,
          password,
          municipality_name: document.getElementById("fMunicipalityName").value.trim(),
          state: stateSelect.value,
          district: districtSelect.value,
          current_location: locationInput.value.trim(),
          latitude,
          longitude,
          municipality_type: document.getElementById("fMunicipalityType").value,
          municipality_code: document.getElementById("fMunicipalityCode").value.trim(),
          designation: document.getElementById("fDesignation").value.trim(),
          contact_number: document.getElementById("fContactNumber").value.trim(),
          authorization_document_url: authorizationDocumentUrl,
          municipality_image_url: municipalityImageUrl,
        },
      });
      if (fnError) {
        const body = fnError.context && typeof fnError.context.json === "function"
          ? await fnError.context.json().catch(() => null)
          : null;
        throw new Error((body && body.error) || fnError.message);
      }
      if (!fnData || fnData.error) throw new Error((fnData && fnData.error) || "Could not submit the registration.");

      // 3. Remember which registration this browser submitted, so the
      // status page can find it even before the sign-in below settles.
      try {
        localStorage.setItem("swachhlensMunicipalityRegistrationId", fnData.id);
      } catch (err) {
        /* ignore */
      }

      // 4. Sign the municipality straight in — works immediately now that
      // the account is created pre-confirmed.
      await db.auth.signInWithPassword({ email, password }).catch(() => {});

      showMessage("Registration submitted! Redirecting to your status page...", "success");
      setTimeout(() => {
        window.location.href = "municipality-status.html";
      }, 900);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Registration <span>→</span>';
      showMessage(err && err.message ? err.message : "Something went wrong. Please try again.", "error");
    }
  });
})();
