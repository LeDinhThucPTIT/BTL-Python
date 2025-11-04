console.log("📜 history.js loaded");

document.addEventListener("DOMContentLoaded", async () => {
  const historyList = document.querySelector(".history-list");

  try {
    const res = await fetch("/api/history");
    const data = await res.json();

    if (!res.ok || data.error) {
      historyList.innerHTML = `<p class="empty-history">Bạn chưa đăng nhập hoặc chưa có lịch sử đọc.</p>`;
      return;
    }

    if (data.length === 0) {
      historyList.innerHTML = `<p class="empty-history">Bạn chưa đọc quyển sách nào.</p>`;
      return;
    }

    // Render danh sách sách
    historyList.innerHTML = data
      .map((item) => {
        const cover =
          item.cover_image || "/static/images/Book/default_cover.jpg";
        const date = new Date(item.last_read_at).toLocaleString("vi-VN");
        const avgRating = item.avg_rating || 0;
        const totalRatings = item.total_ratings || 0;

        const stars = Array.from({ length: 5 }, (_, i) =>
          i < Math.round(avgRating)
            ? '<i class="fa-solid fa-star"></i>'
            : '<i class="fa-regular fa-star"></i>'
        ).join("");

        return `
        <div class="history-item">
          <div class="book-history">
            <div class="book-image">
              <img src="${cover}" alt="${item.title}" />
            </div>
            <div class="book-info">
              <div class="book-title">${item.title}</div>

              <div class="book-rating">
                <span>${avgRating}</span>
                <span class="stars">${stars}</span>
                <span>• ${totalRatings} đánh giá</span>
              </div>

              <div class="book-meta">
                <div class="meta-content">
                  <div class="content-1">Tác giả</div>
                  <div class="content-2">${item.author || "Không rõ"}</div>
                </div>
                <div class="meta-content">
                  <div class="content-1">Thể loại</div>
                  <div class="content-2">${item.genre || "Chưa rõ"}</div>
                </div>
                <div class="meta-content">
                  <div class="content-1">Nhà xuất bản</div>
                  <div class="content-2">Đang cập nhật</div>
                </div>
                <div class="meta-content">
                  <div class="content-1">Tình trạng ra</div>
                  <div class="content-2">Đang cập nhật</div>
                </div>
                <div class="cancel">
                  <button title="Xoá khỏi lịch sử">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              <div class="book-actions">
                <button class="read-btn" data-book-id="${item.book_id}">
                  Đọc sách
                </button>
              </div>

              <div class="last-read-time">
                <span class="state">Đã đọc:</span>
                <div class="time">${date}</div>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // 🎯 Nút “Đọc sách”
    document.querySelectorAll(".read-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const bookId = e.target.dataset.bookId;
        window.location.href = `/read/${bookId}`;
      });
    });

    // 🗑 Xoá khỏi DB + giao diện
    document.querySelectorAll(".cancel button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const parent = btn.closest(".history-item");
        const bookId = parent.querySelector(".read-btn").dataset.bookId;

        try {
          const res = await fetch(`/api/history/${bookId}`, {
            method: "DELETE",
          });
          const result = await res.json();

          if (res.ok && result.success) {
            parent.style.opacity = 0;
            setTimeout(() => parent.remove(), 300);
          } else {
            alert("❌ Không thể xoá sách khỏi lịch sử!");
          }
        } catch (err) {
          console.error("Lỗi xoá lịch sử:", err);
          alert("⚠️ Lỗi khi xoá sách khỏi lịch sử đọc!");
        }
      });
    });
  } catch (err) {
    console.error("❌ Lỗi load lịch sử:", err);
    historyList.innerHTML = `<p class="error">Không thể tải lịch sử đọc. Vui lòng thử lại.</p>`;
  }
});
