const listBtn = document.querySelector(".list button");
const chapterList = document.getElementById("chapterList");
const overlay = document.getElementById("overlay");
const closeList = document.getElementById("closeList");

listBtn.addEventListener("click", () => {
  chapterList.classList.add("active");
  overlay.classList.add("active");
});

function closePanel() {
  chapterList.classList.remove("active");
  overlay.classList.remove("active");
}

closeList.addEventListener("click", closePanel);
overlay.addEventListener("click", closePanel);

//---------------------------------------------------//
console.log("📘 read-book.js loaded");

(function () {
  const DEBUG = true;
  if (DEBUG) console.log("🔹 Script bắt đầu");

  // =============================
  // 🌸 HÀM CHÍNH: CHIA TRANG THEO DÒNG
  // =============================
  function initPagination() {
    const container = document.querySelector(".converted-content");
    if (!container) return;

    const fullText = container.innerText.trim();
    if (fullText.length < 50) {
      if (DEBUG) console.warn("⚠️ Nội dung quá ngắn, không chia trang.");
      return;
    }

    // 🔹 Tạo phần tử ẩn để đo line-height thực
    const temp = document.createElement("div");
    temp.style.visibility = "hidden";
    temp.style.position = "absolute";
    temp.style.top = "-9999px";
    temp.style.left = "0";
    temp.style.width = container.clientWidth + "px";
    temp.style.fontSize = window.getComputedStyle(container).fontSize;
    temp.style.lineHeight = window.getComputedStyle(container).lineHeight;
    temp.style.whiteSpace = "pre-wrap";
    temp.style.textAlign = "justify";
    document.body.appendChild(temp);

    temp.textContent = "A\nB";
    const lineHeight = temp.clientHeight / 2;
    const maxLinesPerPage = Math.floor(container.clientHeight / lineHeight);
    temp.remove();

    console.log(`📏 Mỗi trang chứa khoảng ${maxLinesPerPage} dòng.`);

    // 🔹 Tách nội dung theo dòng
    const lines = fullText.split(/\r?\n/).filter((l) => l.trim() !== "");
    const linesPerPage = maxLinesPerPage - 2;
    const totalPages = Math.ceil(lines.length / linesPerPage);
    const pages = [];

    for (let i = 0; i < totalPages; i++) {
      const start = i * linesPerPage;
      const end = start + linesPerPage;
      pages.push(lines.slice(start, end).join("\n"));
    }

    // 🔹 Render lại
    container.innerHTML = "";
    pages.forEach((text, i) => {
      const page = document.createElement("div");
      page.classList.add("page");
      if (i === 0) page.classList.add("active");
      page.innerText = text;
      container.appendChild(page);
    });

    // 🔹 Điều khiển trang
    let currentIndex = 0;
    const total = pages.length;
    const pageNum = document.querySelector(".chapter-footer span");
    const prev = document.querySelector(".prev");
    const next = document.querySelector(".next");

    pageNum.textContent = `${currentIndex + 1}/${total}`;

    function showPage(idx) {
      container.querySelectorAll(".page").forEach((p, i) => {
        p.classList.toggle("active", i === idx);
      });
      pageNum.textContent = `${idx + 1}/${total}`;
      container.scrollTo({ top: 0, behavior: "smooth" });
    }

    next.addEventListener("click", () => {
      if (currentIndex < total - 1) {
        currentIndex++;
        showPage(currentIndex);
      }
    });

    prev.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        showPage(currentIndex);
      }
    });

    console.log(`✅ Đã chia thành ${total} trang (theo dòng).`);
  }

  // =============================
  // 🕓 CHỜ NỘI DUNG LOAD XONG
  // =============================
  function waitAndInit() {
    const container = document.querySelector(".converted-content");
    if (!container) {
      if (DEBUG)
        console.warn(
          "waitAndInit: chưa có .converted-content — sẽ theo dõi .chapter-body"
        );
      const parent = document.querySelector(".chapter-body");
      if (parent) observeAndInit(parent);
      return;
    }

    if ((container.innerText || "").trim().length > 100) {
      if (DEBUG) console.log("✅ Nội dung đã sẵn sàng, chia trang ngay.");
      initPagination();
      return;
    }

    observeAndInit(container);
  }

  function observeAndInit(targetNode) {
    if (DEBUG) console.log("👀 Quan sát nội dung:", targetNode);

    const observer = new MutationObserver((mutations, obs) => {
      const container = document.querySelector(".converted-content");
      if (!container) return;
      const len = (container.innerText || "").trim().length;
      if (len > 100) {
        if (DEBUG)
          console.log("📄 Phát hiện nội dung đủ, bắt đầu chia trang...");
        initPagination();
        obs.disconnect();
      }
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // fallback kiểm tra sau mỗi 0.5s
    let tries = 0;
    const maxTries = 16;
    const intId = setInterval(() => {
      const container = document.querySelector(".converted-content");
      const len = (container && (container.innerText || "").trim().length) || 0;
      if (len > 100) {
        clearInterval(intId);
        observer.disconnect();
        initPagination();
      } else if (tries++ >= maxTries) {
        clearInterval(intId);
        observer.disconnect();
        if (DEBUG) console.warn("⚠️ Nội dung không load sau 8s.");
      }
    }, 500);
  }

  // =============================
  // 🚀 CHẠY SAU KHI DOM SẴN SÀNG
  // =============================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (DEBUG) console.log("DOMContentLoaded fired");
      waitAndInit();
    });
  } else {
    if (DEBUG) console.log("Document sẵn, gọi waitAndInit()");
    waitAndInit();
  }

  // =============================
  // 📑 DANH SÁCH CHƯƠNG (OVERLAY)
  // =============================
  try {
    const listBtn = document.querySelector(".list button");
    const chapterList = document.getElementById("chapterList");
    const overlay = document.getElementById("overlay");
    const closeList = document.getElementById("closeList");

    if (listBtn && chapterList && overlay && closeList) {
      listBtn.addEventListener("click", () => {
        chapterList.classList.add("active");
        overlay.classList.add("active");
      });

      function closePanel() {
        chapterList.classList.remove("active");
        overlay.classList.remove("active");
      }

      closeList.addEventListener("click", closePanel);
      overlay.addEventListener("click", closePanel);
    }
  } catch (err) {
    console.error("❌ Lỗi overlay:", err);
  }
})();
document.addEventListener("DOMContentLoaded", () => {
  const bookId = window.location.pathname.split("/read/")[1];
  if (!bookId) return;

  fetch("/api/reading-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book_id: bookId, chapter_id: 1 }),
  })
    .then((res) => res.json())
    .then((data) => console.log("📚 Lưu lịch sử:", data))
    .catch((err) => console.error("❌ Lỗi lưu lịch sử:", err));
});
