const NAV = [
  ["index.html", "Home"],
  ["about.html", "About"],
  ["services.html", "Services"],
  ["projects.html", "Our Impact"],
  ["request.html", "Request a Consultation"],
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
      <p>Skills development, workplace safety, stakeholder facilitation and ISO management systems.</p>
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
      © <span id="yr"></span> Gosele Consulting. All rights reserved.<br>
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

const contactAddress = "info@goseleconsult.co.za";
document.querySelectorAll("form[data-mail]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const body = Array.from(
      new FormData(form),
      ([name, value]) => `${name}: ${value}`,
    ).join("\n");
    const subject = form.dataset.mail || "Website enquiry";
    const mailtoUrl = `mailto:${contactAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const status = form.querySelector(".status");

    if (status) {
      status.replaceChildren(
        document.createTextNode(
          "Your email app should open with this enquiry. If it doesn't, email ",
        ),
      );

      const fallbackLink = document.createElement("a");
      fallbackLink.href = `mailto:${contactAddress}`;
      fallbackLink.textContent = contactAddress;
      status.append(fallbackLink, document.createTextNode(" directly."));
      status.style.display = "block";
      status.setAttribute("role", "status");
    }

    location.href = mailtoUrl;
  });
});
