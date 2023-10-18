import { Request, Response } from "express";
import MaJoDo from "../../../majodo/MaJoDo";
import { v4 as uuidv4 } from 'uuid';

const createRoomAndJoin = (req: Request, res: Response) => {
    const roomName = uuidv4();
    const currentMembers = MaJoDo.clientsRoom.get(roomName) || [];
    MaJoDo.clientsRoom.set(roomName, [...currentMembers, req.ip]);
    res.send("Ok");
};

export default createRoomAndJoin;