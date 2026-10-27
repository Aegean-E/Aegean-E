import {
  MAX_CERTIFICATE_BYTES,
  REGISTER_URL,
  TERMS_BASE_URL,
  TERMS_URL,
  parseCertificate,
  parseRegister,
  parseTerms,
  resolveTerms,
  verifyCertificate,
} from "./verify-core.js";

const STATUS_LABELS = {
  VALID: "Valid",
  REVOKED: "Revoked",
  UNREGISTERED: "Not registered",
  TAMPERED: "Tampered",
  EXPIRED: "Expired",
  SCOPE_MISMATCH: "Outside scope",
  INVALID_FORMAT: "Invalid",
  UNSUPPORTED_FORMAT: "Unsupported",
  UNAVAILABLE: "Unavailable",
};

const STATUS_CLASSES = {
  VALID: "is-valid",
  REVOKED: "is-danger",
  TAMPERED: "is-danger",
  INVALID_FORMAT: "is-danger",
  UNSUPPORTED_FORMAT: "is-danger",
  UNAVAILABLE: "is-danger",
  UNREGISTERED: "is-warning",
  EXPIRED: "is-warning",
  SCOPE_MISMATCH: "is-warning",
};

const SUMMARY = {
  VALID: "The certificate is listed as valid in the public register; its digest, terms, scope, dates and optional project check all pass.",
  REVOKED: "The register lists this certificate as revoked. Do not rely on it.",
  UNREGISTERED: "This id and digest are not in the canonical register, so the certificate is not evidence of a grant.",
  TAMPERED: "The digest does not match the certificate contents. Treat the file as altered.",
  EXPIRED: "The certificate term ended before the reference date.",
  SCOPE_MISMATCH: "The certificate does not cover the project you entered.",
  INVALID_FORMAT: "The certificate or the published agreement is malformed; no conclusion is possible.",
  UNSUPPORTED_FORMAT: "Only format-2 certificates verify.",
  UNAVAILABLE: "The register or the agreement text could not be loaded, so no conclusion is possible.",
};

const state = {
  register: null,
  terms: null,
  fetchedAt: null,
  loading: false,
  termTexts: new Map(),
};

const form = document.getElementById("verify-form");
const input = document.getElementById("certificate-input");
const fileInput = document.getElementById("certificate-file");
const projectInput = document.getElementById("project-input");
const runtime = document.getElementById("verify-runtime");
const runtimeError = document.getElementById("verify-runtime-error");
const resultPanel = document.getElementById("verify-result");
const resultBadge = document.getElementById("result-badge");
const resultTitle = document.getElementById("result-title");
const resultSummary = document.getElementById("result-summary");
const resultReasons = document.getElementById("result-reasons");
const resultFacts = document.getElementById("result-facts");
const resultRegister = document.getElementById("result-register");
const registerCount = document.getElementById("register-count");
const registerMeta = document.getElementById("register-meta");
const refreshButton = document.getElementById("refresh-register");
const submitButton = document.getElementById("verify-submit");
const clearButton = document.getElementById("clear-button");

function setRuntime(message) {
  if (runtime) runtime.textContent = message;
}

function showError(message) {
  if (!runtimeError) return;
  runtimeError.textContent = message;
  runtimeError.hidden = false;
}

function clearError() {
  if (!runtimeError) return;
  runtimeError.textContent = "";
  runtimeError.hidden = true;
}

function clearResult() {
  if (!resultPanel) return;
  resultPanel.hidden = true;
  if (resultBadge) resultBadge.textContent = "";
  if (resultBadge) resultBadge.className = "verify-badge";
  if (resultSummary) resultSummary.textContent = "";
  if (resultReasons) resultReasons.replaceChildren();
  if (resultFacts) resultFacts.replaceChildren();
  if (resultRegister) resultRegister.textContent = "";
}

function utcClock(date) {
  return date.toISOString().slice(11, 16) + " UTC";
}

async function readCapped(response, limit, label) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > limit) {
    if (response.body) await response.body.cancel().catch(function () {});
    throw new Error(label + " is larger than the expected limit.");
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > limit) {
      throw new Error(label + " is larger than the expected limit.");
    }
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      total += step.value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(function () {});
        throw new Error(label + " is larger than the expected limit.");
      }
      chunks.push(step.value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      /* the stream is already closed or cancelled */
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(bytes);
}

async function fetchCanonical(url, limit, label) {
  const controller = new AbortController();
  const timer = window.setTimeout(function () {
    controller.abort();
  }, 15000);
  const separator = url.indexOf("?") === -1 ? "?" : "&";
  try {
    const response = await fetch(url + separator + "nonce=" + Date.now(), {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
      headers: { Accept: "application/json, text/plain;q=0.9" },
    });
    if (!response.ok) {
      throw new Error(label + " returned HTTP " + response.status + ".");
    }
    return await readCapped(response, limit, label);
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(label + " timed out. Check your connection and try again.");
    }
    if (error instanceof TypeError) {
      throw new Error(label + " could not be reached. Check your connection and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function updateRegisterStatus() {
  if (registerCount) {
    if (!state.register) {
      registerCount.textContent = "Register unavailable.";
    } else if (state.register.size === 0) {
      registerCount.textContent = "No certificates are listed yet.";
    } else {
      registerCount.textContent =
        state.register.size + (state.register.size === 1 ? " certificate listed." : " certificates listed.");
    }
  }
  if (registerMeta) {
    registerMeta.textContent = state.register
      ? (state.fetchedAt
        ? "Canonical issued.json · fetched " + utcClock(state.fetchedAt)
        : "Canonical issued.json")
      : "No canonical registry loaded.";
  }
}

async function loadRegistries() {
  if (state.loading) return;
  state.loading = true;
  window.__aegeanVerifierReady = true;
  if (!window.crypto || !window.crypto.subtle) {
    state.loading = false;
    setRuntime("This browser cannot compute SHA-256. Use the command-line verifier below.");
    showError("Web Crypto is not available in this browser, so the certificate cannot be checked here.");
    if (refreshButton) refreshButton.disabled = true;
    return;
  }
  if (submitButton) submitButton.disabled = true;
  if (refreshButton) refreshButton.disabled = true;
  clearError();
  setRuntime("Loading the public register…");
  const outcomes = await Promise.allSettled([
    fetchCanonical(REGISTER_URL, 1048576, "The public register"),
    fetchCanonical(TERMS_URL, 262144, "The terms registry"),
  ]);
  const problems = [];
  if (outcomes[0].status === "fulfilled") {
    try {
      state.register = parseRegister(outcomes[0].value);
    } catch (error) {
      state.register = null;
      problems.push(error.message);
    }
  } else {
    state.register = null;
    problems.push(outcomes[0].reason.message);
  }
  if (outcomes[1].status === "fulfilled") {
    try {
      state.terms = parseTerms(outcomes[1].value);
      state.termTexts.clear();
    } catch (error) {
      state.terms = null;
      problems.push(error.message);
    }
  } else {
    state.terms = null;
    problems.push(outcomes[1].reason.message);
  }
  state.fetchedAt = new Date();
  updateRegisterStatus();
  state.loading = false;
  if (refreshButton) refreshButton.disabled = false;
  if (state.register && state.terms) {
    if (submitButton) submitButton.disabled = false;
    setRuntime("Register ready. Paste a certificate or choose a file.");
  } else {
    setRuntime("Verification is unavailable until the canonical registry loads.");
    showError(Array.from(new Set(problems)).join(" "));
  }
}

async function fetchTermsDocument(entry) {
  if (state.termTexts.has(entry.document)) return state.termTexts.get(entry.document);
  const text = await fetchCanonical(TERMS_BASE_URL + entry.document, 524288, "The agreement text");
  state.termTexts.set(entry.document, text);
  return text;
}

function renderFacts(facts) {
  if (!resultFacts) return;
  const fragment = document.createDocumentFragment();
  facts.forEach(function (fact) {
    const term = document.createElement("dt");
    term.textContent = fact[0];
    const value = document.createElement("dd");
    value.textContent = fact[1] || "—";
    fragment.append(term, value);
  });
  resultFacts.replaceChildren(fragment);
}

function registerSummary(verification) {
  const entry = verification.register_entry;
  if (!entry) return "Not listed in issued.json.";
  if (entry.status === "revoked") {
    return "Revoked" + (entry.revoked_at ? " on " + entry.revoked_at : "") + ".";
  }
  return "Valid entry" + (entry.issued_at ? ", issued " + entry.issued_at : "") + ".";
}

function renderResult(verification, certificate, citedTerms) {
  if (!resultPanel) return;
  const status = verification.status;
  if (resultBadge) {
    resultBadge.textContent = STATUS_LABELS[status] || status;
    resultBadge.className = "verify-badge " + (STATUS_CLASSES[status] || "is-danger");
  }
  if (resultSummary) {
    resultSummary.textContent = SUMMARY[status] || "The certificate could not be verified.";
  }
  if (resultReasons) {
    const fragment = document.createDocumentFragment();
    const reasons = verification.reasons.length ? verification.reasons : ["All checks passed."];
    reasons.forEach(function (reason) {
      const item = document.createElement("li");
      item.textContent = reason;
      fragment.append(item);
    });
    resultReasons.replaceChildren(fragment);
  }
  const cert = verification.cert || {};
  const license = [cert.license_type, cert.tier].filter(Boolean).join(" · ");
  const termsState = verification.terms_verified
    ? "Verified against the published agreement."
    : citedTerms
      ? "Cited but not verified."
      : "Not cited by the certificate.";
  renderFacts([
    ["Certificate", cert.cert_id],
    ["Licensee", cert.licensee_name],
    ["Contact", cert.licensee_contact],
    ["License", license],
    ["Scope", cert.scope],
    ["Projects", (cert.projects || []).join(", ")],
    ["Allowances", (cert.allowances || []).join(", ")],
    ["Issued", cert.issued_at],
    ["Term", cert.is_perpetual ? "Perpetual" : "Expires " + (cert.expires_at || "")],
    ["Serial", cert.serial],
    ["Register", registerSummary(verification)],
    ["Terms", termsState],
    ["Signature", cert.signature_present
      ? "Present (private HMAC; not checked in the browser)."
      : "Absent."],
  ]);
  if (resultRegister) {
    resultRegister.textContent = state.fetchedAt
      ? "Register checked against the canonical issued.json at " + utcClock(state.fetchedAt) + "."
      : "Register checked against the canonical issued.json.";
  }
  resultPanel.hidden = false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  resultPanel.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  if (resultTitle) resultTitle.focus({ preventScroll: true });
}

async function handleSubmit(event) {
  event.preventDefault();
  clearError();
  clearResult();
  if (!state.register || !state.terms) await loadRegistries();
  if (!state.register || !state.terms) {
    showError("Verification is unavailable while the canonical register or terms registry is offline.");
    return;
  }
  const text = input ? input.value.trim() : "";
  if (!text) {
    showError("Paste a certificate or choose a JSON file first.");
    if (input) input.focus();
    return;
  }
  let certificate;
  try {
    certificate = parseCertificate(text);
  } catch (error) {
    showError(error.message);
    return;
  }
  const citedTerms =
    typeof certificate.terms_digest === "string" && certificate.terms_digest.trim().length > 0;
  let termsText = null;
  if (citedTerms) {
    try {
      const entry = resolveTerms(state.terms, certificate.license_type);
      termsText = await fetchTermsDocument(entry);
    } catch (error) {
      termsText = null;
    }
  }
  let verification;
  try {
    verification = await verifyCertificate({
      certificate,
      register: state.register,
      terms: state.terms,
      termsText,
      project: projectInput ? projectInput.value : "",
    });
  } catch (error) {
    showError("The certificate could not be checked: " + error.message);
    return;
  }
  renderResult(verification, certificate, citedTerms);
}

if (form) {
  form.addEventListener("submit", handleSubmit);
  if (fileInput) {
    fileInput.addEventListener("change", async function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      clearError();
      clearResult();
      if (file.size > MAX_CERTIFICATE_BYTES) {
        showError("That file is larger than 256 KiB.");
        return;
      }
      try {
        input.value = await file.text();
        setRuntime("Loaded " + file.name + ". Choose Verify certificate.");
      } catch (error) {
        showError("The file could not be read.");
      }
    });
  }
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      if (input) input.value = "";
      if (fileInput) fileInput.value = "";
      if (projectInput) projectInput.value = "";
      clearError();
      clearResult();
      setRuntime(
        state.register && state.terms
          ? "Register ready. Paste a certificate or choose a file."
          : "Verification is unavailable until the canonical registry loads."
      );
      if (input) input.focus();
    });
  }
  if (refreshButton) {
    refreshButton.addEventListener("click", function () {
      clearResult();
      loadRegistries();
    });
  }
  loadRegistries();
} else {
  window.__aegeanVerifierReady = true;
}
