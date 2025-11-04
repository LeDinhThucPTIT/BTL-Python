document.addEventListener("DOMContentLoaded", () => {
  // 🟢 Lấy ID sách từ HTML
  const bookId = document.body.dataset.bookId;

  // ==============================
  // 🔙 Nút quay lại trang Home
  // ==============================
  const backButton = document.querySelector(".back-button");
  if (backButton) {
    backButton.addEventListener("click", () => {
      window.location.href = "/home";
    });
  }

  // ==============================
  // ❤️ Thả tim (Favorite)
  // ==============================
  const heartIcon = document.getElementById("favorite-btn");
  if (!bookId) {
    console.error("⚠️ Không tìm thấy bookId trong <body>!");
    return;
  }
  if (!heartIcon) {
    console.error("⚠️ Không tìm thấy #favorite-btn trong HTML!");
    return;
  }

  function setHeartState(isFav) {
    if (isFav) {
      heartIcon.classList.add("fa-solid");
      heartIcon.classList.remove("fa-regular");
      heartIcon.style.color = "red";
    } else {
      heartIcon.classList.remove("fa-solid");
      heartIcon.classList.add("fa-regular");
      heartIcon.style.color = "";
    }
  }

  // Lấy trạng thái ban đầu
  fetch(`/api/book/${bookId}/favorite`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  })
    .then((res) => res.json())
    .then((data) => setHeartState(data.favorite))
    .catch((err) => console.error("Lỗi khi tải trạng thái tim:", err));

  // Khi click tim
  heartIcon.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/book/${bookId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      const data = await res.json();
      setHeartState(data.favorite);
    } catch (err) {
      console.error("Lỗi khi thả tim:", err);
    }
  });

  // ==============================
  // 📑 Lưu sách (Save / Unsave)
  // ==============================
  const saveIcon = document.getElementById("save-btn");
  if (!saveIcon) {
    console.error("⚠️ Không tìm thấy #save-btn trong HTML!");
    return;
  }

  function setSaveState(isSaved) {
    if (isSaved) {
      saveIcon.classList.add("fa-solid");
      saveIcon.classList.remove("fa-regular");
      saveIcon.style.color = "#f0c420";
    } else {
      saveIcon.classList.remove("fa-solid");
      saveIcon.classList.add("fa-regular");
      saveIcon.style.color = "";
    }
  }

  // Lấy trạng thái ban đầu
  fetch(`/api/book/${bookId}/save`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  })
    .then((res) => {
      if (!res.ok) throw new Error("GET /save failed: " + res.status);
      return res.json();
    })
    .then((data) => setSaveState(data.saved))
    .catch((err) => console.error("Lỗi khi tải trạng thái lưu:", err));

  // Khi click icon bookmark
  saveIcon.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/book/${bookId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("POST /save failed: " + res.status);
      const data = await res.json();
      setSaveState(data.saved);
    } catch (err) {
      console.error("Lỗi khi lưu sách:", err);
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const bookId = document.body.dataset.bookId;
  const writeBtn = document.getElementById("write-comment-btn");
  const popup = document.getElementById("comment-popup");
  const cancelBtn = document.getElementById("cancel-comment-btn");
  const sendBtn = document.getElementById("send-comment-btn");
  const commentInput = document.getElementById("comment-input");
  const commentsList = document.getElementById("comments-list");
  const commentCount = document.getElementById("comment-count");

  if (!writeBtn || !popup) {
    console.error("❌ Không tìm thấy phần tử bình luận!");
    return;
  }

  // Hiện popup
  writeBtn.addEventListener("click", () => {
    popup.style.display = "flex";
    commentInput.focus();
  });

  // Ẩn popup
  cancelBtn.addEventListener("click", () => {
    popup.style.display = "none";
    commentInput.value = "";
  });

  // Gửi bình luận
  sendBtn.addEventListener("click", async () => {
    const content = commentInput.value.trim();
    if (!content) return alert("Vui lòng nhập nội dung!");

    const res = await fetch(`/api/book/${bookId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      credentials: "same-origin",
    });
    const data = await res.json();
    if (data.success) {
      commentInput.value = "";
      popup.style.display = "none";
      loadComments();
    } else {
      alert("Lỗi khi gửi bình luận!");
    }
  });

  // Load danh sách
  async function loadComments() {
    const res = await fetch(`/api/book/${bookId}/comments`);
    const comments = await res.json();

    if (!comments.length) {
      commentsList.innerHTML = "<p>Chưa có bình luận nào.</p>";
      commentCount.textContent = "(0)";
      return;
    }

    commentCount.textContent = `(${comments.length})`;
    commentsList.innerHTML = comments
      .map(
        (c) => `
        <div class="comment-item">
          <img src="${c.avatar}" class="comment-avatar" />
          <div class="comment-body">
            <div class="comment-header">
              <span>${c.username}</span>
              <small>${new Date(c.created_at).toLocaleString()}</small>
            </div>
            <p>${c.content}</p>
          </div>
        </div>`
      )
      .join("");
  }

  loadComments();
});
// ==================================
// ⭐ ĐÁNH GIÁ SAO
// ==================================
document.addEventListener("DOMContentLoaded", () => {
  const bookId = document.body.dataset.bookId;
  const stars = document.querySelectorAll(".rating-stars i");
  const ratingText = document.querySelector(".rating-text");

  if (!bookId || !stars.length) return;

  // Lấy trạng thái ban đầu
  fetch(`/api/book/${bookId}/rating`)
    .then((res) => res.json())
    .then((data) => {
      updateStarsDisplay(data.user_rating);
      ratingText.textContent = `${data.average}/5 (${data.total} đánh giá)`;
    })
    .catch((err) => console.error("Lỗi lấy đánh giá:", err));

  // Gửi đánh giá khi click sao
  stars.forEach((star, index) => {
    star.addEventListener("click", async () => {
      const rating = index + 1;
      try {
        const res = await fetch(`/api/book/${bookId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stars: rating }),
        });
        const data = await res.json();
        if (data.success) {
          updateStarsDisplay(rating);
          // load lại trung bình
          fetch(`/api/book/${bookId}/rating`)
            .then((res) => res.json())
            .then((r) => {
              ratingText.textContent = `${r.average}/5 (${r.total} đánh giá)`;
            });
        }
      } catch (err) {
        console.error("Lỗi gửi đánh giá:", err);
      }
    });
  });

  function updateStarsDisplay(rating) {
    stars.forEach((s, i) => {
      if (i < rating) {
        s.classList.add("fa-solid");
        s.classList.remove("fa-regular");
      } else {
        s.classList.remove("fa-solid");
        s.classList.add("fa-regular");
      }
    });
  }
});
// ================================
// 📖 Xử lý nút "Xem thêm / Thu gọn"
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const descContainer = document.querySelector(".book-description");
  const descText = document.querySelector(".book-description__text");
  const seeMoreBtn = document.querySelector(".see-more");

  if (!descContainer || !seeMoreBtn || !descText) return;

  let isExpanded = false;

  seeMoreBtn.addEventListener("click", (e) => {
    e.preventDefault();
    isExpanded = !isExpanded;

    if (isExpanded) {
      descContainer.classList.add("expanded");
      seeMoreBtn.textContent = "Thu gọn";
    } else {
      descContainer.classList.remove("expanded");
      seeMoreBtn.textContent = "Xem thêm";
      // Cuộn nhẹ lên một chút thay vì xuống cuối trang
      window.scrollTo({
        top: descContainer.offsetTop - 150, // 150px để không che bởi header
        behavior: "smooth",
      });
    }
  });
});
// ================================
// 📤 Xử lý popup chia sẻ
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const shareBtn = document.getElementById("share-btn");
  const sharePopup = document.getElementById("share-popup");
  const copyBtn = document.getElementById("copy-link-btn");
  const fbShare = document.getElementById("fb-share");
  const twShare = document.getElementById("tw-share");

  if (!shareBtn || !sharePopup) return;

  const bookUrl = window.location.href;

  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sharePopup.style.display =
      sharePopup.style.display === "flex" ? "none" : "flex";

    // Gán link mạng xã hội
    fbShare.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      bookUrl
    )}`;
    twShare.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      bookUrl
    )}&text=Hãy đọc cuốn này!`;
  });

  // Sao chép link
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(bookUrl);
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Đã sao chép!';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-link"></i> Sao chép link';
      }, 1500);
    } catch (err) {
      alert("Không thể sao chép link!");
    }
  });

  // Ẩn popup khi click ra ngoài
  document.addEventListener("click", (e) => {
    if (!sharePopup.contains(e.target) && e.target !== shareBtn) {
      sharePopup.style.display = "none";
    }
  });
});
