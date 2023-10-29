import { ServerType } from "./_shared/enums/server-type.enum";
import MaJoDo from "./majodo/MaJoDo";

const majodo = new MaJoDo(ServerType.UDP, "0.0.0.0", 3000, 1934)
majodo.start()
majodo.getGameServerRaw()?.on("listening", () => {
    console.log("hi")
})