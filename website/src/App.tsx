import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { FeaturesPage } from './pages/FeaturesPage'
import { AlphaGenomePage } from './pages/AlphaGenomePage'
import { ScreenshotsPage } from './pages/ScreenshotsPage'
import { ArchitecturePage } from './pages/ArchitecturePage'
import { TechStackPage } from './pages/TechStackPage'
import { GetStartedPage } from './pages/GetStartedPage'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 72px)', paddingTop: 72 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/alphagenome" element={<AlphaGenomePage />} />
          <Route path="/screenshots" element={<ScreenshotsPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/tech-stack" element={<TechStackPage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}

export default App
