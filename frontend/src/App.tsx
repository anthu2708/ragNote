import {BrowserRouter, Routes, Route} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ChatScreen from "./pages/ChatScreen";
import AddProjectScreen from "./pages/AddProjectScreen";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing/>}/>
                <Route path="/dashboard" element={<Dashboard/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>

                <Route path="/chat/:chatId" element={<ChatScreen/>}/>
                <Route path="/add" element={<AddProjectScreen/>}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
