import express from "express"
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";

import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js"




const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", (process.env.PORT|| 8000));
app.use(cors({
    origin: ["https://nxmeet.onrender.com"], // ✅ your frontend domain here
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));
app.use(express.json({limit: "40kb"}))
app.use(express.urlencoded({limit: "40kb", extended: true}))


app.use("/api/v1/users", userRoutes);


const start = async () => {
    const connectionDb = await mongoose.connect("mongodb+srv://akashmourya:GbbBlK3K3PzM3r9Z@cluster0.jbeqb.mongodb.net/zoomdb?retryWrites=true&w=majority&appName=Cluster0");

    console.log(`MONGO Connected DB to Host: ${connectionDb.connection.host}`)
    server.listen(app.get("port"), () => {
        console.log("App is listen at port 8000");
    })
}

start();