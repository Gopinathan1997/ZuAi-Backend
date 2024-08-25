const express = require("express");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");
const cors = require("cors");
const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 9000;
const path = require("path");

const { open } = require("sqlite");
const { appendFileSync } = require("fs");

const app = express();
const dbPath = path.join(__dirname, "database.db");
const blogs = require("./database");
app.use(bodyParser.json());
app.use(cors({ origin: `http://localhost:${port}` }));

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.run(`
      CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        date_published TEXT,
        content TEXT
      )
    `);

    for (let blog of blogs) {
      const { title, author, date_published, content } = blog;
      await db.run(
        `INSERT INTO blogs (title, author, date_published, content) VALUES(?,?,?,?)`,
        [title, author, date_published, content]
      );
    }

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.get("/blogs", async (req, res) => {
  const data = await db.all("SELECT * FROM blogs");
  res.send(data);
});

app.get(`/blog/:id`, async (req, res) => {
  const { id } = req.params;
  const data = await db.get(`select * FROM blogs WHERE id = ${id}`);
  res.send(data);
  console.log(data);
});

app.put("/blog/:id", (req, res) => {
  const { id } = req.params;
  const { title, content, author } = req.body;

  const query = `
    UPDATE blogs
    SET title = ?, content = ?, author = ?
    WHERE id = ?
  `;

  const params = [title, content, author, id];

  db.run(query, params, function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Failed to update blog" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({ message: "Blog updated successfully" });
  });
});

module.exports = app;
