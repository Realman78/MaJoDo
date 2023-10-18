import express from "express";
import roomController from "../controllers/room/room.controller";
import JoinRoomValidator from "../guards/join-room.guard";

const router = express.Router();

router.get("/", roomController.getRooms);
router.post("/join", JoinRoomValidator, roomController.joinRoom);
router.post("/create", roomController.createRoomAndJoin);

export default router;
