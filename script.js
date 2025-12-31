const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 20e6 });

/* ================= CONFIG ================= */
const MAX_ROOMS = 50;
const MAX_USERS_PER_ROOM = 1000;

/* ================= MEMORY ================= */
let rooms = {}; // code -> { users, msgCount }
let bannerAd = "🔥 Anonymous Chat";
let chatAd = "📢 Sponsored Ad";

/* ================= HELPERS ================= */
function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= MAIN SITE ================= */
app.get("/", (_, res) => {
res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width">
<title>Anonymous Chat</title>
<style>
body{margin:0;font-family:Arial;background:#0f172a;color:#fff;text-align:center}
header{background:#020617;padding:15px}
input,button{padding:10px;margin:5px;border-radius:6px;border:none}
button{background:#2563eb;color:#fff}
#messages{height:55vh;overflow:auto;border:1px solid #334155;padding:10px}
.ad{color:#fde047;font-weight:bold;text-align:center}
</style>
</head>
<body>

<header><h3>${bannerAd}</h3></header>

<div id="home">
<button onclick="createRoom()">Create Room</button><br>
<input id="code" placeholder="Room Code">
<button onclick="joinRoom()">Join</button>
</div>

<div id="chat" style="display:none">
<h4 id="info"></h4>
<div id="messages"></div>
<input id="msg" placeholder="Message">
<input type="file" id="file">
<button onclick="send()">Send</button>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let room = "";

function createRoom(){ socket.emit("create"); }
function joinRoom(){ socket.emit("join", code.value); }

socket.on("created", c => alert("Room Code: " + c));

socket.on("joined", d => {
  room = d.code;
  home.style.display="none";
  chat.style.display="block";
  info.innerText = "Room " + d.code + " | " + d.name;
});

socket.on("msg", d => {
  const div = document.createElement("div");
  if(d.type === "media"){
    div.innerHTML = \`
      <b>\${d.from}</b><br>
      \${d.kind==="image"?'<img src="'+d.data+'" width="200">':''}
      \${d.kind==="video"?'<video src="'+d.data+'" controls width="200"></video>':''}
      \${d.kind==="audio"?'<audio src="'+d.data+'" controls></audio>':''}
      <small>(view once)</small>
    \`;
    setTimeout(()=>div.remove(), 5000);
  } else {
    div.innerHTML = "<b>"+d.from+":</b> "+d.text;
  }
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

function send(){
  if(file.files[0]){
    const r = new FileReader();
    r.onload = () =>
      socket.emit("media", {
        room,
        data: r.result,
        type: file.files[0].type
      });
    r.readAsDataURL(file.files[0]);
    file.value="";
  } else {
    socket.emit("text", { room, text: msg.value });
    msg.value="";
  }
}
</script>
</body>
</html>`);
});

/* ================= ADMIN ================= */
app.get("/admin", (_, res) => {
res.send(`
<h2>Admin Panel</h2>
<form method="POST">
Banner Ad:<br>
<input name="banner"><br><br>
Chat Ad (every 50 messages):<br>
<input name="chat"><br><br>
<button>Save</button>
</form>
`);
});

app.post("/admin", (req, res) => {
  bannerAd = req.body.banner || bannerAd;
  chatAd = req.body.chat || chatAd;
  res.redirect("/admin");
});

/* ================= SOCKET ================= */
io.on("connection", socket => {

socket.on("create", () => {
  if(Object.keys(rooms).length >= MAX_ROOMS) return;
  let c; do { c = genCode(); } while(rooms[c]);
  rooms[c] = { users: 0, msgCount: 0 };
  socket.emit("created", c);
});

socket.on("join", c => {
  if(!rooms[c] || rooms[c].users >= MAX_USERS_PER_ROOM) return;
  rooms[c].users++;
  socket.join(c);
  const name = "Anonymous" + String(rooms[c].users).padStart(3,"0");
  socket.emit("joined", { code: c, name });
  io.to(c).emit("msg", { from:"System", text:name+" joined" });
});

socket.on("text", d => {
  if(!rooms[d.room]) return;
  rooms[d.room].msgCount++;
  io.to(d.room).emit("msg", { from:"Anonymous", text:d.text });
  if(rooms[d.room].msgCount % 50 === 0)
    io.to(d.room).emit("msg", { from:"Ad", text:chatAd });
});

socket.on("media", d => {
  const kind =
    d.type.includes("image") ? "image" :
    d.type.includes("video") ? "video" : "audio";
  io.to(d.room).emit("msg", {
    type:"media",
    kind,
    data:d.data,
    from:"Anonymous"
  });
});

socket.on("disconnect", () => {
  for(const c in rooms){
    if(!io.sockets.adapter.rooms.get(c)) delete rooms[c];
  }
});

});

/* ================= START ================= */
server.listen(3000, () =>
  console.log("Running on http://localhost:3000")
);
