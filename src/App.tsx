import Staking from './components/Staking';
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";
import Swap from './components/Swap';
import Farm from './components/Farm';
import Bridge from './components/Bridge';
import Indexes from './components/Indexes';
import Wallet from './components/Wallet';


function App() {
  
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Staking current="stake" />} />
      <Route path="/swap" element={<Swap current="swap"  />} />
      <Route path="/farm" element={<Farm current="farm"   />} />
      <Route path="/wallet" element={<Wallet current="wallet"   />} />
      <Route path="/bridge" element={<Bridge current="bridge"  />} />
      <Route path="/indexes" element={<Indexes current="indexes"  />} />
    </Routes>
  </BrowserRouter>
    
  );
}

export default App;
