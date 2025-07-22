import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { auth } from "./middleware.js";
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "./types.js";
import { PrismaClient } from "@prisma/client";
import cors from 'cors'
import { isValid } from "zod";


const app = express();
app.use(express.json())
app.use(cors());
const prisma = new PrismaClient();
interface Room {
    id: string;
    roomName: string;
    adminId?:string;
    adminName:string;
  }
  export const JWT_SECRET = process.env.JWT_SECRET || "123123"
app.post("/signup", async (req, res) => {

    const parsedData = CreateUserSchema.safeParse(req.body);
    console.log(parsedData);
    if (!parsedData.success) {
        console.log(parsedData.error)
        res.status(400).json({
            message: "Incorrect inputs",
            error:parsedData.error,
            isSuccess:false
        })
        return;
    }
    try {
        const hashedPassword = await bcrypt.hash(parsedData.data.password,5);
       const newUser =  await prisma.user.create({
            data: {
                email: parsedData.data?.email,
                password: hashedPassword,
                name: parsedData.data.username
            }
        })
        console.log(newUser)
        const jwtToken = jwt.sign({
            userId:newUser?.id
        },JWT_SECRET);
        res.status(200).send({
            message:"singup Successfull",
            token:jwtToken,
            isSuccess:true
        })
    } catch(e) {
        console.log(e)
        res.status(411).json({
            message: "User already exists with this username",
            error:e,
            isSuccess:false
        })
    }
})

app.post("/signin", async (req, res) => {
    
try {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.json({
            message: "Incorrect inputs",
            isSuccess:false
        })
        return;
    }
    const user = await prisma.user.findUnique({
        where:{
            email:parsedData.data.email
        }
    })
    if (!user) {
        res.status(401).send({
            message:"used does not exist",
            isSuccess:false
        })
        return;
    }
    const userPassword:string = user?.password??"";
    const passwordMatch = await bcrypt.compare(parsedData.data.password,userPassword);
    if (!passwordMatch) {
        res.status(403).send({
            message:"incorrect password",
            isSuccess:false
        })
        return;
    }
    const jwtToken = jwt.sign({
        userId:user?.id
    },JWT_SECRET);
    res.status(200).send({
        message:"singup Successfull",
        token:jwtToken,
        isSuccess:true
    })
} catch (error) {
    res.json({
        message:"singin failed",
        error:error
    })
}
})
//create room
app.post("/room",auth, async (req, res) => {
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }
    try {
        //@ts-ignore
        const userId = req.userId;
        if (!userId) {
            console.log(userId+"  user id not present (from createRoom route)")
        }
        const checkUser = await prisma.user.findUnique({
            where:{
                id:userId
            }
        })
        if (!checkUser) {
            res.status(403).send({
                message:"invalid user  , signin  and try again"
            })
            return
        }
        const adminId = checkUser.id;
        const adminName = checkUser.name;
        const roomSlug = parsedData.data.name
        const checkSlug = await prisma.room.findUnique({
            where:{
                slug:roomSlug
            }
        })
        if (checkSlug) {
            res.status(401).send({
                message:"room with this name already exists "
            })
            return;
        }
        const newRoom = await prisma.room.create({
            data:{
                slug:roomSlug,
                adminId:userId
            }
        })
        res.json({
            message:"room Created",
            roomId: newRoom.id,
            adminId,
            adminName
        })
    } catch (error) {
        console.log(error)
        
        res.status(400).json({
            message:"request failed",
            error:error
        })
    }
})
//get shapes from db
app.get("/shapes/:room_id",async (req,res)=>{
    // console.log("request recived")
    const room_id = req.params.room_id;
    try {
        const shapes = await prisma.shape.findMany({
            where:{
                roomId:room_id
            },
            orderBy:{
                id:"desc"
            },
            take:50
        })
        res.send({
            message:"request successfull",
            existingShapes:shapes,
        })
    } catch (error) {
        res.status(400).send({
            message:"get request failed"
        })
    }
})
//get RoomId from roomName
app.get("/room/:slug",async(req,res)=>{
    const slug = req.params.slug;
    try {
        let roomId = await prisma.room.findFirst({
            where:{
                slug
            }
        })
        res.send({
            roomId:roomId
        })
    } catch (error) {
        res.status(400).send({
            message:"reqeust failed",
            error:error
        })
    }
})
//check if roomId is valid
app.get("/roomCheck/:roomId",async (req,res) => {
    console.log("roomCheck request recieved")
    const roomId = req.params.roomId;
    try {
        const room = await prisma.room.findUnique({
            where:{
                id:roomId
            }
        })
        if (!room) {
            console.log("room not valid")
            res.send({
                isValidRoom:false
            });
            return;
        }
        console.log('room is valid');
        res.send({
            isValidRoom:true,
            roomDetails:room
        })
    } catch (error) {
        res.status(400).send({
            message:"request failed",
            error:error
        })
    }
})
//get all existing rooms
app.get("/getRooms", async (req, res) => {
    console.log("getRooms route got called")
    try {
        const rooms = await prisma.room.findMany({
            include: {
              admin: true,  
            },
          });

        const roomsResponse = rooms.map(room => ({
            id: room.id,
            adminName: room.admin?.name ?? "Unknown", 
            adminId: room.admin?.id ?? "Unknown",
            roomName: room.slug
        }));

        res.json({
            message: "Rooms fetched successfully",
            rooms: roomsResponse
        });

    } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ message: "Failed to fetch rooms", error });
    }
});


app.listen(3001,()=>{
    console.log("listning on port 3001")
});