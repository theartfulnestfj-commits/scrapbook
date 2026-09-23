// Fallback data, used only if memories.json can't be fetched (e.g. the page
// is opened directly as a local file:// URL, where fetch() of a sibling JSON
// file is blocked by the browser).

async function loadBook() {
  try {
    const res = await fetch("memories.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`memories.json responded ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.photos) || data.photos.length === 0) {
      throw new Error("memories.json had no photos");
    }
    return data;
  } catch (err) {
    console.warn("Falling back to built-in memory data:", err.message);
    return FALLBACK_BOOK;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Camera icon shown inside any polaroid slot that has no photo yet.
const PLACEHOLDER_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="#8a7860" stroke-width="1.5">
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/>
    <circle cx="12" cy="13" r="3.5"/>
  </svg>
`;

function renderPhotoPage(photo) {
  return `
    <div class="photo-frame">
      ${photo.src ? `<img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.caption || "")}">` : PLACEHOLDER_ICON}
    </div>
    ${photo.caption ? `<div class="caption-bar"><p>${escapeHtml(photo.caption)}</p></div>` : ""}
  `;
}

function buildPages(book) {
  const flipbook = document.getElementById("flipbook");

  const front = document.createElement("div");
  front.className = "page page-cover" + (book.coverImage ? " page-cover-photo" : "");
  front.dataset.density = "hard";
  front.innerHTML = book.coverImage
    ? `
      <div class="photo-frame">
        <img src="${escapeHtml(book.coverImage)}" alt="${escapeHtml(book.bookTitle || "Cover")}">
      </div>
      <div class="cover-overlay">
        <h2>${escapeHtml(book.bookTitle ||"")}</h2>
        <p class="cover-line">${escapeHtml(book.bookSubtitle || "")}</p>
      </div>
    `
    : `
      <p class="cover-eyebrow">A little book of</p>
      <h2>${escapeHtml(book.bookTitle || "Memories")}</h2>
      <div class="divider"></div>
      <p class="cover-line">${escapeHtml(book.bookSubtitle || "")}</p>
    `;
  flipbook.appendChild(front);

  book.photos.forEach(photo => {
    const photoPage = document.createElement("div");
    photoPage.className = "page photo-page";
    photoPage.innerHTML = renderPhotoPage(photo);
    flipbook.appendChild(photoPage);
  });

  const back = document.createElement("div");
  back.className = "page page-cover" + (book.backCoverImage ? " page-cover-photo" : "");
  back.dataset.density = "hard";
  back.innerHTML = book.backCoverImage
    ? `
      <div class="photo-frame">
        <img src="${escapeHtml(book.backCoverImage)}" alt="Back cover">
      </div>
      <div class="cover-overlay">
        <h2>To be&nbsp;continued</h2>
      </div>
    `
    : `
      <p class="cover-eyebrow">More to come</p>
      <h2>To be&nbsp;continued</h2>
      <div class="divider"></div>
      <p class="signature">...</p>
    `;
  flipbook.appendChild(back);
}

document.addEventListener("DOMContentLoaded", async () => {
  const book = await loadBook();
  buildPages(book);

  const pageFlip = new St.PageFlip(document.getElementById("flipbook"), {
    width: 480,
    height: 679, // A4 ratio (210mm x 297mm)
    size: "fixed",
    minWidth: 300,
    minHeight: 424,
    maxWidth: 900,
    maxHeight: 1273,
    maxShadowOpacity: 0.5,
    showCover: true,
    mobileScrollSupport: true,
    drawShadow: true,
    flippingTime: 800,
    usePortrait: true,
    startZIndex: 0,
    autoSize: true,
    swipeDistance: 30,
    showPageCorners: true,
    disableFlipByClick: false,
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));

  const total = pageFlip.getPageCount();
  const label = document.getElementById("pageLabel");
  const update = (i) => { label.textContent = `Page ${i + 1} / ${total}`; };
  update(0);

  pageFlip.on("flip", (e) => update(e.data));

  document.getElementById("prevBtn").addEventListener("click", () => pageFlip.flipPrev());
  document.getElementById("nextBtn").addEventListener("click", () => pageFlip.flipNext());

  document.getElementById("fullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  });
});
