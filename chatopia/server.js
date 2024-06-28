import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const activeUsers = []

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log(`User connected ${socket.id}`);
    

    socket.on('join_room',(conversationId) => {
        console.log(`User joined room ${conversationId}`);
        socket.join(conversationId); // Join the user to a socket room
    });

    socket.on('leave_room',(conversationId) => {
        console.log(`User left room ${conversationId}`);
        socket.leave(conversationId); // Leave the user from a socket room
    });

    socket.on('send_message', (message) => {
        // console.log(`Message sent to room ${message.conversationId}`);
        io.to(message.conversationId).emit('receive_message', message);
    });

    socket.on('message_seen', (message) => {
        // console.log(`Message seen in room ${message.conversationId}`);
        io.to(message.conversationId).emit('update_message', message);
    })

    // Creates a new conversation in Conversation List
    socket.on("new_conversation", (conversation) => {
      // console.log(`New conversation created ${conversation.id}`);
      io.emit("recv_new_conversation", conversation);
    })

    // Adds a new message to the conversation in Conversation List
    socket.on("update_conversation", (message) => {
      // console.log(`Conversation updated ${message.conversationId}`);
      io.emit("recv_updated_conversation", message);
    })

    // Deletes the conversation from Conversation List as well as body
    socket.on("delete_conversation", (conversationId) => {
      console.log(`Conversation deleted ${conversationId}`);
      io.emit("recv_deleted_conversation", conversationId);
      io.emit("delete_messages", conversationId);
    })

  
    socket.on('disconnect', () => {
      console.log(`User disconnected ${socket.id}`);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

