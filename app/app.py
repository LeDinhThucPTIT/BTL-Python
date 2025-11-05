from flask import Flask, g, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import mysql.connector
from werkzeug.utils import secure_filename
from bs4 import BeautifulSoup
import os
import fitz
# Các định dạng ảnh bìa được cho phép
ALLOWED_COVER_EXT = {'png', 'jpg', 'jpeg', 'webp'}
ALLOWED_BOOK_EXT = {'pdf'}
ALLOWED_HTML_EXT = {'html'}

# -------------------------
# Import Blueprint admin
from admin import admin_bp
# -------------------------

app = Flask(__name__)
app.secret_key = "super_secret_key"
CORS(app)

# -------------------------
# 🧩 Đăng ký blueprint admin
app.register_blueprint(admin_bp)
# -------------------------


# -------------------------
# Thư mục upload
UPLOAD_COVER_FOLDER = os.path.join(app.root_path, 'static', 'images', 'Book')
UPLOAD_BOOK_FOLDER = os.path.join(app.root_path, 'static', 'books')
UPLOAD_HTML_FOLDER = os.path.join(app.root_path, 'static', 'book_html')

os.makedirs(UPLOAD_COVER_FOLDER, exist_ok=True)
os.makedirs(UPLOAD_BOOK_FOLDER, exist_ok=True)
os.makedirs(UPLOAD_HTML_FOLDER, exist_ok=True)

app.config.update({
    'UPLOAD_COVER_FOLDER': UPLOAD_COVER_FOLDER,
    'UPLOAD_BOOK_FOLDER': UPLOAD_BOOK_FOLDER,
    'UPLOAD_HTML_FOLDER': UPLOAD_HTML_FOLDER
})


# -------------------------
# Kết nối database
def get_db():
    if "db" not in g:
        g.db = mysql.connector.connect(
            host="localhost",
            user="root",
            password="123456",
            database="bookapp",
            autocommit=True
        )
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


# -------------------------
#  LOGIN PAGE
@app.route("/")
def login_page():
    return render_template("login.html")


# -------------------------
#  ĐĂNG NHẬP
@app.route("/login", methods=["POST"])
def login():
    db = get_db()
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s AND password = %s", (email, password))
    user = cursor.fetchone()

    if not user:
        return jsonify({"success": False, "message": "Sai email hoặc mật khẩu!"})

    # Gán session
    session["user_id"] = user["id"]
    session["role"] = user.get("role", "user")
    session["username"] = user["username"]

    # 👉 Nếu là admin thì chuyển sang trang admin dashboard
    if user["role"] == "admin":
        return jsonify({"success": True, "redirect": "/admin/dashboard"})
    else:
        return jsonify({"success": True, "redirect": "/home"})


# -------------------------
# Đăng xuất
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# ------------------------------------------
# Đăng ký
@app.route("/register", methods=["POST"])
def register():
    db = get_db()
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    sdt = data.get("sdt")
    password = data.get("password")

    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id FROM users WHERE email = %s OR sdt = %s", (email, sdt))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "Email hoặc số điện thoại đã tồn tại!"})

        cursor.execute("""
            INSERT INTO users (username, email, sdt, password, role, avatar)
            VALUES (%s, %s, %s, %s, 'user', '/static/images/Logo/Avatar.png')
        """, (username, email, sdt, password))
        db.commit()
        return jsonify({"success": True, "message": "Đăng ký thành công!"})
    except Exception as e:
        print("❌ Lỗi đăng ký:", e)
        return jsonify({"success": False, "message": "Lỗi server!"})


# ------------------------------------------
#  Quên mật khẩu
@app.route("/forgot", methods=["POST"])
def forgot_password():
    db = get_db()
    data = request.get_json()
    email_or_phone = data.get("email_or_phone")
    new_pass = data.get("new_pass")

    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE email = %s OR sdt = %s",
        (email_or_phone, email_or_phone)
    )
    user = cursor.fetchone()

    if not user:
        return jsonify({"success": False, "message": "Không tìm thấy tài khoản!"})

    cursor.execute(
        "UPDATE users SET password = %s WHERE email = %s OR sdt = %s",
        (new_pass, email_or_phone, email_or_phone)
    )
    db.commit()

    return jsonify({"success": True, "message": "Cập nhật mật khẩu thành công!"})


# ------------------------------------------
@app.context_processor
def inject_user():
    db = get_db()
    user_id = session.get("user_id")
    if not user_id:
        return {}
    
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT username, avatar FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close()

    return dict(user=user)

#  Các trang chính
@app.route("/home")
def home():
    db = get_db()
    user_id = session.get("user_id")

    if not user_id:
        return redirect("/login")

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT username, avatar FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close()

    if not user:
        return redirect("/login")

    return render_template("index.html", user=user)


@app.route("/setting", methods=["GET", "POST"])
def setting():
    db = get_db()
    user_id = session.get("user_id")
    if not user_id:
        return redirect("/login")

    cursor = db.cursor(dictionary=True)

    if request.method == "POST":
        username = request.form.get("username")
        name = request.form.get("name")              # 🟢 thêm dòng này
        ngaysinh = request.form.get("ngaysinh")
        sex = request.form.get("sex")
        avatar = request.files.get("avatar")

        avatar_path = None
        if avatar and allowed_file(avatar.filename, ALLOWED_COVER_EXT):
            filename = secure_filename(avatar.filename)
            path = os.path.join(app.config["UPLOAD_COVER_FOLDER"], filename)
            avatar.save(path)
            avatar_path = f"/static/images/Book/{filename}"

        # Cập nhật SQL thêm trường name
        if avatar_path:
            cursor.execute("""
                UPDATE users 
                SET username=%s, name=%s, ngaysinh=%s, sex=%s, avatar=%s 
                WHERE id=%s
            """, (username, name, ngaysinh, sex, avatar_path, user_id))
        else:
            cursor.execute("""
                UPDATE users 
                SET username=%s, name=%s, ngaysinh=%s, sex=%s 
                WHERE id=%s
            """, (username, name, ngaysinh, sex, user_id))

        db.commit()

    # Lấy thông tin user đầy đủ (có cột name)
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close()

    return render_template("setting.html", user=user)

@app.route("/save")
def save():
    return render_template("save.html")

@app.route("/history")
def history():
    return render_template("history.html")
# ------------------------------------------

# ------------------------------------------
#  API lấy danh sách sách
@app.route('/api/books', methods=['GET'])
def get_books():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, title, author, genre, summary, cover_image, created_at
        FROM books
        ORDER BY created_at DESC
    """)
    books = cursor.fetchall()
    cursor.close()
    return jsonify(books)


# ------------------------------------------
#  Upload sách
def allowed_file(filename, allowed):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed


@app.route("/upload")
def upload_page():
    return render_template("upload.html")


@app.route("/api/upload-book", methods=["POST"])
def upload_book():
    db = get_db()
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    title = request.form.get("title")
    author = request.form.get("author")
    genre = request.form.get("genre")
    summary = request.form.get("summary")
    language = request.form.get("language")
    book_file = request.files.get("book_file")
    cover_file = request.files.get("cover_file")

    if not title or not author or not book_file:
        return jsonify({"error": "Thiếu dữ liệu bắt buộc"}), 400

    # Ảnh bìa
    cover_path = None
    if cover_file and allowed_file(cover_file.filename, ALLOWED_COVER_EXT):
        cover_name = secure_filename(cover_file.filename)
        cover_file.save(os.path.join(app.config["UPLOAD_COVER_FOLDER"], cover_name))
        cover_path = f"/static/images/Book/{cover_name}"

    # File PDF
    book_name = secure_filename(book_file.filename)
    if not allowed_file(book_name, ALLOWED_BOOK_EXT):
        return jsonify({"error": "Chỉ hỗ trợ PDF hiện tại!"}), 400

    pdf_path = os.path.join(app.config['UPLOAD_BOOK_FOLDER'], book_name)
    book_file.save(pdf_path)

    # Convert PDF → HTML
    html_filename = book_name.rsplit('.', 1)[0] + ".html"
    html_output_path = os.path.join(app.config['UPLOAD_HTML_FOLDER'], html_filename)

    try:
        with fitz.open(pdf_path) as doc:
            html_content = "".join(page.get_text("html") for page in doc)
        with open(html_output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
    except Exception as e:
        print("❌ Lỗi khi convert PDF:", e)
        return jsonify({"error": "Không thể chuyển đổi PDF sang HTML"}), 500

    # Lưu DB
    cursor = db.cursor()
    sql = """
        INSERT INTO books (title, author, genre, summary, cover_image, file_path, html_path, uploaded_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(sql, (
        title, author, genre, summary,
        cover_path,
        f"/static/books/{book_name}",
        f"/static/book_html/{html_filename}",
        session["user_id"]
    ))

    db.commit()
    book_id = cursor.lastrowid
    cursor.close()

    return jsonify({
        "message": "Upload thành công!",
        "book_id": book_id,
        "html_path": f"/read/{book_id}"
    })


# ------------------------------------------
#  Đọc sách
@app.route("/read/<int:book_id>")
def read_book(book_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM books WHERE id = %s", (book_id,))
    book = cursor.fetchone()
    cursor.close()

    if not book:
        return "Không tìm thấy sách", 404

    html_path = book.get("html_path")
    html_content = None

    if html_path:
        html_file = os.path.join(app.root_path, html_path.lstrip("/"))
        if os.path.exists(html_file):
            with open(html_file, "r", encoding="utf-8") as f:
                soup = BeautifulSoup(f.read(), "html.parser")
                for tag in soup(["style", "script"]):
                    tag.decompose()
                html_content = soup.body.decode_contents() if soup.body else soup.decode()

    return render_template("read-book.html", book=book, content=html_content)

# ------------------------------------------
# ------------------------------------------
#  Lưu lịch sử đọc sách
@app.route("/api/reading-history", methods=["POST"])
def save_reading_history():
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    db = get_db()
    user_id = session["user_id"]
    data = request.get_json()
    book_id = data.get("book_id")

    if not book_id:
        return jsonify({"error": "Thiếu book_id"}), 400

    cursor = db.cursor()

    # Kiểm tra đã có lịch sử cho sách này chưa
    cursor.execute(
        "SELECT id FROM reading_history WHERE user_id = %s AND book_id = %s",
        (user_id, book_id)
    )
    existing = cursor.fetchone()

    if existing:
        # Cập nhật thời gian đọc gần nhất
        cursor.execute(
            "UPDATE reading_history SET last_read_at = NOW() WHERE user_id = %s AND book_id = %s",
            (user_id, book_id)
        )
    else:
        # Thêm mới lịch sử đọc
        cursor.execute(
            "INSERT INTO reading_history (user_id, book_id, last_read_at) VALUES (%s, %s, NOW())",
            (user_id, book_id)
        )

    db.commit()
    cursor.close()
    return jsonify({"success": True}), 200


# ------------------------------------------
#Lịch sử đọc
@app.route("/api/history", methods=["GET"])
def get_reading_history():
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    db = get_db()
    user_id = session["user_id"]
    cursor = db.cursor(dictionary=True)

    # 🔹 Lấy lịch sử + thông tin sách + trung bình sao + số lượt đánh giá
    cursor.execute("""
        SELECT 
            r.id AS history_id,
            b.id AS book_id,
            b.title,
            b.author,
            b.genre,
            b.cover_image,
            b.summary,
            b.file_path,
            b.html_path,
            b.created_at,
            IFNULL(ROUND(AVG(rt.stars),1), 0) AS avg_rating,
            COUNT(rt.id) AS total_ratings,
            r.last_read_at
        FROM reading_history r
        JOIN books b ON r.book_id = b.id
        LEFT JOIN ratings rt ON b.id = rt.book_id
        WHERE r.user_id = %s
        GROUP BY b.id, r.id, b.title, b.author, b.genre, b.cover_image, b.summary, b.file_path, b.html_path, b.created_at, r.last_read_at
        ORDER BY r.last_read_at DESC
    """, (user_id,))

    histories = cursor.fetchall()
    cursor.close()

    return jsonify(histories), 200

# ------------------------------------------
# 🗑 Xoá 1 sách khỏi lịch sử đọc
@app.route("/api/history/<int:book_id>", methods=["DELETE"])
def delete_reading_history(book_id):
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    db = get_db()
    cursor = db.cursor()

    cursor.execute(
        "DELETE FROM reading_history WHERE user_id = %s AND book_id = %s",
        (session["user_id"], book_id)
    )
    db.commit()
    cursor.close()

    return jsonify({"success": True}), 200


# ------------------------------------------
#  Xoá sách
@app.route("/api/delete-book/<int:book_id>", methods=["DELETE"])
def delete_book(book_id):
    db = get_db()
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    user_id = session["user_id"]
    role = session.get("role", "user")

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT uploaded_by FROM books WHERE id = %s", (book_id,))
    book = cursor.fetchone()

    if not book:
        return jsonify({"error": "Không tìm thấy sách!"}), 404

    if role != "admin" and book["uploaded_by"] != user_id:
        return jsonify({"error": "Bạn không có quyền xoá sách này!"}), 403

    cursor = db.cursor()
    cursor.execute("DELETE FROM books WHERE id = %s", (book_id,))
    db.commit()
    cursor.close()

    return jsonify({"message": "Đã xoá sách thành công!"}), 200


# ------------------------------------------
# Lịch sử upload của người dùng
@app.route("/api/user-history", methods=["GET"])
def get_user_history():
    db = get_db()
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    user_id = session["user_id"]
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, title, author, genre, summary, cover_image, created_at
        FROM books
        WHERE uploaded_by = %s
        ORDER BY created_at DESC
    """, (user_id,))
    books = cursor.fetchall()
    cursor.close()
    return jsonify(books)
#---------------------------------------------
# 📘 Trang chi tiết sách
@app.route("/book/<int:book_id>")
def book_detail(book_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM books WHERE id = %s", (book_id,))
    book = cursor.fetchone()
    cursor.close()

    if not book:
        return "Không tìm thấy sách", 404

    return render_template("book-detail.html", book=book)

# ------------------------------------------
# Thả tim / Bỏ tim (GET trạng thái + POST toggle)
@app.route("/api/book/<int:book_id>/favorite", methods=["GET", "POST"])
def favorite_book(book_id):
    db = get_db()
    # kiểm tra login
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    user_id = session["user_id"]
    cursor = db.cursor(dictionary=True)

    try:
        # GET -> trả về trạng thái hiện tại
        if request.method == "GET":
            cursor.execute("SELECT 1 AS exists_row FROM favorites WHERE user_id = %s AND book_id = %s", (user_id, book_id))
            exists = cursor.fetchone() is not None
            cursor.close()
            return jsonify({"favorite": bool(exists)}), 200

        # POST -> toggle
        cursor.execute("SELECT * FROM favorites WHERE user_id = %s AND book_id = %s", (user_id, book_id))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("DELETE FROM favorites WHERE user_id = %s AND book_id = %s", (user_id, book_id))
            db.commit()
            cursor.close()
            print(f"[FAV] user {user_id} UNFAV book {book_id}")
            return jsonify({"favorite": False}), 200
        else:
            cursor.execute("INSERT INTO favorites (user_id, book_id) VALUES (%s, %s)", (user_id, book_id))
            db.commit()
            cursor.close()
            print(f"[FAV] user {user_id} FAV book {book_id}")
            return jsonify({"favorite": True}), 201

    except Exception as e:
        # log lỗi server để debug
        print("❌ Lỗi favorite route:", e)
        try:
            cursor.close()
        except:
            pass
        return jsonify({"error": "Lỗi server"}), 500
# ------------------------------------------
# ------------------------------------------
#  Lưu / Bỏ lưu sách
@app.route("/api/book/<int:book_id>/save", methods=["GET", "POST"])
def toggle_save(book_id):
    db = get_db()
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    user_id = session["user_id"]
    cursor = db.cursor(dictionary=True)

    try:
        # 🟢 GET: lấy trạng thái hiện tại (đã lưu hay chưa)
        if request.method == "GET":
            cursor.execute(
                "SELECT 1 FROM saves WHERE user_id = %s AND book_id = %s",
                (user_id, book_id),
            )
            saved = cursor.fetchone() is not None
            cursor.close()
            return jsonify({"saved": saved}), 200

        # 🔄 POST: toggle (lưu hoặc bỏ lưu)
        cursor.execute(
            "SELECT * FROM saves WHERE user_id = %s AND book_id = %s",
            (user_id, book_id),
        )
        existing = cursor.fetchone()

        if existing:
            cursor.execute(
                "DELETE FROM saves WHERE user_id = %s AND book_id = %s",
                (user_id, book_id),
            )
            db.commit()
            cursor.close()
            print(f"[SAVE] user {user_id} UNSAVE book {book_id}")
            return jsonify({"saved": False}), 200
        else:
            cursor.execute(
                "INSERT INTO saves (user_id, book_id) VALUES (%s, %s)",
                (user_id, book_id),
            )
            db.commit()
            cursor.close()
            print(f"[SAVE] user {user_id} SAVE book {book_id}")
            return jsonify({"saved": True}), 201

    except Exception as e:
        print("❌ Lỗi save route:", e)
        try:
            cursor.close()
        except:
            pass
        return jsonify({"error": "Lỗi server"}), 500

# ------------------------------------------
# ------------------------------------------
#  Lấy danh sách sách đã lưu hoặc yêu thích
@app.route("/api/saves", methods=["GET"])
def get_saved_and_favorite_books():
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    db = get_db()
    user_id = session["user_id"]
    cursor = db.cursor(dictionary=True)

    # Lấy từ bảng saves
    cursor.execute("""
        SELECT 
            s.id AS relation_id,
            b.id AS book_id,
            b.title,
            b.author,
            b.genre,
            b.cover_image,
            b.summary,
            'save' AS type,
            s.created_at AS created_at
        FROM saves s
        JOIN books b ON s.book_id = b.id
        WHERE s.user_id = %s
    """, (user_id,))
    saves = cursor.fetchall()

    # Lấy từ bảng favorites
    cursor.execute("""
        SELECT 
            f.id AS relation_id,
            b.id AS book_id,
            b.title,
            b.author,
            b.genre,
            b.cover_image,
            b.summary,
            'favorite' AS type,
            f.created_at AS created_at
        FROM favorites f
        JOIN books b ON f.book_id = b.id
        WHERE f.user_id = %s
    """, (user_id,))
    favorites = cursor.fetchall()

    # Gộp danh sách lại
    all_books = saves + favorites

    # Loại bỏ trùng (nếu 1 sách có cả trong saves và favorites)
    seen = set()
    unique_books = []
    for book in sorted(all_books, key=lambda x: x["created_at"], reverse=True):
        if book["book_id"] not in seen:
            seen.add(book["book_id"])
            unique_books.append(book)

    cursor.close()
    return jsonify(unique_books), 200
# 🗑 Xoá khỏi bảng saves
@app.route("/api/saves/remove", methods=["POST"])
def remove_save():
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    data = request.get_json()
    book_id = data.get("book_id")

    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM saves WHERE user_id = %s AND book_id = %s", (session["user_id"], book_id))
    db.commit()
    cursor.close()

    return jsonify({"success": True, "message": "Đã xoá khỏi lưu trữ."})


# 🗑 Xoá khỏi bảng favorites
@app.route("/api/favorites/remove", methods=["POST"])
def remove_favorite():
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    data = request.get_json()
    book_id = data.get("book_id")

    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM favorites WHERE user_id = %s AND book_id = %s", (session["user_id"], book_id))
    db.commit()
    cursor.close()

    return jsonify({"success": True, "message": "Đã xoá khỏi yêu thích."})

# ------------------------------------------
#  Comment: Lấy và thêm bình luận
@app.route("/api/book/<int:book_id>/comments", methods=["GET", "POST"])
def handle_comments(book_id):
    db = get_db()
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    user_id = session["user_id"]
    cursor = db.cursor(dictionary=True, buffered=True)

    try:
        if request.method == "GET":
            cursor.execute("""
                SELECT c.id, c.content, c.created_at, u.username, u.avatar
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.book_id = %s
                ORDER BY c.created_at DESC
            """, (book_id,))
            comments = cursor.fetchall()
            cursor.close()
            return jsonify(comments), 200

        #  Thêm bình luận mới
        data = request.get_json()
        content = data.get("content", "").strip()
        if not content:
            return jsonify({"error": "Nội dung trống!"}), 400

        cursor.execute(
            "INSERT INTO comments (user_id, book_id, content) VALUES (%s, %s, %s)",
            (user_id, book_id, content)
        )
        db.commit()
        cursor.close()
        print(f"[COMMENT] user {user_id} commented on book {book_id}")
        return jsonify({"success": True}), 201

    except Exception as e:
        print("❌ Lỗi comment route:", e)
        try:
            cursor.close()
        except:
            pass
        return jsonify({"error": "Lỗi server"}), 500
    
    # ------------------------------------------
#  Đánh giá sao
@app.route("/api/book/<int:book_id>/rating", methods=["GET", "POST"])
def handle_rating(book_id):
    if "user_id" not in session:
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    user_id = session["user_id"]
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        if request.method == "GET":
            # Lấy trung bình & tổng số đánh giá
            cursor.execute("SELECT AVG(stars) AS avg_rating, COUNT(*) AS total FROM ratings WHERE book_id = %s", (book_id,))
            result = cursor.fetchone()

            # Lấy đánh giá của chính user này
            cursor.execute("SELECT stars FROM ratings WHERE user_id = %s AND book_id = %s", (user_id, book_id))
            user_rating = cursor.fetchone()

            return jsonify({
                "average": round(result["avg_rating"] or 0, 1),
                "total": result["total"],
                "user_rating": user_rating["stars"] if user_rating else 0
            })

        # POST — người dùng đánh giá hoặc cập nhật
        data = request.get_json()
        stars = int(data.get("stars", 0))
        if not (1 <= stars <= 5):
            return jsonify({"error": "Số sao không hợp lệ!"}), 400

        cursor.execute(
            "INSERT INTO ratings (user_id, book_id, stars) VALUES (%s, %s, %s) "
            "ON DUPLICATE KEY UPDATE stars = VALUES(stars), created_at = CURRENT_TIMESTAMP",
            (user_id, book_id, stars)
        )
        db.commit()
        cursor.close()
        return jsonify({"success": True, "stars": stars}), 200

    except Exception as e:
        print("❌ Lỗi rating:", e)
        cursor.close()
        return jsonify({"error": "Lỗi server!"}), 500


# ------------------------------------------
# Chạy server
if __name__ == "__main__":
    app.run(debug=True)
