let allBooksData = [];

document.addEventListener("DOMContentLoaded", () => {
  loadBooks();
  setupSearch();
  setupScrollButtons();
});

async function loadBooks() {
  try {
    const res = await fetch("/api/books");
    if (!res.ok) throw new Error("Không thể fetch dữ liệu từ /api/books");
    const books = await res.json();

    allBooksData = books;

    renderBooks(books, "latest-books");
    renderBooks(books.slice(0, 6), "popular-books");
    renderBooks(shuffleArray(books).slice(0, 6), "suggested-books");
    renderBooks(books.slice(0, 6), "top-rated-books");
  } catch (err) {
    console.error("Lỗi khi tải sách:", err);
    showErrorAllSections();
  }
}

function setupSearch() {
  const searchInput = document.querySelector(".Search-input-text");
  const allSections = document.querySelector(".Content");
  const searchResults = document.createElement("div");
  searchResults.classList.add("search-results");
  allSections.parentNode.insertBefore(searchResults, allSections.nextSibling);

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase().trim();
    searchResults.innerHTML = "";

    if (keyword === "") {
      searchResults.style.display = "none";
      allSections.style.display = "block";
      return;
    }

    allSections.style.display = "none";
    searchResults.style.display = "flex";
    searchResults.style.flexWrap = "wrap";
    searchResults.style.gap = "20px";

    const matched = allBooksData.filter((book) => {
      const title = book.title?.toLowerCase() || "";
      const author = book.author?.toLowerCase() || "";
      return title.includes(keyword) || author.includes(keyword);
    });

    if (matched.length > 0) {
      searchResults.innerHTML = matched
        .map(
          (book) => `
          <a href="/read/${book.id}" class="book-card">
            <img 
              src="${
                book.cover_image && book.cover_image.trim()
                  ? book.cover_image
                  : "/static/images/Book/default.jpg"
              }"
              alt="${escapeHtml(book.title)}"
              class="book-card__image"
            />
            <h3 class="book-card__title">${escapeHtml(book.title)}</h3>
            <p class="book-card__author">${escapeHtml(
              book.author || "Chưa rõ"
            )}</p>
          </a>`
        )
        .join("");
    } else {
      searchResults.innerHTML = `
  <p style="text-align:center;margin:40px 0 60px;font-size:18px;color:#666;">
    Không tìm thấy kết quả nào cho "<b>${keyword}</b>"
  </p>
`;
    }
  });
}

function setupScrollButtons() {
  const scrollButtons = document.querySelectorAll(".scroll-btn");
  scrollButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrapper = btn.closest(".book-section__wrapper");
      const list = wrapper.querySelector(".book-section__list");
      const direction = btn.classList.contains("left") ? -1 : 1;
      const distance = list.clientWidth * 0.8;
      const duration = 400;
      smoothScroll(list, direction * distance, duration);
    });
  });

  function smoothScroll(element, distance, duration) {
    const start = element.scrollLeft;
    const startTime = performance.now();
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      element.scrollLeft = start + distance * eased;
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }
}

// ==========================
//  Helpers
// ==========================
function renderBooks(books, elementId) {
  const container = document.getElementById(elementId);
  if (!container) return;
  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = `<p class="no-result">Không có sách nào để hiển thị.</p>`;
    return;
  }
  container.innerHTML = books
    .map(
      (book) => `
        <a href="/book/${book.id}" class="book-card">
          <img 
            src="${
              book.cover_image && book.cover_image.trim()
                ? book.cover_image
                : "/static/images/Book/default.jpg"
            }" 
            alt="${escapeHtml(book.title)}" 
            class="book-card__image"
          />
          <h3 class="book-card__title">${escapeHtml(book.title)}</h3>
          <p class="book-card__author">${escapeHtml(
            book.author || "Chưa rõ"
          )}</p>
        </a>`
    )
    .join("");
}

function escapeHtml(unsafe) {
  return String(unsafe || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showErrorAllSections() {
  [
    "latest-books",
    "popular-books",
    "suggested-books",
    "top-rated-books",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el)
      el.innerHTML = `<p class="no-result error">Không tải được dữ liệu 😢</p>`;
  });
}
