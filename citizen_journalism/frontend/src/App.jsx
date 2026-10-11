import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ScrollToTop from './components/layout/ScrollToTop.jsx'
import Homepage from './routes/Homepage.jsx'
import NotFound from './routes/NotFound.jsx'
import Register from './routes/Register.jsx'
import VerifyOtp from './routes/VerifyOtp.jsx'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
