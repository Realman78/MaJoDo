import { ServerType } from "./_shared/enums/server-type.enum"
import MaJoDo from "./majodo/MaJoDo"

const majodo = new MaJoDo(ServerType.WS, "0.0.0.0", 3000, 1934)
majodo.start()
majodo.getExpressServer().get("/marin", (req,res) => {
    console.log(MaJoDo.clientsRoom)
    res.send("hi")
})
majodo.getGameServerRaw().on("listening", () => {
    console.log("hi im ", majodo.getType())
})