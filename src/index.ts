import { ServerType } from "./_shared/enums/server-type.enum";
import MaJoDo from "./majodo/MaJoDo";

const majodo = new MaJoDo(ServerType.UDP)
majodo.start("0.0.0.0", 1934, 3000)