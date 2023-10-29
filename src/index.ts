import { ServerType } from "./_shared/enums/server-type.enum";
import MaJoDo from "./majodo/MaJoDo";

const majodo = new MaJoDo(ServerType.WS, "0.0.0.0", 3000)
majodo.start()
majodo.getGameServer()?.on("listening", () => {
    console.log("hi")
})