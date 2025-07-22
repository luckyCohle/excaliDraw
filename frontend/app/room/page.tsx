"use client";
import { useState, useEffect } from "react";
import { Button, btnType } from "../../components/Button";
import { Input } from "@/components/input";
import axios from "axios";
import { Loading } from "@/components/Loading";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import Navbar from "@/components/Navbar";
const httpUrl = process.env.NEXT_PUBLIC_HTTP_URL;
interface Room {
  id: string;
  roomName: string;
  adminId?: string;
  adminName?: string;
}

const RoomPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [roomToJoin,setRoomToJoin] = useState("");
  const [isCreatingRoom,setIsCreatingRoom] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const setRoomsArray = async () => {
      const existingRooms: Room[] = await getRooms();
      setRooms(existingRooms);
      setIsLoading(false)
    }

    setRoomsArray();
  }, []);

  const handleCreateRoom = async() => {
    if (!newRoomName.trim()) {
      toast.error("Room name cannot be empty!");
      return;
    }
    setIsCreatingRoom(true);
    const accessToken = localStorage.getItem("token");

    if (!accessToken) {
      toast.error("You need to login to create Room");
      setIsCreatingRoom(false);
      router.push("/signin");
      return;
    }
    
    axios
      .post(
        `${httpUrl}/room`,
        { name: newRoomName },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      .then((response) => {
        const newRoom:Room = {
          id:response.data.roomId,
          roomName:newRoomName,
          adminId:response.data.adminId,
          adminName:response.data.adminName
        }
        console.log(rooms)
        // Create a new array with the updated rooms
  const updatedRooms = [...rooms, newRoom];
  
  // Set the state with the new array
  setRooms(updatedRooms);
  console.log("after push =>");
  console.log(updatedRooms);
  setIsCreatingRoom(false);
  setNewRoomName("");
        toast.success("room added successfully")
      })
      .catch((error) => {
        setIsCreatingRoom(false);
        console.log(error);
    
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            toast.error("Authentication failed. Please log in again.");
            setIsCreatingRoom(false);
            setTimeout(() => {
              router.push("/login");
            }, 3000);
          } else {
            toast.error(error.response?.data?.message || "An error occurred.");
          }
        } else {
          console.error("Unexpected error:", error);
        }
      });
    
  };
  const handleRoomJoin=()=>{
    if (!roomToJoin) {
      return;
    }
    const roomId:string = roomToJoin;
    router.push(`/canvas/${roomId}`)
  }

  if (isLoading) {
    return (
      <div>
        <Loading messagePrimary="preparing the page" messageSecondary="fetching the Data.." />
      </div>
    )
  }

  return (
    <>
    <Navbar/>
   <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 pt-20 flex flex-col md:flex-row justify-center items-center space-y-6 md:space-y-0 md:space-x-6">

      
      <ToastContainer position="top-right"/>
      <div className="max-w-md w-full  bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white text-center">
          <h2 className="text-xl font-bold">Rooms</h2>
          <p className="text-blue-100 text-sm mt-1">Join a room</p>
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold  text-gray-700 mb-2">Available Rooms</h3>
          <div className="h-48 overflow-y-auto">
            <ul className="space-y-2">
              {rooms.length!=0?rooms?.map((room) => (
                <li key={room.id} onClick={()=>setRoomToJoin(room.id)} className={`bg-gray-50  py-2 flex justify-between px-4 rounded-md text-gray-800 text-sm font-medium shadow-sm transition ${roomToJoin === room.id ? "bg-violet-500 hover:bg-violet-700 text-white font-bold" : " hover:bg-gray-100"}`}>
                  <p className="font-semibold">{room.roomName}</p><p>admin name:&nbsp;{room.adminName}</p>
                </li>
              )) :<h3>No rooms Available , You can create your own room</h3>}
            </ul>
          </div>

          <div className="h-6 p-2">
            <hr className="border-t-2 border-gray-300 my-4" />
          </div>
          <Button
                btn={btnType.primary}
                handleClick={handleRoomJoin}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Join Room
              </Button>
        </div>
      </div>

      <p className="underline text-2xl font-serif text-purple-600">
        OR
      </p>

      <div className="max-w-sm w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white text-center">
          <h2 className="text-xl font-bold">Rooms</h2>
          {/* <p className="text-blue-100 text-sm mt-1">Create a new Room </p> */}
        </div>

        <div className="p-4">
          <div className="mt-4">
            <h3 className="text-lg  font-semibold text-gray-600 mb-2">Create a new Room</h3>
            <div className="space-y-3">
              <Input
                placeholder="Enter room name"
                value={newRoomName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoomName(e.target.value)}
                classes="w-full bg-gray-200 shadow-2 my-2 text-black"
                name="roomName"
              />
              <Button
                btn={btnType.primary}
                handleClick={handleCreateRoom}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isCreatingRoom?"Creating Room...":"Create Room"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
async function getRooms(): Promise<Room[]> {
  console.log("called getRooms")
  try {
    const response = await axios.get(`${httpUrl}/getRooms`);
    const roomArray: Room[] = response.data.rooms
    console.log(response.data)
    console.log(roomArray)
    return roomArray;

  } catch (error) {
    console.error(error);
    return [];
  }
}

export default RoomPage;
