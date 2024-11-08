// server.js
const express = require("express");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the "public" directory (where index.html is located)
app.use(express.static(path.join(__dirname, "public")));

// Create an HTTP server and attach the WebSocket server to it
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Set up the WebSocket server to work alongside the HTTP server
const wss = new WebSocket.Server({ server });

let clients = {}; // Stores clients by ID with username and socket info

wss.on("connection", (socket) => {
  let clientId;
  let username;

  // Handle incoming messages from clients
  socket.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      // Assign a unique ID to the client
      clientId = Date.now().toString();
      username = data.username;
      clients[clientId] = { socket, username };

      // Send the client their ID
      socket.send(JSON.stringify({ type: "id", id: clientId }));

      // Broadcast updated client list to all clients
      broadcastClientList();
    } else if (data.type === "message") {
      // Find the recipient client by username
      const recipient = Object.values(clients).find(
        (client) => client.username === data.to
      );
      if (recipient && recipient.socket.readyState === WebSocket.OPEN) {
        recipient.socket.send(
          JSON.stringify({
            type: "message",
            from: username,
            message: data.message,
          })
        );
      }
    }
  });

  // Handle client disconnection
  socket.on("close", () => {
    delete clients[clientId];
    broadcastClientList(); // Update client list when someone disconnects
  });
});

// Broadcasts the list of online clients to each connected client
function broadcastClientList() {
  const clientList = Object.entries(clients).map(([id, client]) => ({
    id,
    username: client.username,
  }));
  Object.values(clients).forEach((client) => {
    client.socket.send(
      JSON.stringify({ type: "clientList", clients: clientList })
    );
  });
}

// Serve the index.html file for any unmatched route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
