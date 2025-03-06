"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_KEY = process.env.JWT_KEY;
const client_1 = require("@prisma/client");
const prismaClient = new client_1.PrismaClient();
const wss = new ws_1.WebSocketServer({ port: 8000 });
const users = [];
function checkUser(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_KEY);
        if (typeof decoded == "string") {
            return null;
        }
        if (!decoded || !decoded.userId) {
            return null;
        }
        return decoded.userId;
    }
    catch (e) {
        return null;
    }
    return null;
}
wss.on('connection', function connection(socket, request) {
    console.log("connected!!!!");
    const url = request.url;
    if (!url) {
        return;
    }
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const token = queryParams.get('token') || "";
    const userId = checkUser(token);
    if (userId == null) {
        socket.close();
        return null;
    }
    users.push({
        userId,
        rooms: [],
        ws: socket
    });
    socket.on('message', function message(data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("message aaya kuch toh!!");
            let parsedData;
            if (typeof data !== "string") {
                parsedData = JSON.parse(data.toString());
            }
            else {
                parsedData = JSON.parse(data); // {type: "join-room", roomId: 1}
            }
            if (parsedData.type === "join_room") {
                const user = users.find(x => x.ws === socket);
                console.log("user here in join type");
                console.log(user);
                user === null || user === void 0 ? void 0 : user.rooms.push(parsedData.roomId);
            }
            if (parsedData.type === "leave_room") {
                const user = users.find(x => x.ws === socket);
                if (!user) {
                    return;
                }
                user.rooms = user === null || user === void 0 ? void 0 : user.rooms.filter(x => x === parsedData.room);
            }
            console.log("message received");
            console.log(parsedData);
            if (parsedData.type === "chat") {
                console.log("type chatttt");
                const roomId = parsedData.roomId;
                const message = parsedData.shapes;
                console.log(roomId);
                console.log(message);
                yield prismaClient.chats.create({
                    data: {
                        roomId: Number(roomId),
                        message,
                        userId
                    }
                });
                for (let i = 0; i < users.length; i++) {
                    console.log(users[i]);
                }
                users.forEach(user => {
                    console.log(user.rooms.includes(roomId));
                    if (user.rooms.includes(roomId)) {
                        console.log("user roommm", user.rooms);
                        user.ws.send(JSON.stringify({
                            type: "chat",
                            message: message,
                            roomId
                        }));
                    }
                });
            }
        });
    });
});
