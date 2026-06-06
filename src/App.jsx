import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import SignIn from "./login";
import SignUp from "./signup";
import Dashboard from "./Dashboard";
import Transactions from "./Transactions";
import AddTransaction from "./add-transaction";
import Analytics from "./analytics";
import Profiles from "./profile";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions/>} />
        <Route path="/add-transaction" element={<AddTransaction/>} />
        <Route path="/analytics" element={<Analytics/>} />
        <Route path="/profile" element={<Profiles/>} />
        
        
      </Routes>
    </Router>
  );
}

export default App;