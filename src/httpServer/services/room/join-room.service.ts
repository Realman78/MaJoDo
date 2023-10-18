import { Request, Response } from "express";
import MaJoDo from "../../../majodo/MaJoDo";

const joinRoom = (req: Request, res: Response) => {
    const roomName = req.body.roomName;
    // const currentMembers = MaJoDo.clientsRoom.get(roomName) || [];

    // if (!currentMembers.length) {
    //     res.status(404).send({error: `No room with ID ${roomName} found.`})
    // }

    // MaJoDo.clientsRoom.set(roomName, [...currentMembers, req.ip]);
    res.send({message: "Joined room " + roomName});
};

export default joinRoom;