const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname)));
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return null; }
}
function saveDB(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }

let db = loadDB();
if (!db) {
  db = {
    seq: 6,
    menu: [
      { id: 1, name: "قهوة عربية", price: 0.75, cat: "ساخن", img: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80", descr: "قهوة عربية أصيلة بالهيل" },
      { id: 2, name: "شاي مع نعنع", price: 0.50, cat: "ساخن", img: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400&q=80", descr: "شاي بلدي مع نعنع طازج" },
      { id: 3, name: "قهوة تركية", price: 1.00, cat: "ساخن", img: "https://images.unsplash.com/photo-1578374173705-969cbe6f2d6b?w=400&q=80", descr: "قهوة تركية على الرمل" },
      { id: 4, name: "ليموناضة بالنعنع", price: 1.25, cat: "بارد", img: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&q=80", descr: "منعشة وباردة" },
      { id: 5, name: "كنافة نابلسية", price: 2.00, cat: "حلويات", img: "https://images.unsplash.com/photo-1571167530149-c1105da4c2c7?w=400&q=80", descr: "كنافة بالجبنة طازجة" },
      { id: 6, name: "نرجيلة", price: 3.00, cat: "أخرى", img: "https://images.unsplash.com/photo-1543160577-13a994d70a26?w=400&q=80", descr: "نكهات متعددة" }
    ],
    orders: []
  };
  saveDB(db);
}

const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

function checkAdmin(req, res, next) {
  if (req.headers["x-pin"] === ADMIN_PIN) return next();
  res.status(401).json({ error: "unauthorized" });
}

app.get("/api/menu", (req, res) => res.json(db.menu));

app.post("/api/menu", checkAdmin, (req, res) => {
  const { name, price, cat, img, descr } = req.body;
  const id = ++db.seq;
  db.menu.push({ id, name, price, cat, img, descr });
  saveDB(db);
  res.json({ id });
});

app.put("/api/menu/:id", checkAdmin, (req, res) => {
  const it = db.menu.find(m => m.id == req.params.id);
  if (it) { Object.assign(it, req.body); saveDB(db); }
  res.json({ ok: true });
});

app.delete("/api/menu/:id", checkAdmin, (req, res) => {
  db.menu = db.menu.filter(m => m.id != req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/upload", checkAdmin, upload.single("img"), (req, res) => {
  res.json({ url: "/uploads/" + req.file.filename });
});

app.get("/api/orders", checkAdmin, (req, res) => res.json([...db.orders].reverse()));

app.post("/api/orders", (req, res) => {
  const { tableNo, items, total } = req.body;
  const time = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const id = ++db.seq;
  db.orders.push({ id, tableNo: tableNo || "—", items, total, status: "جديد", time });
  saveDB(db);
  res.json({ id });
});

app.put("/api/orders/:id", checkAdmin, (req, res) => {
  const o = db.orders.find(x => x.id == req.params.id);
  if (o) { o.status = req.body.status; saveDB(db); }
  res.json({ ok: true });
});

app.delete("/api/orders/:id", checkAdmin, (req, res) => {
  db.orders = db.orders.filter(o => o.id != req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => res.json({ ok: req.body.pin === ADMIN_PIN }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
