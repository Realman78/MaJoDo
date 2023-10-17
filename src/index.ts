import MaJoDo from "./majodo/MaJoDo";

const majodo = new MaJoDo("UDP")
majodo.start("0.0.0.0", 1934, 3000)