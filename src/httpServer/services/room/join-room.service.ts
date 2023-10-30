import { Request, Response } from "express";
import MaJoDo from "../../../majodo/MaJoDo";
import jwt from "jsonwebtoken"

const joinRoom = (req: Request, res: Response) => {
    const roomName = req.body.roomName;

    if (!MaJoDo.roomsToClient[roomName]) {
        return res.send({data: null, message: `Room ${roomName} not found.`})
    }
    const token = jwt.sign({ roomName }, process.env.JWT_SECRET as string, {
        expiresIn: '10m'
    });
    
    MaJoDo.tokens.push(token)

    res.send({data: {token}, message: "Success."});
};

export default joinRoom;