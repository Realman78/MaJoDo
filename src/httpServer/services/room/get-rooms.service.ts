import { Request, Response } from "express";
import MaJoDo from "../../../majodo/MaJoDo";

const getRooms = (req: Request, res: Response) => {
    res.send({data: Object.keys(MaJoDo.roomsToClient), message: "Success"});
};


export default getRooms;