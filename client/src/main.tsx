import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("main.tsx loading...");
createRoot(document.getElementById("root")!).render(<App />);
console.log("App rendered successfully");
