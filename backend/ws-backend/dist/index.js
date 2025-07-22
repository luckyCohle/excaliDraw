"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const wss = new ws_1.WebSocketServer({ port: 8080 });
const prisma = new client_1.PrismaClient();
const processedShapes = new Set();
exports.JWT_SECRET = process.env.JWT_SECRET || "123123";
const users = [];
wss.on('connection', async function connection(ws, request) {
    const url = request.url;
    if (!url) {
        return;
    }
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const token = queryParams.get('token') || "";
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        if (typeof decoded == "string" || !decoded || !decoded.userId) {
            ws.close();
            return;
        }
        const userId = decoded.userId;
        users.push({
            userId,
            rooms: [],
            ws
        });
        ws.on('message', async function message(data) {
            try {
                const parsedData = JSON.parse(data);
                // Join room
                if (parsedData.type == "join_room") {
                    const user = users.find(x => x.ws === ws);
                    user?.rooms.push(parsedData?.roomId);
                }
                // Leave room
                if (parsedData.type == "leave_room") {
                    const user = users.find(x => x.ws === ws);
                    if (user) {
                        user.rooms = user.rooms.filter(x => x !== parsedData.roomId);
                    }
                }
                // Send shape
                if (parsedData.type === "sendShape") {
                    const { roomId, shapeProperties, shapeType, id } = parsedData;
                    // console.log(parsedData);
                    const sender = users.find(user => user.ws === ws);
                    if (!sender)
                        return;
                    // First, save to database
                    const parsedProperties = JSON.parse(shapeProperties);
                    if (processedShapes.has(parsedProperties)) {
                        console.log("shape already in db");
                        return;
                    }
                    try {
                        const shape = await prisma.shape.findUnique({
                            where: {
                                id
                            }
                        });
                        if (shape) {
                            console.log("shape already exists");
                            return;
                        }
                        await prisma.shape.create({
                            data: {
                                id,
                                roomId,
                                shapeType,
                                properties: parsedProperties,
                                userId: sender.userId
                            }
                        });
                        processedShapes.add(parsedProperties);
                        if (processedShapes.size > 500) {
                            processedShapes.clear();
                        }
                        // Then broadcast to all users in the room
                        users.forEach(user => {
                            if (user.rooms.includes(roomId) && user.ws != ws) {
                                user.ws.send(JSON.stringify({
                                    type: "sendShape",
                                    shapeType,
                                    shapeProperties,
                                    roomId
                                }));
                            }
                        });
                    }
                    catch (error) {
                        console.error("Error saving shape to database:", error);
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Failed to save shape"
                        }));
                    }
                }
                if (parsedData.type == "deleteShapes") {
                    console.log("delete shape message recieved");
                    const { roomId, shapesToRemove } = parsedData;
                    const sender = users.find(user => user.ws === ws);
                    try {
                        // Delete from db and await the result
                        const deleted = await prisma.shape.deleteMany({
                            where: {
                                id: {
                                    in: shapesToRemove
                                }
                            }
                        });
                        console.log("result of delete function => " + deleted);
                        // Broadcast to room with shape IDs
                        users.forEach(user => {
                            if (user.rooms.includes(roomId) && ws != user.ws) {
                                user.ws.send(JSON.stringify({
                                    type: "deleteShapes",
                                    shapesToRemove,
                                    roomId
                                }));
                            }
                        });
                    }
                    catch (error) {
                        console.error("Error deleting shapes from database:", error);
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Failed to delete shapes"
                        }));
                    }
                }
                if (parsedData.type === "moveShape") {
                    const { id, shapeType, roomId, shapeProperties } = parsedData;
                    // Ensure Prisma update follows strict typing
                    const update = await prisma.shape.update({
                        where: { id },
                        data: {
                            properties: shapeProperties
                        }
                    });
                    // console.log("Shape updated:", update);
                    //broadcast
                    users.forEach(user => {
                        if (user.rooms.includes(roomId) && user.ws != ws) {
                            user.ws.send(JSON.stringify({
                                id,
                                type: "moveShape",
                                shapeType,
                                roomId,
                                shapeProperties
                            }));
                        }
                    });
                }
            }
            catch (error) {
                console.error("Invalid message received:", error);
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Invalid message format"
                }));
            }
        });
    }
    catch (error) {
        console.log(error);
        ws.close();
    }
});
