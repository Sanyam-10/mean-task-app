const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const db = require("./app/models");
const dbUrl = process.env.MONGO_URI || "mongodb://mongodb:27017/cruddb";

db.mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the database!");
    global.dbError = null;
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    global.dbError = err.toString();
  });

app.get("/api/health", (req, res) => {
  if (global.dbError) {
    res.status(500).json({ status: "error", error: global.dbError });
  } else {
    res.status(200).json({ status: "ok" });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Test application." });
});

require("./app/routes/turorial.routes")(app);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});


