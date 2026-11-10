const NAV = [
  ["index.html", "Home"],
  ["about.html", "About"],
  ["services.html", "Services"],
  ["projects.html", "Our Impact"],
  ["consult.html", "Request a Consultation"],
  ["contact.html", "Contact"],
];
const page = location.pathname.split("/").pop() || "index.html";
document.body.insertAdjacentHTML(
  "afterbegin",
  `
<header class="top">
  <div class="wrap">
    <a class="logo" href="index.html" aria-label="Gosele Consulting home">
      <img src="assets/gosele-logo.jpeg" alt="Gosele Consulting — Insight. Action. Impact.">
    </a>
    <button class="menu-btn" id="mo" type="button" aria-label="Open menu" aria-controls="dr" aria-expanded="false">☰</button>
  </div>
</header>
<div class="veil" id="vl"></div>
<aside class="drawer" id="dr" aria-label="Main navigation" aria-hidden="true" inert>
  <button id="mc" type="button" aria-label="Close menu">×</button>
  <nav>${NAV.map(([href, label]) => `<a href="${href}" class="${href === page ? "on" : ""}">${label}</a>`).join("")}</nav>
</aside>`,
);

const menuButton = document.querySelector("#mo");
const drawer = document.querySelector("#dr");
const menuBackdrop = document.querySelector("#vl");
const closeMenuButton = document.querySelector("#mc");

function setMenuOpen(isOpen) {
  drawer.classList.toggle("open", isOpen);
  menuBackdrop.classList.toggle("open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  drawer.setAttribute("aria-hidden", String(!isOpen));
  drawer.inert = !isOpen;

  if (isOpen) {
    closeMenuButton.focus();
  } else {
    menuButton.focus();
  }
}

menuButton.addEventListener("click", () => setMenuOpen(true));
closeMenuButton.addEventListener("click", () => setMenuOpen(false));
menuBackdrop.addEventListener("click", () => setMenuOpen(false));
drawer.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuButton.getAttribute("aria-expanded") === "true"
  ) {
    setMenuOpen(false);
  }
});

document.body.insertAdjacentHTML(
  "beforeend",
  `
<footer class="wrap">
  <div class="grey office">
    <div>
      <h4>Insight. Action. Impact.</h4>
      <p>Skills Development, Workplace Safety Compliance, Stakeholder Engagement Facilitation and ISO Management Systems.</p>
    </div>
    <div>
      <h4>Contact us</h4>
      <p>
        <a href="tel:+27872654368">087 265 4368</a><br>
        <a href="tel:+27827512137">082 751 2137</a><br>
        <a href="mailto:info@goseleconsult.co.za">info@goseleconsult.co.za</a>
      </p>
    </div>
    <p class="copy">
      © <span id="yr"></span> Gosele Consulting &amp; Projects. All rights reserved.<br>
      <span class="credit">Designed by Matsogo Tau Projects (PTY) LTD</span>
    </p>
  </div>
</footer>`,
);

document.querySelector("#yr").textContent = new Date().getFullYear();

let pageTransitioning = false;
document.addEventListener("click", (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest("a[href]");
  if (
    !link ||
    link.hasAttribute("download") ||
    (link.target && link.target !== "_self")
  ) {
    return;
  }

  const destination = new URL(link.href, location.href);
  if (
    destination.protocol !== location.protocol ||
    destination.host !== location.host ||
    (destination.pathname === location.pathname &&
      destination.search === location.search)
  ) {
    return;
  }

  event.preventDefault();
  if (pageTransitioning) return;

  pageTransitioning = true;
  document.body.classList.add("page-leaving");
  setTimeout(() => location.assign(destination.href), 260);
});

window.addEventListener("pageshow", () => {
  pageTransitioning = false;
  document.body.classList.remove("page-leaving");
});

function showFormStatus(status, message, state) {
  status.textContent = message;
  status.classList.remove("is-success", "is-error", "is-sending");
  status.classList.add(`is-${state}`);
  status.setAttribute("role", state === "error" ? "alert" : "status");
  status.setAttribute("aria-live", state === "error" ? "assertive" : "polite");
  status.style.display = "block";
}

document.querySelectorAll("form[data-endpoint]").forEach((form) => {
  const submitButton = form.querySelector('button[type="submit"]');
  const status = form.querySelector(".status");
  const buttonLabel = submitButton.textContent;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.submitting === "true" || !form.reportValidity()) return;

    form.dataset.submitting = "true";
    form.setAttribute("aria-busy", "true");
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    showFormStatus(status, "Sending your message...", "sending");

    try {
      const response = await fetch(form.dataset.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result || result.success !== true) {
        throw new Error(
          result?.errors
            ? Object.values(result.errors).join(" ")
            : result?.message ||
              "We couldn't send your message. Please try again later.",
        );
      }

      form.reset();
      showFormStatus(status, result.message, "success");
    } catch (error) {
      showFormStatus(
        status,
        error instanceof TypeError
          ? "Unable to connect to the server. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "We couldn't send your message. Please try again later.",
        "error",
      );
    } finally {
      form.dataset.submitting = "false";
      form.removeAttribute("aria-busy");
      submitButton.disabled = false;
      submitButton.textContent = buttonLabel;
    }
  });
});
