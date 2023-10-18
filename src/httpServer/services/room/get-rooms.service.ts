import { Request, Response } from "express";
import MaJoDo from "../../../majodo/MaJoDo";

const getRooms = (req: Request, res: Response) => {
    // const roomsObject = Object.fromEntries(MaJoDo.clientsRoom.entries());
    console.log(MaJoDo.clientsRoom,MaJoDo.tokens, MaJoDo.roomsToClient)
    res.send("roomsObject");
};


export default getRooms;