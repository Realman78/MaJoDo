import { Request, Response } from "express";
import MaJoDo from "../../../majodo/MaJoDo";
import { v4 as uuidv4 } from 'uuid';
import { _uid } from "../../../_shared/utils/string-utils.util";
import jwt from "jsonwebtoken"

const createRoomAndJoin = (req: Request, res: Response) => {
    if (!req.socket.remoteAddress || !req.socket.remotePort) {
        return res.status(400).send({error: "Client disconnected or something went wrong. Cannot get port."})
    }
    
    const roomName = uuidv4();

    const token = jwt.sign({ roomName }, process.env.JWT_SECRET as string, {
        expiresIn: '10m'
    });
    
    MaJoDo.tokens.push(token)

    // MaJoDo.rooms.push(roomName)
    // MaJoDo.clientsRoom[_uid(req.socket.remoteAddress, req.socket.remotePort)]
    res.send({data: {token}, message: "Success."});
};

export default createRoomAndJoin;