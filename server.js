// server.js
const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

let clients = {}; // Stores clients by ID with username and socket info

server.on("connection", (socket) => {
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

console.log("WebSocket server is running on ws://localhost:8080");
